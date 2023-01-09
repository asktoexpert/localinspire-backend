const express = require('express');
const router = express.Router();

const businessController = require('../controllers/businessController');
const authController = require('../middleware/authController');
const businessCacheController = require('../middleware/cache/businessCacheController');

router
  .route('/find')
  .get(businessCacheController.findCachedBusinesses, businessController.findBusinesses);

// Business categories text search
router
  .route('/categories/search')
  .get(
    businessCacheController.searchCachedBusinessCategories,
    businessController.searchBusinessCategories
  );

// Get business reviews AND Review business
router
  .route('/:id/reviews')
  .post(authController.protect, businessController.reviewBusiness)
  .get(authController.protect, businessController.getBusinessReviews);

router
  .route('/reviews/:reviewId/like')
  .post(authController.protect, businessController.toggleBusinessReviewHelpful);

// Ask question about business
router
  .route('/:id/ask')
  .post(authController.protect, businessController.askQuestionAboutBusiness);

// Answer question about business
router
  .route('/questions/:questionId/answer')
  .post(authController.protect, businessController.addAnswerToQuestionAboutBusiness);

// Toggle like answer to business question
router
  .route('/questions/:questionId/answers/:answerId/like')
  .post(authController.protect, businessController.toggleLikeAnswerToBusinessQuestion);

// Toggle dislike answer to business question
router
  .route('/questions/:questionId/answers/:answerId/dislike')
  .post(authController.protect, businessController.toggleDislikeAnswerToBusinessQuestion);

// Get all questions asked about a business
router
  .route('/:id/questions')
  .get(authController.protect, businessController.getQuestionsAskedAboutBusiness);

// Get tips from past visitors about a business
router.route('/:id/tips').get(authController.protect, businessController.getTipsAboutBusiness);

// FOR DEV ONLY
router.route('/reviews/dev-edit').patch(businessController.editReviewDev);

module.exports = router;
