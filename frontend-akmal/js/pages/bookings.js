/* bookings.js
   Staff see every booking. A customer sees only their own: the API decides that from the JWT,
   so the same request gives each role the right list.
     GET    /bookings             the list, newest first
     GET    /bookings/:id         one booking, shown in the detail box
     PATCH  /bookings/:id/cancel  cancel it and put the tickets back on sale
     DELETE /bookings/:id         remove the record (admin only)
   This endpoint has no search or paging of its own, so filtering is done here in the browser. */

const BookingsPage = {
  filters: { status: 'all', search: '' },
  resetFilters() {
    this.filters = { status: 'all', search: '' };
  },
  rows: [],
  names: {},   // user id -> name. Only admins can read /users, so organisers see "Customer #3"

  render(view) {
    view.innerHTML = `
      <header class="page-head">
        <div>
          <h1>${Session.isCustomer ? 'My bookings' : 'Bookings'}</h1>
          <p>${Session.isCustomer
            ? 'The tickets you have booked. Open one to see its QR code. Cancelling returns the tickets to the event.'
            : 'Every booking customers have made. Cancelling one puts its tickets back on sale.'}</p>
        </div>
      </header>

      <div class="tabs" id="bookingTabs">
        <button type="button" data-status="all">All</button>
        <button type="button" data-status="confirmed">Confirmed</button>
        <button type="button" data-status="cancelled">Cancelled</button>
      </div>

      <div class="toolbar">
        <input type="search" id="bookingSearch" placeholder="Search event or booking number" aria-label="Search bookings">
      </div>

      <div id="bookingList"></div>`;

    UI.$('bookingSearch').value = this.filters.search;
    document.querySelector(`#bookingTabs [data-status="${this.filters.status}"]`).setAttribute('aria-pressed', 'true');

    UI.$('bookingTabs').addEventListener('click', e => {
      const tab = e.target.closest('[data-status]');
      if (tab) { this.filters.status = tab.dataset.status; this.draw(); }
    });
    UI.$('bookingSearch').addEventListener('input', e => { this.filters.search = e.target.value.trim(); this.draw(); });

    UI.$('bookingList').addEventListener('click', e => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      const booking = this.rows.find(row => row.id === Number(button.dataset.id));
      if (!booking) return;
      if (button.dataset.action === 'view') this.view(booking);
      if (button.dataset.action === 'cancel') this.cancel(booking);
      if (button.dataset.action === 'delete') this.remove(booking);
    });

    this.load();
  },

  async load() {
    const box = UI.$('bookingList');
    if (!box) return;
    UI.loading(box, 'Loading bookings…');
    try {
      // Admins also fetch the user list so the table can show names. If that fails, fall back to ids.
      const [bookings, users] = await Promise.all([
        Api.bookings.list(),
        Session.isAdmin ? Api.users.list().catch(() => []) : []
      ]);
      if (!UI.$('bookingList')) return;
      this.rows = bookings;
      this.names = {};
      users.forEach(u => { this.names[u.id] = u.name; });
      this.draw();
    } catch (err) {
      if (UI.$('bookingList')) UI.failed(box, err, () => this.load());
    }
  },

  customer(booking) {
    return this.names[booking.user_id] || `Customer #${booking.user_id}`;
  },

  draw() {
    const box = UI.$('bookingList');
    if (!box) return;

    // Tab labels carry the counts
    const count = status => this.rows.filter(b => status === 'all' || b.status === status).length;
    document.querySelectorAll('#bookingTabs button').forEach(tab => {
      const status = tab.dataset.status;
      tab.textContent = `${status.charAt(0).toUpperCase() + status.slice(1)} (${count(status)})`;
      tab.setAttribute('aria-pressed', status === this.filters.status);
    });

    const term = this.filters.search.toLowerCase().replace(/^#/, '');
    const shown = this.rows.filter(b =>
      (this.filters.status === 'all' || b.status === this.filters.status) &&
      (!term || b.event_title.toLowerCase().includes(term) || String(b.id) === term));

    const mine = Session.isCustomer;   // a customer's list is all theirs, so the Customer column is left out
    if (!this.rows.length) {
      return UI.empty(box, 'No bookings yet', mine ? 'Book tickets from the Events page and they will show up here.' : 'They appear here as customers book tickets.');
    }
    if (!shown.length) return UI.empty(box, 'No bookings match', 'Try another tab or a different search.');

    box.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Booking</th><th>Event</th>${mine ? '' : '<th>Customer</th>'}<th class="num">Tickets</th>
              <th class="num">Total</th><th>Status</th><th>Booked</th><th><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            ${shown.map(b => `
              <tr>
                <td>#${b.id}</td>
                <td><strong>${UI.esc(b.event_title)}</strong></td>
                ${mine ? '' : `<td>${UI.esc(this.customer(b))}</td>`}
                <td class="num">${b.quantity}</td>
                <td class="num">${UI.money(b.total_price)}</td>
                <td>${UI.statusTag(b.status)}</td>
                <td>${UI.date(b.booked_at)}</td>
                <td class="row-actions">
                  <button class="btn btn-small" type="button" data-action="view" data-id="${b.id}">View</button>
                  ${b.status === 'confirmed'
                    ? `<button class="btn btn-small" type="button" data-action="cancel" data-id="${b.id}">Cancel booking</button>`
                    : ''}
                  ${Session.isAdmin
                    ? `<button class="btn btn-small btn-danger" type="button" data-action="delete" data-id="${b.id}">Delete</button>`
                    : ''}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  /* ---- The ticket: a code and its QR picture, shared with book.js ---- */

  ticketCode: b => `BOOKING-${b.id}-EVENT-${b.event_id}`,

  // image is the QR picture the API sends back with a new booking.
  // Without one, the same picture is asked for from the QR service directly.
  qrBlock(code, image = '') {
    const src = image || 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(code);
    return `
      <div class="qr">
        <img src="${UI.esc(src)}" alt="QR code for ${code}" width="160" height="160">
        <p>Ticket code<br><strong>${code}</strong></p>
      </div>`;
  },

  // If the QR service can't be reached, keep the code and drop the broken image
  watchQr(box) {
    const img = box.querySelector('.qr img');
    if (img) img.addEventListener('error', () => img.remove());
  },

  /* Detail box. Asks the API for this one booking so the figures are fresh. */
  async view(booking) {
    const body = UI.$('bookingBody');
    UI.$('bookingTitle').textContent = `Booking #${booking.id}`;
    UI.loading(body, 'Loading booking…');
    UI.$('bookingDialog').showModal();
    try {
      const b = await Api.bookings.get(booking.id);
      // The backend puts this same text in the QR code it makes when the booking is created,
      // so the customer's ticket and the one door staff see here carry the same code.
      const code = this.ticketCode(b);

      body.innerHTML = `
        <dl class="details">
          <div><dt>Event</dt><dd>${UI.esc(booking.event_title)}</dd></div>
          ${Session.isCustomer ? '' : `<div><dt>Customer</dt><dd>${UI.esc(this.customer(b))}</dd></div>`}
          <div><dt>Tickets</dt><dd>${b.quantity}</dd></div>
          <div><dt>Total</dt><dd>${UI.money(b.total_price)}</dd></div>
          <div><dt>Booked</dt><dd>${UI.dateTime(b.booked_at)}</dd></div>
          <div><dt>Status</dt><dd>${UI.statusTag(b.status)}</dd></div>
        </dl>
        ${b.status === 'confirmed' ? this.qrBlock(code)
          : '<p class="note">This booking is cancelled, so its ticket is no longer valid.</p>'}`;
      this.watchQr(body);
    } catch (err) {
      UI.failed(body, err, () => this.view(booking));
    }
  },

  async cancel(booking) {
    const tickets = `${booking.quantity} ${booking.quantity === 1 ? 'ticket' : 'tickets'}`;
    const ok = await UI.confirm({
      title: `Cancel booking #${booking.id}?`,
      message: `${tickets} for "${booking.event_title}" will go back on sale. This can't be undone.`,
      confirmLabel: 'Cancel booking',
      danger: true
    });
    if (!ok) return;
    try {
      await Api.bookings.cancel(booking.id);
      UI.toast(`Booking #${booking.id} cancelled. ${tickets} back on sale.`);
      this.load();
    } catch (err) {
      UI.toast(err.message, 'error');   // for example 409 "Booking already cancelled"
      if (err.status === 409 || err.status === 404) this.load();   // our list was out of date
    }
  },

  async remove(booking) {
    const ok = await UI.confirm({
      title: `Delete booking #${booking.id}?`,
      message: booking.status === 'confirmed'
        ? 'This deletes the record without returning its tickets to the event. Cancel the booking first if the tickets should go back on sale.'
        : 'This removes the record for good.',
      confirmLabel: 'Delete booking',
      danger: true
    });
    if (!ok) return;
    try {
      await Api.bookings.remove(booking.id);
      UI.toast(`Booking #${booking.id} deleted`);
      this.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  }
};

