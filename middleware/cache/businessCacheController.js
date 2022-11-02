const { ConnectionTimeoutError } = require('redis');
const { redisClient } = require('../../databases/redis');
const {
  set_of_all_business_categories,
} = require('../../databases/redis/keys/business.keys');
const businessQueries = require('../../databases/redis/queries/business.queries');
const stringUtils = require('../../utils/string-utils');

exports.searchCachedBusinessCategories = async (req, res, next) => {
  // await redisClient.DEL('set_of_all_business_categories');
  // return res.json(await redisClient.sMembers('set_of_all_business_categories'));

  let { textQuery } = req.query;
  textQuery = textQuery.toLowerCase();

  const cachedCategories = await businessQueries.getCachedBusinessCategories();
  console.log('Currently in cache: ', cachedCategories);

  const searchResults = cachedCategories.filter(categ => {
    return (
      categ.toLowerCase().startsWith(textQuery) ||
      textQuery.startsWith(categ.toLowerCase())
    );
  });
  console.log('Search Results in cache: ', searchResults);

  let cacheMiss = !searchResults?.length;
  console.log('cacheMiss: ', cacheMiss ? 'miss' : 'A Hit actually');

  if (cacheMiss) {
    req.searchCategParams = { textQuery };
    return next();
  }
  res.status(200).json({
    source: 'cache',
    status: 'SUCCESS',
    results: searchResults.length,
    categories: searchResults,
  });
};

exports.searchCachedBusinesses = async (req, res, next) => {
  console.log('Reqeust Query: ', req.query);
  // return next();
  try {
    let { category, city: cityName, stateCode, limit = 100, page = 1 } = req.query;
    [category, cityName] = [category.toLowerCase(), cityName.toLowerCase()];

    if (!category || !cityName || !stateCode)
      return res.status(200).json({ results: 0, businesses: [] });

    // await redisClient.DEL('businesses_search_result');
    // return res.json({
    //   'In cache:': await redisClient.hGetAll('businesses_search_result'),
    // });

    const searchResults = await businessQueries.getMatchingBusinessesInCache({
      category,
      cityName,
      stateCode,
    });
    // return res.json({ searchResults });

    const cacheMiss = !searchResults;
    if (cacheMiss) {
      req.businessSearchParams = { category, cityName, stateCode, limit, page };
      return next();
    }

    const skip = page * limit > searchResults.length ? 0 : page * limit;
    const toShow = searchResults.slice(page === 1 ? 0 : skip + 1, page * limit);

    res.status(200).json({
      status: 'SUCCESS',
      source: 'cache',
      results: toShow.length,
      businesses: toShow,
    });
  } catch (err) {
    let status;
    if (err instanceof ConnectionTimeoutError) {
      err.message = 'Your network is not stable';
      status = 500;
    }
    console.log(err);
    res.status(status || 400).json({ source: 'cache', error: err.message });
  }
};
