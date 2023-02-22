const express = require('express');

const businessController = require('../controllers/business/businessController');
const authController = require('../controllers/authController');
const businessCacheController = require('../controllers/business/businessCacheController');

const BusinessQuestion = require('../models/business/BusinessQuestion');
const BusinessReview = require('../models/business/BusinessReview');
const Business = require('../models/business/Business');

const multer = require('multer');

// const multerStorage = multer.diskStorage({
//   destination(req, file, cb) {
//     console.log('In destination, file = ', file);
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const fileExt = file.mimetype.split('/')[1];
//     cb(null, `business-1a2b3c-${Date.now()}.${fileExt}`);
//   },
// });
// const multerFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith('image')) cb(null, true);
//   else cb(new Error('Only images are allowed'), false);
// };
// const upload = multer({ dest: 'public/img/users' });
// const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });
// const upload = multer({ dest: 'public/img/businesses' });

const router = express.Router();

router
  .route('/find')
  .get(businessCacheController.findCachedBusinesses, businessController.findBusinesses);

// Business categories text search
router
  .route('/categories/search')
  .get(
    businessCacheController.searchCachedBusinessCategories,
    businessController.searchBusinessCategories
  );

// Get business by id
router.route('/:id').get(businessController.getBusinessById);

router
  .route('/reviews/:reviewId/like')
  .post(authController.protect, businessController.toggleBusinessReviewHelpful);

// Get tips from past visitors about a business
router.route('/:id/tips').get(businessController.getTipsAboutBusiness);

router.route('/:id/overall-rating').get(businessController.getOverallBusinessRatingStats);

// FOR DEV ONLY
router.route('/reviews/dev/:id').get(async (req, res) => {
  const reviews = await BusinessReview.find({ business: req.params.id });
  const reviewsCount = reviews.length;

  const sumRatings = reviews.reduce((acc, rev) => acc + rev.businessRating, 0);
  const avgRating = sumRatings / reviewsCount;

  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { $set: { avgRating } },
    { new: true }
  );

  res.json({ business });
  // const business = await Business.findByIdAndUpdate(req.params.id, { avgRating: })
});

// ################# DEV ######################

module.exports = router;
