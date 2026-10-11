/* profile.js
   The signed-in person's own account.
     GET /users/:id    read my profile (the API only allows your own id, unless you are an admin)
     PUT /users/:id    change my name */

const ProfilePage = {
  render(view) {
    view.innerHTML = `
      <header class="page-head">
        <div>
          <h1>My account</h1>
          <p>Your details and how long this sign-in lasts.</p>
        </div>
      </header>
      <div id="profileBody"></div>`;
    this.load();
  },

  async load() {
    const box = UI.$('profileBody');
    if (!box) return;
    UI.loading(box, 'Loading your account…');
    try {
      const me = await Api.users.get(Session.user.id);
      if (!UI.$('profileBody')) return;
      this.draw(box, me);
    } catch (err) {
      if (UI.$('profileBody')) UI.failed(box, err, () => this.load());
    }
  },

  draw(box, me) {
    const expiry = Session.expiresAt();   // read from the JWT itself
    box.innerHTML = `
      <div class="panel">
        <form id="profileForm" novalidate>
          <label class="field">
            <span>Name</span>
            <input name="name" maxlength="100" autocomplete="name" value="${UI.esc(me.name)}">
            <small class="field-error" data-error-for="name"></small>
          </label>
          <p class="form-error" role="alert"></p>
          <button class="btn btn-primary" type="submit">Save name</button>
        </form>

        <dl class="details">
          <div><dt>Email</dt><dd>${UI.esc(me.email)}</dd></div>
          <div><dt>Role</dt><dd>${UI.statusTag(me.role)}</dd></div>
          <div><dt>Signed in until</dt><dd>${expiry ? UI.dateTime(expiry) : 'Unknown'}</dd></div>
        </dl>
        <p class="note">Email and role can't be changed here. Sign-ins last two hours, then you are asked to sign in again.</p>
      </div>`;

    UI.$('profileForm').addEventListener('submit', e => { e.preventDefault(); this.submit(me); });
  },

  async submit(me) {
    const form = UI.$('profileForm');
    const name = UI.formValues(form).name.trim();
    if (!name) return UI.showErrors(form, { name: 'Enter your name.' });
    if (name === me.name) return UI.toast('That is already your name.');

    const button = form.querySelector('[type=submit]');
    UI.clearErrors(form);
    UI.busy(button, true);
    try {
      await Api.users.rename(me.id, name);
      me.name = name;
      App.updateName(name);
      UI.toast('Name saved');
    } catch (err) {
      UI.showApiError(form, err);
    } finally {
      UI.busy(button, false);
    }
  }
};
