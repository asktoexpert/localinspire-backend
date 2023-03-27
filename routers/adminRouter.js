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

router
  .route('/filters/:id')
  .delete(
    authController.protect,
    authController.restrictToRoles('MAIN_ADMIN'),
    adminController.deleteFilter
  );

////// KEYWORDS ///////

router
  .route('/keywords')
  .post(
    authController.protect,
    authController.restrictToRoles('MAIN_ADMIN'),
    adminController.addKeyword
  )
  .get(adminController.getKeywords);

router
  .route('/keywords/:id')
  .patch(
    authController.protect,
    authController.restrictToRoles('MAIN_ADMIN'),
    adminController.editKeyword
  )
  .delete(
    authController.protect,
    authController.restrictToRoles('MAIN_ADMIN'),
    adminController.deleteKeyword
  );

module.exports = router;
