const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
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

module.exports = router;
