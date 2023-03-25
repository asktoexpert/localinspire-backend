const Filter = require('../../models/admin/Filter');
const Keyword = require('../../models/admin/Keyword');

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

exports.getFilters = async (_, res) => {
  try {
    const filters = await Filter.find();
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

exports.editFilter = async (req, res) => {};

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
