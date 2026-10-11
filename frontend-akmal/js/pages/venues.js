/* venues.js
   CRUD on /venues. Guests and customers get the same list without the buttons.
     GET    /venues        list, with search, sort and pagination done by the API
     POST   /venues        create               (admin, organiser)
     PUT    /venues/:id    edit                 (admin, organiser)
     DELETE /venues/:id    delete               (admin only) */

const VenuesPage = {
  filters: {},
  resetFilters() {
    this.filters = { search: '', sort: 'name:asc', page: 1 };
  },
  rows: [],
  loadCount: 0,

  init() {
    this.resetFilters();
    UI.$('venueForm').addEventListener('submit', e => { e.preventDefault(); this.submit(); });
  },

  render(view) {
    view.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Venues</h1>
          <p>The places events can be held. ${Session.role === 'organiser' ? 'Only an administrator can delete a venue.' : ''}</p>
        </div>
        ${Session.isStaff ? '<button class="btn btn-primary" id="newVenue" type="button">New venue</button>' : ''}
      </header>

      <div class="toolbar">
        <input type="search" id="venueSearch" placeholder="Search name or city" aria-label="Search venues">
        <select id="venueSort" aria-label="Sort venues">
          <option value="name:asc">Name, A to Z</option>
          <option value="city:asc">City, A to Z</option>
          <option value="capacity:desc">Capacity, largest first</option>
          <option value="capacity:asc">Capacity, smallest first</option>
        </select>
      </div>

      <div id="venueList"></div>
      <div id="venuePager" class="pager"></div>`;

    UI.$('venueSearch').value = this.filters.search;
    UI.$('venueSort').value = this.filters.sort;

    if (Session.isStaff) UI.$('newVenue').addEventListener('click', () => this.openForm());
    UI.$('venueSearch').addEventListener('input', UI.debounce(e => this.change({ search: e.target.value.trim() })));
    UI.$('venueSort').addEventListener('change', e => this.change({ sort: e.target.value }));

    UI.$('venueList').addEventListener('click', e => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      const venue = this.rows.find(row => row.id === Number(button.dataset.id));
      if (!venue) return;
      if (button.dataset.action === 'edit') this.openForm(venue);
      if (button.dataset.action === 'delete') this.remove(venue);
    });

    this.load();
  },

  change(patch) {
    Object.assign(this.filters, { page: 1 }, patch);
    this.load();
  },

  async load() {
    const box = UI.$('venueList');
    if (!box) return;
    const mine = ++this.loadCount;
    UI.loading(box, 'Loading venues…');

    const [sort, order] = this.filters.sort.split(':');
    try {
      const result = await Api.venues.list({
        search: this.filters.search, sort, order,
        page: this.filters.page, limit: CONFIG.PAGE_SIZE
      });
      if (mine !== this.loadCount || !UI.$('venueList')) return;

      if (!result.data.length && result.total && this.filters.page > 1) {
        this.filters.page -= 1;
        return this.load();
      }

      this.rows = result.data;
      this.draw(box, result);
    } catch (err) {
      if (mine === this.loadCount && UI.$('venueList')) {
        UI.$('venuePager').innerHTML = '';
        UI.failed(box, err, () => this.load());
      }
    }
  },

  draw(box, result) {
    if (!result.data.length) {
      if (this.filters.search) UI.empty(box, 'No venues match', 'Try a different name or city.');
      else UI.empty(box, 'No venues yet', Session.isStaff ? 'Add one so events have somewhere to happen.' : '');
    } else {
      const staff = Session.isStaff;   // only staff get the last column of buttons
      box.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Name</th><th>Address</th><th>City</th><th class="num">Capacity</th>${staff ? '<th><span class="sr-only">Actions</span></th>' : ''}</tr>
            </thead>
            <tbody>
              ${result.data.map(v => `
                <tr>
                  <td><strong>${UI.esc(v.name)}</strong></td>
                  <td>${UI.esc(v.address)}</td>
                  <td>${UI.esc(v.city)}</td>
                  <td class="num">${UI.number(v.capacity)}</td>
                  ${staff ? `
                  <td class="row-actions">
                    <button class="btn btn-small" type="button" data-action="edit" data-id="${v.id}">Edit</button>
                    ${Session.isAdmin
                      ? `<button class="btn btn-small btn-danger" type="button" data-action="delete" data-id="${v.id}">Delete</button>`
                      : ''}
                  </td>` : ''}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }
    UI.pager(UI.$('venuePager'), result, page => { this.filters.page = page; this.load(); });
  },

  openForm(venue = null) {
    const form = UI.$('venueForm');
    form.reset();
    UI.clearErrors(form);
    UI.$('venueFormTitle').textContent = venue ? 'Edit venue' : 'New venue';
    if (venue) {
      form.elements.id.value = venue.id;
      form.elements.name.value = venue.name;
      form.elements.address.value = venue.address;
      form.elements.city.value = venue.city;
      form.elements.capacity.value = venue.capacity;
    }
    UI.$('venueDialog').showModal();
  },

  validate(values) {
    const errors = {};
    const capacity = Number(values.capacity);
    if (!values.name.trim()) errors.name = 'Enter the venue name.';
    if (!values.address.trim()) errors.address = 'Enter the address.';
    if (!values.city.trim()) errors.city = 'Enter the city.';
    if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = 'Enter a whole number, at least 1.';
    return errors;
  },

  async submit() {
    const form = UI.$('venueForm');
    const values = UI.formValues(form);
    const errors = this.validate(values);
    if (Object.keys(errors).length) return UI.showErrors(form, errors);

    const body = {
      name: values.name.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      capacity: Number(values.capacity)
    };

    const button = form.querySelector('[type=submit]');
    UI.clearErrors(form);
    UI.busy(button, true);
    try {
      if (values.id) await Api.venues.update(values.id, body);
      else await Api.venues.create(body);
      Lookups.forgetVenues();   // the event form must fetch the new list next time
      UI.toast(`"${body.name}" ${values.id ? 'saved' : 'added'}`);
      UI.$('venueDialog').close();
      this.load();
    } catch (err) {
      UI.showApiError(form, err);
    } finally {
      UI.busy(button, false);
    }
  },

  async remove(venue) {
    const ok = await UI.confirm({
      title: `Delete "${venue.name}"?`,
      message: 'This removes the venue for good. It only works for venues that no event is using.',
      confirmLabel: 'Delete venue',
      danger: true
    });
    if (!ok) return;
    try {
      await Api.venues.remove(venue.id);
      Lookups.forgetVenues();
      UI.toast(`"${venue.name}" deleted`);
      this.load();
    } catch (err) {
      UI.toast(err.status === 409
        ? `"${venue.name}" is used by at least one event, so it can't be deleted.`
        : err.message, 'error');
    }
  }
};

