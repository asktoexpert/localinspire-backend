const { redisClient } = require('..');
const stringUtils = require('../../../utils/string-utils');
const businessKeys = require('../keys/business.keys');

exports.cacheBusinessCategories = async results => {
  console.log('What to cache: ', results);

  if (results.length)
    await redisClient.sAdd(businessKeys.set_of_all_business_categories, results);
};

exports.getCachedBusinessCategories = async () => {
  return await redisClient.sMembers(businessKeys.set_of_all_business_categories);
};

exports.cacheBusinessSearchResults = async params => {
  const { keyword, cityName, stateCode, businesses } = params;

  console.log('What to cache: ', {
    keyword: keyword.toLowerCase(),
    cityName: cityName.toLowerCase(),
    stateCode: stateCode.toUpperCase(),
    businesses: businesses.length,
  });

  const hashSubKey = businessKeys.genBusinessResultsKey(
    keyword.toLowerCase(),
    cityName.toLowerCase(),
    stateCode.toUpperCase()
  );

  await redisClient.hSet(
    businessKeys.businesses_search_result,
    hashSubKey,
    JSON.stringify(businesses)
  );
};

exports.getMatchingBusinessesInCache = async params => {
  const { category, cityName, stateCode } = params;

  // const results = await redisClient.hGetAll(businessKeys.businesses_search_result);
  const resultKeys = await redisClient.hKeys(businessKeys.businesses_search_result);
  console.log('Keys in cache:', resultKeys);
  console.log('In first controller:', params);

  const matchingKey = resultKeys.find(k => {
    const parsedKey = stringUtils.parseSerializedRedisKey(k);
    // console.log('parsedKey: ', parsedKey);
    if (cityName !== parsedKey.get('city')) return false;
    if (stateCode.toUpperCase() !== parsedKey.get('stateCode')) return false;

    const keyword = parsedKey.get('keyword');

    // category.length >= 5 is for cases where the user searches with category names like 'and' or other conjuctions
    return (
      keyword.startsWith(category) || category.startsWith(keyword)
      // && category.length >= 5
    );
  });

  console.log('Matching key: ', matchingKey || null);

  const cacheMiss = !matchingKey;
  if (cacheMiss) return null;

  return JSON.parse(
    await redisClient.hGet(businessKeys.businesses_search_result, matchingKey)
  );
};
