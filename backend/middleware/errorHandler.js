module.exports = (err, req, res, next) => {
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Record already exists' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Related record does not exist' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'Cannot delete: other records depend on this' });
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
};