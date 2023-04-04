const Filter = require('../../models/admin/Filter');
const Keyword = require('../../models/admin/Keyword');
const { toTitleCase } = require('../../utils/string-utils');

exports.addNewFilter = async (req, res) => {
  try {
    console.log('Body: ', req.body);
    const newFilter = await Filter.create({ createdBy: req.user._id, ...req.body });
    res.status(201).json({ status: 'SUCCESS', newFilter, msg: 'Filter created successfully' });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: 'FAIL' });
  }
};

exports.getFilters = async (req, res) => {
  let q = {};

  if (req.query.keyword)
    // Find filters whose searchKeywords field (of type string[]) contains req.query.keyword
    q = { searchKeywords: { $regex: req.query.keyword, $options: 'i' } };

  try {
    const filters = await Filter.find(q);
    res.status(200).json({ status: 'SUCCESS', results: filters.length, filters });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: 'FAIL' });
  }
};

exports.deleteFilter = async (req, res) => {
  try {
    await Filter.findByIdAndDelete(req.params.id);
    res.status(200).json({ status: 'SUCCESS', msg: 'Deleted successfully' });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: 'FAIL' });
  }
};

exports.editFilter = async (req, res) => {
  try {
    console.log('Update obj: ', req.body);
    const updatedFilter = await Filter.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res
      .status(200)
      .json({ status: 'SUCCESS', msg: 'Keyword updated successfully', updatedFilter });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: 'FAIL', msg: err.message });
  }
};

exports.addKeyword = async (req, res) => {
  try {
    const newKeyword = await Keyword.create(req.body);
    res
      .status(201)
      .json({ status: 'SUCCESS', msg: 'Filter created successfully', newKeyword });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: 'FAIL' });
  }
};

exports.getKeywords = async (_, res) => {
  try {
    const keywords = await Keyword.find();
    res.status(200).json({ status: 'SUCCESS', results: keywords.length, keywords });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: 'FAIL' });
  }
};

exports.deleteKeyword = async (req, res) => {
  try {
    await Keyword.findByIdAndDelete(req.params.id);
    res.status(200).json({ status: 'SUCCESS', msg: 'Keyword deleted successfully' });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: 'FAIL', msg: err.message });
  }
};

exports.editKeyword = async (req, res) => {
  try {
    const options = { new: true, runValidators: true };
    console.log('Update obj: ', req.body);
    const updatedKeyword = await Keyword.findByIdAndUpdate(req.params.id, req.body, options);
    res
      .status(200)
      .json({ status: 'SUCCESS', msg: 'Keyword updated successfully', updatedKeyword });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: 'FAIL', msg: err.message });
  }
};
