const fs = require('fs');
const mongoose = require('mongoose');

const Business = require('../../models/business/Business');
const BusinessReview = require('../../models/business/BusinessReview');
const BusinessQuestion = require('../../models/business/BusinessQuestion');
const BusinessAnswer = require('../../models/business/Answer');
const User = require('../../models/user/User');
const { userPublicFieldsString } = require('../../utils/populate-utils');
const userController = require('../user/userController');

exports.askQuestionAboutBusiness = async (req, res) => {
  const { businessId } = req.params;

  try {
    if (!(await Business.findById(businessId)))
      return res.status(404).json({ status: 'FAIL', msg: 'Business not found' });

    // In the future, check if the loggedin user owns this business. If so, dont allow him to ask question.

    const newQuestion = await BusinessQuestion.create({
      questionText: req.body.question,
      askedBy: req.user._id,
      business: businessId,
    });

    await userController.addUserContribution(
      req.user._id,
      newQuestion._id,
      'BusinessQuestion'
    );

    res.status(201).json({
      status: 'SUCCESS',
      question: await newQuestion.populate('askedBy', userPublicFieldsString),
    });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};

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

exports.getAnswersToQuestion = async (req, res, next) => {
  try {
    console.log('Req url in getAnswersToQuestion', req.url);
    const { page = 1, limit } = req.query;
    const skip = limit * (page - 1);

    const [answers, allAnswersCount] = await Promise.all([
      BusinessAnswer.find({ question: req.params.id })
        .skip(skip)
        .limit(limit)
        .populate('answeredBy', userPublicFieldsString),
      BusinessAnswer.find({ question: req.params.id }).count(),
    ]);

    res.status(200).json({
      status: 'SUCCESS',
      results: answers.length,
      total: allAnswersCount,
      data: answers,
    });
  } catch (err) {
    console.log(err);
    res.json(err);
  }
};

exports.addAnswerToQuestionAboutBusiness = async (req, res) => {
  console.log(req.body);
  try {
    const newAnswer = await BusinessAnswer.create({
      answerText: req.body.answer,
      answeredBy: req.user._id,
    });

    const update = { $push: { answers: newAnswer._id } };
    const options = { runValidators: true, new: true };
    const question = await BusinessQuestion.findByIdAndUpdate(
      req.params.id,
      update,
      options
    ).populate([
      { path: 'askedBy', select: userPublicFieldsString },
      {
        path: 'answers',
        populate: { path: 'answeredBy', select: userPublicFieldsString },
      },
    ]);

    await userController.addUserContribution(req.user._id, newAnswer._id, 'BusinessAnswer');
    res.status(200).json({
      status: 'SUCCESS',
      question,
      newAnswer: await BusinessAnswer.findById(newAnswer._id).populate(
        'answeredBy',
        userPublicFieldsString
      ),
    });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
};
