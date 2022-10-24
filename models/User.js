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
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
  }
);

userSchema.statics.verifyPassword = async function (passwordInput, hashedPassword) {
  // console.log(passwordInput, hashedPassword);
  // console.log(await bcrypt.compare(passwordInput, hashedPassword));
  return await bcrypt.compare(passwordInput, hashedPassword);
};

userSchema.statics.encryptPassword = async function (password) {
  console.log('Encrypted password: ', password);
  return await bcrypt.hash(password, 12);
};

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 11);
  return next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
