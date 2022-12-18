const cityQueries = require('../databases/redis/queries/city.queries');
const Business = require('../models/Business');
const arrayUtils = require('../utils/arrayUtils');

exports.searchCities = async (req, res, next) => {
  const { textQuery } = req.searchCitiesParams || req.query;

  try {
    // const cities = await Business.find({
    //   city: { $regex: `^${textQuery}.*`, $options: 'i' },
    // })
    //   .select('+city +stateCode')
    //   .distinct('city');
    let [cityQuery, stateQuery] = textQuery.split('-');

    [cityQuery, stateQuery] = [
      cityQuery.toLowerCase().trim(),
      stateQuery?.toUpperCase().trim(),
    ];
    console.log({ cityQuery, stateQuery });

    const filters = { city: { $regex: new RegExp(`^${cityQuery}`, 'i') } };

    if (stateQuery) filters.stateCode = { $regex: new RegExp(`^${stateQuery}`, 'i') };

    const [result] = await Business.aggregate([
      {
        $match: filters,
      },
      {
        $project: { cityInState: { $concat: ['$city', ', ', '$stateCode'] } },
      },
      {
        $group: {
          _id: null,
          cities: { $addToSet: '$cityInState' },
        },
      },
      {
        $project: { _id: 0 },
      },
    ]);

    if (!result?.cities) {
      return res.json({ status: 'SUCCESS', source: 'db', results: 0, cities: [] });
    }

    // Cache matching cities
    let { cities } = result;
    cities = cities.filter(c => c !== null);

    console.log({ cities });
    if (cities.length) {
      await cityQueries.cacheCitySearchResults(cities);
      await arrayUtils.sortItemsByNumberOfWords(cities);
    }

    res.status(200).json({ status: 'SUCCESS', source: 'db', results: cities.length, cities });
  } catch (err) {
    console.log('Error: ', err);

    res.status(500).json({
      status: 'ERROR',
      source: 'db',
      msg: err.message,
    });
  }
};
