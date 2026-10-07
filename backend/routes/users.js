const router = require('express').Router();
const { body } = require('express-validator');
const db = require('../db');
const httpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const own = (req) => req.user.role === 'admin' || String(req.user.id) === req.params.id;

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  const [rows] = await db.query('SELECT id,name,email,role,created_at FROM users');
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  if (!own(req)) throw httpError(403, 'You can only view your own profile');
  const [rows] = await db.query('SELECT id,name,email,role FROM users WHERE id=?', [req.params.id]);
  if (!rows[0]) throw httpError(404, 'User not found');
  res.json(rows[0]);
});

router.put('/:id', authenticate, [body('name').trim().notEmpty(), validate], async (req, res) => {
  if (!own(req)) throw httpError(403, 'You can only edit your own profile');
  const [r] = await db.query('UPDATE users SET name=? WHERE id=?', [req.body.name, req.params.id]);
  if (!r.affectedRows) throw httpError(404, 'User not found');
  res.json({ message: 'User updated' });
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const [r] = await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
  if (!r.affectedRows) throw httpError(404, 'User not found');
  res.status(204).end();
});

module.exports = router;