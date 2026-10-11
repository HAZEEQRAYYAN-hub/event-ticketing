/* overview.js
   The first screen after signing in. Reads GET /events and GET /bookings
   and works out the figures in the browser. */

const OverviewPage = {
  render(view) {
    view.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Overview</h1>
          <p>What's on sale and what has been booked.</p>
        </div>
      </header>
      <div id="overviewBody"></div>`;
    this.load();
  },

  async load() {
    const box = UI.$('overviewBody');
    if (!box) return;
    UI.loading(box, 'Loading overview…');
    try {
      // Two requests at the same time instead of one after the other
      const [events, bookings] = await Promise.all([
        Api.events.list({ status: 'published', sort: 'event_date', order: 'asc', limit: 50 }),
        Api.bookings.list()
      ]);
      if (!UI.$('overviewBody')) return;   // the user moved to another page while this was loading
      this.draw(box, events, bookings);
    } catch (err) {
      if (UI.$('overviewBody')) UI.failed(box, err, () => this.load());
    }
  },

  draw(box, events, bookings) {
    const now = new Date();
    const upcoming = events.data.filter(e => new Date(e.event_date) >= now).slice(0, 3);
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const ticketsBooked = confirmed.reduce((sum, b) => sum + b.quantity, 0);
    const revenue = confirmed.reduce((sum, b) => sum + Number(b.total_price), 0);
    const cancelled = bookings.length - confirmed.length;
    const latest = bookings.slice(0, 5);   // the API already sends newest first

    box.innerHTML = `
      <dl class="figures">
        <div><dt>Events on sale</dt><dd>${UI.number(events.total)}</dd></div>
        <div><dt>Confirmed bookings</dt><dd>${UI.number(confirmed.length)}</dd><dd class="figure-note">${cancelled} cancelled</dd></div>
        <div><dt>Tickets booked</dt><dd>${UI.number(ticketsBooked)}</dd></div>
        <div><dt>Booking revenue</dt><dd>${UI.money(revenue)}</dd></div>
      </dl>

      <div class="split">
        <section>
          <div class="section-head">
            <h2>Coming up</h2>
            <a href="#/events">All events</a>
          </div>
          <div class="ticket-list">
            ${upcoming.map(e => UI.ticket(e)).join('') ||
              '<div class="state"><h3>Nothing on sale yet</h3><p>Publish an event and it will show up here.</p></div>'}
          </div>
        </section>

        <section>
          <div class="section-head">
            <h2>Latest bookings</h2>
            <a href="#/bookings">All bookings</a>
          </div>
          ${latest.length ? `
            <ul class="feed">
              ${latest.map(b => `
                <li>
                  <div>
                    <strong>${UI.esc(b.event_title)}</strong>
                    <span>Booking #${b.id}, ${b.quantity} ${b.quantity === 1 ? 'ticket' : 'tickets'}, ${UI.money(b.total_price)}</span>
                  </div>
                  ${UI.statusTag(b.status)}
                </li>`).join('')}
            </ul>` :
            '<div class="state"><h3>No bookings yet</h3><p>Bookings appear here as customers make them.</p></div>'}
        </section>
      </div>`;
  }
};

