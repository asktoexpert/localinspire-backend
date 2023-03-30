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

exports.getCategories = async (req, res) => {
  let categoryType = req.params.type.toUpperCase(); // Could be sic2 | sic4

  if (!['SIC2', 'SIC4', 'SIC8'].includes(categoryType))
    return res.status(400).json({
      status: 'FAIL',
      msg: 'Please specify what type of category you want to fetch',
    });

  // - This uppercases the SIC keys of the req.query object - like { sic2: '...' } to { SIC2: '...' }
  // - It also removes non-SIC keys
  for (let k in req.query) {
    if (!k.toLowerCase().startsWith('sic')) {
      delete req.query[k];
      continue;
    }
    req.query[k.toUpperCase()] = { $regex: `^${req.query[k]}` };
    delete req.query[k];
  }

  const qFilter = req.query;
  let categories = [];
  console.log(qFilter, categoryType);

  try {
    const q = Business.find(req.query).select(categoryType).distinct(categoryType);
    (await q).forEach(categ => {
      if (categ && typeof categ === 'string' && categ != '0') categories.push(categ.trim());
    });
    categories.sort();
    res.status(200).json({ status: 'SUCCESS', categories });
  } catch (err) {
    console.log('Error log: ', err);
    res.json({ error: err.message });
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
      data: {
        ...business.toObject(),
        reviewers: await businessQueries.getCachedBusinessReviewers(req.params.id),
      },
    });
  } catch (err) {
    console.log('Error log: ', err);
    res.json({ error: err.message });
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
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .select('adviceToFutureVisitors reviewedBy reviewTitle createdAt')
        .populate('reviewedBy', userPublicFieldsString),
    ]);

    res.status(200).json({ status: 'SUCCESS', total: responses[0], data: responses[1] });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.getReviewersOfBusiness = async (req, res) => {
  try {
    const reviewerIds = await businessQueries.getCachedBusinessReviewers(req.params.id);
    res
      .status(200)
      .json({ status: 'SUCCESS', results: reviewerIds?.length, reviewers: reviewerIds });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.getOverallBusinessRatingStats = async (req, res) => {
  try {
    const [overallFeatureRatings, recommendsStats] = await Promise.all([
      BusinessReview.aggregate([
        { $match: { business: mongoose.Types.ObjectId(req.params.id) } },
        { $project: { featureRatings: 1 } },
        { $unwind: '$featureRatings' },
        {
          $group: {
            _id: '$featureRatings.feature',
            avgRating: { $avg: '$featureRatings.rating' },
          },
        },
      ]),

      BusinessReview.aggregate([
        { $match: { business: mongoose.Types.ObjectId(req.params.id) } },
        { $project: { recommends: 1 } },
        { $group: { _id: '$recommends', count: { $sum: 1 } } },
      ]),
    ]);

    const recommendationStats = {
      yes: recommendsStats?.[0]?.count,
      no: recommendsStats?.[1]?.count,
    };

    res.status(200).json({ status: 'SUCCESS', overallFeatureRatings, recommendationStats });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};
