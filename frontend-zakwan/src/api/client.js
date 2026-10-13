// THE ONLY FILE THAT TALKS TO THE BACKEND DIRECTLY.
// Every other file calls apiRequest() instead of using fetch() itself.
// That way the API key, the login token and error handling are done in one place.

const API_URL = import.meta.env.VITE_API_URL
const API_KEY = import.meta.env.VITE_API_KEY

// Where the login session is saved in the browser
export const SESSION_KEY = 'tixora.session'

// A special kind of error that also remembers the HTTP status code
// (for example 404) and any form field problems the backend sent back.
export class ApiError extends Error {
  constructor(message, status = 0, details = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status   // 0 means the request never reached the backend
    this.details = details // [{ field: 'email', message: 'Valid email required' }]
  }

  // Turns details into { email: 'Valid email required' } so forms can show
  // each message under the right box.
  get fieldErrors() {
    const errors = {}
    for (const item of this.details) {
      if (!errors[item.field]) errors[item.field] = item.message
    }
    return errors
  }
}

// Reads the saved login (token + user) from the browser, or null
export function readSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

// Clear messages for errors that are not the backend's fault
const FRIENDLY_MESSAGES = {
  429: 'Too many requests in a short time. Please wait a few minutes and try again.',
  500: 'Something went wrong on the server. Please try again.',
}

/**
 * Sends one request to the backend.
 *   path:   '/events'
 *   method: 'GET', 'POST', 'PUT', 'PATCH' or 'DELETE'
 *   body:   data to send (for POST, PUT, PATCH)
 *   params: values for the URL, e.g. { page: 2 } becomes ?page=2
 */
export async function apiRequest(path, { method = 'GET', body, params } = {}) {
  // 1. Build the full address, skipping empty params
  const url = new URL(API_URL + path)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    }
  }

  // 2. Headers: the API key always, the login token when logged in
  const headers = { 'x-api-key': API_KEY }
  if (body) headers['Content-Type'] = 'application/json'

  const session = readSavedSession()
  if (session?.token) headers.Authorization = `Bearer ${session.token}`

  // 3. Send it
  let response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(
      "Can't reach the Tixora server. Check that the backend is running, then try again.",
    )
  }

  // 4. "204 No Content" means success with nothing to read
  if (response.status === 204) return null

  let data = null
  try {
    data = await response.json()
  } catch {
    // The backend sent something that is not JSON. Leave data as null.
  }

  // 5. Anything that is not 2xx is an error
  if (!response.ok) {
    // A 401 while logged in means the token expired. Tell the app to log out.
    if (response.status === 401 && session?.token && !path.startsWith('/auth')) {
      window.dispatchEvent(new Event('tixora:session-expired'))
    }

    const message =
      FRIENDLY_MESSAGES[response.status] || data?.error || `Request failed (${response.status})`
    throw new ApiError(message, response.status, data?.details || [])
  }

  return data
}
