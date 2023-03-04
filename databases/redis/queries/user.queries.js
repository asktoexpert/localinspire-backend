const { redisClient } = require('..');
const userKeys = require('../keys/user.keys');

exports.getUserTotalHelpfulVotes = async userId => {
  return +(await redisClient.hGet(userKeys.users_helpful_votes_hash_key, userId.toString()));
};

exports.updateUserTotalHelpfulVotes = async (userId, update) => {
  try {
    if (!['+', '-'].includes(update)) throw new Error('No update to upvotes specified');

    await redisClient.hIncrBy(
      userKeys.users_helpful_votes_hash_key,
      userId.toString(),
      update === '+' ? 1 : -1
    );
  } catch (err) {
    console.log('Error happened: ', err);
  }
};
