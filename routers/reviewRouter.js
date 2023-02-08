const express = require('express');
const multer = require('multer');

const businessController = require('../controllers/business/businessController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/review/reviewController');
const BusinessReview = require('../models/business/BusinessReview');
const {
  cacheBusinessReviewerId,
  getBusinessReviewerIds,
} = require('../databases/redis/queries/review.queries');
const { redisClient } = require('../databases/redis');
const { business_reviewers_hash } = require('../databases/redis/keys/review.keys');

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });
const router = express.Router();

router.get('/dev', async (req, res) => {
  try {
    // return res.json(
    //   await redisClient.get(business_reviewers_hash, '63930e95aece20c26be873a4')
    // );
    // await redisClient.hDel(business_reviewers_hash, '63930e95aece20c26be873a4');
    const allReviews = await BusinessReview.find();
    // console.log(allReviews);

    allReviews.map(async r => {
      console.log(r.reviewedBy, r.business);
      await cacheBusinessReviewerId(r.business.toString(), r.reviewedBy.toString());
    });
    // console.log({ 'allReviews[0].business': allReviews[0].business });
    res.json(await getBusinessReviewerIds('63930e95aece20c26be873a4'));
  } catch (err) {
    console.log(err);
    res.json(err);
  }
});

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
