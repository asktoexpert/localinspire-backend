const nodemailer = require('nodemailer');

class EmailService {
  #transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'login', // default
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  async sendEmailVerificationCode(emailTo, code) {
    const options = {
      from: 'Local Inspire',
      to: emailTo,
      subject: 'Verify your Email',
      html: `<p>Please use the verification code below to continue the registration process. </p><br/>${code
        .toString()
        .split('')
        .join(' ')}`,
    };
    const feedback = await this.#transporter.sendMail(options);
    return feedback;
  }
}

module.exports = new EmailService();
