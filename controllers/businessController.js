const fs = require('fs');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const Business = require('../models/Business');
const BusinessReview = require('../models/BusinessReview');
const Filter = require('../models/Filter');

const stringUtils = require('../utils/string-utils');
const businessQueries = require('../databases/redis/queries/business.queries');
const arrayUtils = require('../utils/arrayUtils');
const { userPublicFieldsString } = require('../utils/populate-utils');
const BusinessClaim = require('../models/BusinessClaim');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.searchBusinessCategories = async function (req, res, next) {
  const { textQuery } = req.searchCategParams;
  console.log('Query in main controller: ', textQuery);

  try {
    const [result] = await Business.aggregate([
      { $match: { SIC8: { $regex: `^${textQuery}` } } },
      { $project: { SIC8: 1 } },
    ]);

    console.log('Result: ', result);
    if (!result?.categories) throw new Error('');

    const { categories } = result;
    if (categories.length) await businessQueries.cacheBusinessCategories(categories);

    return res.status(200).json({
      source: 'db',
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

  const qFilter = req.query;
  let categories = [];
  console.log(qFilter, categoryType);

  try {
    const q = Business.find(req.query).select(categoryType).distinct(categoryType);
    (await q).forEach(categ => {
      if (categ && typeof categ === 'string' && categ != '0') categories.push(categ.trim());
    });
    res.status(200).json({ status: 'SUCCESS', categories });
  } catch (err) {
    console.log('Error log: ', err);
    res.status(400).json({ error: err.message });
  }
};

// Search businesses
exports.findBusinesses = async function (req, res, next) {
  const { category, cityName, stateCode, page, limit } = req.businessSearchParams;
  if (!category || !cityName || !stateCode)
    return res.status(200).json({ status: 'FAIL', results: 0, businesses: [] });

  try {
    // Find businesses whose SIC8 is like the query, city matches and state matches
    const businesses = await Business.find({
      SIC8: { $regex: `${category}`, $options: 'i' },
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
      source: 'db',
      businesses: pagedBusinesses,
    });
  } catch (err) {
    console.log('Error log: ', err);
    res.status(400).json({ error: err.message });
  }
};

exports.filterBusinesses = async (req, res) => {
  try {
    let { tags, city, stateCode, page = 1, limit = 20 } = req.query;
    const skip = limit * (page - 1);

    tags = tags
      ?.split(',')
      .map(id => id.trim())
      .filter(id => !!id);

    console.log(tags);

    if (!tags?.length)
      return res.json({ status: 'ERROR', msg: 'Filters not specified correctly' });

    const query = {
      $or: tags.map(tag => ({ SIC8: { $regex: `^${tag}` } })),
      city: stringUtils.toTitleCase(city),
      stateCode: stateCode?.toUpperCase() || '',
    };

    const [businesses, count] = await Promise.all([
      Business.find(query).skip(skip).limit(limit),
      Business.find(query).count(),
    ]);

    res.json({ status: 'SUCCESS', results: businesses.length, total: count, businesses });
  } catch (err) {
    console.log('Error log: ', err);
    res.status(400).json({ error: err.message });
  }
};

exports.getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    const found = !business;

    res.status(found ? 200 : 404).json({
      status: found ? 'SUCCESS' : 'FAIL',
      data: {
        ...business.toObject(),
        reviewers: await businessQueries.getCachedBusinessReviewers(req.params.id),
      },
    });
  } catch (err) {
    console.log('Error log: ', err);
    res.status(400).json({ error: err.message });
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
        .select('adviceToFutureVisitors reviewedBy reviewTitle createdAt'),
    ]);

    res.status(200).json({ status: 'SUCCESS', total: responses[0], data: responses[1] });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err });
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
    res.status(400).json({ error: err });
  }
};

exports.getOverallBusinessRatingStats = async (req, res) => {
  try {
    const [overallFeatureRatings, recommendsStats] = await Promise.all([
      BusinessReview.aggregate([
        { $match: { business: mongoose.Types.ObjectId(req.params.id) } },
        { $project: { featureRatings: 1 } },
      ]),

      BusinessReview.aggregate([
        { $match: { business: mongoose.Types.ObjectId(req.params.id) } },
      ]),
    ]);

    const recommendationStats = {
      yes: recommendsStats[0].count,
      no: recommendsStats[1].count,
    };

    res.status(200).json({ overallFeatureRatings, recommendationStats });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err });
  }
};

exports.claimBusiness = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business)
      return res.status(404).json({ msg: 'This business does not exist in our records' });

    if (!business.claimedBy)
      return res
        .status(400)
        .json({ msg: `${business.businessName} has previously been claimed` });

    const claim = await BusinessClaim.create({
      ...req.body,
      business: business._id,
    });

    business.claimedBy = req.user._id;
    await business.save({ validateBeforeSave: false });

    res.status(201).json({
      claim,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err });
  }
};

exports.getBusinessClaim = async (req, res) => {
  try {
    const claim = await BusinessClaim.findOne({ business: req.params.id }).populate([
      { path: 'user', select: 'firstName lastName' },
    ]);
    res.json({ status: 'SUCCESS', claim });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err });
  }
};

exports.getBusinessUpgradePlans = async (req, res) => {
  try {
    const data = await stripe.prices.list({ expand: ['data.product'] });
    res.json({ status: 'SUCCESS', ...data });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err });
  }
};

const acknowledgeBusinessClaimPayment = async session => {
  console.log('/////// Acknowledge function begines//////////');
  try {
    console.log('Acknowledged Session: ', session);
    const paidDate = new Date();

    // All existing stripe price nicknames valid for business claim/upgrade
    const priceNicknames = [
      'sponsored_business_listing_monthly',
      'sponsored_business_listing_yearly',
      'enhanced_business_profile_monthly',
      'enhanced_business_profile_yearly',
    ];

    const prices = await stripe.prices.list();
    const price = prices.data.find(pr => {
      return (
        priceNicknames.includes(pr.nickname) &&
        +pr.unit_amount_decimal === +session.amount_subtotal
      );
    });
    console.log({ price });

    // Update the paid status of the claim object
    const claim = await BusinessClaim.findOne({ business: session.client_reference_id });

    claim.payment = {
      status: session.payment_status,
      paidDate,
    };

    await claim.save();
    console.log('Updated claim: ', claim);
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err });
  }
};

exports.stripePaymentWebhookHandler = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;
  console.log('Webhook controller log: ', { signature, 'req.body': req.body });

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      process.env.STRIPE_WEBHOOK_ENDPOINT_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  console.log('Webhook event: ', event);

  let subscription;
  let status;

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Event: customer.subscription.created; Subscription status is ${status}.`);
      // Then define and call a method to handle the subscription created.
      // handleSubscriptionCreated(subscription);
      break;

    case 'customer.subscription.updated':
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Event: customer.subscription.updated; Subscription status is ${status}.`);
      // Then define and call a method to handle the subscription update.
      acknowledgeBusinessClaimPayment(event.data.object);
      break;

    case 'customer.subscription.trial_will_end':
      subscription = event.data.object;
      status = subscription.status;
      console.log(
        `Event: customer.subscription.trial_will_end; Subscription status is ${status}.`
      );
      // Then define and call a method to handle the subscription trial ending.
      // handleSubscriptionTrialEnding(subscription);
      break;
    case 'customer.subscription.deleted':
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Event: customer.subscription.deleted; Subscription status is ${status}.`);
      // Then define and call a method to handle the subscription deleted.
      // handleSubscriptionDeleted(subscriptionDeleted);
      break;

    default:
      console.log(`Unhandled event type ${event.type}.`);
  }
  // Return a 200 response to acknowledge receipt of the event
  res.status(200).json({ received: true });
};

exports.getBusinessClaimCheckoutSession = async (req, res) => {
  try {
    const returnUrl = req.query.returnUrl;
    const prices = await stripe.prices.list({ expand: ['data.product'] });

    // Get business claim
    const claim = await BusinessClaim.findOne({ business: req.params.id }).populate(
      'business'
    );

    console.log(claim);

    const frontendUrl = {
      development: process.env.LOCALINSPIRE_FRONTEND_URL_DEV,
      production: process.env.LOCALINSPIRE_FRONTEND_URL_PROD,
    };

    // const stripeCustomer = await stripe.customers.create({ email: req.user.email });
    // stripeCustomer.id is valid

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      billing_address_collection: 'auto',
      line_items: [
        {
          quantity: 1, // For metered billing, do not pass 'quantity'
          images: claim.business.images,
        },
      ],
      client_reference_id: req.params.business_id,
      customer: req.user._id,
      success_url: frontendUrl[process.env.NODE_ENV].concat(returnUrl),
      // cancel_url: `${req.protocol}://${req.get(hostname)}/payment-cancelled`,
    });

    console.log('Stripe checkout session: ', session);

    res.status(200).json({ session });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
};
