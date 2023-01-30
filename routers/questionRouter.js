const mongoose = require('mongoose');
const express = require('express');
const questionRouter = require('../controllers/question/questionController');
const authController = require('../controllers/authController');

const router = express.Router();

// Ask question about business
router
  .route('/about/:businessId')
  .post(authController.protect, questionRouter.askQuestionAboutBusiness);

router.route('/:id').get(questionRouter.getQuestionDetails);

router
  .route('/:id/answers')
  .get(questionRouter.getAnswersToQuestion)
  .post(authController.protect, questionRouter.addAnswerToQuestionAboutBusiness); // Answer question about business

module.exports = router;
