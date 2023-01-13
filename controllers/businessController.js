const Business = require('../models/business/Business');
const BusinessReview = require('../models/business/BusinessReview');
const BusinessQuestion = require('../models/business/BusinessQuestion');
const BusinessAnswer = require('../models/business/Answer');

const stringUtils = require('../utils/string-utils');
const businessQueries = require('../databases/redis/queries/business.queries');
const arrayUtils = require('../utils/arrayUtils');
const mongoose = require('mongoose');

exports.searchBusinessCategories = async function (req, res, next) {
  const { textQuery } = req.searchCategParams;
  console.log('Query in main controller: ', textQuery);

  const caseSensitiveQuery = stringUtils.toTitleCase(textQuery);
  console.log({ caseSensitiveQuery });

  try {
    const [result] = await Business.aggregate([
      { $match: { SIC8: { $regex: `^${caseSensitiveQuery}` } } },
      { $project: { SIC8: 1 } },
      { $group: { categories: { $addToSet: '$SIC8' }, _id: null } },
      { $project: { _id: 0 } },
    ]);

    console.log('Result: ', result);
    if (!result?.categories) throw new Error('');

    const { categories } = result;
    if (categories.length) await businessQueries.cacheBusinessCategories(categories);

    return res.status(200).json({
      status: 'SUCCESS',
      source: 'db',
      results: categories.length,
      categories,
    });
  } catch (err) {
    console.log('Error log: ', err);
    return res.status(200).json({
      status: 'ERROR',
      source: 'db',
    });
  }
};

// Search businesses
exports.findBusinesses = async function (req, res, next) {
  const { category, cityName, stateCode, page, limit } = req.businessSearchParams;

  if (!category || !cityName || !stateCode)
    return res.status(200).json({ status: 'SUCCESS', results: 0, businesses: [] });

  try {
    // Find businesses whose SIC8 is like the query, city matches and state matches
    const businesses = await Business.find({
      SIC8: { $regex: `${category}`, $options: 'i' },
      city: { $regex: `^${cityName}`, $options: 'i' },
      stateCode: stateCode.toUpperCase(),
    });

    const pagedBusinesses = await arrayUtils.paginate({ array: businesses, page, limit });

    // Cache search results
    businesses.length &&
      (await businessQueries.cacheBusinessSearchResults({
        keyword: category,
        cityName,
        stateCode,
        businesses,
      }));

    res.status(200).json({
      status: 'SUCCESS',
      source: 'db',
      results: pagedBusinesses.length,
      allResults: businesses.length,
      businesses: pagedBusinesses,
    });
  } catch (err) {
    console.log('Error log: ', err);
    res.json({ error: err.message });
  }
};

exports.getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    const found = !!business;

    res.status(found ? 200 : 404).json({
      status: found ? 'SUCCESS' : 'FAIL',
      data: business || null,
    });
  } catch (err) {
    console.log('Error log: ', err);
    res.json({ error: err.message });
  }
};

exports.reviewBusiness = async (req, res) => {
  const { user } = req;

  const [visitedMonth, visitedYear] = req.body.visitedWhen.split(' ');
  const featuresRatingTransformed = Object.entries(req.body.featuresRating).map(([f, r]) => ({
    feature: f,
    rating: r,
  }));

  const newReview = await BusinessReview.create({
    business: new mongoose.Types.ObjectId(req.params.id),
    reviewedBy: new mongoose.Types.ObjectId(user._id),
    ...req.body,
    visitedWhen: { month: visitedMonth, year: +visitedYear },
    featuresRating: featuresRatingTransformed,
  });

  res.status(201).json({ status: 'SUCCESS', review: newReview });
};

exports.getBusinessReviews = async (req, res) => {
  // console.log(req.query);
  const filter = { business: mongoose.Types.ObjectId(req.params.id) };
  const sort = req.query.sort?.split(',').join(' ');

  if (req.query.rating)
    filter.businessRating = { $in: req.query.rating.split(',').map(n => +n) };

  if (req.query.recommends) filter.recommends = req.query.recommends === '1';
  console.log(filter);

  try {
    const reviews = await BusinessReview.find(filter)
      .sort(sort)
      .populate([{ path: 'reviewedBy', select: 'firstName lastName imgUrl role' }]);

    res.status(200).json({ status: 'SUCCESS', results: reviews.length, data: reviews });
  } catch (err) {
    console.log(err);
  }
};

exports.getUserReviewOnBusiness = async (req, res) => {
  try {
    const userReview = await BusinessReview.findOne({
      business: req.params.id,
      reviewedBy: req.query.uid,
    });
    res.status(200).json({ status: 'SUCCESS', userReview });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.toggleBusinessReviewHelpful = async (req, res) => {
  const { reviewId } = req.params;
  try {
    // Find the review
    const review = await BusinessReview.findById(reviewId);
    console.log({ 'Review to like': review });

    // If user has liked the review before..
    if (review.likedBy?.includes(req.user._id)) {
      // Remove user from the list of likers
      review.likedBy = review.likedBy.filter(id => id.toString() !== req.user._id.toString());
      review.save();
      return res.status(200).json({
        status: 'SUCCESS',
        likes: { total: review.likedBy.length, users: review.likedBy },
      });
    }

    // Add him to the list of likers
    review.likedBy.push(req.user._id);
    review.save();
    res.status(200).json({
      status: 'SUCCESS',
      likes: { total: review.likedBy.length, users: review.likedBy },
    });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

// To be done later
// exports.respondToReviewAsBusinessOwner = async (req, res) => {

// }

exports.getQuestionsAskedAboutBusiness = async (req, res) => {
  try {
    const questions = await BusinessQuestion.find({ business: req.params.id })
      .select('-business')
      .populate([
        { path: 'askedBy', select: 'firstName lastName imgUrl role' },
        {
          path: 'answers',
          populate: { path: 'answeredBy', select: 'firstName lastName imgUrl role' },
        },
      ]);

    res.status(200).json({ status: 'SUCCESS', results: questions.length, data: questions });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.askQuestionAboutBusiness = async (req, res) => {
  const { id: businessId } = req.params;

  try {
    if (!(await Business.findById(businessId)))
      return res.status(404).json({ status: 'FAIL', msg: 'Business not found' });

    // In the future, check if the loggedin user owns this business. If so, dont allow him to ask question.

    const newQuestion = await BusinessQuestion.create({
      questionText: req.body.question,
      askedBy: req.user._id,
      business: businessId,
    });

    res.status(201).json({
      status: 'SUCCESS',
      question: await newQuestion.populate('askedBy', 'firstName lastName imgUrl role'),
    });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.addAnswerToQuestionAboutBusiness = async (req, res) => {
  console.log(req.body);
  try {
    const newAnswer = await BusinessAnswer.create({
      answerText: req.body.answer,
      answeredBy: req.user._id,
    });
    console.log({ newAnswer });

    const update = { $push: { answers: newAnswer._id } };
    const options = { runValidators: true, new: true };

    const question = await BusinessQuestion.findByIdAndUpdate(
      req.params.questionId,
      update,
      options
    ).populate([
      { path: 'askedBy', select: 'firstName lastName imgUrl role' },
      {
        path: 'answers',
        populate: { path: 'answeredBy', select: 'firstName lastName imgUrl role' },
      },
    ]);
    res.status(200).json({ status: 'SUCCESS', question });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.toggleLikeAnswerToBusinessQuestion = async (req, res) => {
  try {
    const question = await BusinessQuestion.findById(req.params.questionId).populate([
      { path: 'askedBy', select: 'firstName lastName imgUrl role' },
      'answers',
    ]);
    const answer = question.answers.find(a => a._id.toString() === req.params.answerId);

    // If user has liked before
    if (answer.likes.includes(req.user._id)) {
      answer.likes = answer.likes.filter(id => id.toString() !== req.user._id.toString());
    } else {
      answer.likes.push(req.user._id); // Add him to the array of likers
      answer.dislikes = answer.dislikes.filter(
        id => id.toString() !== req.user._id.toString()
      );
    }

    await answer.save();
    const { likes, dislikes } = answer;

    res.json({ status: 'SUCCESS', likes, dislikes });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.toggleDislikeAnswerToBusinessQuestion = async (req, res) => {
  console.log('In toggleDislike');
  try {
    const question = await BusinessQuestion.findById(req.params.questionId).populate([
      { path: 'askedBy', select: 'firstName lastName imgUrl role' },
      'answers',
    ]);
    const answer = question.answers.find(a => a._id.toString() === req.params.answerId);

    // If user disliked before
    if (answer.dislikes.includes(req.user._id)) {
      answer.dislikes = answer.dislikes.filter(
        id => id.toString() !== req.user._id.toString()
      );
    } else {
      answer.dislikes.push(req.user._id); // Add him to the dislikers list
      answer.likes = answer.likes.filter(id => id.toString() !== req.user._id.toString());
    }

    await answer.save();
    const { likes, dislikes } = answer;

    res.json({ status: 'SUCCESS', likes, dislikes });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.getTipsAboutBusiness = async (req, res, next) => {
  try {
    const tips = await BusinessReview.find({ business: req.params.id })
      .select('adviceToFutureVisitors reviewedBy createdAt')
      .populate('reviewedBy', 'firstName lastName imgUrl role');

    res.status(200).json({ status: 'SUCCESS', results: tips.length, data: tips });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

// ======================== FOR DEV ONLY ========================
exports.editReviewDev = async (req, res) => {
  const reviews = await BusinessQuestion
    .updateOne
    // _id: {
    //   $in: [
    //     '63b33ec7a8606bd48e477346',
    //     '63b7114abba2c925aa49936e',
    //     '63b712abbba2c925aa499393',
    //   ],
    // },
    // {$rename:{"recommended":"recommends"}}
    ();
  res.json(reviews);
};
// await Business.updateMany(
//   {},
//   [
//     {
//       $addFields: {
//         coordinates: {
//           type: 'Point',
//           coordinates: {
//             $map: {
//               input: {
//                 $reverseArray: {
//                   $split: ['$coordinates', ','],
//                 },
//               },
//               as: 'c',
//               in: {
//                 $convert: {
//                   input: '$$c',
//                   to: 'double',
//                   onError: '',
//                   onNull: '',
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//   ],
//   {
//     multi: true,
//   }
// );
// res.send('Done');
