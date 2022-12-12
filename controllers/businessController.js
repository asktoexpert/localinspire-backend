const Business = require('../models/Business');
const stringUtils = require('../utils/string-utils');
const businessQueries = require('../databases/redis/queries/business.queries');
const arrayUtils = require('../utils/arrayUtils');

exports.searchBusinessCategories = async function (req, res, next) {
  const { textQuery } = req.searchCategParams;
  console.log('Query in main controller: ', textQuery);

  const caseSensitiveQuery = stringUtils.toTitleCase(textQuery);
  console.log({ caseSensitiveQuery });

  try {
    const results = await Business.find({
      SIC8: { $regex: `^${caseSensitiveQuery}` },
    }).select('SIC8 -_id');

    let categories;

    if (results.length) {
      categories = [...new Set(results.map(categ => categ.SIC8))];
      await businessQueries.cacheBusinessCategories(categories);
    }

    return res.json({
      status: 'SUCCESS',
      source: 'db',
      categories: categories || [],
      results: categories.length,
    });

    // const [result] = await Business.aggregate([
    //   { $match: { SIC8: { $regex: `^${caseSensitiveQuery}` } } },
    //   // { $match: { SIC8: { $regex: new RegExp(`/^${textQuery}/`, 'i') } } },
    //   { $project: { SIC8: 1 } },
    //   { $group: { categories: { $addToSet: '$SIC8' }, _id: null } },
    //   // { $project: { _id: 0 } },
    // ]);

    // console.log('Result: ', result);
    // if (!result?.categories) throw new Error('');

    // const { categories } = result;
    // // if (categories.length) await businessQueries.cacheBusinessCategories(categories);

    // return res.status(200).json({
    //   status: 'SUCCESS',
    //   source: 'db',
    //   results: categories.length,
    //   categories: categories,
    // });
  } catch (err) {
    console.log('Error log: ', err);
    return res.status(200).json({
      status: 'ERROR',
      source: 'db',
    });
  }
};

// Search businesses
exports.findBusinesses = async function (req, res, next) {
  const { category, cityName, stateCode, page, limit } = req.businessSearchParams;

  if (!category || !cityName || !stateCode)
    return res.status(200).json({ status: 'SUCCESS', results: 0, businesses: [] });

  try {
    // Find businesses whose SIC8 is like the query, city matches and state matches
    const businesses = await Business.find({
      SIC8: { $regex: `${category}`, $options: 'i' },
      city: { $regex: `^${cityName}`, $options: 'i' },
      stateCode: stateCode.toUpperCase(),
    });

    const pagedBusinesses = await arrayUtils.paginate({ array: businesses, page, limit });

    // Cache search results
    if (businesses.length) {
      await businessQueries.cacheBusinessSearchResults({
        keyword: category,
        cityName,
        stateCode,
        businesses,
      });
    }

    res.status(200).json({
      status: 'SUCCESS',
      source: 'db',
      results: pagedBusinesses.length,
      allResults: businesses.length,
      businesses: pagedBusinesses,
    });
  } catch (err) {
    console.log('Error log: ', err);
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
