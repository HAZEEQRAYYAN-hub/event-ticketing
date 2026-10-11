/* ui.js
   Small helpers shared by every page: formatting, messages, dialogs,
   form errors, and the loading / empty / error states. */

const UI = {
  $: id => document.getElementById(id),

  /* Escape text from the API before putting it into innerHTML, so a venue called
     "<script>" shows up as text instead of running. */
  esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  money: n => 'RM' + Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  number: n => Number(n).toLocaleString('en-MY'),

  date: iso => new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }),
  time: iso => new Date(iso).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' }),
  dateTime(iso) { return `${this.date(iso)}, ${this.time(iso)}`; },

  // API date -> value for <input type="datetime-local">, in the browser's own time zone
  toInputValue(iso) {
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  // "2026-12-20T18:00" -> "2026-12-20 18:00:00", the format the API asks for
  toApiDate(inputValue) {
    if (!inputValue) return '';
    const value = inputValue.replace('T', ' ');
    return value.length === 16 ? value + ':00' : value;
  },

  /* ---- Messages ---- */

  toast(message, type = 'ok') {
    const item = document.createElement('div');
    item.className = `toast toast-${type}`;
    item.textContent = message;
    this.$('toasts').appendChild(item);
    setTimeout(() => item.remove(), type === 'error' ? 8000 : 4500);
  },

  /* A confirm box that returns a promise:  const ok = await UI.confirm({...})  */
  confirm({ title, message, confirmLabel = 'Confirm', danger = false }) {
    const dialog = this.$('confirmDialog');
    this.$('confirmTitle').textContent = title;
    this.$('confirmMessage').textContent = message;
    const yes = this.$('confirmYes');
    yes.textContent = confirmLabel;
    yes.className = danger ? 'btn btn-danger-solid' : 'btn btn-primary';

    return new Promise(resolve => {
      dialog.returnValue = '';
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), { once: true });
      dialog.showModal();
    });
  },

  /* ---- Buttons and forms ---- */

  // Disable a button while a request is running so it can't be sent twice
  busy(button, isBusy, busyLabel = 'Saving…') {
    if (!button) return;
    if (isBusy) {
      button.dataset.label = button.textContent;
      button.textContent = busyLabel;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = false;
    }
  },

  formValues: form => Object.fromEntries(new FormData(form)),

  clearErrors(form) {
    form.querySelectorAll('[data-error-for]').forEach(el => { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    const summary = form.querySelector('.form-error');
    if (summary) summary.textContent = '';
  },

  /* errors looks like { title: 'Give the event a title.' }.
     The same function shows our own checks and the ones sent back by the API. */
  showErrors(form, errors, summaryText = '') {
    this.clearErrors(form);
    let first = null;
    const unmatched = [];

    Object.entries(errors).forEach(([field, message]) => {
      const input = form.elements[field];
      const slot = form.querySelector(`[data-error-for="${field}"]`);
      if (input && slot) {
        slot.textContent = message;
        input.setAttribute('aria-invalid', 'true');
        first = first || input;
      } else {
        unmatched.push(message);
      }
    });

    const summary = form.querySelector('.form-error');
    if (summary) summary.textContent = [summaryText, ...unmatched].filter(Boolean).join(' ');
    if (first) first.focus();
  },

  // Decide where an API error belongs: next to the fields, or in the form's summary line
  showApiError(form, err) {
    const fields = err.fieldErrors || {};
    if (Object.keys(fields).length) this.showErrors(form, fields, 'Check the highlighted fields.');
    else this.showErrors(form, {}, err.message);
  },

  /* ---- Page states ---- */

  loading(box, label = 'Loading…') {
    box.innerHTML = `<div class="state"><span class="spinner" aria-hidden="true"></span><p>${this.esc(label)}</p></div>`;
  },

  empty(box, title, hint = '') {
    box.innerHTML = `<div class="state"><h3>${this.esc(title)}</h3>${hint ? `<p>${this.esc(hint)}</p>` : ''}</div>`;
  },

  failed(box, err, retry) {
    box.innerHTML = `
      <div class="state state-error" role="alert">
        <h3>This didn't load</h3>
        <p>${this.esc(err.message)}</p>
        <button class="btn" type="button">Try again</button>
      </div>`;
    box.querySelector('button').addEventListener('click', retry);
  },

  /* "Showing 1 to 5 of 12" with Previous and Next */
  pager(box, { page, limit, total }, onChange) {
    if (!total) { box.innerHTML = ''; return; }
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);
    box.innerHTML = `
      <span>Showing ${from} to ${to} of ${total}</span>
      <span class="pager-buttons">
        <button class="btn btn-small" type="button" data-step="-1" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <button class="btn btn-small" type="button" data-step="1" ${to >= total ? 'disabled' : ''}>Next</button>
      </span>`;
    box.querySelectorAll('button').forEach(b =>
      b.addEventListener('click', () => onChange(page + Number(b.dataset.step))));
  },

  /* One event drawn as a ticket: date on the stub, details and a sold meter on the body.
     actionsHtml is optional buttons for the right-hand side. */
  ticket(e, actionsHtml = '') {
    const when = new Date(e.event_date);
    const sold = Math.max(0, e.total_tickets - e.available_tickets);
    const percent = Math.min(100, Math.round((sold / e.total_tickets) * 100));
    const price = Number(e.ticket_price) === 0 ? 'free entry' : `${this.money(e.ticket_price)} a ticket`;
    return `
      <article class="ticket" data-status="${this.esc(e.status)}">
        <div class="ticket-stub">
          <span class="stub-day">${when.getDate()}</span>
          <span class="stub-month">${when.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })}</span>
          <span class="stub-time">${this.time(e.event_date)}</span>
        </div>
        <div class="ticket-body">
          <h3>${this.esc(e.title)}</h3>
          <p class="ticket-meta">${this.esc(e.venue_name)}, ${price}</p>
          <div class="meter" role="img" aria-label="${sold} of ${e.total_tickets} tickets sold"><span style="width:${percent}%"></span></div>
          <p class="meter-label">${this.number(sold)} sold, ${this.number(e.available_tickets)} left</p>
        </div>
        ${actionsHtml ? `<div class="ticket-actions">${actionsHtml}</div>` : ''}
      </article>`;
  },

  statusTag(status) {
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    return `<span class="tag" data-status="${this.esc(status)}">${this.esc(label)}</span>`;
  },

  // Wait until the user stops typing before searching, so each keystroke isn't an API call
  debounce(fn, wait = 350) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
  }
};

/* Any button with data-close closes the dialog it sits in */
document.addEventListener('click', e => {
  const closer = e.target.closest('[data-close]');
  if (closer) closer.closest('dialog').close();
});

