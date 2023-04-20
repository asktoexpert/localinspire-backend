const express = require('express');
const questionController = require('../controllers/questionController');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/about/:businessId')
  .post(authController.protect, questionController.askQuestionAboutBusiness) // Ask question about business
  .get(questionController.getQuestionsAskedAboutBusiness); // Get all questions asked about a business

router.route('/:id').get(questionController.getQuestionDetails);

router
  .route('/:id/answers')
  .get(questionController.getAnswersToQuestion) // Get answers to question
  .post(authController.protect, questionController.addAnswerToQuestionAboutBusiness); // Answer question about business

// router
//   .route('/:id/answers/most-helpful')
//   .get(questionController.getMostHelpfulAnswerToQuestion);

// Toggle like answer to business question
router
  .route('/:questionId/answers/:answerId/like')
  .post(authController.protect, questionController.toggleLikeAnswerToBusinessQuestion);

// Toggle dislike answer to business question
router
  .route('/:questionId/answers/:answerId/dislike')
  .post(authController.protect, questionController.toggleDislikeAnswerToBusinessQuestion);

module.exports = router;
