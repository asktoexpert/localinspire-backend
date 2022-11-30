const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../middleware/authController');

const router = express.Router();

router
  .route('/login')
  .post(authController.verifyCredentials, userController.loginWithCredentials);

router.route('/signup').post(
  authController.verifyCredentials,
  // authController.verifyEmailForCredentialsSignup,
  userController.signupWithCredentials
);
router.route('/is-email-in-use').get(userController.checkEmailAlreadyInUse);

router.route('/forgot-password').get(userController.forgotPassword);
router.route('/reset-password').post(userController.resetPassword);
router.route('/confirm-account').get(userController.confirmAccount);
// router.route('/:email/status').get(userController.getUserEmailVerifiedStatus);

router.route('/oauth/:provider').post(authController.verifyOauthToken, userController.oAuth);

module.exports = router;
