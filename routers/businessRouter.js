const express = require('express');

const businessController = require('../controllers/businessController');
const businessCacheController = require('../controllers/businessCacheController');

const multer = require('multer');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

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
const router = express.Router();

router
  .route('/find')
  .get(businessCacheController.findCachedBusinesses, businessController.findBusinesses);

router.route('/filter').get(businessController.filterBusinesses);

// Business categories text search
router
  .route('/categories/search')
  .get(
    businessCacheController.searchCachedBusinessCategories,
    businessController.searchBusinessCategories
  );
router.route('/categories/:type').get(businessController.getCategories);
router.route('/:id').get(businessController.getBusinessById); // Get business by id

router.route('/:id/tips').get(businessController.getTipsAboutBusiness); // Get tips from past visitors about a business
router.route('/:id/overall-rating').get(businessController.getOverallBusinessRatingStats);

router
  .route('/:id/claim')
  .post(authController.protect, businessController.claimBusiness)
  .get(authController.protect, businessController.getBusinessClaim);

module.exports = router;
