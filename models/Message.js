const mongoose = require('mongoose');

const msgSchema = mongoose.Schema(
  {
    text: { type: String, minlength: 1, required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seen: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Message = mongoose.model('Message', msgSchema);
module.exports = Message;
