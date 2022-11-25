const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../middleware/authController');

const router = express.Router();

router
  .route('/login')
  .post(authController.verifyCredentials, userController.loginWithCredentials);

router
  .route('/signup')
  .post(
    authController.verifyCredentials,
    authController.verifyEmailForCredentialsSignup,
    userController.signupWithCredentials
  );

router
  .route('/forgot-password')
  .post(authController.verifyEmailForForgotPassword, userController.forgotPassword);

router
  .route('/oauth/:provider')
  .post(authController.verifyOauthToken, userController.oAuth);

module.exports = router;
