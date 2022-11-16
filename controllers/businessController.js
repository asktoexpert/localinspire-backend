const Business = require('../models/Business');
const stringUtils = require('../utils/string-utils');
const businessQueries = require('../databases/redis/queries/business.queries');
const arrayUtils = require('../utils/arrayUtils');

exports.searchBusinessCategories = async function (req, res, next) {
  const { textQuery } = req.searchCategParams;
  console.log('Query in main controller: ', textQuery);

  const categories = await Business.find({
    SIC8Category: { $regex: `^${textQuery}.*`, $options: 'i' },
  }).distinct('SIC8Category');

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
  // const skip = page > 0 ? (page - 1) * limit : 0;

  if (!category || !cityName || !stateCode)
    return res.status(200).json({ status: 'SUCCESS', results: 0, businesses: [] });

  try {
    // Find businesses whose fields match the query
    const businesses = await Business.find({
      // SIC8Category: { $regex: `${category}`, $options: 'i' },
      // SIC8Category: { $regex: `/^${category}`, $options: 'i' },
      SIC8Category: stringUtils.toTitleCase(category),
      city: stringUtils.toTitleCase(cityName),
      stateCode: stateCode.toUpperCase(),
    });

    const paginatedResults = await arrayUtils.paginate({
      array: businesses,
      page,
      limit,
    });

    // Store in Redis if there are search results
    if (businesses.length) {
      // Get search keyword based on search query.
      const keyword = !!businesses.length && businesses?.[0]?.SIC8Category;
      console.log('searchKeyWord: ', keyword);
      await businessQueries.cacheBusinessSearchResults({
        keyword,
        cityName,
        stateCode,
        businesses,
      });
    }

    res.status(200).json({
      status: 'SUCCESS',
      source: 'db',
      results: paginatedResults.length,
      allResults: businesses.length,
      businesses: paginatedResults,
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

// const businesses = await Business.updateMany(
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
