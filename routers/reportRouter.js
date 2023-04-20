const express = require('express');
const authController = require('../controllers/authController');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.post('/', authController.protect, reportController.report);

module.exports = router;
