const { validationResult } = require('express-validator');
module.exports = (req, res, next) => {
  const e = validationResult(req);
  if (e.isEmpty()) return next();
  res.status(400).json({ error: 'Validation failed',
    details: e.array().map(x => ({ field: x.path, message: x.msg })) });
};