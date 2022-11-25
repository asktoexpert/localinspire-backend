const { redisClient } = require('..');
const authKeys = require('../keys/auth.keys');

exports.getCachedEmailVerificationCode = async email => {
  console.log(
    'Results in cache: ',
    await redisClient.hGetAll(authKeys.email_verification_codes)
  );
  return await redisClient.hGet(authKeys.email_verification_codes, email);
};

exports.saveEmailVerification = async (email, verificationCode) => {
  return await redisClient.hSet(
    authKeys.email_verification_codes,
    email,
    verificationCode
  );
};

exports.removeEmailVerification = async email => {
  return redisClient.hDel(authKeys.email_verification_codes, email);
};
