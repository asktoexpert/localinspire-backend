const Business = require('../models/Business');
const stringUtils = require('../utils/string-utils');
const businessQueries = require('../databases/redis/queries/business.queries');

exports.searchBusinessCategories = async function (req, res, next) {
  const { textQuery } = req.searchCategParams;
  console.log('Query in main controller: ', textQuery);

  const categories = await Business.find({
    SIC8Category: { $regex: `^${textQuery}.*`, $options: 'i' },
  }).distinct('SIC8Category');

  const sortResultsByLeastWordsFirst = () => {
    categories.sort((currWord, nextWord) => {
      if (currWord.split(' ').length < nextWord.split(' ').length) return -1;
      return 1;
    });
  };
  // sortResultsByLeastWordsFirst();
  if (categories.length) await businessQueries.cacheBusinessCategories(categories);

  res.status(200).json({
    status: 'SUCCESS',
    source: 'db',
    results: categories.length,
    categories,
  });
};

// Find businesses based on location coords & matching coordinates
exports.findBusinesses = async function (req, res, next) {
  const { category, cityName, stateCode, page, limit } = req.businessSearchParams;
  const skip = page * limit;

  if (!category || !cityName || !stateCode)
    return res.status(200).json({ status: 'SUCCESS', results: 0, businesses: [] });

  try {
    // Find businesses whose fields match/is-like the query
    const searchResults = await Business.find({
      SIC8Category: { $regex: `^${category}.*`, $options: 'i' },
      city: stringUtils.toTitleCase(cityName),
      stateCode: stateCode.toUpperCase(),
    });
    // .skip(skip)
    // .limit(limit);

    // Get search keyword based on search query.
    const keyword = !!searchResults.length && searchResults?.[0]?.SIC8Category;

    // const keywords =
    //   !!searchResults.length &&
    //   [...new Set(searchResults?.[0]?.SIC8Category.split(' '))].join(' ');

    console.log('searchKeyWord: ', keyword);

    // Store in Redis if there are search results
    if (searchResults.length)
      await businessQueries.cacheBusinessSearchResults({
        keyword,
        cityName,
        stateCode,
        searchResults,
      });

    res.status(200).json({
      status: 'SUCCESS',
      source: 'db',
      results: searchResults.length,
      businesses: searchResults,
    });
  } catch (err) {
    console.log('Error -> ', err);
    res.json({ error: err.message });
  }
};

// await Business.updateMany(
//   {},
//   [
//     {
//       $addFields: {
//         coordinates: {
//           type: 'Point',
//           coordinates: {
//             $map: {
//               input: {
//                 $reverseArray: {
//                   $split: ['$coordinates', ','],
//                 },
//               },
//               as: 'c',
//               in: {
//                 $convert: {
//                   input: '$$c',
//                   to: 'double',
//                   onError: '',
//                   onNull: '',
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//   ],
//   {
//     multi: true,
//   }
// );
// res.send('Done');

// const searchResults = await Business.updateMany(
//   // Match all documents
//   {},
//   // MongoDB 4.2+ can use an aggregation pipeline for updates
//   [
//     {
//       $set: {
//         coordinates: `124.5232, -44.25635`,
//       },
//     },
//   ]
// );
