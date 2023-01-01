const mongoose = require('mongoose');

const businessReviewSchema = mongoose.Schema({
  business: { required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  reviewedBy: { required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  businessRating: { type: Number, min: 0, max: 5, required: [true, 'A rating is required'] },
  reviewTitle: {
    type: String,
    minlength: 1,
    maxlength: 60,
    required: [true, 'A review title is required'],
  },
  review: { type: String, required: true },
  visitType: {
    type: String,
    enum: ['Solo', 'Couples', 'Family', 'Friends', 'Business'],
    required: [true, 'Please specify a visit type'],
  },
  visitedWhen: {
    month: { type: String, required: true },
    year: { type: Number, enum: [2022], required: true },
  },
  featuresRating: [
    {
      feature: { type: String, enum: ['Food', 'Value', 'Location', 'Service', 'Atmosphere'] },
      rating: { type: Number, min: 0, max: 5 },
    },
  ],
  // {
  //   Food: ,
  //   Value: { type: Number, min: 0, max: 5 },
  //   Service: { type: Number, min: 0, max: 5 },
  //   Location: { type: Number, min: 0, max: 5 },
  //   Atmosphere: { type: Number, min: 0, max: 5 },
  // },
  adviceToFutureVisitors: { type: String, minlength: 1, maxlength: 100 },
  photosWithDescription: [
    {
      photo: String,
      description: { type: String, minlength: 1, maxlength: 50, required: true },
    },
  ],
});

const BusinessReview = new mongoose.model('BusinessReview', businessReviewSchema);
module.exports = BusinessReview;
