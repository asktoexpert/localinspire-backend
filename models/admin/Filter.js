const mongoose = require('mongoose');

const filterSchema = mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, maxlength: 150, required: true, index: 'text' },
    title: { type: String, maxlength: 150 },
    description: { type: String, maxlength: 250 },
    isActive: { type: Boolean, default: true },
    showForBusiness: { type: Boolean, default: false },
    showForFilter: { type: Boolean, default: true },
    category: String,
    searchKeywords: [String],
    SIC2Categories: [String],
    SIC4Categories: [String],
    SIC8Categories: [String],
    keyOrder: Number,
    formType: { type: String, enum: ['input', 'checkbox', 'dropdown', 'textarea', 'slider'] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Filter = mongoose.model('Filter', filterSchema);
module.exports = Filter;
