const mongoose = require('mongoose');

exports.contributionSchema = mongoose.Schema({
  contribution: { type: mongoose.Schema.Types.ObjectId, refPath: 'model', required: true },
  model: {
    type: String,
    enum: ['BusinessReview', 'BusinessQuestion', 'BusinessAnswer'],
    required: true,
  },
});
