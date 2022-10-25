const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../middleware/authController');

const router = express.Router();

router.route('/signup').post(authController.verifyCredentials, userController.signup);
router.route('/login').post(authController.verifyCredentials, userController.login);
router
  .route('/oauth/:provider')
  .post(authController.verifyOauthToken, userController.oAuth);

module.exports = router;
