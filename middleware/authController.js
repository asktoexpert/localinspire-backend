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
