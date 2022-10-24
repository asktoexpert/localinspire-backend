const mongoose = require('mongoose');

exports.connectMongooseDB = async function () {
  const DBUsername = process.env.MONGOOSE_DB_USERNAME;
  const DBPassword = process.env.MONGOOSE_DB_PASSWORD;
  const DBName = process.env.MONGOOSE_DB_NAME;

  const DBString = process.env.MONGOOSE_DB_URI.replace('<username>', DBUsername)
    .replace('<replace-with-your-password>', DBPassword)
    .replace('<db-name>', DBName);

  return mongoose.connect(DBString);
};
