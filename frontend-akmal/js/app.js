/* app.js
   Starts the app, decides which page to show from the address bar (#/events, #/venues ...)
   and applies the role rules to the menu and the routes.

   There are four roles. "guest" is someone who has not signed in: they can open Events
   and Venues. Booking needs a customer account, and managing needs organiser or admin. */

const App = {
  // Each route says which roles may open it.
  ROUTES: {
    overview: { label: 'Overview',   page: OverviewPage, roles: ['admin', 'organiser'],                      menu: true },
    events:   { label: 'Events',     page: EventsPage,   roles: ['guest', 'customer', 'admin', 'organiser'], menu: true },
    venues:   { label: 'Venues',     page: VenuesPage,   roles: ['guest', 'customer', 'admin', 'organiser'], menu: true },
    bookings: { label: 'Bookings',   page: BookingsPage, roles: ['customer', 'admin', 'organiser'],          menu: true },
    users:    { label: 'Users',      page: UsersPage,    roles: ['admin'],                                   menu: true },
    profile:  { label: 'My account', page: ProfilePage,  roles: ['customer', 'admin', 'organiser'],          menu: false }
  },

  ROLE_NAMES: { admin: 'Administrator', organiser: 'Organiser', customer: 'Customer' },

  returnTo: '',      // the page a guest was after when they were sent to sign in
  signInNotice: {},  // what the sign-in form should say the next time it is shown

  start() {
    Session.load();
    LoginPage.init();
    RegisterPage.init();
    EventsPage.init();
    VenuesPage.init();
    UsersPage.init();
    BookForm.init();

    UI.$('signOut').addEventListener('click', () => this.signOut());
    UI.$('owner').textContent = `Frontend by ${CONFIG.OWNER.name} (${CONFIG.OWNER.studentId})`;

    window.addEventListener('hashchange', () => this.route());
    // api.js fires this when the API rejects our token. It has already cleared the session.
    window.addEventListener('session-expired', () => this.expired());

    this.route();
  },

  // Staff start on the figures. Guests and customers start on what they can book.
  home() {
    return Session.isStaff ? 'overview' : 'events';
  },

  // Change page. Setting the hash triggers route(), unless we are already there.
  // replace = true swaps the current history entry, so the Back button does not land on a redirect.
  go(name, replace = false) {
    if (location.hash === '#/' + name) this.route();
    else if (replace) location.replace('#/' + name);
    else location.hash = '#/' + name;
  },

  /* Runs on every page change */
  route() {
    if (Session.user && Session.isExpired()) return this.expired();

    const name = location.hash.replace(/^#\/?/, '') || this.home();
    const role = Session.role;
    document.querySelectorAll('dialog[open]').forEach(d => d.close());

    // The sign-in and register forms have their own screen
    if (name === 'signin' || name === 'register') {
      if (Session.user) return this.go(this.home(), true);   // already signed in
      return this.showAuth(name);
    }

    const route = this.ROUTES[name];

    // A guest asking for a page that needs an account is sent to sign in, then brought back
    if (route && role === 'guest' && !route.roles.includes('guest')) {
      this.returnTo = name;
      return this.toSignIn({ text: `Sign in to open ${route.label}.` }, true);
    }

    const view = UI.$('view');
    this.showShell(name);

    if (!route) {
      UI.empty(view, 'Page not found', 'Pick a page from the menu.');
    } else if (!route.roles.includes(role)) {
      // Typing #/users as an organiser, or #/overview as a customer, lands here
      UI.empty(view, 'Not available for your account', `You are signed in as ${this.ROLE_NAMES[role].toLowerCase()}, and this page is for other roles.`);
    } else {
      document.title = `${this.label(name)} | Box Office`;
      route.page.render(view);
    }
    view.focus();
  },

  // A customer's bookings page only holds their own, so the menu says so
  label(name) {
    return name === 'bookings' && Session.isCustomer ? 'My bookings' : this.ROUTES[name].label;
  },

  /* ---- Signing in and out ---- */

  // Send someone to the sign-in form. notice = { text, success, email }, all optional.
  toSignIn(notice = {}, replace = false) {
    this.signInNotice = notice;
    this.go('signin', replace);
  },

  showAuth(name) {
    UI.$('shell').hidden = true;
    UI.$('loginView').hidden = false;
    if (name === 'register') {
      RegisterPage.show();
    } else {
      LoginPage.show(this.signInNotice);
      this.signInNotice = {};   // a notice is shown once
    }
  },

  /* Called by the login page after a successful sign-in */
  enter() {
    const wanted = this.ROUTES[this.returnTo];
    const target = wanted && wanted.roles.includes(Session.role) ? this.returnTo : this.home();
    this.returnTo = '';
    this.go(target);
  },

  // The person chose "Browse without signing in"
  forgetReturn() {
    this.returnTo = '';
    EventsPage.pendingId = null;
  },

  // The next person on this computer should not inherit searches, tabs or a half-made booking
  clearState() {
    Session.clear();
    EventsPage.resetFilters();
    VenuesPage.resetFilters();
    BookingsPage.resetFilters();
    Lookups.forgetVenues();
    this.forgetReturn();
  },

  // Signing out does not lock anything any more: the person carries on as a guest
  signOut() {
    this.clearState();
    UI.toast('You have signed out.');
    this.go('events');
  },

  // The two-hour JWT ran out. Ask for a fresh sign-in and come back to the same page.
  expired() {
    const current = location.hash.replace(/^#\/?/, '');
    this.clearState();
    if (this.ROUTES[current]) this.returnTo = current;
    this.toSignIn({ text: 'Your session has expired. Sign in again.' }, true);
  },

  /* ---- The sidebar ---- */

  showShell(current) {
    UI.$('loginView').hidden = true;
    UI.$('shell').hidden = false;

    // Build the menu from the routes this role is allowed to open
    const role = Session.role;
    UI.$('nav').innerHTML = Object.entries(this.ROUTES)
      .filter(([, route]) => route.menu && route.roles.includes(role))
      .map(([name]) =>
        `<a href="#/${name}" ${name === current ? 'aria-current="page"' : ''}>${this.label(name)}</a>`)
      .join('');

    UI.$('brand').href = '#/' + this.home();
    UI.$('brandNote').textContent = Session.isStaff ? 'Staff console' : 'Events and tickets';

    // Signed in: name, role and Sign out. Guest: Sign in and Register.
    UI.$('sideUser').hidden = !Session.user;
    UI.$('sideGuest').hidden = !!Session.user;
    if (Session.user) {
      UI.$('whoName').textContent = Session.user.name;
      UI.$('whoRole').textContent = this.ROLE_NAMES[role];
    }
  },

  // After a rename, update the saved session and the sidebar
  updateName(name) {
    Session.save(Session.token, { ...Session.user, name });
    UI.$('whoName').textContent = name;
  }
};

App.start();
