const { ConnectionTimeoutError } = require('redis');
const { redisClient } = require('../../databases/redis');
const { set_of_all_business_categories } = require('../../databases/redis/keys/business.keys');
const businessQueries = require('../../databases/redis/queries/business.queries');
const arrayUtils = require('../../utils/arrayUtils');
const stringUtils = require('../../utils/string-utils');

exports.searchCachedBusinessCategories = async function (req, res, next) {
  // await redisClient.DEL('set_of_all_business_categories');
  // return res.json(await redisClient.sMembers('set_of_all_business_categories'));
  let { textQuery } = req.query;
  textQuery = textQuery.toLowerCase();
  // req.searchCategParams = { textQuery };
  // return next();

  try {
    const cachedCategories = await businessQueries.getCachedBusinessCategories();
    console.log('Currently in cache: ', cachedCategories);

    const cacheResults = cachedCategories.filter(categ => {
      return (
        categ.toLowerCase().startsWith(textQuery) || textQuery.startsWith(categ.toLowerCase())
      );
    });
    console.log('Matching Results in cache: ', cacheResults);

    let cacheMiss = !cacheResults?.length;
    console.log('cacheMiss: ', cacheMiss ? 'miss' : 'A Hit actually');

    if (cacheMiss) {
      req.searchCategParams = { textQuery };
      return next();
    }

    res.status(200).json({
      source: 'cache',
      status: 'SUCCESS',
      results: cacheResults.length,
      categories: cacheResults,
    });
  } catch (err) {
    res.status(400).json({ status: 'ERROR', results: 0, categories: [] });
  }
};

exports.findCachedBusinesses = async function (req, res, next) {
  console.log('Reqeust query in main controller: ', req.query);
  let { category, city: cityName, stateCode, page = 1, limit = 20 } = req.query;

  [category, cityName, page, limit] = [
    category.toLowerCase(),
    cityName.toLowerCase(),
    +page,
    +limit,
  ];
  // req.businessSearchParams = { category, cityName, stateCode, page, limit };
  // return next();
  try {
    if (!category || !cityName || !stateCode)
      return res.status(200).json({ status: 'SUCCESS', results: 0, businesses: [] });

    // await redisClient.DEL('businesses_search_result');
    // await redisClient.hDel(
    //   'businesses_search_result',
    //   'results:keyword=carpenters|city=anchorage|stateCode=AK'
    // );
    // return res.json({
    //   'In cache:': await redisClient.hKeys('businesses_search_result'),
    // });

    const searchResults = await businessQueries.getMatchingBusinessesInCache({
      category,
      cityName,
      stateCode,
    });
    // return res.json({ searchResults });
    const cacheMiss = !searchResults;

    if (cacheMiss) {
      req.businessSearchParams = { category, cityName, stateCode, page, limit };
      return next();
    }

    const paginatedResults = await arrayUtils.paginate({
      array: searchResults,
      page,
      limit,
    });

    res.status(200).json({
      status: 'SUCCESS',
      source: 'cache',
      results: paginatedResults.length,
      allResults: searchResults.length,
      businesses: paginatedResults,
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
