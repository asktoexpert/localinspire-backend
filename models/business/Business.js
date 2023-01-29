const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  SIC2: { type: String, required: true },
  SIC4: { type: String, required: true },
  SIC8: { type: String },
  contactName: { type: String, required: true },
  stateCode: { type: String, required: true },
  city: { type: String, required: true },
  zipCode: String,
  address: { type: String, required: true },
  phone: { type: String, required: true },
  web: { type: String, lowercase: true },
  coordinates: { type: String },
  yearFounded: { type: String, required: true },
  locationType: { type: String, required: true },
  marketVariable: { type: String, required: true },
  annualRevenue: { type: String, required: true },
  SIC: { type: String, required: true },
  NAICS: { type: String, required: true },
  industry: { type: String, required: true },

  // New
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  avgRating: { type: Number, default: 0 },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// businessSchema.index({ coordinates: '2dsphere' });
// businessSchema.createIndex({ SIC4: 'text' });
const Business = mongoose.model('Business', businessSchema);
businessSchema.index({ SIC8: 1, stateCode: 1, city: 1 });

module.exports = Business;
