const mongoose = require('mongoose');

const businessAnswerSchema = new mongoose.Schema(
  {
    answerText: { type: String, minlength: 1 },
    answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    likes: [{ type: mongoose.Schema.Types.ObjectId }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  { timestamps: true, toObject: { virtuals: true } }
);

const BusinessAnswer = mongoose.model('BusinessAnswer', businessAnswerSchema);
module.exports = BusinessAnswer;
