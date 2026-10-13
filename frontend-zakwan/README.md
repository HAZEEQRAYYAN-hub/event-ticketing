# Tixora: customer website

Individual frontend for the Event Ticketing and Venue Booking System (SWC3633/SWC4443).

**Author:** AHMAD ZAKWAN BIN MUHAMMAD HADI (AM2512021975)

Tixora is the customer side of the system, plus an admin approval step. Visitors browse and search events; customers sign up, book tickets and cancel bookings. Each new booking waits for an **admin to approve it** (for example after checking payment); only then does the customer get their QR code. Other staff work (creating events and venues, managing users) belongs to the staff console in `../frontend-akmal`.

## Run it

You need Node.js (LTS) and the shared backend running.

1. **Once only:** in phpMyAdmin, select the `ticketing` database, open the SQL tab and run `database/add-approval.sql`. It adds the approval column (see "Backend change" below). A fresh install from `schema.sql` already has it.
2. Start MySQL in XAMPP and the backend (`cd backend` then `node app.js`). It listens on `http://localhost:3000`.
3. In this folder, copy `.env.example` to `.env` and check the two values:
   - `VITE_API_URL` points at the backend.
   - `VITE_API_KEY` is the same as `API_KEY` in `backend/.env`.
4. Install and start:
   ```
   npm install
   npm run dev
   ```
5. Open `http://localhost:5173`.

**Test accounts.** The sample users in `database/data.sql` have the placeholder `<PASTE_HASH>` instead of a password, so they cannot log in as shipped. To use them, run this once in phpMyAdmin (SQL tab, `ticketing` database). It sets every sample user's password to `Password123`:

```sql
UPDATE users SET password_hash = '$2b$10$w5B2Sn9m5yja2Z.O6uPri.jmnV5zC9aGy7IrzBf6ojfA29RC1vM.6';
```

Then log in as `cust1@demo.com` / `Password123` (customer) or `admin@demo.com` / `Password123` (admin). Or create a new customer account with Sign up.

## Technology

| Tool | Why |
|---|---|
| React 19 | The site is built from reusable pieces (event card, button, form field) instead of repeated HTML |
| Vite 8 | Runs the site locally with instant reload, and builds it for deployment |
| Tailwind CSS 4 | Styling with one shared set of colours, fonts and spacing (`src/index.css`) |
| React Router 7 | Separate pages with real addresses, so refresh, Back and shared links work |

Plain JavaScript, no TypeScript.

## Files

| Path | What it does |
|---|---|
| `src/main.jsx` | Starting point: router and login memory around the app |
| `src/App.jsx` | Every page and its address |
| `src/config.js` | Author details, page size, ticket limit |
| `src/index.css` | Design tokens (colours, fonts) and base styles |
| `src/api/client.js` | The only place that calls `fetch`. Adds the API key and token, turns errors into plain messages, signs out on an expired token |
| `src/api/*.js` | One function per backend endpoint |
| `src/context/AuthContext.jsx` | Who is logged in; log in, sign up, log out |
| `src/components/` | Shared pieces: navbar, footer, buttons, event card, form field, alerts, loading/empty/error states, confirm dialog |
| `src/pages/` | One file per page |
| `src/utils/format.js` | Prices (RM), dates and times (Malaysia format), seats left |
| `src/utils/ticket.js` | Ticket code and QR image address |

## Pages

| Address | Page | Login |
|---|---|---|
| `/` | Home: next event, upcoming events, venues, how booking works | No |
| `/events` | All events with search, venue filter, price range, sort and pages | No |
| `/events/:id` | Event details and booking box | Booking needs a customer account |
| `/register`, `/login` | Sign up and log in | No |
| `/my-tickets` | The customer's bookings, with Active / Cancelled / All tabs | Yes |
| `/my-tickets/:id` | One ticket with QR code, print and cancel | Yes |
| `/profile` | Account details, change name, booking summary | Yes |
| `/admin/bookings` | Manage bookings: approve or reject bookings awaiting approval | Admin only |

## API endpoints used

Every request sends `x-api-key`. After login, requests also send `Authorization: Bearer <token>`.

| Page | Method and endpoint | Used for |
|---|---|---|
| Sign up | `POST /auth/register`, then `POST /auth/login` | Create the account, then sign straight in (register returns no token) |
| Log in | `POST /auth/login` | Get the token and role |
| Home | `GET /events?sort=event_date&order=asc&limit=12` | Next and upcoming events |
| Home | `GET /venues?sort=name&limit=6` | Venue list |
| Events | `GET /events` with `search`, `venue_id`, `min_price`, `max_price`, `sort`, `order`, `page`, `limit` | Filtering, sorting and paging are done by the API |
| Events | `GET /venues?sort=name&limit=50` | Venue filter |
| Event details | `GET /events/:id`, `GET /venues/:id` | Event and full venue address |
| Event details | `POST /bookings` | Book 1 to 10 tickets |
| My tickets | `GET /bookings` | The customer's own bookings (the API filters by token) |
| Ticket | `GET /bookings/:id`, `GET /events/:id` | Booking plus event date and venue |
| Ticket | `PATCH /bookings/:id/cancel` | Cancel and return tickets to sale |
| Profile | `GET /users/:id`, `PUT /users/:id`, `GET /bookings` | Read profile, change name, booking summary |
| Manage bookings | `GET /bookings`, `GET /users` | Every booking, with customer names (admin) |
| Manage bookings | `PATCH /bookings/:id/approve` | Approve a booking (new endpoint, admin only) |
| Manage bookings | `PATCH /bookings/:id/cancel` | Reject a booking: cancels it and returns the seats |

**Third-party API:** ticket QR codes come from QR Server (`api.qrserver.com`). The backend sends a QR code once, when the booking is made, but does not store it. The ticket page shows that one straight after booking, and later asks QR Server again for the same text, `BOOKING-<id>-EVENT-<event id>`, which gives the same code.

## Booking approval workflow

1. A customer books. The backend saves the booking as `status = 'confirmed'`, `approval_status = 'pending'`, and holds the seats.
2. The customer's ticket shows **Awaiting approval**. The QR code is hidden.
3. An admin opens **Manage bookings**, checks the booking (for example that it has been paid), and clicks **Approve** or **Reject**.
4. Approve: `approval_status` becomes `approved` and the customer's QR code appears. Reject: the booking is cancelled and the seats go back on sale.

Only admins can approve. A customer or organiser who calls the endpoint gets `403`; approving twice or approving a cancelled booking gets `409`.

### Backend change

This feature needed a small, add-only change to the shared backend (agreed before it was made):

| File | Change |
|---|---|
| `database/schema.sql` | New column `bookings.approval_status ENUM('pending','approved') NOT NULL DEFAULT 'pending'` |
| `database/add-approval.sql` | Adds that column to an existing database and marks older bookings `approved` |
| `backend/routes/bookings.js` | New route `PATCH /bookings/:id/approve` (admin only); the `POST /bookings` reply also includes `approval_status` |

Nothing existing was removed or renamed. The `status` column and every other endpoint work as before, so the other frontends keep working unchanged; they simply do not show the approval step. To undo: `ALTER TABLE bookings DROP COLUMN approval_status;` and restore the two files from git.

## Error handling

All requests go through `apiRequest()` in `src/api/client.js`.

| Situation | What the user sees |
|---|---|
| Backend not running | "Can't reach the Tixora server…" with Try again |
| `400` validation | Message under the matching form field |
| `401` at login | "That email and password don't match" |
| `401` later (token expired, 2 hours) | Signed out and sent to log in with a notice |
| `403` | "Not your ticket" on another customer's booking; "Admins only" on Manage bookings for non-admins |
| `404` | "Event not found" / "Ticket not found" |
| `409` on sign up | "An account with this email already exists" |
| `409` on booking | Not enough tickets; the seat count reloads |
| `409` on approve | Already approved or cancelled; the list reloads |
| `429` rate limit | Wait a few minutes and try again |

Every page that loads data has a loading state, an error state with Try again, and an empty state.

## Design decisions

- **Events look like tickets.** A coloured date stub, a perforated tear line, and a bar showing how many seats are left. The same shape is used for the "Next up" hero, booking rows and the ticket page.
- **Colours and fonts in one place.** Paper `#FAF7F2`, ink `#16161D`, coral `#FF5A3C`, teal `#0E5E6F`; Bricolage Grotesque for headings, Inter for text.
- **Filters live in the address bar** (`/events?search=rock&venue_id=1`), so refresh and Back keep them.
- **Few requests.** Search waits until typing stops, and React StrictMode is off, to stay inside the API's limit of 100 requests per 15 minutes.
- **Checks before sending.** Forms are checked in the browser with the same rules as the API (valid email, 8+ character password, 1 to 10 tickets).
- **Responsive.** Works from phone width up; the navbar folds into a menu on small screens.
- **Accessible basics.** Labels on every field, visible keyboard focus, a skip link, and no animation when the system asks for reduced motion.

## Known limits

- The API key is in `.env` and ends up in the browser, because the backend requires it from the client. A browser app cannot hide it. The token and role checks are what protect the data.
- The backend has no payments, event images, password change or email change, so the site does not offer them.
- The backend's `GET /bookings/:id` has no event title, so the ticket page makes a second request for the event.
- Staff accounts can log in, but cannot book (the API only lets customers book). Admins get the Manage bookings page; organisers are pointed to the staff console.
- The backend still returns a QR code in the `POST /bookings` reply (other frontends rely on it). Tixora does not show it until the booking is approved.
- There is no payment system; the admin checks payment outside the website before approving.
