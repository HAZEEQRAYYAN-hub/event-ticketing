const router = require('express').Router();
const { body } = require('express-validator');
const db = require('../db');
const httpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const generateQr = require('../utils/qr');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('customer'), [
  body('event_id').isInt({ min: 1 }),
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be 1 to 10'),
  validate
], async (req, res) => {
  const { event_id, quantity } = req.body;
  const conn = await db.getConnection();
  let bookingId, total;
  try {
    await conn.beginTransaction();
    const [[event]] = await conn.query(
      "SELECT * FROM events WHERE id=? AND status='published' FOR UPDATE", [event_id]);
    if (!event) throw httpError(404, 'Event not found or not open for booking');
    if (event.available_tickets < quantity) throw httpError(409, 'Not enough tickets available');
    total = event.ticket_price * quantity;
    const [r] = await conn.query(
      'INSERT INTO bookings (user_id,event_id,quantity,total_price) VALUES (?,?,?,?)',
      [req.user.id, event_id, quantity, total]);
    bookingId = r.insertId;
    await conn.query('UPDATE events SET available_tickets = available_tickets - ? WHERE id=?',
      [quantity, event_id]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }

  let qr_code = null;
  try { qr_code = await generateQr(`BOOKING-${bookingId}-EVENT-${event_id}`); } catch (e) { console.error('QR failed', e.message); }
  res.status(201).json({ id: bookingId, event_id, quantity, total_price: total, status: 'confirmed', qr_code });
});

router.get('/', authenticate, async (req, res) => {
  const base = `SELECT b.*, e.title AS event_title FROM bookings b JOIN events e ON e.id=b.event_id`;
  const [rows] = req.user.role === 'customer'
    ? await db.query(`${base} WHERE b.user_id=? ORDER BY b.booked_at DESC`, [req.user.id])
    : await db.query(`${base} ORDER BY b.booked_at DESC`);
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM bookings WHERE id=?', [req.params.id]);
  const b = rows[0];
  if (!b) throw httpError(404, 'Booking not found');
  if (req.user.role === 'customer' && b.user_id !== req.user.id) throw httpError(403, 'Not your booking');
  res.json(b);
});

router.patch('/:id/cancel', authenticate, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[b]] = await conn.query('SELECT * FROM bookings WHERE id=? FOR UPDATE', [req.params.id]);
    if (!b) throw httpError(404, 'Booking not found');
    if (req.user.role === 'customer' && b.user_id !== req.user.id) throw httpError(403, 'Not your booking');
    if (b.status === 'cancelled') throw httpError(409, 'Booking already cancelled');
    await conn.query("UPDATE bookings SET status='cancelled' WHERE id=?", [b.id]);
    await conn.query('UPDATE events SET available_tickets = available_tickets + ? WHERE id=?', [b.quantity, b.event_id]);
    await conn.commit();
    res.json({ message: 'Booking cancelled' });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const [r] = await db.query('DELETE FROM bookings WHERE id=?', [req.params.id]);
  if (!r.affectedRows) throw httpError(404, 'Booking not found');
  res.status(204).end();
});

module.exports = router;