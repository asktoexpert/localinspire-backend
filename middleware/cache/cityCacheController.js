const { redisClient } = require('../../databases/redis');
const cityQueries = require('../../databases/redis/queries/city.queries');

exports.searchCachedCities = async (req, res, next) => {
  let { textQuery } = req.query;

  if (textQuery.length < 2) {
    return res.status(200).json({ status: 'FAIL', msg: 'Please enter at most 2 characters' });
  }

  textQuery = textQuery.toLowerCase();
  console.log('Quering cities: ', textQuery);

  try {
    // await redisClient.sRem('set_of_all_cities', 'Casper, WY ');
    // return res.json({
    //   'isMember: ': await redisClient.sIsMember('set_of_all_cities', 'Casper, WY '),
    // });
    // req.searchCitiesParams = { textQuery };
    // return next();

    const cachedCities = await cityQueries.getCachedCities();
    console.log('Cached cities: ', cachedCities);

    const searchResult = cachedCities?.filter(c => {
      return c.toLowerCase().startsWith(textQuery) || textQuery.startsWith(c.toLowerCase());
    });

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
    console.log('Error: ', Object.keys(err), Object.values(err));

    res.status(500).json({
      status: 'ERROR',
      source: 'cache',
      msg: err.message,
    });
  }
};
