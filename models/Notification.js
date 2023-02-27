const mongoose = require('mongoose');

const schemaOptions = {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
};

const notificationSchema = mongoose.Schema(
  {
    for: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    alert: { type: mongoose.Schema.Types.ObjectId, refPath: 'alertType', required: true },
    alertType: { type: String, enum: ['Message'], required: true },
  },
  { ...schemaOptions }
);

const Notification = new mongoose.model('Notification', notificationSchema);
module.exports = Notification;
