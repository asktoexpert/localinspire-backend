const fs = require('fs');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const Business = require('../../models/business/Business');
const BusinessReview = require('../../models/business/BusinessReview');
const BusinessQuestion = require('../../models/business/BusinessQuestion');
const BusinessAnswer = require('../../models/business/BusinessAnswer');

const stringUtils = require('../../utils/string-utils');
const businessQueries = require('../../databases/redis/queries/business.queries');
const arrayUtils = require('../../utils/arrayUtils');
const cloudinaryService = require('../../services/cloudinaryService');
const User = require('../../models/user/User');
const { userPublicFieldsString } = require('../../utils/populate-utils');
const userController = require('../user/userController');

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
    // .select({ avgRating: 1 });

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

exports.toggleBusinessReviewHelpful = async (req, res) => {
  try {
    // Find the review
    const review = await BusinessReview.findById(req.params.reviewId).populate({
      path: 'likes',
      populate: { path: 'user', select: userPublicFieldsString },
    });

    // If user has liked the review before..
    const indexOfUser = review.likes.findIndex(
      ({ user: liker }) => liker._id.toString() === req.user._id.toString()
    );
    const userLikedBefore = indexOfUser !== -1;

    // Remove user from the list of likers
    if (userLikedBefore) review.likes.splice(indexOfUser, 1);
    else review.likes.push({ user: req.user._id }); // Add him to the list of likers

    await review.save();

    const updatedReview = await BusinessReview.findById(req.params.reviewId).populate({
      path: 'likes',
      populate: { path: 'user', select: userPublicFieldsString },
    });

    res.status(200).json({ status: 'SUCCESS', likes: updatedReview.likes });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

// To be done later
// exports.respondToReviewAsBusinessOwner = async (req, res) => {

// }

exports.getTipsAboutBusiness = async (req, res, next) => {
  console.log('Req url in getTipsAboutBusiness', req.url);
  const { page = 1, limit } = req.query;
  const skip = limit * (page - 1);

  try {
    const responses = await Promise.all([
      BusinessReview.find({ business: req.params.id }).count(),
      BusinessReview.find({ business: req.params.id })
        .skip(skip)
        .limit(limit)
        .select('adviceToFutureVisitors reviewedBy createdAt')
        .populate('reviewedBy', userPublicFieldsString),
    ]);

    res.status(200).json({ status: 'SUCCESS', total: responses[0], data: responses[1] });
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
