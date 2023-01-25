const express = require('express');
const userController = require('../controllers/user/userController');
const authController = require('../controllers/authController');
const multer = require('multer');

const multerStorage = multer.memoryStorage();

// const multerFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith('image')) cb(null, true);
//   else cb(new Error('Only images are allowed'), false);
// };
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

router.route('/contribute').patch(authController.protect, userController.addContribution);

module.exports = router;
