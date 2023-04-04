exports.getNumberOfWords = str => str.split(' ').length;

exports.toTitleCase = (str, divider = ' ') => {
  if (!str) return '';
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

// Where a serialized Redis key/subkey is like: "results:query=restaurants|city=anchorage|stateCode=AK"
// This func transforms it into: Map { query => restaurants, city => anchorage, stateCode => result}
exports.parseSerializedRedisKey = key => {
  let params = key.split(':')[1];
  const keyValuePairs = params.split('|').map(pair => pair.split('='));
  return new Map(keyValuePairs);
};

exports.getCommonWords = function (str) {
  const refWords = this.str.split(' ');
  return str.split(' ').filter(word => refWords.includes(word));
};

exports.weaklyEncryptEmail = email => {
  const emailPortionToBeHidden = email.slice(3, email.indexOf('@'));
  return email.replace(emailPortionToBeHidden, '*'.repeat(emailPortionToBeHidden.length));
};
