const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  SIC2Category: { type: String, required: true },
  SIC4Category: { type: String, required: true },
  SIC8Category: { type: String },
  contactName: { type: String, required: true },
  stateCode: { type: String, required: true },
  city: { type: String, required: true },
  zipCode: String,
  address: { type: String, required: true },
  phone: { type: String, required: true },
  web: { type: String, lowercase: true },
  // coordinates: { type: { type: String }, coordinates: [] },
  // coordinates: { type: String },
  yearFounded: { type: String, required: true },
  locationType: { type: String, required: true },
  marketVariable: { type: String, required: true },
  annualRevenue: { type: String, required: true },
  SIC: { type: String, required: true },
  NAICS: { type: String, required: true },
  industry: { type: String, required: true },
});

// businessSchema.index({ coordinates: '2dsphere' });
// businessSchema.createIndex({ SIC4Category: 'text' });
const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
