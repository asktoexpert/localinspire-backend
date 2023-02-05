const express = require('express');
const multer = require('multer');

const businessController = require('../controllers/business/businessController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/review/reviewController');

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });
const router = express.Router();

router
  .route('/on/:businessId/new')
  .post(
    authController.protect,
    upload.array('photos', 7),
    reviewController.resizeReviewPhotos,
    reviewController.reviewBusiness
  );

router
  .route('/made-by-user')
  .get(authController.protect, reviewController.getAllReviewsMadeByUser);

router.route('/:id').get(reviewController.getReview);

// Get reviews made on business
router.route('/businesses/:id/').get(reviewController.getBusinessReviews);

router
  .route('/by-user/on/:businessId/add-photos')
  .patch(
    authController.protect,
    upload.array('photos', 7),
    reviewController.resizeReviewPhotos,
    reviewController.addPhotosOfBusiness
  );

router
  .route('/on/:businessId/by-user')
  .get(authController.protect, reviewController.getUserReviewOnBusiness);

module.exports = router;
