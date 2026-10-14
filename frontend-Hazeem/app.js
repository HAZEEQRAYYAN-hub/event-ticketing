/* TicketHub – vanilla JS single-page frontend for the event-ticketing API */
const { API_BASE, API_KEY } = window.CONFIG;
const $app = document.getElementById("app");
const $nav = document.getElementById("nav");

/* ---------- state ---------- */
const state = {
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
};
function setSession(token, user) {
  state.token = token; state.user = user;
  if (token) { localStorage.setItem("token", token); localStorage.setItem("user", JSON.stringify(user)); }
  else { localStorage.removeItem("token"); localStorage.removeItem("user"); }
}
const isStaff = () => state.user && ["admin", "organiser"].includes(state.user.role);

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "RM " + Number(n).toFixed(2);
const fmtDate = (d) => new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const toLocalInput = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const $ = (sel, root = document) => root.querySelector(sel);

let toastTimer;
function toast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "toast" + (isError ? " error" : ""); t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3500);
}

class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
  get full() { return this.details?.length ? this.details.map((d) => d.message).join(", ") : this.message; }
}

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "x-api-key": API_KEY };
  if (body) headers["Content-Type"] = "application/json";
  if (auth && state.token) headers.Authorization = "Bearer " + state.token;
  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running at " + API_BASE + " ?");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth && state.token) {
      setSession(null, null); renderNav(); location.hash = "#/login";
      toast("Session expired, please log in again", true);
    }
    throw new ApiError(res.status, data.error || "Request failed", data.details);
  }
  return data;
}

const statusBadge = (s) => `<span class="badge ${s === "published" || s === "confirmed" ? "ok" : s === "draft" ? "warn" : "bad"}">${esc(s)}</span>`;

/* ---------- nav ---------- */
function renderNav() {
  const cur = location.hash || "#/";
  const link = (h, t) => `<a href="${h}" class="${cur === h ? "active" : ""}">${t}</a>`;
  let html = link("#/", "Events");
  if (state.user) {
    html += link("#/bookings", state.user.role === "customer" ? "My Bookings" : "Bookings");
    if (isStaff()) html += link("#/manage", "Manage");
    html += `<span class="who">${esc(state.user.name)} (${esc(state.user.role)})</span><button id="logout">Log out</button>`;
  } else {
    html += link("#/login", "Log in") + link("#/register", "Register");
  }
  $nav.innerHTML = html;
  const lo = $("#logout");
  if (lo) lo.onclick = () => { setSession(null, null); renderNav(); location.hash = "#/"; toast("Logged out"); };
}

/* ---------- router ---------- */
const routes = [
  [/^#\/$/, viewEvents],
  [/^#\/event\/(\d+)$/, viewEvent],
  [/^#\/login$/, viewLogin],
  [/^#\/register$/, viewRegister],
  [/^#\/bookings$/, viewBookings],
  [/^#\/manage$/, viewManage],
];
async function router() {
  const hash = location.hash || "#/";
  renderNav();
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) {
      $app.innerHTML = `<p class="empty">Loading…</p>`;
      try { await fn(...m.slice(1)); }
      catch (e) { $app.innerHTML = `<div class="card"><p class="err">${esc(e.full || e.message)}</p></div>`; }
      return;
    }
  }
  $app.innerHTML = `<p class="empty">Page not found. <a href="#/">Go home</a></p>`;
}
window.addEventListener("hashchange", router);

const needLogin = () => { if (!state.user) { location.hash = "#/login"; return true; } };

/* ---------- views: events ---------- */
const evq = { search: "", sort: "event_date", order: "asc", venue_id: "", max_price: "", page: 1 };

async function viewEvents() {
  const venues = (await api("/venues?limit=50")).data;
  $app.innerHTML = `
    <h1>Upcoming events</h1>
    <div class="filters">
      <input id="f-search" placeholder="Search events…" value="${esc(evq.search)}">
      <select id="f-venue"><option value="">All venues</option>
        ${venues.map((v) => `<option value="${v.id}" ${String(v.id) === String(evq.venue_id) ? "selected" : ""}>${esc(v.name)}</option>`).join("")}
      </select>
      <input id="f-max" type="number" min="0" placeholder="Max price (RM)" value="${esc(evq.max_price)}">
      <select id="f-sort">
        ${[["event_date|asc", "Date: soonest"], ["event_date|desc", "Date: latest"], ["ticket_price|asc", "Price: low to high"], ["ticket_price|desc", "Price: high to low"], ["title|asc", "Title A–Z"]]
          .map(([v, t]) => `<option value="${v}" ${v === evq.sort + "|" + evq.order ? "selected" : ""}>${t}</option>`).join("")}
      </select>
    </div>
    <div id="list"></div>`;

  let t;
  $("#f-search").oninput = (e) => { clearTimeout(t); t = setTimeout(() => { evq.search = e.target.value; evq.page = 1; loadList(); }, 300); };
  $("#f-venue").onchange = (e) => { evq.venue_id = e.target.value; evq.page = 1; loadList(); };
  $("#f-max").onchange = (e) => { evq.max_price = e.target.value; evq.page = 1; loadList(); };
  $("#f-sort").onchange = (e) => { [evq.sort, evq.order] = e.target.value.split("|"); evq.page = 1; loadList(); };
  loadList();
}

async function loadList() {
  const box = $("#list"); if (!box) return;
  const limit = 9;
  const p = new URLSearchParams({ page: evq.page, limit, sort: evq.sort, order: evq.order });
  if (evq.search) p.set("search", evq.search);
  if (evq.venue_id) p.set("venue_id", evq.venue_id);
  if (evq.max_price !== "") p.set("max_price", evq.max_price);
  try {
    const r = await api("/events?" + p);
    if (!r.data.length) { box.innerHTML = `<p class="empty">No events match your filters.</p>`; return; }
    const pages = Math.ceil(r.total / limit);
    box.innerHTML = `<div class="grid">${r.data.map((e) => `
      <a href="#/event/${e.id}" class="card event-card" style="color:inherit">
        <h3>${esc(e.title)}</h3>
        <span class="muted">📅 ${fmtDate(e.event_date)}</span>
        <span class="muted">📍 ${esc(e.venue_name)}</span>
        <div class="row"><span class="price">${Number(e.ticket_price) === 0 ? "Free" : money(e.ticket_price)}</span>
          ${e.available_tickets > 0 ? `<span class="badge ok">${e.available_tickets} left</span>` : `<span class="badge bad">Sold out</span>`}</div>
      </a>`).join("")}</div>
      <div class="pager">
        <button class="btn secondary sm" id="prev" ${evq.page <= 1 ? "disabled" : ""}>← Prev</button>
        <span class="muted">Page ${r.page} of ${pages} · ${r.total} events</span>
        <button class="btn secondary sm" id="next" ${evq.page >= pages ? "disabled" : ""}>Next →</button>
      </div>`;
    $("#prev").onclick = () => { evq.page--; loadList(); };
    $("#next").onclick = () => { evq.page++; loadList(); };
  } catch (e) { box.innerHTML = `<p class="err">${esc(e.full)}</p>`; }
}

/* ---------- views: event detail + booking ---------- */
async function viewEvent(id) {
  const e = await api("/events/" + id, { auth: true });
  const open = e.status === "published" && e.available_tickets > 0;
  $app.innerHTML = `
    <p><a href="#/">← All events</a></p>
    <div class="detail">
      <div class="card">
        <div class="row"><h1 style="margin:0">${esc(e.title)}</h1>${statusBadge(e.status)}</div>
        <p class="muted">📅 ${fmtDate(e.event_date)}<br>📍 ${esc(e.venue_name)}</p>
        <p>${esc(e.description || "No description provided.")}</p>
      </div>
      <div class="card" id="book-box">
        <div class="price" style="font-size:1.5rem">${Number(e.ticket_price) === 0 ? "Free" : money(e.ticket_price)} <span class="muted">/ ticket</span></div>
        <p class="muted">${e.available_tickets} of ${e.total_tickets} tickets available</p>
        <div id="book-area"></div>
      </div>
    </div>`;
  const area = $("#book-area");
  if (!open) { area.innerHTML = `<p class="err">${e.status !== "published" ? "This event is not open for booking." : "Sold out."}</p>`; return; }
  if (!state.user) { area.innerHTML = `<a class="btn" href="#/login">Log in to book</a>`; return; }
  if (state.user.role !== "customer") { area.innerHTML = `<p class="muted">Only customer accounts can book tickets.</p>`; return; }

  const max = Math.min(10, e.available_tickets);
  area.innerHTML = `
    <label for="qty">Quantity (max ${max})</label>
    <input id="qty" type="number" min="1" max="${max}" value="1">
    <p>Total: <strong id="total">${money(e.ticket_price)}</strong></p>
    <button class="btn" id="book" style="width:100%">Book now</button>
    <p class="err" id="book-err"></p>`;
  const qty = $("#qty");
  qty.oninput = () => ($("#total").textContent = money(e.ticket_price * (parseInt(qty.value) || 0)));
  $("#book").onclick = async (ev) => {
    ev.target.disabled = true; $("#book-err").textContent = "";
    try {
      const b = await api("/bookings", { method: "POST", auth: true, body: { event_id: Number(id), quantity: parseInt(qty.value) } });
      $("#book-box").innerHTML = `
        <h2 style="margin-top:0">✅ Booking confirmed</h2>
        <p>Booking #${b.id} · ${b.quantity} ticket(s) · <strong>${money(b.total_price)}</strong></p>
        ${b.qr_code ? `<div class="qr"><img src="${b.qr_code}" alt="Ticket QR code" width="200" height="200"><p class="muted">Show this QR code at the entrance</p></div>` : `<p class="muted">QR code unavailable right now.</p>`}
        <p><a class="btn secondary" href="#/bookings">View my bookings</a></p>`;
    } catch (err) { $("#book-err").textContent = err.full; ev.target.disabled = false; }
  };
}

/* ---------- views: auth ---------- */
function viewLogin() {
  $app.innerHTML = `
    <form class="card form" id="f">
      <h1>Log in</h1>
      <label>Email</label><input name="email" type="email" required autocomplete="email">
      <label>Password</label><input name="password" type="password" required autocomplete="current-password">
      <p><button class="btn" style="width:100%">Log in</button></p>
      <p class="err" id="e"></p>
      <p class="muted">No account? <a href="#/register">Register</a></p>
    </form>`;
  $("#f").onsubmit = async (ev) => {
    ev.preventDefault(); const f = new FormData(ev.target);
    try {
      const r = await api("/auth/login", { method: "POST", body: { email: f.get("email"), password: f.get("password") } });
      setSession(r.token, r.user); toast("Welcome back, " + r.user.name);
      location.hash = r.user.role === "customer" ? "#/" : "#/manage";
    } catch (err) { $("#e").textContent = err.full; }
  };
}

function viewRegister() {
  $app.innerHTML = `
    <form class="card form" id="f">
      <h1>Create account</h1>
      <label>Name</label><input name="name" required>
      <label>Email</label><input name="email" type="email" required>
      <label>Password (min 8 characters)</label><input name="password" type="password" minlength="8" required>
      <p><button class="btn" style="width:100%">Register</button></p>
      <p class="err" id="e"></p>
      <p class="muted">Already registered? <a href="#/login">Log in</a></p>
    </form>`;
  $("#f").onsubmit = async (ev) => {
    ev.preventDefault(); const f = new FormData(ev.target);
    try {
      await api("/auth/register", { method: "POST", body: { name: f.get("name"), email: f.get("email"), password: f.get("password") } });
      toast("Account created! Please log in."); location.hash = "#/login";
    } catch (err) { $("#e").textContent = err.full; }
  };
}

/* ---------- views: bookings ---------- */
async function viewBookings() {
  if (needLogin()) return;
  const rows = await api("/bookings", { auth: true });
  const admin = state.user.role === "admin";
  const staff = state.user.role !== "customer";
  $app.innerHTML = `
    <h1>${staff ? "All bookings" : "My bookings"}</h1>
    ${rows.length ? `<div class="card table-wrap"><table>
      <thead><tr><th>#</th><th>Event</th>${staff ? "<th>User</th>" : ""}<th>Qty</th><th>Total</th><th>Status</th><th>Booked</th><th></th></tr></thead>
      <tbody>${rows.map((b) => `<tr>
        <td>${b.id}</td><td><a href="#/event/${b.event_id}">${esc(b.event_title)}</a></td>${staff ? `<td>${b.user_id}</td>` : ""}
        <td>${b.quantity}</td><td>${money(b.total_price)}</td><td>${statusBadge(b.status)}</td><td>${fmtDate(b.booked_at)}</td>
        <td class="actions">
          ${b.status === "confirmed" ? `<button class="btn secondary sm" data-cancel="${b.id}">Cancel</button>` : ""}
          ${admin ? `<button class="btn danger sm" data-del="${b.id}">Delete</button>` : ""}
        </td></tr>`).join("")}</tbody></table></div>`
      : `<p class="empty">No bookings yet. <a href="#/">Browse events</a></p>`}`;
  $app.querySelectorAll("[data-cancel]").forEach((btn) => (btn.onclick = async () => {
    if (!confirm("Cancel this booking? Tickets will be released.")) return;
    try { await api(`/bookings/${btn.dataset.cancel}/cancel`, { method: "PATCH", auth: true }); toast("Booking cancelled"); viewBookings(); }
    catch (e) { toast(e.full, true); }
  }));
  $app.querySelectorAll("[data-del]").forEach((btn) => (btn.onclick = async () => {
    if (!confirm("Permanently delete this booking record?")) return;
    try { await api("/bookings/" + btn.dataset.del, { method: "DELETE", auth: true }); toast("Booking deleted"); viewBookings(); }
    catch (e) { toast(e.full, true); }
  }));
}

/* ---------- views: manage (organiser / admin) ---------- */
let manageTab = "events";
async function viewManage() {
  if (needLogin()) return;
  if (!isStaff()) { $app.innerHTML = `<p class="empty">You do not have permission to view this page.</p>`; return; }
  const tabs = [["events", "Events"], ["venues", "Venues"]];
  if (state.user.role === "admin") tabs.push(["users", "Users"]);
  if (!tabs.some(([k]) => k === manageTab)) manageTab = "events";
  $app.innerHTML = `
    <h1>Manage</h1>
    <div class="tabs">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${k === manageTab ? "active" : ""}">${t}</button>`).join("")}</div>
    <div id="tab"></div>`;
  $app.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { manageTab = b.dataset.tab; viewManage(); }));
  await ({ events: tabEvents, venues: tabVenues, users: tabUsers })[manageTab]();
}

function modal(html) {
  const bg = document.createElement("div"); bg.className = "modal-bg";
  bg.innerHTML = `<div class="modal">${html}</div>`;
  bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
  document.body.appendChild(bg);
  return bg;
}

async function tabEvents() {
  const status = tabEvents.status || "published";
  const [{ data }, venues] = await Promise.all([api(`/events?limit=50&status=${status}&sort=event_date`, { auth: true }), api("/venues?limit=50").then((r) => r.data)]);
  const canEdit = (e) => state.user.role === "admin" || e.organiser_id === state.user.id;
  $("#tab").innerHTML = `
    <div class="row" style="margin-bottom:12px">
      <select id="st" style="width:auto">${["published", "draft", "cancelled"].map((s) => `<option ${s === status ? "selected" : ""}>${s}</option>`).join("")}</select>
      <button class="btn" id="new">+ New event</button>
    </div>
    ${data.length ? `<div class="card table-wrap"><table>
      <thead><tr><th>Title</th><th>Date</th><th>Venue</th><th>Price</th><th>Sold</th><th>Status</th><th></th></tr></thead>
      <tbody>${data.map((e) => `<tr>
        <td><a href="#/event/${e.id}">${esc(e.title)}</a></td><td>${fmtDate(e.event_date)}</td><td>${esc(e.venue_name)}</td>
        <td>${money(e.ticket_price)}</td><td>${e.total_tickets - e.available_tickets}/${e.total_tickets}</td><td>${statusBadge(e.status)}</td>
        <td class="actions">${canEdit(e) ? `<button class="btn secondary sm" data-edit="${e.id}">Edit</button><button class="btn danger sm" data-del="${e.id}">Delete</button>` : `<span class="muted">—</span>`}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">No ${status} events.</p>`}`;

  $("#st").onchange = (e) => { tabEvents.status = e.target.value; tabEvents(); };
  $("#new").onclick = () => eventForm(null, venues);
  $("#tab").querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => eventForm(data.find((e) => e.id == b.dataset.edit), venues)));
  $("#tab").querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    if (!confirm("Delete this event? This fails if it already has bookings.")) return;
    try { await api("/events/" + b.dataset.del, { method: "DELETE", auth: true }); toast("Event deleted"); tabEvents(); }
    catch (e) { toast(e.full, true); }
  }));
}

function eventForm(ev, venues) {
  if (!venues.length) { toast("Create a venue first", true); return; }
  const m = modal(`
    <h2 style="margin-top:0">${ev ? "Edit event" : "New event"}</h2>
    <form id="ef">
      <label>Title</label><input name="title" required value="${esc(ev?.title)}">
      <label>Description</label><textarea name="description" rows="3">${esc(ev?.description)}</textarea>
      <label>Venue</label><select name="venue_id">${venues.map((v) => `<option value="${v.id}" ${ev?.venue_id === v.id ? "selected" : ""}>${esc(v.name)} (${esc(v.city)})</option>`).join("")}</select>
      <label>Date &amp; time</label><input name="event_date" type="datetime-local" required value="${ev ? toLocalInput(ev.event_date) : ""}">
      <div class="two">
        <div><label>Ticket price (RM)</label><input name="ticket_price" type="number" min="0" step="0.01" required value="${ev ? ev.ticket_price : ""}"></div>
        <div><label>Total tickets</label><input name="total_tickets" type="number" min="1" required value="${ev ? ev.total_tickets : ""}"></div>
      </div>
      ${ev ? `<label>Status</label><select name="status">${["published", "draft", "cancelled"].map((s) => `<option ${ev.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>` : ""}
      <p class="err" id="ee"></p>
      <div class="row" style="margin-top:14px"><button type="button" class="btn secondary" id="cx">Cancel</button><button class="btn">Save</button></div>
    </form>`);
  $("#cx", m).onclick = () => m.remove();
  $("#ef", m).onsubmit = async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    const body = {
      title: f.title, description: f.description, venue_id: Number(f.venue_id),
      event_date: f.event_date.length === 16 ? f.event_date + ":00" : f.event_date,
      ticket_price: Number(f.ticket_price), total_tickets: Number(f.total_tickets),
    };
    if (ev) body.status = f.status;
    try {
      await api(ev ? "/events/" + ev.id : "/events", { method: ev ? "PUT" : "POST", auth: true, body });
      m.remove(); toast(ev ? "Event updated" : "Event created"); tabEvents();
    } catch (err) { $("#ee", m).textContent = err.full; }
  };
}

async function tabVenues() {
  const { data } = await api("/venues?limit=50&sort=name", {});
  const admin = state.user.role === "admin";
  $("#tab").innerHTML = `
    <div class="row" style="margin-bottom:12px"><span class="muted">${data.length} venues</span><button class="btn" id="new">+ New venue</button></div>
    ${data.length ? `<div class="card table-wrap"><table>
      <thead><tr><th>Name</th><th>Address</th><th>City</th><th>Capacity</th><th></th></tr></thead>
      <tbody>${data.map((v) => `<tr><td>${esc(v.name)}</td><td>${esc(v.address)}</td><td>${esc(v.city)}</td><td>${v.capacity}</td>
        <td class="actions"><button class="btn secondary sm" data-edit="${v.id}">Edit</button>${admin ? `<button class="btn danger sm" data-del="${v.id}">Delete</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">No venues yet.</p>`}`;
  $("#new").onclick = () => venueForm(null);
  $("#tab").querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => venueForm(data.find((v) => v.id == b.dataset.edit))));
  $("#tab").querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    if (!confirm("Delete this venue?")) return;
    try { await api("/venues/" + b.dataset.del, { method: "DELETE", auth: true }); toast("Venue deleted"); tabVenues(); }
    catch (e) { toast(e.full, true); }
  }));
}

function venueForm(v) {
  const m = modal(`
    <h2 style="margin-top:0">${v ? "Edit venue" : "New venue"}</h2>
    <form id="vf">
      <label>Name</label><input name="name" required value="${esc(v?.name)}">
      <label>Address</label><input name="address" required value="${esc(v?.address)}">
      <div class="two">
        <div><label>City</label><input name="city" required value="${esc(v?.city)}"></div>
        <div><label>Capacity</label><input name="capacity" type="number" min="1" required value="${v ? v.capacity : ""}"></div>
      </div>
      <p class="err" id="ve"></p>
      <div class="row" style="margin-top:14px"><button type="button" class="btn secondary" id="cx">Cancel</button><button class="btn">Save</button></div>
    </form>`);
  $("#cx", m).onclick = () => m.remove();
  $("#vf", m).onsubmit = async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    f.capacity = Number(f.capacity);
    try {
      await api(v ? "/venues/" + v.id : "/venues", { method: v ? "PUT" : "POST", auth: true, body: f });
      m.remove(); toast(v ? "Venue updated" : "Venue created"); tabVenues();
    } catch (err) { $("#ve", m).textContent = err.full; }
  };
}

async function tabUsers() {
  const users = await api("/users", { auth: true });
  $("#tab").innerHTML = `<div class="card table-wrap"><table>
    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
    <tbody>${users.map((u) => `<tr><td>${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><span class="badge">${esc(u.role)}</span></td><td>${fmtDate(u.created_at)}</td>
      <td class="actions">${u.id !== state.user.id ? `<button class="btn danger sm" data-del="${u.id}">Delete</button>` : `<span class="muted">you</span>`}</td></tr>`).join("")}
    </tbody></table></div>`;
  $("#tab").querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    if (!confirm("Delete this user?")) return;
    try { await api("/users/" + b.dataset.del, { method: "DELETE", auth: true }); toast("User deleted"); tabUsers(); }
    catch (e) { toast(e.full, true); }
  }));
}

router();
