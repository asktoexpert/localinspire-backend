const mongoose = require('mongoose');
const express = require('express');
const questionController = require('../controllers/question/questionController');
const authController = require('../controllers/authController');
const Report = require('../models/Report');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.post('/', authController.protect, reportController.report);

module.exports = router;
