/* users.js
   Admin only.
     GET    /users        list every account
     PUT    /users/:id    rename (the API only lets the name be changed)
     DELETE /users/:id    delete
   Organisers never reach this page: the menu hides it and app.js refuses the route.
   If someone forced a request anyway, the API would answer 403. */

const UsersPage = {
  rows: [],

  init() {
    UI.$('userForm').addEventListener('submit', e => { e.preventDefault(); this.submit(); });
  },

  render(view) {
    view.innerHTML = `
      <header class="page-head">
        <div>
          <h1>Users</h1>
          <p>Everyone with an account. Customers register themselves from the sign-in screen.</p>
        </div>
      </header>
      <div id="userList"></div>`;

    UI.$('userList').addEventListener('click', e => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      const user = this.rows.find(row => row.id === Number(button.dataset.id));
      if (!user) return;
      if (button.dataset.action === 'rename') this.openForm(user);
      if (button.dataset.action === 'delete') this.remove(user);
    });

    this.load();
  },

  async load() {
    const box = UI.$('userList');
    if (!box) return;
    UI.loading(box, 'Loading users…');
    try {
      this.rows = await Api.users.list();
      if (!UI.$('userList')) return;
      this.draw(box);
    } catch (err) {
      if (UI.$('userList')) UI.failed(box, err, () => this.load());
    }
  },

  draw(box) {
    box.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th><span class="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            ${this.rows.map(u => {
              const me = u.id === Session.user.id;
              return `
                <tr>
                  <td><strong>${UI.esc(u.name)}</strong>${me ? ' <span class="you">you</span>' : ''}</td>
                  <td>${UI.esc(u.email)}</td>
                  <td>${UI.statusTag(u.role)}</td>
                  <td>${UI.date(u.created_at)}</td>
                  <td class="row-actions">
                    <button class="btn btn-small" type="button" data-action="rename" data-id="${u.id}">Rename</button>
                    ${me ? '' : `<button class="btn btn-small btn-danger" type="button" data-action="delete" data-id="${u.id}">Delete</button>`}
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  openForm(user) {
    const form = UI.$('userForm');
    form.reset();
    UI.clearErrors(form);
    form.elements.id.value = user.id;
    form.elements.name.value = user.name;
    UI.$('userDialog').showModal();
  },

  async submit() {
    const form = UI.$('userForm');
    const values = UI.formValues(form);
    const name = values.name.trim();
    if (!name) return UI.showErrors(form, { name: 'Enter a name.' });

    const button = form.querySelector('[type=submit]');
    UI.clearErrors(form);
    UI.busy(button, true);
    try {
      await Api.users.rename(values.id, name);
      if (Number(values.id) === Session.user.id) App.updateName(name);   // keep the sidebar in step
      UI.toast(`Renamed to ${name}`);
      UI.$('userDialog').close();
      this.load();
    } catch (err) {
      UI.showApiError(form, err);
    } finally {
      UI.busy(button, false);
    }
  },

  async remove(user) {
    const ok = await UI.confirm({
      title: `Delete ${user.name}?`,
      message: 'This removes the account for good. It only works for accounts with no bookings or events.',
      confirmLabel: 'Delete user',
      danger: true
    });
    if (!ok) return;
    try {
      await Api.users.remove(user.id);
      UI.toast(`${user.name} deleted`);
      this.load();
    } catch (err) {
      UI.toast(err.status === 409
        ? `${user.name} has bookings or events, so the account can't be deleted.`
        : err.message, 'error');
    }
  }
};
