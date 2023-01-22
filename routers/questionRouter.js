const mongoose = require('mongoose');
const express = require('express');
const questionRouter = require('../controllers/question/questionController');

const router = express.Router();

router.route('/:id').get(questionRouter.getQuestionDetails);

module.exports = router;
