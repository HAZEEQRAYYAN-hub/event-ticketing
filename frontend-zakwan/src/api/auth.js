// Backend endpoints: /api/auth
import { apiRequest } from './client'

// POST /api/auth/login  ->  { token, user: { id, name, role } }
export function loginRequest(email, password) {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password } })
}

// POST /api/auth/register  ->  { id, name, email, role }  (always a customer)
export function registerRequest(name, email, password) {
  return apiRequest('/auth/register', { method: 'POST', body: { name, email, password } })
}
