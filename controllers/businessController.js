const Business = require('../models/Business');
const stringUtils = require('../utils/string-utils');
const businessQueries = require('../databases/redis/queries/business.queries');

exports.searchBusinessCategories = async (req, res, next) => {
  const { textQuery } = req.searchCategParams;

  const categories = await Business.find({
    SIC4Category: { $regex: `${textQuery}`, $options: 'i' },
  }).distinct('SIC4Category');

  if (categories.length) await businessQueries.cacheBusinessCategories(categories);

  res.status(200).json({
    status: 'SUCCESS',
    source: 'db',
    results: categories.length,
    categories,
  });
};

// Find businesses based on location coords & matching coordinates
exports.findBusinesses = async (req, res, next) => {
  const { textQuery, cityName, stateCode } = req.businessSearchParams;

  if (!textQuery || !cityName || !stateCode)
    return res.status(200).json({ results: 0, businesses: [] });

  try {
    // Find businesses whose fields match/is-like the query
    const searchResults = await Business.find({
      SIC4Category: { $regex: `${textQuery}`, $options: 'i' },
      city: stringUtils.toTitleCase(cityName),
      stateCode,
    });

    // Get search keyword based on search query.
    const searchKeyWords =
      !!searchResults.length &&
      [...new Set(searchResults?.[0]?.SIC4Category.split(' '))].join(' ');

    console.log('searchKeyWords: ', searchKeyWords);

    // Store in Redis for quick access later
    await businessQueries.cacheBusinessSearchResults({
      keywords: searchKeyWords,
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
