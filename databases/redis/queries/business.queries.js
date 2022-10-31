const { redisClient } = require('..');
const stringUtils = require('../../../utils/string-utils');
const businessKeys = require('../keys/business.keys');
const searchResultsHashKey = businessKeys.getSearchResultHashKey();

exports.getCachedBusinessCategories = async () => {
  return await redisClient.sMembers(businessKeys.set_of_all_business_categories);
};

exports.cacheBusinessCategories = async results => {
  console.log('What to cache: ', results);

  await redisClient.sAdd(
    businessKeys.set_of_all_business_categories,
    results.map(city => city.toLowerCase())
  );
};

exports.cacheBusinessSearchResults = async params => {
  const { keywords, cityName, stateCode, searchResults } = params;
  console.log('What to cache: ', { keywords, cityName, stateCode });

  const hashSubKey = businessKeys.genBusinessResultsKey(
    keywords.toLowerCase(),
    cityName.toLowerCase(),
    stateCode.toUpperCase()
  );
  await redisClient.hSet(searchResultsHashKey, hashSubKey, JSON.stringify(searchResults));
};

exports.getCachedBusinessSearchResults = async params => {
  const { textQuery, cityName, stateCode } = params;

  // const results = await redisClient.hGetAll(searchResultsHashKey);
  const resultKeys = await redisClient.hKeys(searchResultsHashKey);
  console.log('Result keys:', resultKeys);
  console.log('Searching for:', params);

  const matchingKey = resultKeys.find(k => {
    const parsedResultKey = stringUtils.parseSerializedRedisKey(k);
    console.log('parsedResultKey: ', parsedResultKey);

    if (cityName.toLowerCase() !== parsedResultKey.get('city')) {
      console.log('city: False');
      return false;
    }
    if (stateCode !== parsedResultKey.get('stateCode').toUpperCase()) {
      console.log('stateCode: False');
      return false;
    }
    return parsedResultKey.get('keywords').includes(textQuery);
  });

  console.log('Matching key: ', matchingKey);

  const cacheMiss = !matchingKey;
  if (cacheMiss) return null;

  return JSON.parse(await redisClient.hGet(searchResultsHashKey, matchingKey));
};
