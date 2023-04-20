const mongoose = require('mongoose');

const filterSchema = mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, maxlength: 150, required: true, index: 'text' },
    title: { type: String, maxlength: 150 },
    description: {
      text: { type: String, maxlength: 300 },
      showInSearchResultsPage: { type: Boolean, default: true },
      showInAddEditBusinessPage: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    showForBusiness: { type: Boolean, default: false },
    showForFilter: { type: Boolean, default: true },
    keywords: [String],
    SIC2Categories: [String],
    SIC4Categories: [String],
    SIC8Categories: [String],
    keyOrder: { type: Number, min: 1, default: 1 },
    tags: [String],
    formType: {
      type: String,
      enum: ['input', 'checkbox', 'dropdown', 'textarea', 'slider'],
      lowercase: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Filter = mongoose.model('Filter', filterSchema);
module.exports = Filter;
