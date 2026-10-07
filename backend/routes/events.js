const router = require('express').Router();
const { body } = require('express-validator');
const db = require('../db');
const httpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { authenticate, authorize, apiKey } = require('../middleware/auth');

const rules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('venue_id').isInt({ min: 1 }).withMessage('Valid venue_id required'),
  body('event_date').isISO8601().withMessage('Use format YYYY-MM-DD HH:mm:ss'),
  body('ticket_price').isFloat({ min: 0 }).withMessage('Price must be 0 or more'),
  body('total_tickets').isInt({ min: 1 }).withMessage('Total tickets must be at least 1'),
  body('status').optional().isIn(['draft', 'published', 'cancelled']),
  validate
];

router.get('/', apiKey, async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const sortable = ['event_date', 'ticket_price', 'title'];
  const sort = sortable.includes(req.query.sort) ? req.query.sort : 'event_date';
  const order = req.query.order === 'desc' ? 'DESC' : 'ASC';
  const s = `%${req.query.search || ''}%`;

  const where = ['(e.title LIKE ? OR e.description LIKE ?)', 'e.status = ?'];
  const params = [s, s, req.query.status || 'published'];
  if (req.query.venue_id) { where.push('e.venue_id = ?'); params.push(req.query.venue_id); }
  if (req.query.min_price) { where.push('e.ticket_price >= ?'); params.push(req.query.min_price); }
  if (req.query.max_price) { where.push('e.ticket_price <= ?'); params.push(req.query.max_price); }
  const clause = where.join(' AND ');

  const [rows] = await db.query(
    `SELECT e.*, v.name AS venue_name FROM events e JOIN venues v ON v.id = e.venue_id
     WHERE ${clause} ORDER BY e.${sort} ${order} LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM events e WHERE ${clause}`, params);
  res.json({ page, limit, total, data: rows });
});

router.get('/:id', apiKey, async (req, res) => {
  const [rows] = await db.query(
    'SELECT e.*, v.name AS venue_name FROM events e JOIN venues v ON v.id = e.venue_id WHERE e.id = ?',
    [req.params.id]);
  if (!rows[0]) throw httpError(404, 'Event not found');
  res.json(rows[0]);
});

router.post('/', authenticate, authorize('admin', 'organiser'), rules, async (req, res) => {
  const { title, description, venue_id, event_date, ticket_price, total_tickets } = req.body;
  const [r] = await db.query(
    `INSERT INTO events (title,description,venue_id,organiser_id,event_date,ticket_price,total_tickets,available_tickets)
     VALUES (?,?,?,?,?,?,?,?)`,
    [title, description || null, venue_id, req.user.id, event_date, ticket_price, total_tickets, total_tickets]);
  res.status(201).json({ id: r.insertId, title, venue_id, event_date, ticket_price, total_tickets });
});

router.put('/:id', authenticate, authorize('admin', 'organiser'), rules, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
  const ev = rows[0];
  if (!ev) throw httpError(404, 'Event not found');
  if (req.user.role !== 'admin' && ev.organiser_id !== req.user.id)
    throw httpError(403, 'You can only edit your own events');

  const { title, description, venue_id, event_date, ticket_price, total_tickets, status } = req.body;
  const available = ev.available_tickets + (total_tickets - ev.total_tickets);
  if (available < 0) throw httpError(409, 'Total tickets cannot be lower than tickets already sold');

  await db.query(
    `UPDATE events SET title=?, description=?, venue_id=?, event_date=?, ticket_price=?,
     total_tickets=?, available_tickets=?, status=? WHERE id=?`,
    [title, description || null, venue_id, event_date, ticket_price, total_tickets, available,
     status || ev.status, req.params.id]);
  res.json({ message: 'Event updated' });
});

router.delete('/:id', authenticate, authorize('admin', 'organiser'), async (req, res) => {
  const [rows] = await db.query('SELECT organiser_id FROM events WHERE id = ?', [req.params.id]);
  if (!rows[0]) throw httpError(404, 'Event not found');
  if (req.user.role !== 'admin' && rows[0].organiser_id !== req.user.id)
    throw httpError(403, 'You can only delete your own events');
  await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

module.exports = router;