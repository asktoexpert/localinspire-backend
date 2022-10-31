const { ConnectionTimeoutError } = require('redis');
const businessQueries = require('../../databases/redis/queries/business.queries');
const stringUtils = require('../../utils/string-utils');

exports.searchCachedBusinessCategories = async (req, res, next) => {
  let { textQuery } = req.query;
  textQuery = textQuery.toLowerCase();

  const cachedCategories = await businessQueries.getCachedBusinessCategories();
  console.log('Cached categories: ', cachedCategories);

  const searchResults = cachedCategories.filter(categ => {
    return categ.includes(textQuery) || textQuery.includes(categ);
  });
  console.log('Cache Search Results: ', searchResults);

  let cacheMiss = !searchResults?.length;
  console.log('cacheMiss: ', cacheMiss ? 'miss' : 'A Hit actually');
  if (cacheMiss) {
    req.searchCategParams = { textQuery };
    return next();
  }

  const matchingWordsFromEachCateg = searchResults
    ?.map(categ => {
      const words = categ.replace(',', '').split(' ');
      const matchingWordsWithQuery = words.filter(
        word => word.includes(textQuery) || textQuery.includes(word)
      );
      console.log('Words: ', matchingWordsWithQuery);
      return matchingWordsWithQuery;
    })
    .flat();

  const uniqueWords = [...new Set(matchingWordsFromEachCateg)];

  // console.log('Check: ', searchResults);
  res.status(200).json({
    source: 'cache',
    status: 'SUCCESS',
    results: uniqueWords.length,
    categories: uniqueWords,
  });
};

exports.checkCachedResults = async (req, res, next) => {
  // return next();
  try {
    let { textQuery, city: cityName, stateCode, limit = 100, page = 1 } = req.query;
    [textQuery, cityName] = [textQuery.toLowerCase(), cityName.toLowerCase()];

    if (!textQuery || !cityName || !stateCode)
      return res.status(200).json({ results: 0, businesses: [] });

    // await redisClient.DEL('businesses_search');

    const cachedResults = await businessQueries.getCachedBusinessSearchResults({
      textQuery,
      cityName,
      stateCode,
    });
    //return res.json({ cachedResults });

    const cacheMiss = !cachedResults;
    if (cacheMiss) {
      req.businessSearchParams = { stateCode, textQuery, cityName };
      return next();
    }

    const skip = page * limit > cachedResults.length ? 0 : page * limit;

    res.status(200).json({
      status: 'SUCCESS',
      source: 'cache',
      results: cachedResults.length,
      businesses: cachedResults.slice(page === 1 ? 0 : skip + 1, page * limit),
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
