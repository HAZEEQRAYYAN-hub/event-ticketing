// Backend endpoints: /api/events  (reading only; customers cannot change events)
import { apiRequest } from './client'

// GET /api/events  ->  { page, limit, total, data: [events] }
// params can include: page, limit, search, venue_id, min_price, max_price, sort, order
export function getEvents(params = {}) {
  return apiRequest('/events', { params })
}

// GET /api/events/:id  ->  one event (includes venue_name)
export function getEvent(id) {
  return apiRequest(`/events/${id}`)
}
