require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json());
app.use(require('./middleware/logger'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 100,
  message: { error: 'Too many requests, try again later' } }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/events', require('./routes/events'));
app.use('/api/bookings', require('./routes/bookings'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(require('./middleware/errorHandler'));

app.listen(process.env.PORT || 3000, () => console.log('API running'));