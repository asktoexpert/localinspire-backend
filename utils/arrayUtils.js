const strUtils = require('./string-utils');

exports.paginate = async function ({ array, page, limit }) {
  const start = (page - 1) * limit;
  const end = limit * page;
  console.log({ start, end });
  return Promise.resolve(array.slice(start, end));
};

exports.sortItemsByNumberOfWords = async (list, order = 'asc') => {
  if (!('map' in list)) return console.log('An array wasnt passed'); // If not an array

  list.sort((prevStr, nextStr) => {
    if (order === 'desc')
      return strUtils.getNumberOfWords(nextStr) - strUtils.getNumberOfWords(prevStr);
    return strUtils.getNumberOfWords(prevStr) - strUtils.getNumberOfWords(nextStr);
  });

  Promise.resolve();
};
