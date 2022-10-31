const { redisClient } = require('..');
const cityKeys = require('../keys/city.keys');

exports.getCachedCities = async () => {
  return await redisClient.sMembers(cityKeys.set_of_all_cities);
};

exports.cacheCitySearchResults = async results => {
  console.log('What to cache: ', results);

  await redisClient.sAdd(
    cityKeys.set_of_all_cities,
    results.map(city => city.toLowerCase())
  );
};
