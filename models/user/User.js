const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { contributionSchema, collectionSchema } = require('./schemas');

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: 'String',
      required: [true, 'Please enter your first name'],
      trim: true,
    },

    lastName: {
      type: 'String',
      trim: true,
      // required: [true, 'Please enter your last name'],
    },

    email: {
      type: String,
      lowercase: true,
      required: [true, 'Please enter an email address'],
      unique: true,
      validate: [validator.isEmail, 'Please enter a valid email'],
      trim: true,
    },

    role: {
      type: String,
      required: true,
      enum: ['USER', 'MAIN_ADMIN'],
      default: 'USER',
    },

    facebookEmail: {
      type: String,
      lowercase: true,
      validate: [validator.isEmail, 'Please enter a valid email'],
    },

    password: {
      type: String,
      required: [false, 'Please provide a password'],
      minlength: 6,
      select: false,
      trim: true,
    },

    imgUrl: { type: String, default: '/img/default-profile-pic.jpeg' },

    gender: {
      type: String,
      enum: ['male', 'female'],
    },

    location: {
      long: Number,
      lat: Number,
      stateCode: String,
      cityName: String,
    },

    birthday: { day: Number, month: String, year: Number },

    signedUpWith: {
      type: String,
      required: true,
      enum: ['credentials', 'google', 'facebook', 'twitter'],
    },

    accountVerified: {
      required: true,
      type: Boolean,
      default: false,
    },

    collections: [collectionSchema],
    contributions: [contributionSchema],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    profileViews: { type: Number, default: 0 },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    businessesClaimed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }],
    citiesClaimed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual('city').get(function () {
  return this.location.cityName?.concat(', ')?.concat(this.location.stateCode);
});

userSchema.statics.findUserByEmail = async email => {
  return await User.findOne({ email });
};

userSchema.statics.isEmailAlreadyInUse = async email => {
  return !!(await User.findOne({ email }));
};

userSchema.methods.verifyPassword = async function (passwordInput, hashedPassword) {
  return await bcrypt.compare(passwordInput, hashedPassword);
};

userSchema.statics.encryptPassword = async function (password) {
  return await bcrypt.hash(password, 11);
};

userSchema.pre('save', function (next) {
  if (this.isModified('password')) this.password = bcrypt.hash(this.password, 11);
  return next();
});

// userSchema.virtual('totalContributions').get(function () {
//   return this.contributions.length;
// });

const User = mongoose.model('User', userSchema);
module.exports = User;
