const express = require('express');

const businessController = require('../controllers/business/businessController');
const authController = require('../controllers/authController');
const businessCacheController = require('../controllers/business/businessCacheController');

const multer = require('multer');

// const multerStorage = multer.diskStorage({
//   destination(req, file, cb) {
//     console.log('In destination, file = ', file);
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const fileExt = file.mimetype.split('/')[1];
//     cb(null, `business-1a2b3c-${Date.now()}.${fileExt}`);
//   },
// });
// const multerFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith('image')) cb(null, true);
//   else cb(new Error('Only images are allowed'), false);
// };
// const upload = multer({ dest: 'public/img/users' });
// const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });
// const upload = multer({ dest: 'public/img/businesses' });

const router = express.Router();

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

// Get business by id
router.route('/:id').get(businessController.getBusinessById);

// TEST: Get business question by business id
router.route('/:id/questions/:qid').get(async (req, res) => {
  res.json(await BusinessQuestion.findById(req.params.qid));
});

// Review business - POST
// Get business reviews - GET
router
  .route('/:id/reviews')
  .post(
    authController.protect,
    upload.array('photos', 7),
    businessController.resizeBusinessPhotos,
    businessController.reviewBusiness
  )
  .get(businessController.getBusinessReviews);

router.get('/:id/user-review', businessController.getUserReviewOnBusiness);

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
router.route('/:id/questions').get(businessController.getQuestionsAskedAboutBusiness);

// Get tips from past visitors about a business
router.route('/:id/tips').get(businessController.getTipsAboutBusiness);

// FOR DEV ONLY
router.route('/reviews/dev-edit').patch(businessController.editReviewDev);

// ################# DEV ######################
const cloudinaryService = require('../services/cloudinaryService');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const BusinessQuestion = require('../models/business/BusinessQuestion');

router.post('/upload', upload.array('photos', 12), async (req, res) => {
  try {
    const businessPhotos = [];

    req.files.forEach((file, i) => {
      const fileName = `public/img/businesses/business-${uuidv4()}.jpeg`;

      sharp(file.buffer)
        .resize(500, 500)
        .jpeg({ quality: 90 })
        .toFile(fileName, (err, info) => {
          console.log('In toFile: ', { err, errMsg: err?.message, info });
        });

      businessPhotos.push(fileName);
    });

    console.log({ businessPhotos });

    const reqs = businessPhotos.map(async img => {
      console.log({ img });
      return cloudinaryService.upload({ dir: 'businesses', filePath: img });
    });

    const results = await Promise.all(reqs);

    console.log({ results });
    res.json({ results });

    // console.log({ 'req.files': req.files, 'req.body': req.body });
    // res.json({ 'req.body': req.body });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
});

module.exports = router;
