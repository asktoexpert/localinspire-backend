const mongoose = require('mongoose');

exports.contributionSchema = mongoose.Schema({
  contribution: { type: mongoose.Schema.Types.ObjectId, refPath: 'model', required: true },
  model: {
    type: String,
    enum: ['BusinessReview', 'BusinessQuestion', 'BusinessAnswer'],
    required: true,
  },
});

exports.collectionSchema = mongoose.Schema(
  {
    name: { type: String, maxlength: 40, required: true, trim: true },
    description: { type: String, maxlength: 300, trim: true, required: true, select: false },
    isPrivate: { type: Boolean, required: true },
    items: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, refPath: 'model', required: true },
        model: { type: String, enum: ['Business'], required: true },
      },
    ],
    coverPhotoUrl: {
      type: String,
      required: false,
      default: '/img/business-img-default.jpeg',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
