const express = require('express');
const cityController = require('../controllers/city/cityController');
const cityCacheController = require('../controllers/city/cityCacheController');
const router = express.Router();

router
  .route('/search')
  .get(cityCacheController.searchCachedCities, cityController.searchCities);

module.exports = router;
