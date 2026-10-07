const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate
], async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const [r] = await db.query(
    'INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,"customer")', [name, email, hash]);
  res.status(201).json({ id: r.insertId, name, email, role: 'customer' });
});

router.post('/login', [body('email').isEmail(), body('password').notEmpty(), validate],
async (req, res) => {
  const [rows] = await db.query('SELECT * FROM users WHERE email=?', [req.body.email]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(req.body.password, u.password_hash)))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, user: { id: u.id, name: u.name, role: u.role } });
});

module.exports = router;