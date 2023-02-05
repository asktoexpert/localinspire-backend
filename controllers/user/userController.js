const fs = require('fs');
const User = require('../../models/user/User');
const stringUtils = require('../../utils/string-utils');
const authController = require('../authController');
const authQueries = require('../../databases/redis/queries/auth.queries');
const emailService = require('../../services/emailService');
const { v4: uuid } = require('uuid');
const sharp = require('sharp');
const { default: mongoose } = require('mongoose');
const cloudinaryService = require('../../services/cloudinaryService');

const emailAccountConfirmationLink = async (email, firstName) => {
  // Send verification email
  const origin =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://localinspire.vercel.app';

  const verificationLink = origin.concat(`/verify/account?email=${email}`);
  const emailFeedback = await emailService.sendAccountConfirmationRequestEmail(
    email,
    verificationLink,
    firstName
  );
  console.log({ emailFeedback, verificationLink, env: process.env.NODE_ENV });

  // Cache the verification code once the email is sent
  const verificationCode = uuid();
  await authQueries.cacheVerificationForAccountConfirmation(email, verificationCode);
};

exports.addUserContribution = async (userId, contributionId, contributionType) => {
  const newContribution = { contribution: contributionId, model: contributionType };

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { contributions: newContribution } },
      { new: true }
    );
    // console.log('Updated user contribution: ', updatedUser);
  } catch (err) {
    console.log('Error in adding contribution: ', err);
    throw err;
  }
};

exports.resizeUserPhoto = async (req, res, next) => {
  try {
    console.log({ 'req.file': req.file });
    // console.log(req);
    if (!req.file) return next();

    const newUserId = new mongoose.Types.ObjectId();

    // Validate uploaded photo
    if (!req.file.mimetype.startsWith('image/'))
      return res.status(400).json({ status: 'FAIL', msg: 'Only images are allowed' });

    // Resize user photo
    const filePath = `public/img/users/user-${newUserId}-${Date.now()}.jpeg`;
    const sharpResult = await sharp(req.file.buffer)
      .resize(500, 500)
      .jpeg({ quality: 90 })
      .toFormat('jpeg')
      .toFile(filePath);
    console.log({ sharpResult });

    // Upload photo to Cloudinary server
    const uploadResult = await cloudinaryService.upload({ dir: 'users', filePath });

    if (uploadResult.secure_url) {
      req.body.imgUrl = uploadResult.secure_url;
      req.body.newUserId = newUserId;
    }

    // Delete file from server
    fs.unlink(filePath, err => {
      if (err) return console.log('Could not delete user photo from server');
      console.log('User photo deleted successfully');
    });
    console.log({ uploadResult });

    next();
  } catch (err) {
    console.log(err);
    res.json({ msg: err.message });
  }
};

exports.signupWithCredentials = async function (req, res) {
  try {
    // res.json(req.body);
    const emailInUse = await User.isEmailAlreadyInUse(req.body.email);
    if (emailInUse)
      return res.status(400).json({
        status: 'FAIL',
        reason: 'EMAIL_IN_USE',
        msg: 'A user with this email already exists',
      });

    // Create user
    const newUser = await User.create({
      _id: req.body.newUserId || new mongoose.Types.ObjectId(),
      ...req.body,
      role: 'USER',
      signedUpWith: 'credentials',
      accountVerified: false,
    });

    // Send verification email
    await emailAccountConfirmationLink(req.body.email, req.body.firstName);

    res.status(201).json({
      status: 'SUCCESS',
      data: {
        ...newUser.toObject(),
        accessToken: authController.signToken(newUser._id, newUser.email),
        rft: authController.genRefreshToken(),
      },
    });
  } catch (err) {
    console.log(err);
    res.json({ msg: err.message });
  }
};

exports.confirmAccount = async (req, res) => {
  const { email } = req.query;
  console.log('REQ EMAIL: ', email);

  if (!email?.length)
    return res.status(400).json({ status: 'FAIL', msg: 'This is an Invalid URL' });

  try {
    const user = await User.findUserByEmail(email.trim());
    if (!user) return res.status(400).json({ status: 'FAIL', msg: 'This link is invalid.' });

    // If user used this link in the past and was confirmed
    if (user.accountVerified)
      return res.status(200).json({
        status: 'SUCCESS',
        msg: 'Your account has been confirmed. You may close this tab now.',
      });

    // Check if user's email is found as a cache key
    const { isFound } = await authQueries.checkAccountConfirmationEmail(email);
    console.log({ isFound });

    if (!isFound) {
      return res.status(400).json({
        status: 'FAIL',
        msg: 'This is an Invalid URL',
      });
    }

    user.accountVerified = true;
    await user.save();

    res.status(200).json({
      status: 'SUCCESS',
      msg: 'Your account has been confirmed. You may close this tab now.',
    });
  } catch (err) {
    console.log(err);
    res.json({ status: 'FAIL', msg: err.message, error: err });
  }
};

exports.checkEmailAlreadyInUse = async function (req, res) {
  try {
    res.status(200).json({
      status: 'SUCCESS',
      isEmailInUse: await User.isEmailAlreadyInUse(req.query.email),
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', msg: err.message });
  }
};

exports.loginWithCredentials = async (req, res) => {
  try {
    let user = await User.findOne({ email: req.body.email }).select('+password');
    console.log({ user });

    if (!user || !(await user.verifyPassword(req.body.password, user.password))) {
      return res.status(400).json({
        status: 'FAIL',
        reason: 'WRONG_CREDENTIALS',
        msg: 'Wrong login credentials',
      });
    }

    // If user earlier signed up with a non-credentials provider
    if (user && user.signedUpWith !== 'credentials') {
      return res.status(400).json({
        status: 'ERROR',
        reason: 'WRONG_LOGIN_STRATEGY',
        msg: `This account can only be logged in with ${stringUtils.toTitleCase(
          user.signedUpWith
        )}`,
      });
    }

    user = user.toJSON();
    delete user.password;

    res.status(201).json({
      status: 'SUCCESS',
      data: {
        ...user,
        accessToken: authController.signToken(user._id, user.email),
        rft: authController.genRefreshToken(),
      },
    });
  } catch (err) {
    console.log('Error: ', err);
    res.status(400).json({ error: err });
  }
};

exports.oAuth = async function (req, res, next) {
  const { verifiedUser } = req;
  console.log('Verified user: ', verifiedUser);

  try {
    let user = await User.findOne({
      $or: [{ email: verifiedUser.email }, { facebookEmail: verifiedUser.email }],
    });
    let userExistedBefore = !!user;
    console.log({ user });

    if (!userExistedBefore) {
      // Create new user
      user = await User.create({
        ...verifiedUser,
        accountVerified: false,
        signedUpWith: req.params.provider,
        role: 'USER',
      });
      verifiedUser.email &&
        (await emailAccountConfirmationLink(verifiedUser.email, verifiedUser.firstName));
    }

    res.status(userExistedBefore ? 200 : 201).json({
      status: 'SUCCESS',
      data: {
        ...user.toObject(),
        // Send the incoming Oauth provider's data, not the one from DB
        ...verifiedUser,
        currentlyLoggedInWith: req.params.provider,
        accessToken: authController.signToken(user._id, user.email),
        rft: authController.genRefreshToken(),
      },
    });
  } catch (err) {
    console.log('UnKnown erroR: ', err);
    res.status(400).json({ error: err });
  }
};

exports.forgotPassword = async function (req, res) {
  const { email } = req.query;

  try {
    // Check if user with email exists
    const user = await User.findUserByEmail(email);
    console.log('User: ', user);

    if (!user) {
      return res.status(400).json({
        status: 'FAIL',
        reason: 'INVALID_EMAIL',
        msg: 'Wrong email entered',
      });
    }
    console.log({ env: process.env.NODE_ENV });

    // User exists, so generate verification code
    const verificationCode = uuid();
    const origin =
      process.env.NODE_ENV === 'development'
        ? // ? 'http://192.168.177.12:5000'
          'http://localhost:3000'
        : 'https://localinspire.vercel.app';

    const verificationLink = origin.concat(`/verify/password-reset?code=${verificationCode}`);

    // Send verification link to user's email
    const emailFeedback = await emailService.sendEmailVerificationLinkForPasswordReset(
      email,
      verificationLink
    );
    console.log({ emailFeedback });

    // Cache the verification once the email is sent
    await authQueries.cacheVerificationForPasswordReset(verificationCode, email);
    const cachedEmail = await authQueries.getCorrespondingEmailWithVerificationCode(
      verificationCode
    );

    res.json({
      status: 'SUCCESS',
      msg: 'EMAIL_SENT',
      fullMsg: `We have just sent an email to ${stringUtils.weaklyEncryptEmail(
        email.toLowerCase()
      )}. Follow the instructions to reset your password.`,
      // code: verificationCode,
      cachedEmail,
      verificationLink,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      status: 'ERROR',
      msg: 'Something went wrong',
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { code } = req.query;

    if (!code?.length) {
      return res.status(400).json({
        status: 'FAIL',
        reason: 'INVALID_CODE',
      });
    }
    console.log('Code & password ', code, newPassword);
    const cachedEmail = await authQueries.getCorrespondingEmailWithVerificationCode(code);

    if (!cachedEmail) {
      return res.status(400).json({
        status: 'FAIL',
        reason: 'INVALID_CODE',
      });
    }
    console.log({ cachedEmail });
    const filter = { email: cachedEmail };
    const update = { password: newPassword };
    await User.findOneAndUpdate(filter, update, { new: true, runValidators: true });

    res
      .status(200)
      .json({ status: 'SUCCESS', msg: 'Your password has been changed successfully' });
  } catch (err) {
    console.log(err);
    res.json({
      status: 'FAIL',
      msg: err.message,
      error: err,
    });
  }
};

exports.updateUserLocation = async (req, res) => {
  console.log('Location body: ', req.body);

  try {
    const result = await User.findByIdAndUpdate(
      req.user._id,
      { location: req.body },
      { new: true }
    );
    // console.log('Update location result: ', result);
    res.status(200).json({ status: 'SUCCESS' });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: 'FAIL' });
  }
};
