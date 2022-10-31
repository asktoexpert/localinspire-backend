exports.set_of_all_business_categories = 'set_of_all_business_categories';

exports.getSearchResultHashKey = () => 'businesses_search';

exports.genBusinessResultsKey = (keyword, cityName, stateCode) => {
  const key = `results:keywords=${keyword}|city=${cityName}|stateCode=${stateCode}`;
  return key;
};
