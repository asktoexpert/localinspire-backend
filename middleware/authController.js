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

// const { redisClient } = require('../databases/redis');

exports.signToken = (userId, userEmail) => {
  const token = jwt.sign({ id: userId, email: userEmail }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
  return token;
};

exports.genRefreshToken = () => {
  return uuid.v4();
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
  const { email, password } = req.body;
  console.log('Req body: ', req.body);

  if (!email || !password) {
    return res.status(400).json({
      status: 'FAIL',
      reason: 'BAD_CREDENTIALS',
    });
  }
  next();
};

const googleVerify = async (token, clientUser) => {
  const url = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`;

  const handleResponse = function (err, res, body) {
    if (err) this.reject(err);
    const result = JSON.parse(body);
    console.log('Google Result: ', result);

    if (result.error) this.reject({ success: false });
    if (result.user_id === clientUser.id && result.email === clientUser.email)
      this.resolve({ success: true });
    this.reject({ success: false });
  };

  return new Promise((resolve, reject) => {
    request(url, handleResponse.bind({ resolve, reject }));
  });
};

const facebookVerify = async (token, clientUser) => {
  const url = `https://graph.facebook.com/me?access_token=${token}`;

  const handleResponse = function (err, res, body) {
    if (err) this.reject(err);

    const result = JSON.parse(body);
    console.log('Facebook Result: ', result);

    if (result.error) this.reject(result);

    if (result.id === clientUser.id) {
      if (!result.email) this.resolve({ success: true });
      if (result.email !== clientUser.email) this.reject({ success: false });
    }
    this.reject(result);
  };

  return new Promise((resolve, reject) =>
    request(url, handleResponse.bind({ resolve, reject }))
  );
};

exports.verifyOauthToken = async (req, res, next) => {
  const { provider } = req.params;
  const { user: clientUser, account } = req.body;

  console.log(provider, clientUser, account);

  try {
    const { success } = await (provider === 'google'
      ? googleVerify
      : provider === 'facebook'
      ? facebookVerify
      : () => {})(account.access_token, clientUser);

    if (success) {
      req.verifiedUser = clientUser;
      return next();
    }
    return res.status(400).json({ status: 'FAIL' });
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
