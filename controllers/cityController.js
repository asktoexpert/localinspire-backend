const cityQueries = require('../databases/redis/queries/city.queries');
const Business = require('../models/Business');

exports.searchCities = async (req, res, next) => {
  const { textQuery } = req.searchCitiesParams;

  try {
    const cities = await Business.find({
      city: { $regex: `^${textQuery}.*`, $options: 'i' },
    }).distinct('city');

    if (cities.length) await cityQueries.cacheCitySearchResults(cities);

    res.status(200).json({
      status: 'SUCCESS',
      source: 'db',
      results: cities.length,
      cities,
    });
  } catch (err) {
    console.log('Error: ', err);

    res.status(500).json({
      status: 'ERROR',
      source: 'db',
      msg: err.message,
    });
  }
};
