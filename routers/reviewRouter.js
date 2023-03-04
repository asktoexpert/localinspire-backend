const express = require('express');
const multer = require('multer');

const authController = require('../controllers/authController');
const reviewController = require('../controllers/review/reviewController');
const BusinessReview = require('../models/business/BusinessReview');
const { redisClient } = require('../databases/redis');
const Business = require('../models/business/Business');

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });
const router = express.Router();

router.get('/dev', async (req, res) => {
  try {
    let reviews = await BusinessReview.find();
    reviews = reviews.map(r => ({ business: r.business, reviewedBy: r.reviewedBy }));

    // reviews.map(async r => {
    //   console.log(r);
    //   await addBusinessReviewer(r.business.toString(), r.reviewedBy.toString());
    // });
    res.json(
      await redisClient.sMembers(`business_reviewers:business=63930ebbaece20c26be8d2eb`)
    );
    // res.json(await getBusinessReviewerIds('63930e95aece20c26be873a4'));
  } catch (err) {
    res.json(err);
  }
});

router
  .route('/on/:businessId/new')
  .post(
    authController.protect,
    authController.restrictToNonBusinessReviewers,
    upload.array('photos', 7),
    reviewController.resizeReviewPhotos,
    reviewController.reviewBusiness
  );

router
  .route('/:reviewId/like')
  .patch(authController.protect, reviewController.toggleReviewHelpful);

router.route('/made-by/:userId').get(reviewController.getAllReviewsMadeByUser);

router.route('/:id').get(reviewController.getReview);

router
  .route('/businesses/what-people-say')
  .post(reviewController.getWhatPeopleSayAboutBusinesses);

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
