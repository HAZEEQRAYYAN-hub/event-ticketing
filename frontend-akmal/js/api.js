/* api.js
   Everything that talks to the backend lives in this file.
   Events and venues can be read with the API key alone, which is what lets a guest browse.
   Everything else needs the JWT from signing in.
   Pages never call fetch() themselves. They call Api.events.list(), Api.venues.create() and so on. */

/* An error that remembers the HTTP status and any field messages the API sent back. */
class ApiError extends Error {
  constructor(message, status = 0, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;    // 0 means the request never reached the server
    this.details = details;  // [{ field, message }] from the validation middleware
  }

  // Turns [{ field: 'title', message: 'Title is required' }] into { title: 'Title is required' }
  get fieldErrors() {
    const map = {};
    this.details.forEach(d => { if (!map[d.field]) map[d.field] = d.message; });
    return map;
  }
}

/* The signed-in user and their JWT.
   Kept in sessionStorage, so closing the tab signs a staff member out. */
const Session = {
  KEY: 'boxoffice.session',
  token: '',
  user: null,

  load() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(this.KEY) || 'null');
      if (saved) { this.token = saved.token; this.user = saved.user; }
    } catch {
      this.clear();
    }
  },

  save(token, user) {
    this.token = token;
    this.user = user;
    sessionStorage.setItem(this.KEY, JSON.stringify({ token, user }));
  },

  clear() {
    this.token = '';
    this.user = null;
    sessionStorage.removeItem(this.KEY);
  },

  // The middle part of a JWT is base64 JSON. It holds "exp", the expiry time in seconds.
  expiresAt() {
    try {
      const middle = this.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return new Date(JSON.parse(atob(middle)).exp * 1000);
    } catch {
      return null;
    }
  },

  isExpired() {
    const expiry = this.expiresAt();
    return !expiry || expiry <= new Date();
  },

  // Someone who has not signed in is treated as one more role, "guest"
  get role() { return this.user ? this.user.role : 'guest'; },
  get isAdmin() { return this.role === 'admin'; },
  get isStaff() { return this.role === 'admin' || this.role === 'organiser'; },
  get isCustomer() { return this.role === 'customer'; }
};

/* One function for every request: builds the URL, adds the headers,
   and turns every kind of failure into an ApiError with a readable message. */
async function request(path, { method = 'GET', body, query } = {}) {
  let url = CONFIG.API_URL + path;

  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) qs.set(key, value);
    });
    if (qs.toString()) url += '?' + qs;
  }

  const headers = { 'x-api-key': CONFIG.API_KEY };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (Session.token) headers.Authorization = 'Bearer ' + Session.token;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(`Can't reach the API at ${CONFIG.API_URL}. Check that the backend is running.`);
  }

  if (res.status === 204) return null;              // deleted, nothing to read
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;

  // A 401 about the token means the JWT ran out (it lasts 2 hours). Send the user back to sign in.
  if (res.status === 401 && Session.token && /token/i.test(data.error || '')) {
    Session.clear();
    window.dispatchEvent(new Event('session-expired'));
    throw new ApiError('Your session has expired. Sign in again.', 401);
  }

  if (res.status === 429) {
    throw new ApiError('Too many requests. The API allows 100 every 15 minutes, so wait a little and try again.', 429);
  }

  throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.details || []);
}

/* The endpoints this frontend uses, grouped by resource. */
const Api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  // The API always creates a customer account, whatever is sent
  register: (name, email, password) => request('/auth/register', { method: 'POST', body: { name, email, password } }),

  events: {
    list:   query      => request('/events', { query }),
    get:    id         => request(`/events/${id}`),
    create: body       => request('/events', { method: 'POST', body }),
    update: (id, body) => request(`/events/${id}`, { method: 'PUT', body }),
    remove: id         => request(`/events/${id}`, { method: 'DELETE' })
  },

  venues: {
    list:   query      => request('/venues', { query }),
    create: body       => request('/venues', { method: 'POST', body }),
    update: (id, body) => request(`/venues/${id}`, { method: 'PUT', body }),
    remove: id         => request(`/venues/${id}`, { method: 'DELETE' })
  },

  bookings: {
    list:   ()  => request('/bookings'),        // staff get every booking, a customer gets their own
    create: body => request('/bookings', { method: 'POST', body }),   // customers only
    get:    id  => request(`/bookings/${id}`),
    cancel: id  => request(`/bookings/${id}/cancel`, { method: 'PATCH' }),
    remove: id  => request(`/bookings/${id}`, { method: 'DELETE' })
  },

  users: {
    list:   ()         => request('/users'),
    get:    id         => request(`/users/${id}`),
    rename: (id, name) => request(`/users/${id}`, { method: 'PUT', body: { name } }),
    remove: id         => request(`/users/${id}`, { method: 'DELETE' })
  }
};


/* The event form and the event filter both need the list of venues.
   Keep one copy and only ask the API again after a venue has changed,
   which also keeps us well under the API's rate limit. */
const Lookups = {
  _venues: null,

  async venues() {
    if (!this._venues) this._venues = (await Api.venues.list({ sort: 'name', limit: 50 })).data;
    return this._venues;
  },

  forgetVenues() { this._venues = null; }
};
