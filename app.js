const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const userRouter = require('./routers/userRouter.js');
const businessRouter = require('./routers/businessRouter.js');
const cityRouter = require('./routers/cityRouter');
const questionRouter = require('./routers/questionRouter');
const reviewRouter = require('./routers/reviewRouter');
const reportRouter = require('./routers/reportRouter');
const msgRouter = require('./routers/msgRouter');
const adminRouter = require('./routers/adminRouter');

const app = express();

app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://localinspire.vercel.app',
    methods: ['GET', 'POST', 'PATCH', 'HEAD'],
  })
);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/businesses', businessRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/cities', cityRouter);
app.use('/api/v1/questions', questionRouter);
app.use('/api/v1/messages', msgRouter);
app.use('/api/v1/admin', adminRouter);

app.use('/api/v1/report', reportRouter);

// app.all('*', (req, res) => {
//   res.status(400).send(`Invalid url: `, req.originalUrl);
// });

module.exports = app;
