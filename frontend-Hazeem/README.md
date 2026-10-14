# TicketHub frontend

Plain HTML/CSS/JS (no build step) for the `event-ticketing` backend. Put this folder next to `backend/` and `database/` in the repo as `frontend/`.

## Setup
1. **Database** – `database/data.sql` has `<PASTE_HASH>` placeholders. Generate a bcrypt hash and replace them all:
   ```bash
   cd backend && npm install
   node -e "console.log(require('bcryptjs').hashSync('Password123',10))"
   ```
   Then load `schema.sql` and `data.sql` into MySQL.
2. **Backend** – copy `.env.example` to `.env`, set `DB_*`, `JWT_SECRET`, `API_KEY`, then `node app.js`.
3. **Frontend** – open `config.js` and set `API_BASE` and `API_KEY` (same value as in backend `.env`). Serve the folder:
   ```bash
   cd frontend && npx serve .      # or: python3 -m http.server 8080
   ```

## Demo logins (password = what you hashed, e.g. Password123)
| Role | Email | Can do |
|---|---|---|
| customer | cust1@demo.com | browse, book, cancel own bookings |
| organiser | org@demo.com | + create/edit/delete own events, manage venues |
| admin | admin@demo.com | + users, delete bookings/venues, edit any event |

## Notes
- The events/venues endpoints require the `x-api-key` header, so the key is visible in the frontend. Fine for a class/demo project; for production, proxy through your server.
- Backend rate limit is 100 requests / 15 min per IP, so avoid refreshing excessively.
