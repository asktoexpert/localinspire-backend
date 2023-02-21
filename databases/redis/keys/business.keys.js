exports.set_of_all_business_categories = 'set_of_all_business_categories';
exports.businesses_search_result = 'businesses_search_result';

exports.genBusinessResultsKey = (keyword, cityName, stateCode) => {
  return `results:keyword=${keyword}|city=${cityName}|stateCode=${stateCode}`;
};

exports.genBusinessReviewersKey = businessId => {
  return `business_reviewers:business=${businessId.toString?.()}`;
};
