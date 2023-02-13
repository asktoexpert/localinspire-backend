const express = require('express');
const userController = require('../controllers/user/userController');
const authController = require('../controllers/authController');

const multer = require('multer');
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

const router = express.Router();

router
  .route('/login')
  .post(authController.verifyCredentials, userController.loginWithCredentials);

router
  .route('/signup')
  .post(
    upload.single('photo'),
    userController.resizeUserPhoto,
    authController.verifyCredentials,
    userController.signupWithCredentials
  );

router.route('/is-email-in-use').get(userController.checkEmailAlreadyInUse);

router.route('/forgot-password').get(userController.forgotPassword);
router.route('/reset-password').post(userController.resetPassword);
router.route('/confirm-account').get(userController.confirmAccount);

router.route('/oauth/:provider').post(authController.verifyOauthToken, userController.oAuth);

router
  .route('/update-user-location')
  .patch(authController.protect, userController.updateUserLocation);

router.route('/contribute').patch(authController.protect, userController.addUserContribution);

router
  .route('/collections')
  .patch(authController.protect, userController.createCollection)
  .get(authController.protect, userController.getUserCollections);

router
  .route('/collections/:cId/add')
  .patch(authController.protect, userController.addOrRemoveItemToCollection);

module.exports = router;
