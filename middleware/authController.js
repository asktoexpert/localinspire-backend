const request = require('request');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const uuid = require('uuid');

exports.signToken = (userId, userEmail) => {
  const token = jwt.sign({ id: userId, email: userEmail }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
  return token;
};

exports.genRefreshToken = () => uuid.v4();

const googleVerify = async (token, clientUser) => {
  const url = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`;

  return new Promise((resolve, reject) => {
    const callback = (err, res, body) => {
      if (err) reject(err);
      const result = JSON.parse(body);
      console.log('Google Result: ', result);

      if (result.error) reject({ success: false });
      if (result.user_id === clientUser.id && result.email === clientUser.email)
        resolve({ success: true });
      reject({ success: false });
    };

    request(url, callback);
  });
};

const facebookVerify = async (token, clientUser) => {
  const url = `https://graph.facebook.com/me?access_token=${token}`;
  return new Promise((resolve, reject) => {
    request(url, (err, res, body) => {
      if (err) reject(err);

      const result = JSON.parse(body);
      console.log('Facebook Result: ', result);

      if (result.error) reject(result);

      if (result.id === clientUser.id) {
        if (!result.email) resolve({ success: true });
        if (result.email !== clientUser.email) reject({ success: false });
      }
      reject(result);
    });
  });
};

exports.verifyCredentials = (req, res, next) => {
  const { email, password } = req.body;
  console.log('Req body: ', req.body);

  if (!email || !password) {
    return res.status(400).json({
      status: 'FAIL',
      reason: 'BAD_CREDENTIALS',
    });
  }
  next();
};

exports.verifyOauthToken = async (req, res, next) => {
  const { provider } = req.params;
  const { user: clientUser, account } = req.body;

  console.log(provider, clientUser, account);

  try {
    switch (provider) {
      case 'google': {
        const { success } = await googleVerify(account.access_token, clientUser);
        if (success) {
          req.verifiedUser = clientUser;
          return next();
        }
        return res.status(400).json({ status: 'FAIL' });
      }
      case 'facebook': {
        const { success } = await facebookVerify(account.access_token, clientUser);
        if (success) {
          req.verifiedUser = clientUser;
          return next();
        }
        return res.status(400).json({ status: 'FAIL' });
      }
    }
  } catch (err) {
    console.log('ERR: ', err);
    res.status(400).json(err);
  }
};
