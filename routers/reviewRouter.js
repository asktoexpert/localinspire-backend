const express = require('express');
const multer = require('multer');

const businessController = require('../controllers/business/businessController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/review/reviewController');
const BusinessReview = require('../models/business/BusinessReview');
const Business = require('../models/business/Business');
const {
  getBusinessReviewers,
  addBusinessReviewer,
} = require('../databases/redis/queries/review.queries');
const { redisClient } = require('../databases/redis');
const { business_reviewers_hash } = require('../databases/redis/keys/review.keys');

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });
const router = express.Router();

// router.get('/dev', async (req, res) => {
//   let reviews = await BusinessReview.aggregate([
//     { $project: { 'images.photoUrl': 1, business: 1 } },
//   ]);

//   reviews = reviews.map(r => {
//     r.images = r.images.map(({ photoUrl }) => photoUrl);

//     return { ...r, business: r.business };
//   });

//   reviews.map(async r => {
//     const business = await Business.findById(r.business).select('businessName images');
//     if (!business.images) business.images = r.images.map(img => ({ imgUrl: img }));
//     else business.images.push(...r.images.map(img => ({ imgUrl: img })));

//     await business.save();
//     console.log('Business: ', business);
//   });

//   res.json(reviews);
// });
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
