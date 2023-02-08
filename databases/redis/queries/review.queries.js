const { redisClient } = require('..');
const reviewKeys = require('../keys/review.keys');

exports.getBusinessReviewerIds = async businessId => {
  return await redisClient.hGet(reviewKeys.business_reviewers_hash, businessId);
};

exports.cacheBusinessReviewerId = async (businessId, userId) => {
  let cachedIds = await this.getBusinessReviewerIds(businessId);
  console.log('First cachedIds: ', cachedIds);

  if (cachedIds === null) {
    await redisClient.hSet(
      reviewKeys.business_reviewers_hash,
      businessId.toString(),
      JSON.stringify([userId])
    );
    return;
  }

  cachedIds = JSON.parse(cachedIds);
  console.log('Array ids before pushing: ', cachedIds);

  cachedIds.push(userId);
  console.log('Array ids after pushing: ', cachedIds);

  toCache = Array.from(new Set(cachedIds));
  console.log('To cache: ', toCache);

  await redisClient.hSet(
    reviewKeys.business_reviewers_hash,
    businessId.toString(),
    JSON.stringify(toCache)
  );
};
