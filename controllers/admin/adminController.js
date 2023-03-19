const Filter = require('../../models/Filter');

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
