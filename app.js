const express = require('express');
const cors = require('cors');
const userRouter = require('./routers/userRouter.js');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.json({ extended: true }));
app.use('/api/v1/users', userRouter);

// app.all('*', (req, res) => {
//   res.status(400).send(`Invalid url: `, req.originalUrl);
// });

module.exports = app;
