const mongoose = require('mongoose');
const validator = require('validator');

const businessClaimSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    businessPhone: { type: Number, required: true },
    businessEmail: {
      type: String,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please enter a valid email'],
      required: [true, 'Please enter an email address'],
    },
    role: {
      enum: [
        'Owner',
        'Business Manager',
        'Business Representative ',
        'I work here and have permission to claim',
        'Other',
      ],
    },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

const BusinessClaim = new mongoose.model('BusinessClaim', businessClaimSchema);
module.exports = BusinessClaim;
