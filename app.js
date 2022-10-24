const express = require('express');
const cors = require('cors');
const userRouter = require('./routers/userRouter.js');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/v1/users', userRouter);

module.exports = app;
