const express = require('express');
const cityController = require('../controllers/cityController');
const cityCacheController = require('../controllers/cityCacheController');
const authController = require('../controllers/authController');
const City = require('../models/City');

const router = express.Router();

router.route('/search').get(
  // cityCacheController.searchCachedCities,
  cityController.searchCities
);

router.route('/').get(cityController.getAllCities);
router.route('/all-states').get(cityController.getStateNames);

router
  .route('/:cityId/toggle-featured')
  .patch(
    authController.protect,
    authController.restrictToRoles('MAIN_ADMIN'),
    cityController.toggleCityFeatured
  );

router.get('/modify/', async (req, res) => {
  const cities = await City.find({});
  res.json(cities);
});

module.exports = router;
