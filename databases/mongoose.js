const mongoose = require('mongoose');

exports.connectMongooseDB = async function () {
  const mongooseDBUsername = process.env.MONGOOSE_DB_USERNAME;
  const mongooseDBPassword = process.env.MONGOOSE_DB_PASSWORD;
  const mongooseDBName = process.env.MONGOOSE_DB_NAME;

  const DBString = process.env.MONGOOSE_DB_URI.replace('<username>', mongooseDBUsername)
    .replace('<password>', mongooseDBPassword)
    .replace('<database-name>', mongooseDBName);

  return mongoose.connect(DBString);
};
