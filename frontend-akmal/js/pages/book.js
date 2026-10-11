/* book.js
   The "Book tickets" box a customer gets from the Events page.
     POST /bookings   { event_id, quantity }   customers only
   The API takes the tickets off the event and sends back the booking with a QR code. */

const BookForm = {
  MAX_PER_BOOKING: 10,   // the API's own limit
  event: null,           // the event being booked

  // Called once when the app starts
  init() {
    const form = UI.$('bookForm');
    form.addEventListener('submit', e => { e.preventDefault(); this.submit(); });
    // Typing a new number clears the old complaint and updates the total
    form.elements.quantity.addEventListener('input', () => { UI.clearErrors(form); this.showTotal(); });
  },

  // The most this person can ask for: 10, or fewer if the event is nearly sold out
  limit() {
    return Math.min(this.MAX_PER_BOOKING, this.event.available_tickets);
  },

  open(event) {
    this.event = event;
    const form = UI.$('bookForm');
    form.reset();
    UI.clearErrors(form);
    this.showEvent();
    UI.$('bookDialog').showModal();
    form.elements.quantity.select();
  },

  // Fills in the parts of the box that depend on the event
  showEvent() {
    const e = this.event;
    const form = UI.$('bookForm');
    UI.$('bookEvent').innerHTML = `
      <div><dt>Event</dt><dd>${UI.esc(e.title)}</dd></div>
      <div><dt>When</dt><dd>${UI.dateTime(e.event_date)}</dd></div>
      <div><dt>Where</dt><dd>${UI.esc(e.venue_name)}</dd></div>
      <div><dt>Price</dt><dd>${Number(e.ticket_price) === 0 ? 'Free' : UI.money(e.ticket_price) + ' each'}</dd></div>`;
    form.elements.quantity.max = Math.max(1, this.limit());
    UI.$('bookHint').textContent = e.available_tickets < this.MAX_PER_BOOKING
      ? `Only ${UI.number(e.available_tickets)} left.`
      : `Up to ${this.MAX_PER_BOOKING} in one booking. ${UI.number(e.available_tickets)} left.`;
    form.querySelector('[type=submit]').disabled = e.available_tickets < 1;
    this.showTotal();
  },

  // Returns an error message, or '' when the number is fine
  validate(value) {
    const quantity = Number(value);
    if (value === '' || !Number.isInteger(quantity) || quantity < 1) return 'Enter a whole number of tickets, at least 1.';
    if (quantity > this.event.available_tickets) {
      const left = this.event.available_tickets;
      return `Only ${UI.number(left)} ${left === 1 ? 'ticket is' : 'tickets are'} left.`;
    }
    if (quantity > this.MAX_PER_BOOKING) return `You can book up to ${this.MAX_PER_BOOKING} tickets at a time.`;
    return '';
  },

  // The total changes as the number is typed. The API works out the real one from its own price.
  showTotal() {
    const value = UI.$('bookForm').elements.quantity.value;
    UI.$('bookTotal').textContent = this.validate(value) ? '—' : UI.money(Number(value) * Number(this.event.ticket_price));
  },

  async submit() {
    const form = UI.$('bookForm');
    const value = form.elements.quantity.value;
    const problem = this.validate(value);
    if (problem) return UI.showErrors(form, { quantity: problem });

    const event = this.event;
    const button = form.querySelector('[type=submit]');
    UI.clearErrors(form);
    UI.busy(button, true, 'Booking…');
    try {
      const booking = await Api.bookings.create({ event_id: event.id, quantity: Number(value) });
      UI.$('bookDialog').close();
      UI.toast(`Booked ${booking.quantity} ${booking.quantity === 1 ? 'ticket' : 'tickets'} for "${event.title}"`);
      this.showTicket(booking, event);
      EventsPage.load();   // the "sold" bar and "left" count have changed
    } catch (err) {
      await this.explain(form, err);
    } finally {
      UI.busy(button, false);
      if (this.event.available_tickets < 1) button.disabled = true;
    }
  },

  /* Why a booking was refused, in words that say what to do next */
  async explain(form, err) {
    if (err.status === 409) {
      // Someone else booked while this box was open. Fetch the event again to show the true number.
      try { this.event = await Api.events.get(this.event.id); this.showEvent(); } catch { /* keep the old figures */ }
      const left = this.event.available_tickets;
      return UI.showErrors(form, {
        quantity: left < 1 ? 'This event has just sold out.' : `Not enough tickets. Only ${UI.number(left)} left now.`
      });
    }
    if (err.status === 404) return UI.showErrors(form, {}, 'This event is no longer open for booking.');
    if (err.status === 403) return UI.showErrors(form, {}, 'Only customer accounts can book tickets.');
    UI.showApiError(form, err);   // 400 goes under the field, anything else in the summary line
  },

  /* The confirmation, shown in the same box the bookings page uses for details */
  showTicket(booking, event) {
    const code = BookingsPage.ticketCode(booking);
    const body = UI.$('bookingBody');
    UI.$('bookingTitle').textContent = `Booking #${booking.id} confirmed`;
    body.innerHTML = `
      <dl class="details">
        <div><dt>Event</dt><dd>${UI.esc(event.title)}</dd></div>
        <div><dt>When</dt><dd>${UI.dateTime(event.event_date)}</dd></div>
        <div><dt>Where</dt><dd>${UI.esc(event.venue_name)}</dd></div>
        <div><dt>Tickets</dt><dd>${booking.quantity}</dd></div>
        <div><dt>Total</dt><dd>${UI.money(booking.total_price)}</dd></div>
      </dl>
      ${BookingsPage.qrBlock(code, booking.qr_code)}
      <p class="note">Show this code at the door. It is kept under <a href="#/bookings">My bookings</a>.</p>`;
    BookingsPage.watchQr(body);
    UI.$('bookingDialog').showModal();
  }
};
