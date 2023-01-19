const bcrypt = require('bcryptjs');
const request = require('request');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const authKeys = require('../databases/redis/keys/auth.keys');
const authQueries = require('../databases/redis/queries/auth.queries');
const { redisClient } = require('../databases/redis');
const EmailService = require('../services/emailService');
const User = require('../models/User');
const stringUtils = require('../utils/string-utils');
const emailService = require('../services/emailService');
const axios = require('axios');

// const { redisClient } = require('../databases/redis');

exports.signToken = (userId, userEmail) => {
  const token = jwt.sign({ id: userId, email: userEmail }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
  return token;
};

exports.genRefreshToken = () => {
  return uuid.v4();
};

exports.protect = async (req, res, next) => {
  try {
    const token = req.headers?.authorization?.replace('Bearer ', '');
    const { id: userId } = await Promise.resolve(jwt.verify(token, process.env.JWT_SECRET));

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ msg: 'AUTH_ERROR' });

    req.user = user;
    console.log('User authenticated');
    next();
  } catch (err) {
    console.log(err.message);
    // if (err.message === 'jwt malformed') {
    res.status(401).json({ msg: 'AUTH_ERROR' });
    // }
  }
};

exports.genVerificationCode = async () => {
  const shuffle = arr => {
    for (
      let j, x, i = arr.length;
      i;
      j = Math.floor(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x
    );
    return arr;
  };
  const genRandom4Digits = () => {
    const digits = '123456789'.split('');
    const first = shuffle(digits).pop();
    digits.push('0');
    return parseInt(first + shuffle(digits).join('').substring(0, 3), 10);
  };
  return Promise.resolve(genRandom4Digits());
};

exports.verifyCredentials = (req, res, next) => {
  console.log('Req body: ', req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 'FAIL',
      reason: 'BAD_CREDENTIALS',
    });
  }
  next();
};

// const googleVerify = async (token, clientUser) => {
//   const url = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`;

//   const handleResponse = function (err, res, body) {
//     if (err) this.reject(err);
//     const result = JSON.parse(body);
//     console.log('Google Result: ', result);

//     if (result.error) this.reject({ success: false });
//     if (result.user_id === clientUser.id && result.email === clientUser.email)
//       this.resolve({ success: true });
//     this.reject({ success: false });
//   };

//   return new Promise((resolve, reject) => {
//     request(url, handleResponse.bind({ resolve, reject }));
//   });
// };

const googleVerify = async function (accessToken) {
  const url = 'https://www.googleapis.com/oauth2/v3/userinfo';

  const { data: result } = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
  });

  console.log('Data from Google: ', result);
  if (result.error) return { success: false, msg: 'Invalid token' };

  return {
    success: true,
    user: {
      firstName: result.given_name,
      lastName: result.family_name,
      email: result.email,
      imgUrl: result.picture,
    },
  };
};

const facebookVerify = async function (accessToken, profile) {
  const url = `https://graph.facebook.com/me?access_token=${accessToken}`;

  console.log('Body profile: ', profile.name);

  const handleResponse = function (err, res, body) {
    if (err) this.reject(err);

    const result = JSON.parse(body);
    console.log('Facebook Result: ', result);

    if (result.error || result?.id !== profile.id) return this.reject(result);

    const [firstName, lastName] = profile.name.split(' ');
    const user = {
      firstName,
      lastName,
      email: profile.email,
      imgUrl: profile.picture.data.url,
    };
    this.resolve({ success: true, user });
  };

  return new Promise((resolve, reject) =>
    request(url, handleResponse.bind({ resolve, reject }))
  );
};

exports.verifyOauthToken = async (req, res, next) => {
  const [{ provider }, { access_token }] = [req.params, req.query];

  console.log('Req body: ', req.body);
  console.log({ provider, access_token });

  const verifiers = { google: googleVerify, facebook: facebookVerify };

  try {
    const result = await verifiers[provider](access_token, req.body);
    console.log('Final result: ', result);

    if (result.success) {
      req.verifiedUser = result.user;
      return next();
      // return res.json({ success: true });
    }

    return res
      .status(400)
      .json({ status: 'FAIL', msg: result.msg || 'Sorry, something went wrong' });
  } catch (err) {
    console.log('ERR: ', err);
    res.status(400).json(err);
  }
};

const verifyEmail = async (email, verificationCode, res, next) => {
  // console.log('Req query: ', req.query);
  try {
    console.log({ allVerifs: await redisClient.hGetAll('email_verification_codes') });

    const noCodeProvided =
      !verificationCode || ['undefined', 'null'].includes(verificationCode);
    console.log({ noCodeProvided });

    const cachedCode = await authQueries.getCachedEmailVerificationCode(email);
    console.log({ cachedCode });

    const isYetToVerifyCode = cachedCode?.includes('unverified');
    const isRequestingVerificationCode =
      cachedCode === null || (isYetToVerifyCode && noCodeProvided);

    if (isRequestingVerificationCode) {
      const { feedback, newCode } = await startNewEmailVerification(email);
      console.log('Generated code: ', newCode);
      if (!feedback?.messageId) return;

      return res.status(400).json({
        status: 'FAIL',
        reason: 'EMAIL_NOT_VERIFIED',
        msg: `Please check your email. We just sent a verification code to ${stringUtils.weaklyEncryptEmail(
          email
        )}`,
      });
    }

    if (verificationCode === cachedCode.replace('-unverified', '')) {
      await authQueries.removeEmailVerification(email);
      return next();
    } else {
      return res.status(400).json({
        status: 'FAIL',
        reason: 'WRONG_CODE',
        msg: 'You have entered a wrong code',
      });
    }
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      status: 'ERROR',
      msg: 'Sorry, something wrong has happened',
      error: err,
    });
  }
};

// Email Verification Middleware
exports.verifyEmailForCredentialsSignup = async function (req, res, next) {
  // await redisClient.DEL(authKeys.email_verification_codes);
  // return res.json({
  //   emailVerifications: await redisClient.hKeys(authKeys.email_verification_codes),
  // });
  const { email } = req.body;

  if (await User.isEmailAlreadyInUse(email)) {
    req.emailAreadyInUse = true;
    return next();
  }
  const { verification_code: verificationCode } = req.query;
  verifyEmail(email, verificationCode, res, next);
};

exports.verifyEmailForForgotPassword = async function (req, res, next) {
  const { verification_code: verificationCode } = req.query;
  const { email } = req.body;

  if (!(await User.isEmailAlreadyInUse(email))) {
    return res.status(400).json({
      status: 'FAIL',
      reason: 'INVALID_EMAIL',
      msg: 'You entered a wrong email.',
    });
  }
  verifyEmail(email, verificationCode, res, next);
};
