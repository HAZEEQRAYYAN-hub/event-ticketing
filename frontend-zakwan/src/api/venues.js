// Backend endpoints: /api/venues  (reading only)
import { apiRequest } from './client'

// GET /api/venues  ->  { page, limit, total, data: [venues] }
export function getVenues(params = {}) {
  return apiRequest('/venues', { params })
}

// GET /api/venues/:id  ->  one venue (name, address, city, capacity)
export function getVenue(id) {
  return apiRequest(`/venues/${id}`)
}
