const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token missing' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
};

exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next()
    : res.status(403).json({ error: 'You do not have permission' });

exports.apiKey = (req, res, next) =>
  req.headers['x-api-key'] === process.env.API_KEY ? next()
    : res.status(401).json({ error: 'Invalid or missing API key' });