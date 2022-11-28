exports.email_verification_codes = 'email_verification_codes';
exports.email_verifications = 'email_verifications';

exports.all_account_confirmation = 'all_account_confirmation';
exports.email_verifications_for_password_reset = 'email_verifications_for_password_reset';
// exports.genEmailVerificationCodeKey = (email, code) => {
//   return `email_verification:email=${email}|code=${code}`;
// };

exports.genEmailVerificationKey = (email, code) => {
  return `email_verification:email=${email}|code=${code}`;
};
