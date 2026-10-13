// EVENT DETAILS PAGE  ( /events/:id )
// Uses: GET /api/events/:id   (the event)
//       GET /api/venues/:id   (full venue address)
//       POST /api/bookings    (when the customer books)

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createBooking } from '../api/bookings'
import { getEvent } from '../api/events'
import { getVenue } from '../api/venues'
import Alert from '../components/Alert'
import Button from '../components/Button'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import SeatsBar from '../components/SeatsBar'
import { MAX_TICKETS_PER_BOOKING } from '../config'
import { useAuth } from '../context/AuthContext'
import { formatDateLong, formatPrice, formatTime, getDateParts, getSeatsInfo, isPast } from '../utils/format'

export default function EventDetailsPage() {
  const { id } = useParams() // the number in the address, e.g. /events/3 -> "3"
  const [event, setEvent] = useState(null)
  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError(null)

    getEvent(id)
      .then(async (eventData) => {
        if (ignore) return
        setEvent(eventData)
        // The venue's address is a "nice to have", so a failure here is ignored
        try {
          const venueData = await getVenue(eventData.venue_id)
          if (!ignore) setVenue(venueData)
        } catch {
          if (!ignore) setVenue(null)
        }
      })
      .catch((err) => !ignore && setError(err))
      .finally(() => !ignore && setLoading(false))

    return () => { ignore = true }
  }, [id, reloadKey])

  if (loading && !event) return <LoadingState message="Loading event…" />

  if (error) {
    return error.status === 404 ? (
      <ErrorState title="Event not found" message="This event may have been removed. Have a look at what else is on." />
    ) : (
      <ErrorState message={error.message} onRetry={() => setReloadKey(reloadKey + 1)} />
    )
  }

  const date = getDateParts(event.event_date)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <Link to="/events" className="text-sm font-semibold text-teal hover:underline">Back to all events</Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* ---------- LEFT: about the event ---------- */}
        <div>
          {event.status === 'cancelled' && (
            <Alert type="error" className="mb-6">This event has been cancelled by the organiser.</Alert>
          )}

          <div className="flex items-start gap-5">
            <div className="hidden shrink-0 rounded-2xl bg-coral px-4 py-3 text-center text-ink sm:block">
              <p className="font-display text-4xl leading-none font-extrabold">{date.day}</p>
              <p className="mt-1 text-sm font-semibold">{date.month}</p>
            </div>
            <h1 className="text-4xl leading-tight font-extrabold sm:text-5xl">{event.title}</h1>
          </div>

          <dl className="mt-8 grid gap-6 border-y border-ink/10 py-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-stone">When</dt>
              <dd className="mt-1 font-semibold">{formatDateLong(event.event_date)}</dd>
              <dd className="text-stone">{formatTime(event.event_date)}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone">Where</dt>
              <dd className="mt-1 font-semibold">{event.venue_name}</dd>
              {venue && <dd className="text-stone">{venue.address}, {venue.city}</dd>}
            </div>
          </dl>

          <h2 className="mt-8 text-2xl font-bold">About this event</h2>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed whitespace-pre-line text-ink/80">
            {event.description || 'The organiser has not added a description yet.'}
          </p>

          {venue && (
            <>
              <h2 className="mt-10 text-2xl font-bold">The venue</h2>
              <p className="mt-3 text-ink/80">
                {venue.name} in {venue.city} holds up to {Number(venue.capacity).toLocaleString('en-MY')} people.
              </p>
              <Link to={`/events?venue_id=${venue.id}`} className="mt-2 inline-block text-sm font-semibold text-teal hover:underline">
                More events at {venue.name}
              </Link>
            </>
          )}
        </div>

        {/* ---------- RIGHT: booking box ---------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingBox event={event} onEventChanged={() => setReloadKey(reloadKey + 1)} />
        </aside>
      </div>
    </div>
  )
}

// The box where a customer picks how many tickets and books
function BookingBox({ event, onEventChanged }) {
  const { isLoggedIn, isCustomer } = useAuth()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')

  const seats = getSeatsInfo(event)
  const maxQuantity = Math.min(MAX_TICKETS_PER_BOOKING, seats.left)
  const total = Number(event.ticket_price) * quantity

  // Why booking is not possible, if it isn't
  let blockedReason = ''
  if (event.status === 'cancelled') blockedReason = 'This event was cancelled.'
  else if (event.status !== 'published') blockedReason = 'Tickets are not on sale yet.'
  else if (isPast(event.event_date)) blockedReason = 'This event has already happened.'
  else if (seats.soldOut) blockedReason = 'Sold out. Every ticket has been booked.'

  async function handleBook() {
    setBooking(true)
    setError('')
    try {
      const result = await createBooking(event.id, quantity)
      // Go to the new ticket, and pass along the QR code the backend just made
      navigate(`/my-tickets/${result.id}`, { state: { justBooked: true, qrCode: result.qr_code } })
    } catch (err) {
      setError(err.message)
      // 409 means someone else got the last tickets. Reload to show the real number.
      if (err.status === 409) onEventChanged()
      setBooking(false)
    }
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(22,22,29,0.06),0_20px_40px_-20px_rgba(22,22,29,0.25)]">
      <p className="text-sm text-stone">Price per ticket</p>
      <p className="font-display text-4xl font-extrabold">{formatPrice(event.ticket_price)}</p>

      <div className="mt-5">
        <SeatsBar event={event} />
      </div>

      {blockedReason ? (
        <Alert type="info" className="mt-6">{blockedReason}</Alert>
      ) : !isLoggedIn ? (
        <div className="mt-6">
          <p className="text-sm text-stone">Log in or create a free account to book.</p>
          <Button to="/login" state={{ from: { pathname: `/events/${event.id}` } }} variant="accent" size="lg" className="mt-3 w-full">
            Log in to book
          </Button>
          <Button to="/register" variant="ghost" className="mt-2 w-full">Create an account</Button>
        </div>
      ) : !isCustomer ? (
        <Alert type="info" className="mt-6">
          You're logged in with a staff account. Only customer accounts can book tickets.
        </Alert>
      ) : (
        <div className="mt-6">
          <p className="text-sm font-semibold" id="qty-label">Number of tickets</p>
          <div className="mt-2 flex items-center gap-3" role="group" aria-labelledby="qty-label">
            <button
              type="button"
              onClick={() => setQuantity(quantity - 1)}
              disabled={quantity <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-xl hover:border-ink disabled:opacity-30"
              aria-label="One less ticket"
            >
              −
            </button>
            <span className="w-10 text-center font-display text-2xl font-bold" aria-live="polite">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              disabled={quantity >= maxQuantity}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-xl hover:border-ink disabled:opacity-30"
              aria-label="One more ticket"
            >
              +
            </button>
            <span className="ml-auto text-xs text-stone">Max {maxQuantity}</span>
          </div>

          <div className="mt-5 flex items-baseline justify-between border-t border-dashed border-ink/15 pt-4">
            <span className="text-stone">Total</span>
            <span className="font-display text-2xl font-extrabold">{formatPrice(total)}</span>
          </div>

          {error && <Alert type="error" className="mt-4">{error}</Alert>}

          <Button variant="accent" size="lg" className="mt-5 w-full" loading={booking} onClick={handleBook}>
            {booking ? 'Booking…' : `Book ${quantity} ${quantity === 1 ? 'ticket' : 'tickets'}`}
          </Button>
          <p className="mt-3 text-center text-xs text-stone">You can cancel later from My tickets.</p>
        </div>
      )}
    </div>
  )
}
