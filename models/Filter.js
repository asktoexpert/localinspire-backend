const mongoose = require('mongoose');

const filterSchema = mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, maxlength: 60, required: true },
    description: { type: String, maxlength: 250 },
    isActive: { type: Boolean, default: true },
    showForBusiness: { type: Boolean, default: false },
    showForFilter: { type: Boolean, default: true },
    category: String,
    searchKeyword: {
      type: String,
      enum: ['Restaurants', 'Hotels', 'Things to do', 'Vacation rentals', 'Cruises'],
    },
    SIC2Categories: [String],
    SIC4Categories: [String],
    SIC8Categories: [String],
    keyOrder: Number,
    // subCategories: [String],
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
