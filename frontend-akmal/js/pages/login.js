/* login.js
   Sign in with POST /auth/login. Any role can sign in: customers to book tickets,
   organisers and admins to manage events. The role in the reply decides what the menu shows.
   The Register button swaps this form for the one in register.js. */

const LoginPage = {
  // Called once when the app starts
  init() {
    UI.$('loginForm').addEventListener('submit', e => { e.preventDefault(); this.submit(); });
    UI.$('showRegister').addEventListener('click', () => { location.hash = '#/register'; });
    // Giving up on signing in also drops the page or booking we were going to return to
    UI.$('browseGuest').addEventListener('click', () => App.forgetReturn());
  },

  // notice is an optional line such as "Your session has expired."
  // success turns the notice green and email fills in the form: both are used straight after registering.
  show({ text = '', success = false, email = '' } = {}) {
    const form = UI.$('loginForm');
    UI.$('registerForm').hidden = true;
    form.hidden = false;
    form.reset();
    UI.clearErrors(form);
    UI.$('loginNotice').textContent = text;
    UI.$('loginNotice').hidden = !text;
    UI.$('loginNotice').classList.toggle('notice-ok', success);
    document.title = 'Sign in | Box Office';
    form.elements.email.value = email;
    (email ? form.elements.password : form.elements.email).focus();
  },

  // Check the form in the browser first, so obvious mistakes never reach the API
  validate({ email, password }) {
    const errors = {};
    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'That doesn\'t look like an email address.';
    if (!password) errors.password = 'Enter your password.';
    return errors;
  },

  async submit() {
    const form = UI.$('loginForm');
    const values = UI.formValues(form);
    const errors = this.validate(values);
    if (Object.keys(errors).length) return UI.showErrors(form, errors);

    const button = form.querySelector('[type=submit]');
    UI.clearErrors(form);
    UI.busy(button, true, 'Signing in…');
    try {
      const { token, user } = await Api.login(values.email.trim(), values.password);
      Session.save(token, user);
      UI.toast(`Signed in as ${user.name}`);
      App.enter();   // goes back to the page or booking the person was after
    } catch (err) {
      UI.showApiError(form, err);
    } finally {
      UI.busy(button, false);
    }
  }
};

