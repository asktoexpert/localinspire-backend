const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: 'String',
      required: [true, 'Please enter your first name'],
    },
    lastName: {
      type: 'String',
      required: [true, 'Please enter your last name'],
    },
    email: {
      type: String,
      lowercase: true,
      required: [true, 'Please enter an email address'],
      unique: true,
      validate: [validator.isEmail, 'Please enter a valid email'],
    },
    emailVerified: {
      required: true,
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [false, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    imgUrl: String,
    gender: {
      type: String,
      enum: ['male', 'female'],
    },
    birthday: { day: Number, month: String, year: Number },
    signedUpWith: {
      type: String,
      required: true,
      enum: ['credentials', 'google', 'facebook', 'twitter'],
    },
    role: {
      type: String,
      required: true,
      enum: ['USER', 'CITY_MANAGER', 'BUSINESS_OWNER', 'MAIN_ADMIN'],
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
  }
);

userSchema.statics.findUserByEmail = async email => {
  return await User.findOne({ email });
};

userSchema.statics.isEmailAlreadyInUse = async email => {
  const user = await User.findOne({ email });
  console.log({ USER: user });
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
