const { redisClient } = require('../../databases/redis');
const cityQueries = require('../../databases/redis/queries/city.queries');
const stringUtils = require('../../utils/string-utils');

exports.searchCachedCities = async (req, res, next) => {
  try {
    // await redisClient.del('set_of_all_cities');
    // return res.json({
    //   'set_of_all_cities: ': await redisClient.sMembers('set_of_all_cities'),
    // });
    let { textQuery } = req.query;

    if (textQuery.length < 2) {
      return res
        .status(200)
        .json({ status: 'FAIL', msg: 'Please enter at most 2 characters' });
    }

    textQuery = textQuery.toLowerCase();
    console.log('Quering cities with: ', textQuery);

    const cachedCities = await cityQueries.getCachedCities();
    const searchResult = cachedCities
      ?.filter(c => {
        return c.includes(textQuery) || textQuery.includes(c);
      })
      .map(c => stringUtils.toTitleCase(c));

    let cacheMiss = !searchResult?.length;
    console.log('cacheMiss: ', cacheMiss ? 'miss' : 'A Hit actually');

    if (cacheMiss) {
      req.searchCitiesParams = { textQuery };
      return next();
    }

    res.status(200).json({
      status: 'SUCCESS',
      source: 'cache',
      results: searchResult.length,
      cities: searchResult,
    });
  } catch (err) {
    console.log('Error: ', err);

    res.status(500).json({
      status: 'ERROR',
      source: 'cache',
      msg: err.message,
    });
  }
};
