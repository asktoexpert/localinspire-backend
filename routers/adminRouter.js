const express = require('express');
const adminController = require('../controllers/admin/adminController');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/filters')
  .post(
    authController.protect,
    authController.restrictToRoles('MAIN_ADMIN'),
    adminController.addNewFilter
  )
  .get(
    authController.protect,
    authController.restrictToRoles('MAIN_ADMIN'),
    adminController.getFilters
  );

module.exports = router;
