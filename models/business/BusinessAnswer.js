const mongoose = require('mongoose');

const businessAnswerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessQuestion' },
    answerText: [String],
    answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    likes: [{ type: mongoose.Schema.Types.ObjectId }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

const BusinessAnswer = mongoose.model('BusinessAnswer', businessAnswerSchema);
module.exports = BusinessAnswer;
