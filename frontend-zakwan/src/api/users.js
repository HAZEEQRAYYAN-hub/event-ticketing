// Backend endpoints: /api/users  (a customer can only see and edit themselves)
import { apiRequest } from './client'

// GET /api/users  ->  every user (admin only). Used to show customer names on bookings.
export function getUsers() {
  return apiRequest('/users')
}

// GET /api/users/:id  ->  { id, name, email, role }
export function getUser(id) {
  return apiRequest(`/users/${id}`)
}

// PUT /api/users/:id  ->  { message: 'User updated' }  (only the name can change)
export function updateUserName(id, name) {
  return apiRequest(`/users/${id}`, { method: 'PUT', body: { name } })
}
