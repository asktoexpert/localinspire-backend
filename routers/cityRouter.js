const express = require('express');
const cityController = require('../controllers/cityController');
const cityCacheController = require('../controllers/cityCacheController');
const City = require('../models/City');
const router = express.Router();

router
  .route('/search')
  .get(cityCacheController.searchCachedCities, cityController.searchCities);

router.route('/').get(cityController.getAllCities);

router.get('/modify/', async (req, res) => {
  const cities = await City.find({});
  res.json(cities);
});

module.exports = router;
