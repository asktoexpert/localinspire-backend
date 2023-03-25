const mongoose = require('mongoose');

const keywordSchema = mongoose.Schema(
  {
    name: { type: String, maxlength: 60, required: true, unique: true },
    enableForBusiness: { type: Boolean, default: false },
    enableForFilter: { type: Boolean, default: true },
    sic4Categories: [String],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const Keyword = mongoose.model('Keyword', keywordSchema);
module.exports = Keyword;
