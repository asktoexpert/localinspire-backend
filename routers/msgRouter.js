const express = require('express');
const authController = require('../controllers/authController');
const msgController = require('../controllers/msgController');
const router = express.Router();

router.route('/to/:recipientId').post(authController.protect, msgController.sendMessage);
router.route('/unread').get(authController.protect, msgController.getNewMessages);

module.exports = router;
