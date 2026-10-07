const API = 'http://localhost:3000/api';
const API_KEY = 'my-demo-api-key-123';
const LIMIT = 5;

let token = localStorage.getItem('token') || '';
let user = JSON.parse(localStorage.getItem('user') || 'null');
let page = 1, total = 0;
let eventsCache = {}, venuesCache = {};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => 'RM' + Number(n).toFixed(2);
const toInput = d => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

function notify(text, ok = false) {
  const m = $('msg');
  m.textContent = text;
  m.className = ok ? 'ok' : 'err';
  clearTimeout(notify.t);
  notify.t = setTimeout(() => { m.textContent = ''; }, 6000);
}

// One function for every API call: adds the token and API key, turns errors into messages
async function api(path, { method = 'GET', body, key = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (key) headers['x-api-key'] = API_KEY;
  let res;
  try {
    res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) { logout(true); throw new Error('Session expired. Please log in again.'); }
    const details = (data.details || []).map(d => `${d.field}: ${d.message}`).join(', ');
    throw new Error((data.error || 'Request failed') + (details ? ` (${details})` : ''));
  }
  return data;
}

// Show or hide parts of the page by role
function applyRole() {
  const role = user ? user.role : 'guest';
  const rules = {
    guest: role === 'guest',
    auth: role !== 'guest',
    customer: role === 'customer',
    staff: role === 'admin' || role === 'organiser',
    admin: role === 'admin'
  };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !rules[el.dataset.show]; });
  $('who').textContent = user ? `${user.name} (${user.role})` : '';
}

function showView(name) {
  if ((name === 'bookings' || name === 'manage') && !user) name = 'login';
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'view-' + name; });
  if (name === 'events') loadEvents();
  if (name === 'bookings') loadBookings();
  if (name === 'manage') {
    loadVenues().then(loadManageEvents);
    if (user && user.role === 'admin') loadUsers();
  }
}

/* ---------- Auth ---------- */
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const d = await api('/auth/login', { method: 'POST', body: { email: $('l_email').value, password: $('l_pw').value } });
    token = d.token; user = d.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    notify(`Welcome ${user.name} (${user.role})`, true);
    applyRole(); showView('events');
  } catch (err) { notify(err.message); }
});

$('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await api('/auth/register', { method: 'POST',
      body: { name: $('r_name').value, email: $('r_email').value, password: $('r_pw').value } });
    notify('Account created. You can log in now.', true);
    $('registerForm').reset();
  } catch (err) { notify(err.message); }
});

function logout(silent) {
  token = ''; user = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  applyRole(); showView('login');
  if (!silent) notify('Logged out', true);
}

/* ---------- Events (public list with search, sort, filter, pagination) ---------- */
const eventCard = e => `
  <article class="card">
    <h3>${esc(e.title)}</h3>
    <p>${esc(e.venue_name)} · ${new Date(e.event_date).toLocaleString()}</p>
    <p><strong>${money(e.ticket_price)}</strong> · ${e.available_tickets} left</p>
    ${user && user.role === 'customer'
      ? (e.available_tickets > 0
        ? `<label>Qty <input type="number" id="qty${e.id}" value="1" min="1" max="10" style="width:70px"></label>
           <button data-action="book" data-id="${e.id}">Book</button>`
        : '<em>Sold out</em>')
      : ''}
  </article>`;

async function loadEvents() {
  try {
    const p = new URLSearchParams({ search: $('q').value, sort: $('sort').value, order: $('order').value, page, limit: LIMIT });
    if ($('maxPrice').value) p.set('max_price', $('maxPrice').value);
    const d = await api('/events?' + p, { key: true });
    total = d.total;
    $('pageInfo').textContent = `Page ${page} of ${Math.max(1, Math.ceil(total / LIMIT))}`;
    $('eventList').innerHTML = d.data.map(eventCard).join('') || '<p>No events found.</p>';
  } catch (err) { notify(err.message); }
}

function changePage(n) {
  const next = page + n;
  if (next < 1 || (next - 1) * LIMIT >= total) return;
  page = next; loadEvents();
}

/* ---------- Bookings ---------- */
async function book(id) {
  try {
    const d = await api('/bookings', { method: 'POST',
      body: { event_id: Number(id), quantity: Number($('qty' + id).value) } });
    notify(`Booking #${d.id} confirmed. Total ${money(d.total_price)}`, true);
    if (d.qr_code) {
      $('qrImg').src = d.qr_code;
      $('qrText').textContent = `Booking #${d.id}`;
      $('qrDialog').showModal();
    }
    loadEvents();
  } catch (err) { notify(err.message); }
}

async function loadBookings() {
  try {
    const rows = await api('/bookings');
    $('bookingList').innerHTML = rows.map(b => `
      <article class="card">
        <h3>#${b.id} ${esc(b.event_title)}</h3>
        <p>Qty ${b.quantity} · ${money(b.total_price)} · <span class="tag ${esc(b.status)}">${esc(b.status)}</span></p>
        ${b.status === 'confirmed' ? `<button class="danger" data-action="cancel" data-id="${b.id}">Cancel</button>` : ''}
      </article>`).join('') || '<p>No bookings yet.</p>';
  } catch (err) { notify(err.message); }
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking?')) return;
  try {
    await api(`/bookings/${id}/cancel`, { method: 'PATCH' });
    notify('Booking cancelled', true); loadBookings();
  } catch (err) { notify(err.message); }
}

/* ---------- Staff: events ---------- */
async function loadManageEvents() {
  try {
    const d = await api('/events?limit=50&sort=event_date', { key: true });
    eventsCache = {};
    d.data.forEach(e => { eventsCache[e.id] = e; });
    $('manageEvents').innerHTML = d.data.map(e => `
      <article class="card">
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.venue_name)} · ${e.available_tickets}/${e.total_tickets} left</p>
        <button data-action="editEvent" data-id="${e.id}">Edit</button>
        <button class="danger" data-action="deleteEvent" data-id="${e.id}">Delete</button>
      </article>`).join('') || '<p>No events.</p>';
  } catch (err) { notify(err.message); }
}

function editEvent(id) {
  const e = eventsCache[id];
  $('e_id').value = e.id;
  $('e_title').value = e.title;
  $('e_desc').value = e.description || '';
  $('e_venue').value = e.venue_id;
  $('e_date').value = toInput(e.event_date);
  $('e_price').value = e.ticket_price;
  $('e_total').value = e.total_tickets;
  $('eventFormTitle').textContent = 'Edit event #' + e.id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetEventForm() {
  $('eventForm').reset(); $('e_id').value = '';
  $('eventFormTitle').textContent = 'New event';
}

$('eventForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('e_id').value;
  const body = {
    title: $('e_title').value,
    description: $('e_desc').value,
    venue_id: Number($('e_venue').value),
    event_date: $('e_date').value ? $('e_date').value.replace('T', ' ') + ':00' : '',
    ticket_price: Number($('e_price').value),
    total_tickets: Number($('e_total').value)
  };
  try {
    await api(id ? '/events/' + id : '/events', { method: id ? 'PUT' : 'POST', body });
    notify(id ? 'Event updated' : 'Event created', true);
    resetEventForm(); loadManageEvents();
  } catch (err) { notify(err.message); }
});

/* ---------- Staff: venues ---------- */
async function loadVenues() {
  try {
    const d = await api('/venues?limit=50&sort=name', { key: true });
    venuesCache = {};
    d.data.forEach(v => { venuesCache[v.id] = v; });
    $('e_venue').innerHTML = d.data.map(v => `<option value="${v.id}">${esc(v.name)}</option>`).join('');
    $('venueList').innerHTML = d.data.map(v => `
      <article class="card">
        <h3>${esc(v.name)}</h3>
        <p>${esc(v.city)} · capacity ${v.capacity}</p>
        <button data-action="editVenue" data-id="${v.id}">Edit</button>
        <button class="danger" data-action="deleteVenue" data-id="${v.id}">Delete</button>
      </article>`).join('');
  } catch (err) { notify(err.message); }
}

function editVenue(id) {
  const v = venuesCache[id];
  $('v_id').value = v.id; $('v_name').value = v.name; $('v_address').value = v.address;
  $('v_city').value = v.city; $('v_capacity').value = v.capacity;
  $('venueFormTitle').textContent = 'Edit venue #' + v.id;
}

function resetVenueForm() {
  $('venueForm').reset(); $('v_id').value = '';
  $('venueFormTitle').textContent = 'New venue';
}

$('venueForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('v_id').value;
  const body = { name: $('v_name').value, address: $('v_address').value,
    city: $('v_city').value, capacity: Number($('v_capacity').value) };
  try {
    await api(id ? '/venues/' + id : '/venues', { method: id ? 'PUT' : 'POST', body });
    notify(id ? 'Venue updated' : 'Venue created', true);
    resetVenueForm(); loadVenues();
  } catch (err) { notify(err.message); }
});

/* ---------- Admin: users ---------- */
async function loadUsers() {
  try {
    const rows = await api('/users');
    $('userList').innerHTML = rows.map(u => `
      <article class="card">
        <h3>${esc(u.name)}</h3>
        <p>${esc(u.email)} · ${esc(u.role)}</p>
        <button class="danger" data-action="deleteUser" data-id="${u.id}">Delete</button>
      </article>`).join('');
  } catch (err) { notify(err.message); }
}

/* ---------- Shared delete helper and click handling ---------- */
async function remove(path, label, reload) {
  if (!confirm(`Delete this ${label}?`)) return;
  try {
    await api(path, { method: 'DELETE' });
    notify(label + ' deleted', true); reload();
  } catch (err) { notify(err.message); }
}

const actions = {
  logout: () => logout(),
  search: () => { page = 1; loadEvents(); },
  prev: () => changePage(-1),
  next: () => changePage(1),
  book, cancel: cancelBooking,
  editEvent, resetEvent: resetEventForm,
  deleteEvent: id => remove('/events/' + id, 'event', loadManageEvents),
  editVenue, resetVenue: resetVenueForm,
  deleteVenue: id => remove('/venues/' + id, 'venue', loadVenues),
  deleteUser: id => remove('/users/' + id, 'user', loadUsers)
};

document.addEventListener('click', e => {
  const v = e.target.closest('[data-view]');
  if (v) return showView(v.dataset.view);
  const b = e.target.closest('[data-action]');
  if (b && actions[b.dataset.action]) actions[b.dataset.action](b.dataset.id);
});

applyRole();
showView('events');