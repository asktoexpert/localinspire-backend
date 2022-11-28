const User = require('../models/User');
const stringUtils = require('../utils/string-utils');
const authController = require('../middleware/authController');
const authQueries = require('../databases/redis/queries/auth.queries');
const { redisClient } = require('../databases/redis');
const emailService = require('../services/emailService');
const { v4: uuid } = require('uuid');

exports.signupWithCredentials = async function (req, res) {
  try {
    const exists = await User.isEmailAlreadyInUse(req.body.email);
    if (exists)
      return res.status(400).json({
        status: 'FAIL',
        reason: 'EMAIL_IN_USE',
        msg: 'A user with this email already exists',
      });

    const userDetails = {
      ...req.body,
      signedUpWith: 'credentials',
      emailVerified: false,
    };
    if (req.body !== 'MAIN_ADMIN') userDetails.role = req.body.role || 'USER';

    const newUser = await User.create(userDetails);

    const verificationCode = uuid();
    const origin =
      process.env.NODE_ENV == 'development'
        ? // ? 'http://192.168.177.12:5000'
          'http://localhost:3000'
        : 'https://localinspire.vercel.app';

    const verificationLink = origin.concat(`/verify/account?code=${verificationCode}`);
    const emailFeedback = await emailService.sendEmailVerificationLinkForPasswordReset(
      req.body.email,
      verificationLink
    );
    console.log({ emailFeedback, verificationLink, env: process.env.NODE_ENV });

    // Cache the verification once the email is sent
    await authQueries.cacheVerificationForAccountConfirmation(
      verificationCode,
      req.body.email
    );

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
  const { code } = req.query;
  console.log('CODE: ', code);
  if (!code?.length) {
    return res.status(400).json({
      status: 'FAIL',
      reason: 'INVALID_CODE',
    });
  }
  try {
    const cachedEmail = await authQueries.getAccountConfirmationEmail(code);
    console.log({ cachedEmail });

    if (!cachedEmail) {
      return res.status(400).json({
        status: 'FAIL',
        reason: 'INVALID_CODE',
      });
    }

    res.status(200).json({
      status: 'SUCCESS',
      msg: 'Your account has been confirmed. You may close this tab now.',
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: 'FAIL',
      msg: err.message,
      error: err,
    });
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
  const [firstName, lastName] = verifiedUser.name.split(' ');
  console.log('verifiedUser: ', verifiedUser);

  try {
    let user = await User.findOne({ email: verifiedUser.email });
    let userExistedBefore = true;

    if (!user) {
      userExistedBefore = false;
      user = await User.create({
        firstName,
        lastName,
        email: verifiedUser.email,
        imgUrl: verifiedUser.image,
        emailVerified: true,
        signedUpWith: req.params.provider,
        role: 'USER',
      });
    }

    res.status(userExistedBefore ? 200 : 201).json({
      status: 'SUCCESS',
      data: {
        ...user.toObject(),
        firstName,
        lastName,
        imgUrl: verifiedUser.image,
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
    // const code = await authController.genVerificationCode();
    const verificationCode = uuid();
    const origin =
      process.env.NODE_ENV !== 'development'
        ? // ? 'http://192.168.177.12:5000'
          'http://localhost:3000'
        : 'https://localinspire.vercel.app';

    const verificationLink = origin.concat(
      `/verify/password-reset?code=${verificationCode}`
    );

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
