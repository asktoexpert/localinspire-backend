const fs = require('fs');
const mongoose = require('mongoose');

const Business = require('../../models/business/Business');
const BusinessReview = require('../../models/business/BusinessReview');
const BusinessQuestion = require('../../models/business/BusinessQuestion');
const BusinessAnswer = require('../../models/business/Answer');
const User = require('../../models/user/User');

exports.getQuestionDetails = async (req, res, next) => {
  const filters = { _id: req.params.id };
  if (req.query.textSearch.length)
    filters.questionText = { $regex: `^${req.query.textSearch}`, $options: 'i' };

  const question = await BusinessQuestion.findOne(filters).populate([
    { path: 'business', select: 'businessName city stateCode' },
    { path: 'askedBy', select: 'firstName lastName imgUrl role' },
    {
      path: 'answers',
      populate: { path: 'answeredBy', select: 'firstName lastName imgUrl role' },
    },
  ]);

  if (!question) return res.status(404).json({ status: 'NOT_FOUND' });
  return res.status(200).json({ status: 'SUCCESS', question });
};
