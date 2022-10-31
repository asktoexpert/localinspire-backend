const { createClient } = require('redis');

const redisClient = createClient({
  url: 'redis://' + process.env.REDIS_DB_URL,
  password: process.env.REDIS_PASSWORD,
});

redisClient.on('error', err => console.error(err));
redisClient.connect().then(console.log('Redis connected successfully'));

module.exports = { redisClient };
