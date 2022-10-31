const jwt = require('jsonwebtoken');
const User = require('../models/User');
const uuid = require('uuid');
const bcrypt = require('bcryptjs');
const stringUtils = require('../utils/string-utils');

const signToken = (userId, userEmail) => {
  const token = jwt.sign({ id: userId, email: userEmail }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
  return token;
};

const getRefreshToken = () => uuid.v4();

exports.signup = async function (req, res) {
  try {
    const userWithEmailExists = await User.findOne({ email: req.body.email });
    if (userWithEmailExists) {
      return res.status(400).json({
        status: 'FAIL',
        reason: 'USER_ALREADY_EXISTS',
        msg: 'A user with this email already exists',
      });
    }

    const newUser = await User.create({ ...req.body, signedUpWith: 'credentials' });
    res.status(201).json({
      status: 'SUCCESS',
      data: {
        ...newUser.toObject(),
        accessToken: signToken(newUser._id, newUser.email),
        rft: getRefreshToken(),
      },
    });
  } catch (err) {
    res.json({ msg: 'Error: ' + err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select('+password');

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
        msg: `This user account can only be logged in with ${stringUtils.toTitleCase(
          user.signedUpWith
        )}`,
      });
    }

    res.status(201).json({
      status: 'SUCCESS',
      data: {
        ...user.toObject(),
        accessToken: signToken(user._id, user.email),
        rft: getRefreshToken(),
      },
    });
  } catch (err) {
    console.log(err);
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
        accessToken: signToken(user._id, user.email),
        rft: getRefreshToken(),
      },
    });
  } catch (err) {
    console.log('UnKnown erroR: ', err);
    res.status(400).json({ error: err });
  }
};
