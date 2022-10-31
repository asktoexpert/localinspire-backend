const express = require('express');
const cityController = require('../controllers/cityController');
const cityCacheController = require('../middleware/cache/cityCacheController');
const router = express.Router();

router
  .route('/search')
  .get(cityCacheController.searchCachedCities, cityController.searchCities);

module.exports = router;
