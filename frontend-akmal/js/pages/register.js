/* register.js
   Create an account with POST /auth/register.
   The API always gives a new account the "customer" role, which is the role that can book.
   Registering does not sign you in (the API sends no token back), so afterwards the person
   lands on the sign-in form with their email already filled in. */

const RegisterPage = {
  // Called once when the app starts
  init() {
    UI.$('registerForm').addEventListener('submit', e => { e.preventDefault(); this.submit(); });
    UI.$('showLogin').addEventListener('click', () => { location.hash = '#/signin'; });
  },

  // Swap the sign-in form for this one
  show() {
    const form = UI.$('registerForm');
    UI.$('loginForm').hidden = true;
    form.hidden = false;
    form.reset();
    UI.clearErrors(form);
    document.title = 'Register | Box Office';
    form.elements.name.focus();
  },

  /* Checked in the browser before anything is sent.
     The length limits match the columns in the users table: name VARCHAR(100), email VARCHAR(150).
     The API does not check them, so without this a long name would come back as a 500. */
  validate({ name, email, password, confirm }) {
    const errors = {};
    if (!name.trim()) errors.name = 'Enter your name.';
    else if (name.trim().length > 100) errors.name = 'Keep the name to 100 characters or fewer.';

    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'That doesn\'t look like an email address.';
    else if (email.trim().length > 150) errors.email = 'Keep the email to 150 characters or fewer.';

    if (!password) errors.password = 'Choose a password.';
    else if (password.length < 8) errors.password = 'Use at least 8 characters.';

    if (!confirm) errors.confirm = 'Type the password again.';
    else if (password && confirm !== password) errors.confirm = 'The two passwords don\'t match.';
    return errors;
  },

  async submit() {
    const form = UI.$('registerForm');
    const values = UI.formValues(form);
    const errors = this.validate(values);
    if (Object.keys(errors).length) return UI.showErrors(form, errors);

    const button = form.querySelector('[type=submit]');
    UI.clearErrors(form);
    UI.busy(button, true, 'Creating account…');
    try {
      // "confirm" is only for the browser check, so it is not sent
      const account = await Api.register(values.name.trim(), values.email.trim(), values.password);
      App.toSignIn({ text: 'Account created. Sign in to start booking.', success: true, email: account.email });
    } catch (err) {
      // 409 is the users table refusing a second account with the same email
      if (err.status === 409) {
        UI.showErrors(form, { email: 'An account with this email already exists. Go back and sign in.' });
      } else {
        UI.showApiError(form, err);   // 400 details go under the fields, anything else in the summary line
      }
    } finally {
      UI.busy(button, false);
    }
  }
};
