const express = require('express');
const cors = require('cors');

const userRouter = require('./routers/userRouter.js');
const businessRouter = require('./routers/businessRouter.js');
const cityRouter = require('./routers/cityRouter');
const app = express();

app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  next();
});
app.use(express.json());
app.use(express.json({ extended: true }));

// Routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/businesses', businessRouter);
app.use('/api/v1/cities', cityRouter);

// app.all('*', (req, res) => {
//   res.status(400).send(`Invalid url: `, req.originalUrl);
// });

module.exports = app;
