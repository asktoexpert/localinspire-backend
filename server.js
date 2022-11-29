const http = require('http');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const app = require('./app');
const { connectMongooseDB } = require('./databases/mongoose');

connectMongooseDB()
  .then(conn => console.log('Mongoose connected successfully'))
  .catch(err => console.log('Error in mongoose connection: ', err));

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, console.log.bind(null, `Server running at port ${PORT}`));
