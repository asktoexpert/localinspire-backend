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
    toJSON: { virtuals: true },
  }
);

businessQuestionSchema.virtual('answersCount').get(function () {
  return this.answers.length;
});

const BusinessQuestion = mongoose.model('BusinessQuestion', businessQuestionSchema);
module.exports = BusinessQuestion;
