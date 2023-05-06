const express = require('express');
const userController = require('../controllers/userController');
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
    userController.signupWithCredentials
  );

router.route('/:id/profile').get(userController.getUserPublicProfile);
router.route('/:id/profile/views').patch(userController.updateProfileViewsCount);

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

router.route('/:id/follow').patch(authController.protect, userController.followUser);
router.route('/:id/followers').get(userController.getUserFollowers);
router.route('/:id/block').patch(authController.protect, userController.toggeleBlockUser);
router.route('/blocked-by/:userId').get(userController.getPeopleBlockedByUser);

module.exports = router;
