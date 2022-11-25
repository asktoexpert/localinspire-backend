const http = require('http');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const app = require('./app');
const { connectMongooseDB } = require('./databases/mongoose');
// const EmailService = require('./services/emailService');

// EmailService.sendMail({
//   from: '"Local Inspire" <foo@example.com>', // sender address
//   to: 'chimaorji25@gmail.com,', // list of receivers
//   subject: 'Hello, Testing NodeMailer ✔', // Subject line
//   text: 'This is just a dummy text to test email automation', // plain text body
//   html: '<p>Please use the verification code below to continue the register process. </p><br/><h5>10246</h5>', // html body
// })
//   .then(console.log)
//   .catch(console.log);
// const nodemailer = require('nodemailer');

// const sendMail = async () => {
//   let transporter = nodemailer.createTransport({
//     service: 'gmail',
//     // host: 'smtp.gmail.com',
//     auth: {
//       type: 'login', // default
//       user: 'chimaorji25@gmail.com',
//       pass: process.env.GOOGLE_NODEMAILER_PASSWORD,
//     },
//   });
//   const options = {
//     from: '"Local Inspire" <foo@example.com>', // sender address
//     to: 'chimaorji25@gmail.com,', // list of receivers
//     subject: 'Hello, Testing NodeMailer ✔', // Subject line
//     text: 'This is just a dummy text to test email automation', // plain text body
//     html: '<p>Please use the verification code below to continue the register process. </p><br/><h5>10246</h5>', // html body
//   };

//   let info = await transporter.sendMail(options);
//   console.log('Message sent: %s', info.messageId);
// };
// sendMail().then(console.log).catch(console.log);

connectMongooseDB()
  .then(conn => console.log('Mongoose connected successfully'))
  .catch(err => console.log('Error in mongoose connection: ', err));

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, console.log.bind(null, `Server running at port ${PORT}`));
