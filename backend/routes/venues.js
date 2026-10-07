const router = require('express').Router();
const { body } = require('express-validator');
const db = require('../db');
const httpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { authenticate, authorize, apiKey } = require('../middleware/auth');

const rules = [
  body('name').trim().notEmpty(),
  body('address').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive number'),
  validate
];

router.get('/', apiKey, async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const sortable = ['name', 'city', 'capacity'];
  const sort = sortable.includes(req.query.sort) ? req.query.sort : 'id';
  const order = req.query.order === 'desc' ? 'DESC' : 'ASC';
  const s = `%${req.query.search || ''}%`;
  const [rows] = await db.query(
    `SELECT * FROM venues WHERE name LIKE ? OR city LIKE ? ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
    [s, s, limit, (page - 1) * limit]);
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM venues WHERE name LIKE ? OR city LIKE ?', [s, s]);
  res.json({ page, limit, total, data: rows });
});

router.get('/:id', apiKey, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM venues WHERE id=?', [req.params.id]);
  if (!rows[0]) throw httpError(404, 'Venue not found');
  res.json(rows[0]);
});

router.post('/', authenticate, authorize('admin', 'organiser'), rules, async (req, res) => {
  const { name, address, city, capacity } = req.body;
  const [r] = await db.query('INSERT INTO venues (name,address,city,capacity) VALUES (?,?,?,?)',
    [name, address, city, capacity]);
  res.status(201).json({ id: r.insertId, name, address, city, capacity });
});

router.put('/:id', authenticate, authorize('admin', 'organiser'), rules, async (req, res) => {
  const { name, address, city, capacity } = req.body;
  const [r] = await db.query('UPDATE venues SET name=?,address=?,city=?,capacity=? WHERE id=?',
    [name, address, city, capacity, req.params.id]);
  if (!r.affectedRows) throw httpError(404, 'Venue not found');
  res.json({ message: 'Venue updated' });
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const [r] = await db.query('DELETE FROM venues WHERE id=?', [req.params.id]);
  if (!r.affectedRows) throw httpError(404, 'Venue not found');
  res.status(204).end();
});

module.exports = router;