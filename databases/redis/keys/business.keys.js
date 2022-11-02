exports.set_of_all_business_categories = 'set_of_all_business_categories';
exports.businesses_search_result = 'businesses_search_result';

exports.genBusinessResultsKey = (keyword, cityName, stateCode) => {
  const key = `results:keyword=${keyword}|city=${cityName}|stateCode=${stateCode}`;
  return key;
};
