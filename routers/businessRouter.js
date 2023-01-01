const express = require('express');
const router = express.Router();

const businessController = require('../controllers/businessController');
const authController = require('../middleware/authController');
const businessCacheController = require('../middleware/cache/businessCacheController');

router
  .route('/find')
  .get(businessCacheController.findCachedBusinesses, businessController.findBusinesses);

router
  .route('/categories/search')
  .get(
    businessCacheController.searchCachedBusinessCategories,
    businessController.searchBusinessCategories
  );

router
  .route('/:id/reviews')
  .post(authController.protect, businessController.reviewBusiness)
  .get(authController.protect, businessController.getBusinessReviews);

module.exports = router;
