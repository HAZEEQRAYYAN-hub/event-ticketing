// Backend endpoints: /api/bookings  (all need the user to be logged in)
import { apiRequest } from './client'

// POST /api/bookings  ->  { id, event_id, quantity, total_price, status, qr_code }
export function createBooking(eventId, quantity) {
  return apiRequest('/bookings', {
    method: 'POST',
    body: { event_id: Number(eventId), quantity: Number(quantity) },
  })
}

// GET /api/bookings  ->  bookings, newest first (includes event_title)
// The backend decides what you get: a customer gets only their own,
// an admin gets every booking. So both functions call the same endpoint.
export function getMyBookings() {
  return apiRequest('/bookings')
}

export function getAllBookings() {
  return apiRequest('/bookings')
}

// GET /api/bookings/:id  ->  one booking
export function getBooking(id) {
  return apiRequest(`/bookings/${id}`)
}

// PATCH /api/bookings/:id/approve  ->  { message: 'Booking approved' }  (admin only)
export function approveBooking(id) {
  return apiRequest(`/bookings/${id}/approve`, { method: 'PATCH' })
}

// PATCH /api/bookings/:id/cancel  ->  { message: 'Booking cancelled' }
// Customers use this to cancel; admins use it to reject a pending booking.
export function cancelBooking(id) {
  return apiRequest(`/bookings/${id}/cancel`, { method: 'PATCH' })
}
