const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    name: String,
    stateCode: { type: String, maxlength: 2 },
    stateName: String,
    stateId: Number,
    population: Number,
    lat: Number,
    lng: Number,
    density: Number,
    zips: String,
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const City = new mongoose.model('City', citySchema);
module.exports = City;
