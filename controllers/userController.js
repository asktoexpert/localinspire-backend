const jwt = require('jsonwebtoken');
const User = require('../models/User');
const uuid = require('uuid');
const bcrypt = require('bcryptjs');

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

    const newUser = await User.create(req.body);
    // console.log(newUser);

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
    // .select('password');

    if (!user || !(await User.verifyPassword(req.body.password, user.password))) {
      return res.status(400).json({
        status: 'FAIL',
        reason: 'BAD_CREDENTIALS',
        msg: 'Invalid credentials',
      });
    }
    // console.log(user);

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
