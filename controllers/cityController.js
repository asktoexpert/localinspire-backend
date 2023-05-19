const cityQueries = require('../databases/redis/queries/city.queries');
const Business = require('../models/Business');
const City = require('../models/City');
const arrayUtils = require('../utils/arrayUtils');
const { toTitleCase } = require('../utils/string-utils');

exports.getAllCities = async (req, res) => {
  try {
    const cities = await City.find({}).select('name imgUrl isFeatured searchesCount');
    res.status(200).json({ results: cities.length, cities });
  } catch (err) {
    console.log('Error: ', err);

    res.status(500).json({
      status: 'ERROR',
      msg: err.message,
    });
  }
};

exports.searchCities = async (req, res, next) => {
  const { textQuery } = req.searchCitiesParams || req.query;

  try {
    // const cities = await Business.find({
    //   city: { $regex: `^${textQuery}.*`, $options: 'i' },
    // })
    //   .select('city stateCode')
    //   .distinct('city');
    let [cityQuery, stateQuery] = textQuery.split('-');

    [cityQuery, stateQuery] = [
      toTitleCase(cityQuery.toLowerCase().trim()),
      stateQuery?.toUpperCase().trim(),
    ];
    console.log({ cityQuery, stateQuery });

    const filters = { city: { $regex: `^${cityQuery}` } };

    if (stateQuery) filters.stateCode = { $regex: `^${stateQuery}` };

    if (!req.query.populateFields) {
      const cities = await City.find(filters);
      return res.status(200).json({ status: 'SUCCESS', cities });
    }

    const [result] = await Business.aggregate([
      { $match: filters },
      { $project: { cityInState: { $concat: ['$city', ', ', '$stateCode'] } } },
      { $group: { _id: null, cities: { $addToSet: '$cityInState' } } },
      { $project: { _id: 0 } },
    ]);

    if (!result?.cities) {
      return res.json({ source: 'db', results: 0, cities: [] });
    }

    // Cache matching cities
    let { cities } = result;
    console.log({ cities });

    if (cities.length) {
      cities.sort((prev, next) => prev.length - next.length); // In asc order of string length
      await cityQueries.cacheCitySearchResults(cities);
    }

    res.status(200).json({ source: 'db', results: cities.length, cities });
  } catch (err) {
    console.log('Error: ', err);

    res.status(500).json({
      status: 'ERROR',
      source: 'db',
      msg: err.message,
    });
  }
};

exports.toggleCityFeatured = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    city.isFeatured = !city.isFeatured;

    await city.save();
    res.status(200).json({ city });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
};

exports.getStateNames = async (req, res) => {
  try {
    const stateNames = await City.find({}).select('stateName');
    res.status(200).json({ results: stateNames.length, stateNames });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
};

exports.resizeCityPhoto = async (req, res, next) => {
  try {
    // Validate uploaded photo
    if (!req.file.mimeType.endsWith('image'))
      return res.status(400).json({
        msg: `Uploaded file of type ${req.file.mimeType} is not an image`,
      });

    // Store image in filesystem
    const filePath = `public/img/cities/city-${req.params.cityId}-${Date.now()}.jpeg`;

    // Resize photo
    const sharpResult = await sharp(req.file.buffer)
      .resize(2000, 1333)
      .jpeg({ quality: 90 })
      .toFormat('jpeg');

    // Delete file from our server
    fs.unlink(filePath, err => {
      console.log(
        err ? 'Could not delete city photo from server' : 'City photo deleted successfully'
      );
    });
    res.json({ status: 'success' });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
};

exports.updateCity = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (req.body.price) {
      const stripePrices = await stripe.prices.list();
      const existingStripePrice = stripePrices.data.find(pr => {
        return pr.unit_amount / 100 === req.body.price;
      });

      if (existingStripePrice) {
        const cityClaimProduct = stripePrices.data.find(price =>
          price.product.name.toLowerCase().includes('city claim')
        );

        // Create a new price
        const newPrice = await stripe.prices.create({
          unit_amount: req.body.price,
          currency: 'usd',
          recurring: { interval: 'month' },
          product: cityClaimProduct.id,
        });

        city.price = { amount: req.body.price, currency: newPrice.currency };
      } else {
        city.price = {
          amount: req.body.price,
          currency: existingStripePrice.currency,
          stripePriceId: existingStripePrice.id,
          stripePriceNickname: existingStripePrice.nickname,
        };
      }
      await city.save();
    }

    const updatedCity = await City.findByIdAndUpdate(city._id, req.body);
    res.status(200).json({
      msg: `${city.name} has been updated successfully`,
      city: updatedCity,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: '400', error: err.message });
  }
};
