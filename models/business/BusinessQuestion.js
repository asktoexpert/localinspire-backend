const mongoose = require('mongoose');

const businessQuestionSchema = mongoose.Schema(
  {
    business: { required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    questionText: String,
    askedBy: { required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    answers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BusinessAnswer' }],
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
  }
);

const BusinessQuestion = mongoose.model('BusinessQuestion', businessQuestionSchema);
module.exports = BusinessQuestion;
