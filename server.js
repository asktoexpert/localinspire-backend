const http = require('http');
const app = require('./app');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { connectMongooseDB } = require('./databases/mongoose');

dotenv.config({ path: './config.env' });

connectMongooseDB()
  .then(conn => {
    console.log('Mongoose connected successfully');
  })
  .catch(err => console.log('Error in mongoose connection: ', err));

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, console.log.bind(null, `Server running at port ${PORT}`));
