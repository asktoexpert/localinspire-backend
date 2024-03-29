const { redisClient } = require('..');
const stringUtils = require('../../../utils/string-utils');
const authKeys = require('../keys/auth.keys');

exports.getCachedEmailVerificationCode = async email => {
  console.log(
    'Results in cache: ',
    await redisClient.hGetAll(authKeys.email_verification_codes)
  );
  return await redisClient.hGet(authKeys.email_verification_codes, email);
};

exports.saveEmailVerification = async (email, verificationCode) => {
  return await redisClient.hSet(authKeys.email_verification_codes, email, verificationCode);
};

exports.removeEmailVerification = async email => {
  return redisClient.hDel(authKeys.email_verification_codes, email);
};

exports.cacheVerificationForPasswordReset = async (code, email) => {
  await redisClient.hSet(authKeys.email_verifications_for_password_reset, code, email);
};
exports.getCorrespondingEmailWithVerificationCode = async code => {
  const email = await redisClient.hGet(
    authKeys.email_verifications_for_password_reset,
    code
  );
  return email;
};

exports.cacheVerificationForAccountConfirmation = async (email, code) => {
  console.log('To cache: ', email, code);
  await redisClient.hSet(authKeys.all_account_confirmation, email, code);
};

exports.checkAccountConfirmationEmail = async userEmail => {
  // console.log('All: ', await redisClient.hGetAll(authKeys.all_account_confirmation));
  // await redisClient.DEL(authKeys.all_account_confirmation);
  // return await redisClient.hGetAll(authKeys.all_account_confirmation);

  console.log('All: ', await redisClient.hGetAll(authKeys.all_account_confirmation));
  console.log('To check for: ', userEmail);

  const emails = await redisClient.hKeys(authKeys.all_account_confirmation);
  console.log('All emails: ', emails);

  return { isFound: emails.includes(userEmail) };
};
