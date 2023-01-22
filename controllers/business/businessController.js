const fs = require('fs');
const mongoose = require('mongoose');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const Business = require('../../models/business/Business');
const BusinessReview = require('../../models/business/BusinessReview');
const BusinessQuestion = require('../../models/business/BusinessQuestion');
const BusinessAnswer = require('../../models/business/Answer');

const stringUtils = require('../../utils/string-utils');
const businessQueries = require('../../databases/redis/queries/business.queries');
const arrayUtils = require('../../utils/arrayUtils');
const cloudinaryService = require('../../services/cloudinaryService');
const User = require('../../models/User');

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

exports.resizeBusinessPhotos = async (req, res, next) => {
  if (!req.files.length) return next();

  if (req.files.some(f => !f.mimetype.startsWith('image/')))
    return res.json({ error: 'Only images are allowed' });

  try {
    console.log({ 'req.files': req.files, 'req.body': req.body });

    req.body.photoUrls = [];

    await Promise.all(
      req.files.map(async (rawFile, i) => {
        const filename = `business-${req.params.id}-${Date.now()}-${i}.jpeg`;
        const filePath = `public/img/businesses/${filename}`;

        // 1) Resize request files
        const sharpResult = await sharp(rawFile.buffer)
          .resize(2000, 1333)
          .jpeg({ quality: 90 })
          .toFormat('jpeg')
          .toFile(filePath);
        console.log({ sharpResult });

        // 2) Upload server files to cloudinary server
        const uploadResult = await cloudinaryService.upload({ dir: 'businesses', filePath });
        console.log({ uploadResult });
        req.body.photoUrls.push(uploadResult.secure_url);

        // 3) Delete file from local server
        fs.unlink(filePath, err => {
          if (err) return console.log('Could not delete file from server: ', err);
          console.log('Business image deleted from server ');
        });
      })
    );

    next();
  } catch (err) {
    console.log('Error log: ', err);
    res.json({ error: err.message });
  }
};

exports.reviewBusiness = async (req, res) => {
  console.log('Req body: ', req.body);
  // res.json({ status: 'Checking...' });
  const featureRatings = JSON.parse(req.body.featureRatings);
  const photoDescriptions = JSON.parse(req.body.photoDescriptions);

  if (photoDescriptions?.length < req.body.photoUrls?.length)
    return res.json({ status: 'FAIL', msg: 'Please describe all uploaded photos' });

  const [visitedMonth, visitedYear] = req.body.visitedWhen.split(' ');
  const featureRatingsTransformed = Object.entries(featureRatings).map(([f, r]) => ({
    feature: f,
    rating: r,
  }));
  const imagesWithCorrespondingDescription = req.body.photoUrls.map((url, i) => {
    return { photoUrl: url, description: photoDescriptions[i] };
  });

  // const obj = {
  //   business: new mongoose.Types.ObjectId(req.params.id),
  //   ...req.body,
  //   businessRating: +req.body.businessRating,
  //   // reviewedBy: new mongoose.Types.ObjectId(req.user._id),
  //   visitedWhen: { month: visitedMonth, year: +visitedYear },
  //   featureRatings: featureRatingsTransformed,
  //   images: imagesWithCorrespondingDescription,
  // };
  // res.json(obj);

  const newReview = await BusinessReview.create({
    business: new mongoose.Types.ObjectId(req.params.id),
    ...req.body,
    reviewedBy: new mongoose.Types.ObjectId(req.user._id),
    businessRating: +req.body.businessRating,
    recommends: req.body.recommends === 'yes',
    visitedWhen: { month: visitedMonth, year: +visitedYear },
    featureRatings: featureRatingsTransformed,
    images: imagesWithCorrespondingDescription,
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
      .populate([
        { path: 'reviewedBy', select: 'firstName lastName imgUrl role' },
        {
          path: 'likes',
          populate: { path: 'user', select: 'firstName lastName imgUrl role' },
        },
      ]);

    res.status(200).json({ status: 'SUCCESS', results: reviews.length, data: reviews });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
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
    const review = await BusinessReview.findById(reviewId).populate({
      path: 'likes',
      populate: { path: 'user', select: 'firstName lastName imgUrl role' },
    });
    // console.log({ 'Review to like': review });
    // res.json(review.likes);

    // If user has liked the review before..
    const indexOfUser = review.likes.findIndex(
      ({ user: liker }) => liker._id.toString() === req.user._id.toString()
    );
    const userLikedBefore = indexOfUser !== -1;

    // res.json({ userLikedBefore });

    if (userLikedBefore) {
      review.likes.splice(indexOfUser, 1); // Remove user from the list of likers
    } else {
      // Add him to the list of likers
      review.likes.push({
        user: await User.findById(req.user._id).select('firstName lastName imgUrl'),
      });
    }

    await review.save();
    res.status(200).json({ status: 'SUCCESS', likes: review.likes });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

// To be done later
// exports.respondToReviewAsBusinessOwner = async (req, res) => {

// }

exports.getQuestionsAskedAboutBusiness = async (req, res) => {
  const { page = 1, limit } = req.query;
  const skip = limit * (page - 1);

  try {
    console.log(req.query);
    const sort = req.query.sort?.split(',').join(' ').trim();
    console.log({ sort, 'req.query.sort': req.query.sort });

    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ status: 'NOT_FOUND' });

    const [questionsCount, questions] = await Promise.all([
      BusinessQuestion.find({ business: req.params.id }).count(),
      BusinessQuestion.find({ business: req.params.id })
        .sort(sort)
        .select('-business')
        .skip(skip)
        .limit(limit)
        .populate([
          { path: 'askedBy', select: 'firstName lastName imgUrl role' },
          {
            path: 'answers',
            populate: { path: 'answeredBy', select: 'firstName lastName imgUrl role' },
          },
        ]),
    ]);

    if (sort?.includes('-answersCount')) {
      questions.sort((prev, next) => next.answers.length - prev.answers.length);
    }

    res.status(200).json({
      status: 'SUCCESS',
      total: questionsCount,
      data: questions,
    });
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
