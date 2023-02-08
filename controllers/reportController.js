const BusinessAnswer = require('../models/business/BusinessAnswer');
const BusinessQuestion = require('../models/business/BusinessQuestion');
const BusinessReview = require('../models/business/BusinessReview');
const Report = require('../models/Report');

exports.report = async (req, res) => {
  try {
    const reportableModels = {
      BusinessReview,
      BusinessQuestion,
      BusinessAnswer,
      BusinessTip: BusinessReview,
    };

    const reportedObject = await reportableModels[req.body.model]?.findById?.(
      req.body.reportedObject
    );
    console.log('Reported object: ', reportedObject);

    if (!reportedObject) {
      return res.status(404).json({
        status: 'FAIL',
        summary: 'NOT_FOUND',
        msg: `The ${req.body.model.replace(
          'Business',
          ''
        )} you're trying to report does not exist`,
      });
    }
    await Report.create({
      ...req.body,
      moreExplanation: req.body.moreExplanation?.split('\n'), // In paragraphs
      reportedBy: req.user._id,
    });

    res.status(201).json({ status: 'SUCCESS' });
  } catch (err) {
    res.status(400).json({ status: 'FAIL' });
    console.log('Report error: ', err);
  }
};
