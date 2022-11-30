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

  async sendEmailVerificationLinkForPasswordReset(email, link) {
    const options = {
      from: 'Local Inspire',
      to: email,
      subject: 'Reset your Password',
      html: `<p>Please click the link below to reset your password.</p><br/>${link}`,
    };
    const feedback = await this.#transporter.sendMail(options);
    return feedback;
  }

  async sendAccountConfirmationRequestEmail(email, link, userFirstName) {
    const options = {
      from: 'Local Inspire',
      to: email,
      subject: 'Confirm your account on Local Inspire',
      html: `
        <div>
          <p>Dear ${userFirstName},</p>
          <p>Thank you for joining us at Local Inspire.</p>
          <p style="margin-bottom: 30px">To complete the registration process, comfirm your account by clicking the link below.</p>
          <br/>
          <a href='${link}' style="background: #0955a1; color: #fff; padding: 7px 15px; border-radius: 999px; text-align: center;">Confirm My Account</a>
        </div>
      `,
    };
    const feedback = await this.#transporter.sendMail(options);
    return feedback;
  }
}

module.exports = new EmailService();
