/* events.js
   The same list serves every role, with different buttons on each event.
     GET    /events        list, with status, search, venue filter, sort and pagination done by the API
     POST   /events        create
     PUT    /events/:id    edit, and change status (publish, unpublish, cancel)
     DELETE /events/:id    delete
   Guests and customers see what is on sale and a Book tickets button (book.js does the booking).
   Staff get the full CRUD. Organisers can only change their own events. Admins can change any. */

const EventsPage = {
  // Kept on the object so the filters are still there when the user comes back to this page
  filters: {},
  resetFilters() {
    this.filters = { status: 'published', search: '', venue_id: '', sort: 'event_date:asc', page: 1 };
  },
  rows: [],        // the events on the current page
  venues: [],      // for the venue filter and the form
  loadCount: 0,    // used to ignore slow responses that arrive after a newer one
  pendingId: null, // the event a guest pressed Book on, picked up again once they have signed in

  STATUS_WORDS: { published: 'published', draft: 'moved to drafts', cancelled: 'cancelled' },

  // Called once when the app starts: the form lives in index.html, so it only needs wiring up once
  init() {
    this.resetFilters();
    const form = UI.$('eventForm');
    form.addEventListener('submit', e => { e.preventDefault(); this.submit(); });
    form.elements.venue_id.addEventListener('change', () => this.showCapacity());
  },

  async render(view) {
    const staff = Session.isStaff;
    // Drafts and cancelled events are staff business. Everyone else only sees what is on sale.
    if (!staff) this.filters.status = 'published';

    const intro = staff ? 'Create events, set ticket numbers and decide what goes on sale.'
      : Session.isCustomer ? 'Everything on sale. Pick an event and book up to 10 tickets at a time.'
      : 'Everything on sale. You can look around freely, and sign in when you want to book.';

    view.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Events</h1>
          <p>${intro}</p>
        </div>
        ${staff ? '<button class="btn btn-primary" id="newEvent" type="button">New event</button>' : ''}
      </header>

      ${staff ? `
      <div class="tabs" id="eventTabs">
        <button type="button" data-status="published">Published</button>
        <button type="button" data-status="draft">Drafts</button>
        <button type="button" data-status="cancelled">Cancelled</button>
      </div>` : ''}

      <div class="toolbar">
        <input type="search" id="eventSearch" placeholder="Search title or description" aria-label="Search events">
        <select id="eventVenue" aria-label="Filter by venue"><option value="">All venues</option></select>
        <select id="eventSort" aria-label="Sort events">
          <option value="event_date:asc">Date, soonest first</option>
          <option value="event_date:desc">Date, latest first</option>
          <option value="ticket_price:asc">Price, lowest first</option>
          <option value="ticket_price:desc">Price, highest first</option>
          <option value="title:asc">Title, A to Z</option>
        </select>
      </div>

      <div id="eventList" class="ticket-list"></div>
      <div id="eventPager" class="pager"></div>`;

    // Put the remembered filters back into the controls
    UI.$('eventSearch').value = this.filters.search;
    UI.$('eventSort').value = this.filters.sort;
    this.markTab();

    // Every control changes a filter, goes back to page 1 and reloads
    if (staff) {
      UI.$('newEvent').addEventListener('click', () => this.openForm());
      UI.$('eventTabs').addEventListener('click', e => {
        const tab = e.target.closest('[data-status]');
        if (tab) this.change({ status: tab.dataset.status });
      });
    }
    UI.$('eventSearch').addEventListener('input', UI.debounce(e => this.change({ search: e.target.value.trim() })));
    UI.$('eventVenue').addEventListener('change', e => this.change({ venue_id: e.target.value }));
    UI.$('eventSort').addEventListener('change', e => this.change({ sort: e.target.value }));

    // One click listener for all the buttons inside the list
    UI.$('eventList').addEventListener('click', e => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      const event = this.rows.find(row => row.id === Number(button.dataset.id));
      if (!event) return;
      if (button.dataset.action === 'edit') this.openForm(event);
      if (button.dataset.action === 'status') this.setStatus(event, button.dataset.status);
      if (button.dataset.action === 'delete') this.remove(event);
      if (button.dataset.action === 'book') this.book(event);
    });

    this.load();
    this.loadVenues();
    this.resumeBooking();
  },

  change(patch) {
    Object.assign(this.filters, { page: 1 }, patch);
    this.markTab();
    this.load();
  },

  markTab() {
    document.querySelectorAll('#eventTabs button').forEach(tab =>
      tab.setAttribute('aria-pressed', tab.dataset.status === this.filters.status));
  },

  async loadVenues() {
    try {
      this.venues = await Lookups.venues();
      const select = UI.$('eventVenue');
      if (!select) return;
      select.innerHTML = '<option value="">All venues</option>' +
        this.venues.map(v => `<option value="${v.id}">${UI.esc(v.name)}</option>`).join('');
      select.value = this.filters.venue_id;
    } catch (err) {
      UI.toast(`Venues didn't load, so the venue filter is empty. ${err.message}`, 'error');
    }
  },

  async load() {
    const box = UI.$('eventList');
    if (!box) return;
    const mine = ++this.loadCount;
    UI.loading(box, 'Loading events…');

    const [sort, order] = this.filters.sort.split(':');
    try {
      const result = await Api.events.list({
        status: this.filters.status,
        search: this.filters.search,
        venue_id: this.filters.venue_id,
        sort, order,
        page: this.filters.page,
        limit: CONFIG.PAGE_SIZE
      });
      if (mine !== this.loadCount || !UI.$('eventList')) return;

      // Deleting the only row on the last page leaves that page empty, so step back one
      if (!result.data.length && result.total && this.filters.page > 1) {
        this.filters.page -= 1;
        return this.load();
      }

      this.rows = result.data;
      this.draw(box, result);
    } catch (err) {
      if (mine === this.loadCount && UI.$('eventList')) {
        UI.$('eventPager').innerHTML = '';
        UI.failed(box, err, () => this.load());
      }
    }
  },

  draw(box, result) {
    if (!result.data.length) {
      const filtered = this.filters.search || this.filters.venue_id;
      const messages = {
        published: ['Nothing is on sale', Session.isStaff ? 'Create an event, or publish one from Drafts.' : 'Check back soon.'],
        draft: ['No drafts', 'Unpublish an event to work on it out of sight of customers.'],
        cancelled: ['No cancelled events', '']
      };
      const [title, hint] = filtered
        ? ['No events match', 'Try a different search or venue.']
        : messages[this.filters.status];
      UI.empty(box, title, hint);
    } else {
      box.innerHTML = result.data.map(e => UI.ticket(e, this.actions(e))).join('');
    }
    UI.pager(UI.$('eventPager'), result, page => { this.filters.page = page; this.load(); });
  },

  // Role handling: an organiser may only change events they created
  canManage(event) {
    return Session.isAdmin || event.organiser_id === Session.user.id;
  },

  actions(e) {
    if (!Session.isStaff) return this.bookAction(e);
    if (!this.canManage(e)) return '<p class="ticket-note">Created by someone else. Only they or an admin can change it.</p>';

    const button = (label, attrs, extra = '') =>
      `<button class="btn btn-small ${extra}" type="button" data-id="${e.id}" ${attrs}>${label}</button>`;
    const statusButtons = {
      published: button('Unpublish', 'data-action="status" data-status="draft"') +
                 button('Cancel event', 'data-action="status" data-status="cancelled"'),
      draft:     button('Publish', 'data-action="status" data-status="published"'),
      cancelled: button('Move to drafts', 'data-action="status" data-status="draft"')
    };
    return button('Edit', 'data-action="edit"') + statusButtons[e.status] +
           button('Delete', 'data-action="delete"', 'btn-danger');
  },

  /* ---- Booking (guests and customers) ---- */

  // What sits on the right of an event for someone who is not staff
  bookAction(e) {
    if (e.available_tickets < 1) return '<p class="ticket-note">Sold out</p>';
    if (new Date(e.event_date) <= new Date()) return '<p class="ticket-note">This event has already taken place.</p>';
    return `<button class="btn btn-primary btn-book" type="button" data-id="${e.id}" data-action="book">Book tickets</button>`;
  },

  // Role handling: looking is free, booking needs a customer account
  book(event) {
    if (Session.isCustomer) return BookForm.open(event);
    this.pendingId = event.id;
    App.returnTo = 'events';
    App.toSignIn({ text: `Sign in or register to book "${event.title}".` });
  },

  // Runs when the page opens. If the person was sent to sign in from a Book button,
  // carry on where they left off instead of making them find the event again.
  async resumeBooking() {
    const id = this.pendingId;
    this.pendingId = null;
    if (!id || !Session.isCustomer) return;
    try {
      BookForm.open(await Api.events.get(id));   // fetched fresh: tickets may have sold while they signed in
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  /* ---- Create and edit (staff) ---- */

  async openForm(event = null) {
    try {
      this.venues = await Lookups.venues();
    } catch (err) {
      return UI.toast(err.message, 'error');
    }
    if (!this.venues.length) return UI.toast('Add a venue first. Every event needs one.', 'error');

    const form = UI.$('eventForm');
    form.reset();
    UI.clearErrors(form);
    form.elements.venue_id.innerHTML = '<option value="">Choose a venue</option>' +
      this.venues.map(v => `<option value="${v.id}">${UI.esc(v.name)}, ${UI.esc(v.city)}</option>`).join('');

    UI.$('eventFormTitle').textContent = event ? 'Edit event' : 'New event';
    // The API always creates events as published, so status is only offered when editing
    UI.$('eventStatusField').hidden = !event;

    if (event) {
      form.elements.id.value = event.id;
      form.elements.title.value = event.title;
      form.elements.description.value = event.description || '';
      form.elements.venue_id.value = event.venue_id;
      form.elements.event_date.value = UI.toInputValue(event.event_date);
      form.elements.ticket_price.value = Number(event.ticket_price);
      form.elements.total_tickets.value = event.total_tickets;
      form.elements.status.value = event.status;
    }
    this.showCapacity();
    UI.$('eventDialog').showModal();
  },

  showCapacity() {
    const venue = this.venues.find(v => String(v.id) === UI.$('eventForm').elements.venue_id.value);
    UI.$('capacityHint').textContent = venue ? `${venue.name} holds ${UI.number(venue.capacity)}.` : '';
  },

  /* Checks done in the browser before anything is sent.
     The first five mirror the API's own rules. The capacity and "already sold" checks are extra. */
  validate(values, editing, venue) {
    const errors = {};
    const price = Number(values.ticket_price);
    const total = Number(values.total_tickets);

    if (!values.title.trim()) errors.title = 'Give the event a title.';
    if (!values.venue_id) errors.venue_id = 'Choose a venue.';

    if (!values.event_date) errors.event_date = 'Choose a date and time.';
    else if (!editing && new Date(values.event_date) <= new Date()) errors.event_date = 'Choose a date in the future.';

    if (values.ticket_price === '' || Number.isNaN(price) || price < 0) errors.ticket_price = 'Enter a price of 0 or more.';

    if (!Number.isInteger(total) || total < 1) {
      errors.total_tickets = 'Enter a whole number, at least 1.';
    } else if (venue && total > venue.capacity) {
      errors.total_tickets = `Too many for this venue. It holds ${UI.number(venue.capacity)}.`;
    } else if (editing) {
      const sold = editing.total_tickets - editing.available_tickets;
      if (total < sold) errors.total_tickets = `${UI.number(sold)} tickets are already sold, so it can't go lower than that.`;
    }
    return errors;
  },

  async submit() {
    const form = UI.$('eventForm');
    const values = UI.formValues(form);
    const editing = this.rows.find(e => String(e.id) === values.id) || null;
    const venue = this.venues.find(v => String(v.id) === values.venue_id);

    const errors = this.validate(values, editing, venue);
    if (Object.keys(errors).length) return UI.showErrors(form, errors);

    const body = {
      title: values.title.trim(),
      description: values.description.trim(),
      venue_id: Number(values.venue_id),
      event_date: UI.toApiDate(values.event_date),
      ticket_price: Number(values.ticket_price),
      total_tickets: Number(values.total_tickets)
    };
    if (editing) body.status = values.status;

    const button = form.querySelector('[type=submit]');
    UI.clearErrors(form);
    UI.busy(button, true);
    try {
      if (editing) {
        await Api.events.update(editing.id, body);
        UI.toast(`"${body.title}" saved`);
        this.load();
      } else {
        await Api.events.create(body);
        UI.toast(`"${body.title}" created and published`);
        this.change({ status: 'published' });   // new events are published, so show that tab
      }
      UI.$('eventDialog').close();
    } catch (err) {
      UI.showApiError(form, err);   // 400 goes next to the fields, 403 and 409 go in the summary line
    } finally {
      UI.busy(button, false);
    }
  },

  /* ---- Status and delete ---- */

  // PUT replaces the whole event, so send every field back with only the status changed
  async setStatus(event, status) {
    if (status === 'cancelled') {
      const ok = await UI.confirm({
        title: `Cancel "${event.title}"?`,
        message: 'Customers will no longer be able to book it. Existing bookings stay as they are until you cancel them.',
        confirmLabel: 'Cancel event',
        danger: true
      });
      if (!ok) return;
    }
    try {
      await Api.events.update(event.id, {
        title: event.title,
        description: event.description || '',
        venue_id: event.venue_id,
        event_date: UI.toApiDate(UI.toInputValue(event.event_date)),
        ticket_price: Number(event.ticket_price),
        total_tickets: event.total_tickets,
        status
      });
      UI.toast(`"${event.title}" ${this.STATUS_WORDS[status]}`);
      this.load();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async remove(event) {
    const ok = await UI.confirm({
      title: `Delete "${event.title}"?`,
      message: 'This removes the event for good. It only works for events that have no bookings.',
      confirmLabel: 'Delete event',
      danger: true
    });
    if (!ok) return;
    try {
      await Api.events.remove(event.id);
      UI.toast(`"${event.title}" deleted`);
      this.load();
    } catch (err) {
      // 409 = the database refused because bookings point at this event
      UI.toast(err.status === 409
        ? `"${event.title}" has bookings, so it can't be deleted. Cancel the event instead.`
        : err.message, 'error');
    }
  }
};

