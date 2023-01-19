const path = require('path');
const express = require('express');
const cors = require('cors');

const userRouter = require('./routers/userRouter.js');
const businessRouter = require('./routers/businessRouter.js');
const cityRouter = require('./routers/cityRouter');
const bodyParser = require('body-parser');

const app = express();

app.use(cors({}));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.text({ type: '/' }));

app.use(express.json());
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/businesses', businessRouter);
app.use('/api/v1/cities', cityRouter);

// app.all('*', (req, res) => {
//   res.status(400).send(`Invalid url: `, req.originalUrl);
// });

module.exports = app;
