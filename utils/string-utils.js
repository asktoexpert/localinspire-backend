exports.toTitleCase = (str, divider = ' ') => {
  return str
    .toLowerCase()
    .split(divider)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(divider);
};

exports.toCamelCase = (str, divider = ' ') => {
  return str
    .toLowerCase()
    .split(divider)
    .map((word, i) => {
      if (i !== 0) return word[0].toUpperCase() + word.slice(1);
      return word;
    })
    .join('');
};

exports.addSuffixToNumber = number => {
  console.log('ARG: ', number);
  let s = ['th', 'st', 'nd', 'rd'];
  let v = +number % 100;
  return number + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Where a serialized Redis key/subkey is like: "results:query=restaurants,city=anchorage,stateCode=AK"
// This func transforms it into: Map { query => restaurants, city => anchorage, stateCode => result}
exports.parseSerializedRedisKey = key => {
  let params = key.split(':')[1];
  const keyValuePairs = params.split('|');

  const map = new Map(keyValuePairs.map(pair => pair.split('=')));
  return map;
};
