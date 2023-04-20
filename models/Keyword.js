const mongoose = require('mongoose');

const keywordSchema = mongoose.Schema(
  {
    name: { type: String, maxlength: 60, required: true, unique: true },
    sic4Categories: [String],
    showOnNavbar: { type: Boolean, default: true },
    showForSearch: { type: Boolean, default: true },
    enableForBusiness: { type: Boolean, default: false },
    enableForFilter: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const Keyword = mongoose.model('Keyword', keywordSchema);
module.exports = Keyword;
