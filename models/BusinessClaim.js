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
      type: String,
      enum: [
        'Owner',
        'Business Manager',
        'Business Representative ',
        'I work here and have permission to claim',
        'Other',
      ],
    },
    currentPlan: {
      type: String,
      enum: [
        'free',
        'sponsored_business_listing_monthly',
        'enhanced_business_profile_monthly',
        'sponsored_business_listing_yearly',
        'enhanced_business_profile_yearly',
      ],
      default: 'free',
    },
    payment: {
      status: String, // 'paid' | ...
      amountPaid: Number,
      currency: { type: String },
      stripeSubscriptionId: String,
      paidDate: Date,
    },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

const BusinessClaim = new mongoose.model('BusinessClaim', businessClaimSchema);
module.exports = BusinessClaim;
