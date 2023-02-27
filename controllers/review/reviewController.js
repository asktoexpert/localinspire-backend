const fs = require('fs');
const mongoose = require('mongoose');
const sharp = require('sharp');

const { userPublicFieldsString } = require('../../utils/populate-utils');
const userController = require('../user/userController');
const cloudinaryService = require('../../services/cloudinaryService');
const { v4: uuidv4 } = require('uuid');

const Business = require('../../models/business/Business');
const BusinessReview = require('../../models/business/BusinessReview');
const BusinessQuestion = require('../../models/business/BusinessQuestion');
const BusinessAnswer = require('../../models/business/BusinessAnswer');
const User = require('../../models/user/User');
const businessQueries = require('../../databases/redis/queries/business.queries');
const arrayUtils = require('../../utils/arrayUtils');

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
    recommends: req.body.recommends === 'yes',
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
    status: 'SUCCESS',
    review: await BusinessReview.findById(newReview._id).populate(
      'business',
      'businessName city stateCode'
    ),
  });
};

exports.addPhotosOfBusiness = async (req, res) => {
  try {
    console.log(req.body.descriptions);

    const [review, business] = await Promise.all([
      BusinessReview.findOne({
        business: req.params.businessId,
        reviewedBy: req.user._id,
      }),
      Business.findById(req.params.businessId),
    ]);

    if (!review) {
      return res
        .status(404)
        .json({ status: 'NOT_FOUND', msg: 'You have not reviewed this business' });
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
    await business.save();

    res.json({ status: 'SUCCESS', review });
  } catch (err) {
    console.log(err);
    res.json(err);
  }
};

exports.getBusinessReviews = async (req, res) => {
  console.log('getBusinessReviews url', req.url);
  console.log('getBusinessReviews query', req.query);

  const { page = 1, limit = 5 } = req.query;
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
      .skip(skip)
      .limit(limit)
      .populate([
        { path: 'reviewedBy', select: userPublicFieldsString },
        { path: 'likes', populate: { path: 'user', select: userPublicFieldsString } },
        { path: 'contributions', populate: { path: 'contribution' }, strictPopulate: false },
      ]),
  ];

  try {
    let [allCount, reviews] = await Promise.all(queries);

    if (sort?.includes('-likes')) {
      reviews.sort((prev, next) => next.likes.length - prev.likes.length);
      reviews = await arrayUtils.paginate({ array: reviews, page, limit });

      return res.json({
        status: 'SUCCESS',
        results: reviews.length,
        total: allCount,
        data: reviews,
        filter,
        sort,
      });
    }

    res.status(200).json({
      status: 'SUCCESS',
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

exports.getReview = async (req, res, next) => {
  try {
    const review = await BusinessReview.findById(req.params.id).populate([
      { path: 'reviewedBy', userPublicFieldsString },
      { path: 'likes', populate: { path: 'user', select: userPublicFieldsString } },
    ]);
    if (!review) return res.status(404).json({ status: 'NOT_FOUND', review });

    res.json({ status: 'SUCCESS', review });
  } catch (err) {
    console.log(err);
    res.json({ status: 'ERROR', msg: err.message });
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
  try {
    const userReviews = await BusinessReview.find({ reviewedBy: req.user._id });
    // .populate({
    //   path: 'business',
    //   select: 'avgRating',
    // });
    res
      .status(200)
      .json({ status: 'SUCCESS', results: userReviews.length, reviews: userReviews });
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
      { $group: { _id: '$business', whatPeopleSay: { $addToSet: '$review' } } },
    ]);

    res.json(whatPeopleSay);
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};
