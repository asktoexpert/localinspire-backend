const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    username: {
      type: 'String',
      required: [true, 'Please enter a username'],
    },
    email: {
      type: String,
      lowercase: true,
      required: [true, 'Please enter an email address'],
      unique: true,
      validate: [validator.isEmail, 'Please enter a valid email'],
    },
    emailVerified: Boolean,
    password: {
      type: String,
      required: [false, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    signedUpWith: {
      type: String,
      enum: ['credentials', 'google', 'facebook', 'twitter'],
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
  console.log('Exisiting user: ', !!(await User.findOne({ email })));
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
