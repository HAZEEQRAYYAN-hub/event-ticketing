// Small helper functions that turn raw data from the backend
// into text that looks nice on the page.

const LOCALE = 'en-MY'

// 120 -> "RM 120.00", 0 -> "Free"
// The backend sends prices as text ("120.00"), so we convert to a number first.
export function formatPrice(value) {
  const amount = Number(value)
  if (amount === 0) return 'Free'
  return `RM ${amount.toFixed(2)}`
}

// 240 -> "RM 240.00" (always a number, even when 0; used for totals)
export function formatMoney(value) {
  return `RM ${Number(value).toFixed(2)}`
}

// "2026-12-01T12:00:00.000Z" -> "Tuesday, 1 December 2026"
export function formatDateLong(isoDate) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(isoDate))
}

// "2026-12-01T12:00:00.000Z" -> "1 Dec 2026"
export function formatDateShort(isoDate) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(isoDate))
}

// "2026-12-01T12:00:00.000Z" -> "8:00 pm"
export function formatTime(isoDate) {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(isoDate)).toLowerCase()
}

// Splits a date into pieces for the ticket "stub": { day: "01", month: "Dec", weekday: "Tue" }
export function getDateParts(isoDate) {
  const date = new Date(isoDate)
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: new Intl.DateTimeFormat(LOCALE, { month: 'short' }).format(date),
    weekday: new Intl.DateTimeFormat(LOCALE, { weekday: 'short' }).format(date),
  }
}

// true if the date is earlier than right now
export function isPast(isoDate) {
  return new Date(isoDate).getTime() < Date.now()
}

// Text and percentage for the "seats left" bar
export function getSeatsInfo(event) {
  const total = Number(event.total_tickets)
  const left = Number(event.available_tickets)
  const percentSold = total > 0 ? Math.round(((total - left) / total) * 100) : 100

  let label = `${left.toLocaleString(LOCALE)} of ${total.toLocaleString(LOCALE)} left`
  if (left === 0) label = 'Sold out'
  else if (left <= Math.max(10, total * 0.1)) label = `Only ${left} left`

  return { left, total, percentSold, label, soldOut: left === 0 }
}
