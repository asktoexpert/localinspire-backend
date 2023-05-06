const cityQueries = require('../databases/redis/queries/city.queries');
const Business = require('../models/Business');
const City = require('../models/City');
const arrayUtils = require('../utils/arrayUtils');
const { toTitleCase } = require('../utils/string-utils');

exports.getAllCities = async (req, res) => {
  try {
    const cities = await City.find({}).select('name imgUrl isFeatured searchesCount');
    res.status(200).json({ status: 'SUCCESS', results: cities.length, cities });
  } catch (err) {
    console.log('Error: ', err);

    res.status(500).json({
      status: 'ERROR',
      msg: err.message,
    });
  }
};

// exports.searchCities = async (req, res, next) => {
//   const { textQuery } = req.searchCitiesParams || req.query;

//   try {
//     // const cities = await Business.find({
//     //   city: { $regex: `^${textQuery}.*`, $options: 'i' },
//     // })
//     //   .select('+city +stateCode')
//     //   .distinct('city');
//     let [cityQuery, stateQuery] = textQuery.split('-');

//     [cityQuery, stateQuery] = [
//       toTitleCase(cityQuery.toLowerCase().trim()),
//       stateQuery?.toUpperCase().trim(),
//     ];
//     console.log({ cityQuery, stateQuery });

//     const filters = { city: { $regex: `^${cityQuery}` } };

//     if (stateQuery) filters.stateCode = { $regex: `^${stateQuery}` };

//     const [result] = await Business.aggregate([
//       { $match: filters },
//       { $project: { cityInState: { $concat: ['$city', ', ', '$stateCode'] } } },
//       { $group: { _id: null, cities: { $addToSet: '$cityInState' } } },
//       { $project: { _id: 0 } },
//     ]);

//     if (!result?.cities) {
//       return res.json({ status: 'SUCCESS', source: 'db', results: 0, cities: [] });
//     }

//     // Cache matching cities
//     let { cities } = result;
//     console.log({ cities });

//     if (cities.length) {
//       cities.sort((prev, next) => prev.length - next.length); // In asc order of string length
//       await cityQueries.cacheCitySearchResults(cities);
//     }

//     res.status(200).json({ status: 'SUCCESS', source: 'db', results: cities.length, cities });
//   } catch (err) {
//     console.log('Error: ', err);

//     res.status(500).json({
//       status: 'ERROR',
//       source: 'db',
//       msg: err.message,
//     });
//   }
// };

exports.searchCities = async (req, res, next) => {
  try {
    const [nameQuery, stateCodeQuery] = req.query.textQuery.split('-');
    const filter = {};

    if (nameQuery) filter.name = { $regex: `^${toTitleCase(nameQuery.trim())}` };

    if (stateCodeQuery)
      filter.stateCode = { $regex: `^${stateCodeQuery.toUpperCase().trim()}` };

    const [result] = await City.aggregate([
      { $match: filter },
      { $sort: { searchesCount: -1 } },
    ]);

    res.status(200).json({ results: result.cities?.length, cities: result.cities });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
};

exports.toggleCityFeatured = async (req, res) => {
  try {
    const city = await City.findById(req.params.cityId).select('isFeatured');
    city.isFeatured = city.isFeatured;

    await city.save({ validateBeforeSave: false });
    res.status(200).json({ status: 'SUCCESS', city });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
};

exports.getStateNames = async (req, res) => {
  try {
    const stateNames = await City.find({}).select('stateName').distinct('stateName');
    res.status(200).json({ status: 'SUCCESS', results: stateNames.length, stateNames });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
};
