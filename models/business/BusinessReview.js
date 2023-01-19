const mongoose = require('mongoose');

const reviewLikesSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const businessReviewSchema = mongoose.Schema(
  {
    business: { required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    reviewedBy: { required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    recommends: { type: Boolean, required: true },
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
    featureRatings: [
      {
        feature: {
          type: String,
          enum: ['Food', 'Value', 'Location', 'Service', 'Atmosphere'],
          required: true,
        },
        rating: {
          type: Number,
          min: 0,
          max: 5,
          required: [true, 'Please enter a rating for this feature'],
        },
      },
    ],
    adviceToFutureVisitors: { type: String, minlength: 1, maxlength: 250 },
    images: [
      {
        photoUrl: String,
        description: { type: String, minlength: 1, maxlength: 70, required: true },
      },
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        commentText: { type: String, required: true },
      },
    ],

    // likes: [{ type: mongoose.Schema.Types.ObjectId }],
    likes: [reviewLikesSchema],

    businessOwnerResponse: {
      required: false,
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      responseText: { type: String },
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

const BusinessReview = new mongoose.model('BusinessReview', businessReviewSchema);
module.exports = BusinessReview;
