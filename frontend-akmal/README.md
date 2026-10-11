# Box Office: staff console

Individual frontend for the Event Ticketing and Venue Booking System (SWC3633/SWC4443).

**Author:** AKMAL FARHAN BIN HAMIZAN (AM2512021926)

This frontend is the staff side of the system. Organisers and administrators use it to manage events, venues, bookings and user accounts through the group's shared REST API. Customers cannot sign in here; booking tickets belongs to the customer frontend.

## Run it

1. Start the shared backend (see the `backend` folder). By default it listens on `http://localhost:3000`.
2. Open `js/config.js` and check two values:
   - `API_URL` points at the backend.
   - `API_KEY` is the same as `API_KEY` in `backend/.env`.
3. Open `index.html` in a browser. There is nothing to install or build.
4. Sign in with an organiser or admin account from the seed data.

The page loads two fonts from Google Fonts and, in the booking detail box, a QR image from api.qrserver.com. Without internet the console still works: it falls back to system fonts and shows the ticket code as text.

## Technology

Plain HTML, CSS and JavaScript. No framework and no build step, so every line that runs is in this folder.

- `fetch` for all API calls, wrapped in one function in `js/api.js`
- `sessionStorage` for the JWT and the signed-in user
- Hash routing (`#/events`, `#/venues` and so on) so refresh and the back button work
- The native `<dialog>` element for forms and confirmations

## Files

| File | What it does |
|---|---|
| `index.html` | Sign-in screen, the app shell, and the dialogs |
| `css/style.css` | All styling |
| `js/config.js` | API address, API key, page size, author name |
| `js/api.js` | The only file that talks to the backend. Holds the request function, the session and JWT handling, and one function per endpoint |
| `js/ui.js` | Shared helpers: formatting, messages, confirm box, form errors, loading, empty and error states |
| `js/app.js` | Starts the app, routes between pages, applies the role rules |
| `js/pages/login.js` | Sign in |
| `js/pages/overview.js` | Figures, upcoming events, latest bookings |
| `js/pages/events.js` | Events: list, create, edit, change status, delete |
| `js/pages/venues.js` | Venues: list, create, edit, delete |
| `js/pages/bookings.js` | Bookings: list, view, cancel, delete |
| `js/pages/users.js` | User accounts (admin only) |
| `js/pages/profile.js` | The signed-in person's own account |

## API endpoints used

Every request sends the `x-api-key` header. After sign-in every request also sends `Authorization: Bearer <token>`.

| Screen | Method and endpoint | Used for |
|---|---|---|
| Sign in | `POST /auth/login` | Get the JWT and the user's role |
| Overview | `GET /events?status=published&sort=event_date&limit=50` | Events on sale and what is coming up |
| Overview | `GET /bookings` | Booking counts, tickets booked, revenue |
| Events | `GET /events` with `status`, `search`, `venue_id`, `sort`, `order`, `page`, `limit` | The list. Filtering, sorting and paging are done by the API |
| Events | `POST /events` | Create an event |
| Events | `PUT /events/:id` | Edit an event, and publish, unpublish or cancel it |
| Events | `DELETE /events/:id` | Delete an event |
| Events | `GET /venues?sort=name&limit=50` | Fill the venue filter and the venue field in the form |
| Venues | `GET /venues` with `search`, `sort`, `order`, `page`, `limit` | The list |
| Venues | `POST /venues`, `PUT /venues/:id` | Add and edit a venue |
| Venues | `DELETE /venues/:id` | Delete a venue (admin) |
| Bookings | `GET /bookings` | Every booking |
| Bookings | `GET /bookings/:id` | The detail box |
| Bookings | `PATCH /bookings/:id/cancel` | Cancel a booking and return its tickets |
| Bookings | `DELETE /bookings/:id` | Delete a booking record (admin) |
| Bookings | `GET /users` | Customer names in the table (admin) |
| Users | `GET /users`, `PUT /users/:id`, `DELETE /users/:id` | List, rename and delete accounts (admin) |
| My account | `GET /users/:id`, `PUT /users/:id` | Read my profile and change my name |

Third-party service: the booking detail box shows a QR code from `api.qrserver.com` for the text `BOOKING-<id>-EVENT-<event id>`. This is the same text the backend encodes in the QR code it sends the customer, so door staff can compare the two.

## Roles

| Action | Organiser | Administrator | Customer |
|---|---|---|---|
| Sign in to this console | Yes | Yes | No, refused at sign-in |
| Create events | Yes | Yes | |
| Edit, change status, delete events | Own events only | Any event | |
| Add and edit venues | Yes | Yes | |
| Delete venues | No, button not shown | Yes | |
| View and cancel bookings | Yes | Yes | |
| See customer names on bookings | No, sees "Customer #3" | Yes | |
| Delete booking records | No | Yes | |
| Users page | No, menu item hidden and route refused | Yes | |

The frontend hides what a role cannot do, but it does not rely on that. The API enforces the same rules and answers `403` if a request is forced.

## Validation

Forms are checked in the browser before anything is sent, and the message appears under the field.

- Sign in: email format, password present.
- Event: title, venue, date and time, price of 0 or more, whole number of tickets.
- Venue: name, address, city, whole-number capacity of at least 1.

Three rules go further than the API's own checks:

- A new event's date must be in the future.
- Total tickets cannot be more than the chosen venue's capacity.
- When editing, total tickets cannot go below the number already sold.

If the API still rejects a request with `400`, its `details` list is matched to the form fields by name, so server messages appear in the same place as browser ones.

## Error handling

All failures pass through `request()` in `js/api.js`, which turns them into one `ApiError` type.

| Situation | What the user sees |
|---|---|
| Backend not running | "Can't reach the API" with a Try again button |
| `400` validation | Messages under the fields |
| `401` wrong email or password | Message on the sign-in form |
| `401` token expired or rejected | Signed out, sent to sign in with a notice |
| `403` | The API's message |
| `404` | The API's message |
| `409` on delete | A plain explanation, for example that an event with bookings cannot be deleted and should be cancelled instead |
| `429` rate limit | A message saying to wait and try again |

The JWT's expiry time is also read in the browser, so an expired session is caught on the next page change without waiting for the API to refuse it.

## Design decisions

- **One place for API calls.** Pages call `Api.events.list()` and similar, never `fetch` directly. Headers, errors and session expiry are handled once.
- **`sessionStorage`, not `localStorage`.** A staff console may be used on a shared computer, so closing the tab signs the person out.
- **The server does the heavy list work.** Events and venues use the API's own search, sort and pagination. Bookings are filtered in the browser because that endpoint has none.
- **Few requests.** The venue list is cached until a venue changes, and search waits until typing stops. This keeps the console inside the API's limit of 100 requests per 15 minutes.
- **Status changes use `PUT`.** The API has no separate publish endpoint, so the console sends the whole event back with only the status changed.
- **Everything from the API is escaped** before it is put on the page, so text such as `<script>` in an event title is shown, not run.
- **Events are drawn as tickets.** The date sits on a tear-off stub and a bar shows how much of the event is sold.

## Known limits

- The API key sits in `js/config.js`, which any visitor could read. A browser app cannot keep a key secret. The key only identifies the client; the JWT and role checks are what protect the data.
- New events are always created as published, because that is how the API creates them. To make a draft, create the event and then choose Unpublish.
- Deleting a confirmed booking as admin removes the record without returning its tickets, because that is what the endpoint does. The console warns about this and suggests cancelling first.
