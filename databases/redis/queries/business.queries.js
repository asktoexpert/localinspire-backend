const { redisClient } = require('..');
const stringUtils = require('../../../utils/string-utils');
const businessKeys = require('../keys/business.keys');

exports.getCachedBusinessCategories = async () => {
  return await redisClient.sMembers(businessKeys.set_of_all_business_categories);
};

exports.cacheBusinessCategories = async results => {
  console.log('What to cache: ', results);
  if (!results.length) return;
  await redisClient.sAdd(businessKeys.set_of_all_business_categories, results);
};

exports.cacheBusinessSearchResults = async params => {
  const { keyword, cityName, stateCode, searchResults } = params;
  console.log('What to cache: ', { keyword, cityName, stateCode });

  const hashSubKey = businessKeys.genBusinessResultsKey(
    keyword.toLowerCase(),
    cityName.toLowerCase(),
    stateCode.toUpperCase()
  );

  await redisClient.hSet(
    businessKeys.businesses_search_result,
    hashSubKey,
    JSON.stringify(searchResults)
  );
};

exports.getMatchingBusinessesInCache = async params => {
  const { category, cityName, stateCode } = params;

  // const results = await redisClient.hGetAll(businessKeys.businesses_search_result);
  const resultKeys = await redisClient.hKeys(businessKeys.businesses_search_result);
  console.log('Result keys:', resultKeys);
  // console.log('Searching for:', params);

  const matchingKey = resultKeys.find(k => {
    const parsedKey = stringUtils.parseSerializedRedisKey(k);
    // console.log('parsedKey: ', parsedKey);

    if (cityName !== parsedKey.get('city')) return false;
    if (stateCode !== parsedKey.get('stateCode').toUpperCase()) return false;
    return parsedKey.get('keyword') === category;
  });

  console.log('Matching key: ', matchingKey || null);

  const cacheMiss = !matchingKey;
  if (cacheMiss) return null;

  return JSON.parse(
    await redisClient.hGet(businessKeys.businesses_search_result, matchingKey)
  );
};
