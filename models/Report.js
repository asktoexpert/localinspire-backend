const mongoose = require('mongoose');

const reportSchema = mongoose.Schema(
  {
    reported: { type: mongoose.Schema.Types.ObjectId, refPath: 'model', required: true },
    model: {
      type: String,
      enum: [
        'BusinessReview',
        'BusinessQuestion',
        'BusinessAnswer',
        'BusinessTip',
        'UserProfile',
      ],
      required: true,
    },
    reason: { type: String, required: true },
    moreExplanation: { type: [String], required: false },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },

  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
