const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { contributionSchema } = require('./schemas');

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: 'String',
      required: [true, 'Please enter your first name'],
    },

    lastName: {
      type: 'String',
      // required: [true, 'Please enter your last name'],
    },

    email: {
      type: String,
      lowercase: true,
      required: [true, 'Please enter an email address'],
      unique: true,
      validate: [validator.isEmail, 'Please enter a valid email'],
    },

    role: {
      type: String,
      required: true,
      enum: ['USER', 'CITY_MANAGER', 'BUSINESS_OWNER', 'MAIN_ADMIN'],
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

    contributions: [contributionSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
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

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 11);
  return next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
