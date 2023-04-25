const mongoose = require('mongoose');
const validator = require('validator');

const paymentSchema = new mongoose.Schema(
  {
    reason: {
      item: { type: mongoose.Schema.Types.ObjectId, refPath: 'model', required: true },
      model: { type: String, enum: ['BusinessClaim'], required: true },
    },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaid: { type: Number },
    successful: { type: Boolean, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
