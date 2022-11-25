const User = require('../models/User');
const stringUtils = require('../utils/string-utils');
const authController = require('../middleware/authController');
const authQueries = require('../databases/redis/queries/auth.queries');
const { redisClient } = require('../databases/redis');

exports.signupWithCredentials = async function (req, res) {
  try {
    if (req.emailAreadyInUse)
      return res.status(400).json({
        status: 'FAIL',
        reason: 'EMAIL_IN_USE',
        msg: 'A user with this email already exists',
      });

    const newUser = await User.create({
      ...req.body,
      signedUpWith: 'credentials',
      emailVerified: true,
    });

    res.status(201).json({
      status: 'SUCCESS',
      data: {
        ...newUser.toObject(),
        accessToken: authController.signToken(newUser._id, newUser.email),
        rft: authController.genRefreshToken(),
      },
    });
  } catch (err) {
    res.json({ msg: 'Error: ' + err.message });
  }
};

exports.loginWithCredentials = async (req, res) => {
  try {
    let user = await User.findOne({ email: req.body.email }).select('+password');

    if (!user || !(await user.verifyPassword(req.body.password, user.password))) {
      return res.status(400).json({
        status: 'FAIL',
        reason: 'WRONG_CREDENTIALS',
        msg: 'Wrong login credentials',
      });
    }

    // If user earlier signed up with a non-credentials provider
    if (user.signedUpWith !== 'credentials') {
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
  console.log('verifiedUser: ', verifiedUser);

  try {
    let user = await User.findOne({ email: verifiedUser.email });

    if (!user) {
      const newUser = { username: verifiedUser.name, email: verifiedUser.email };
      user = await User.create({ ...newUser, signedUpWith: req.params.provider });
    }
    res.status(201).json({
      status: 'SUCCESS',
      data: {
        ...user.toObject(),
        username: verifiedUser.name,
        email: verifiedUser.email,
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
  const { email, newPassword } = req.body;
  try {
    const user = await User.findUserByEmail(email);
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'SUCCESS',
      msg: 'You have successfully changed your password.',
      data: { user },
    });
  } catch (err) {
    console.log('Error: ', err);
    res.status(400).json({ error: err });
  }
};
