const fs = require('fs');
const mongoose = require('mongoose');
const sharp = require('sharp');

const { userPublicFieldsString } = require('../utils/populate-utils');
const userController = require('./userController');
const cloudinaryService = require('../services/cloudinaryService');
const { v4: uuidv4 } = require('uuid');

const Business = require('../models/Business');
const BusinessReview = require('../models/BusinessReview');
const BusinessQuestion = require('../models/BusinessQuestion');
const BusinessAnswer = require('../models/BusinessAnswer');
const User = require('../models/user/User');
const businessQueries = require('../databases/redis/queries/business.queries');
const arrayUtils = require('../utils/arrayUtils');
const reviewQueries = require('../databases/redis/queries/user.queries');

exports.resizeReviewPhotos = async (req, res, next) => {
  console.log('Req files: ', req.files);
  if (!req.files.length) return next();

  if (req.files.some(f => !f.mimetype.startsWith('image/')))
    return res.json({ error: 'Only images are allowed' });

  try {
    console.log({ 'req.files': req.files, 'req.body': req.body });

    req.body.photoUrls = [];

    await Promise.all(
      req.files.map(async (rawFile, i) => {
        const filename = `business-${req.params.businessId}-${Date.now()}-${i}.jpeg`;
        const filePath = `public/img/businesses/${filename}`;

        // 1) Resize request files
        const sharpResult = await sharp(rawFile.buffer)
          .resize(2000, 1333)
          .jpeg({ quality: 90 });
        console.log({ sharpResult });

        // 2) Upload server files to cloudinary server
        const uploadResult = await cloudinaryService.upload({ dir: 'businesses', filePath });
        console.log({ uploadResult });
        req.body.photoUrls.push(uploadResult.secure_url);
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

  console.log('Review text: ', req.body.review.split('\n'));

  const newReview = await BusinessReview.create({
    business: new mongoose.Types.ObjectId(req.params.businessId),
    ...req.body,
    review: req.body.review.split('\n'),
    reviewedBy: new mongoose.Types.ObjectId(req.user._id),
    businessRating: +req.body.businessRating,
    recommends: req.body.recommends !== 'yes',
    visitedWhen: { month: visitedMonth, year: +visitedYear },
    featureRatings: featureRatingsTransformed,
    images: imagesWithCorrespondingDescription,
  });

  await Promise.all([
    businessQueries.cacheBusinessReviewer(req.params.businessId, req.user._id),
    userController.addUserContribution(req.user._id, newReview._id, 'BusinessReview'),
  ]);

  // Update avg business rating and business images
  const reviews = await BusinessReview.find({ business: req.params.businessId });
  const reviewsCount = reviews.length;
  const avgRating = reviews.reduce((acc, rev) => acc + rev.businessRating, 0) / reviewsCount;
  const images = imagesWithCorrespondingDescription.map(img => ({ imgUrl: img.photoUrl }));

  await Business.findByIdAndUpdate(
    req.params.businessId,
    { $set: { avgRating }, $push: { images } },
    { new: true }
  );
  res.status(201).json({
    review: await BusinessReview.findById(newReview._id),
  });
};

exports.addPhotosOfBusiness = async (req, res) => {
  try {
    console.log(req.body.descriptions);

    const [review, business] = await Promise.all([
      BusinessReview.findOne({
        business: req.params.businessId,
      }),
      Business.findById(req.params.businessId),
    ]);

    if (!review) {
      return res.status(404).json({ msg: 'You have not reviewed this business' });
    }

    const descriptions = JSON.parse(req.body.descriptions);
    const imagesWithDescription = req.body.photoUrls.map((url, i) => ({
      photoUrl: url,
      imgUrl: url,
      description: descriptions[i],
    }));

    if (Array.isArray(imagesWithDescription)) {
      review.images.unshift(...imagesWithDescription);
      business.images.push(...imagesWithDescription);
    }
    await review.save();

    res.json({ review });
  } catch (err) {
    console.log(err);
    res.json(err);
  }
};

exports.getBusinessReviews = async (req, res) => {
  console.log('getBusinessReviews url', req.url);
  console.log('getBusinessReviews query', req.query);

  const { page = 1, limit = 100 } = req.query;
  const skip = limit * (page - 1);
  const filter = { business: mongoose.Types.ObjectId(req.params.id) }; // Default filter

  let sort = (req.query.sort?.split(',').join(' ') || '').concat(
    req.query.sort?.includes('-createdAt') ? '' : '-createdAt'
  );
  console.log('Reviews sort: ', sort);

  if (req.query.rating)
    filter.businessRating = { $in: req.query.rating.split(',').map(n => +n) };

  if (req.query.recommends) filter.recommends = req.query.recommends === '1';
  console.log(filter);

  // return res.json({ filter, sort });

  const queries = [
    BusinessReview.find(filter).count(),
    BusinessReview.find(filter)
      .sort(sort)
      .populate([
        { path: 'reviewedBy', select: userPublicFieldsString },
        { path: 'likes', populate: { path: 'user', select: userPublicFieldsString } },
      ]),
  ];

  try {
    let [allCount, reviews] = await Promise.all(queries);

    if (sort.includes('-likes')) {
      reviews.sort((prev, next) => next.likes.length - prev.likes.length);
      reviews = await arrayUtils.paginate({ array: reviews, page, limit });

      return res.json({ results: reviews.length, data: reviews, filter, sort });
    }

    res.status(200).json({
      results: reviews.length,
      total: allCount,
      data: reviews,
      filter,
      sort,
    });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.toggleReviewHelpful = async (req, res) => {
  try {
    // Find the review
    const review = await BusinessReview.findById(req.params.review_id).populate({
      path: 'likes',
      populate: { path: 'user', select: userPublicFieldsString },
    });

    // If user has liked the review before..
    const indexOfUser = review.likes.findIndex(
      ({ user: liker }) => liker._id.toString() === req.user._id.toString()
    );
    const userLikedBefore = indexOfUser !== -1;

    // Remove user from the list of likers
    if (userLikedBefore)
      review.likes.push({ user: req.user._id }); // Add him to the list of likers
    else review.likes.splice(indexOfUser, 1);

    await Promise.all([
      reviewQueries.updateUserTotalHelpfulVotes(req.user._id, userLikedBefore ? '-' : '+'),
    ]);

    const updatedReview = await BusinessReview.findById(req.params.reviewId).populate({
      path: 'likes',
      populate: { path: 'user', select: userPublicFieldsString },
    });

    res.status(200).json({ likes: updatedReview.likes });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.getReview = async (req, res, next) => {
  try {
    const review = await BusinessReview.findById(req.params.id).populate([
      { path: 'reviewedBy', userPublicFieldsString },
      { path: 'likes', populate: { path: 'user', select: userPublicFieldsString } },
    ]);
    if (!review) return res.status(404).json({ review });

    res.json({ review });
  } catch (err) {
    console.log(err);
    res.json({ msg: err.message });
  }
};

exports.getReviewLikes = async (req, res) => {
  try {
    const review = await BusinessReview.findById(req.params.id)
      .select('reviewedBy likes')
      .populate([{ path: 'reviewedBy', select: 'firstName lastName' }]);

    if (!review) return res.status(404).json({ msg: 'NOT_FOUND' });

    // review.likes = review.toObject();
    res.json({
      ...{
        ...review,
        likes: review.likes.map(({ user }) => ({ ...user })),
      },
    });
  } catch (err) {
    console.log(err);
    res.json({ msg: err.message });
  }
};

exports.getUserReviewOnBusiness = async (req, res) => {
  try {
    const userReview = await BusinessReview.findOne({
      business: req.params.businessId,
      reviewedBy: req.user._id,
    });
    res.status(200).json({ status: 'SUCCESS', review: userReview });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.getAllReviewsMadeByUser = async (req, res) => {
  console.log({ 'Req url': req.url, 'Req query': req.query });
  try {
    const { page = 1, limit } = req.query;
    const skip = limit * (page - 1);

    const populateConfig = [
      { path: 'business', select: 'businessName stateCode city ' },
      { path: 'reviewedBy', select: userPublicFieldsString.replace('contributions', '') },
    ];

    const [reviews, reviewsCount] = await Promise.all([
      BusinessReview.find({ reviewedBy: req.params.userId })
        .sort('-createdAt')
        .populate(req.query.populate === 'false' ? [] : populateConfig),

      BusinessReview.find({ reviewedBy: req.params.userId }).count(),
    ]);

    res.status(200).json({
      results: reviews.length,
      total: reviewsCount,
      data: reviews,
    });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

exports.getWhatPeopleSayAboutBusinesses = async (req, res) => {
  try {
    const businessIds = req.body?.businesses || [];
    console.log({ businessIds });

    const whatPeopleSay = await BusinessReview.aggregate([
      { $match: { business: { $in: businessIds.map(id => mongoose.Types.ObjectId(id)) } } },
      { $project: { review: 1, business: 1, likes: 1 } },
    ]);

    res.json(whatPeopleSay);
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};
