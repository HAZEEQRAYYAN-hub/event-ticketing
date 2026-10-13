// ONE TICKET PAGE  ( /my-tickets/:id )  — logged-in customers only
// Uses: GET /api/bookings/:id            (the booking)
//       GET /api/events/:id              (event date, time and venue)
//       PATCH /api/bookings/:id/cancel   (Cancel button)
//       QR Server API                    (the QR code picture)

import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { cancelBooking, getBooking } from '../api/bookings'
import { getEvent } from '../api/events'
import Alert from '../components/Alert'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import { formatDateLong, formatDateShort, formatMoney, formatPrice, formatTime, isPast } from '../utils/format'
import { getQrImageUrl, getTicketCode } from '../utils/ticket'
import StatusBadge, { getBookingState } from '../components/StatusBadge'

export default function TicketPage() {
  const { id } = useParams()
  const location = useLocation()
  // Set by the Event page right after booking
  const justBooked = location.state?.justBooked
  const qrFromBooking = location.state?.qrCode

  const [booking, setBooking] = useState(null)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [cancelledNow, setCancelledNow] = useState(false)
  const [qrFailed, setQrFailed] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError(null)

    getBooking(id)
      .then(async (bookingData) => {
        if (ignore) return
        setBooking(bookingData)
        try {
          const eventData = await getEvent(bookingData.event_id)
          if (!ignore) setEvent(eventData)
        } catch {
          if (!ignore) setEvent(null) // the ticket still shows without event details
        }
      })
      .catch((err) => !ignore && setError(err))
      .finally(() => !ignore && setLoading(false))

    return () => { ignore = true }
  }, [id, reloadKey])

  async function handleCancel() {
    setCancelling(true)
    setCancelError('')
    try {
      await cancelBooking(booking.id)
      setConfirmOpen(false)
      setCancelledNow(true)
      setReloadKey(reloadKey + 1) // load the booking again to show its new status
    } catch (err) {
      setCancelError(err.message)
      setConfirmOpen(false)
    } finally {
      setCancelling(false)
    }
  }

  if (loading && !booking) return <LoadingState message="Loading your ticket…" />

  if (error) {
    if (error.status === 404) return <ErrorState title="Ticket not found" message="Check the booking number, or go back to My tickets." />
    if (error.status === 403) return <ErrorState title="Not your ticket" message="This booking belongs to another account." />
    return <ErrorState message={error.message} onRetry={() => setReloadKey(reloadKey + 1)} />
  }

  const state = getBookingState(booking)
  const cancelled = state === 'cancelled'
  const pending = state === 'pending'
  const approved = state === 'approved'
  const eventOver = event && isPast(event.event_date)
  // Fresh QR from the booking if we have it, otherwise ask QR Server again
  const qrSrc = qrFromBooking || getQrImageUrl(booking)

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <Link to="/my-tickets" className="text-sm font-semibold text-teal hover:underline print:hidden">Back to My tickets</Link>

      {justBooked && pending && (
        <Alert type="success" className="mt-6">
          Booking received. Your seats are held while an admin checks it. Your QR code appears here once it's approved.
        </Alert>
      )}
      {justBooked && approved && (
        <Alert type="success" className="mt-6">You're booked. Show this QR code at the entrance.</Alert>
      )}
      {cancelledNow && <Alert type="info" className="mt-6">Booking cancelled. The tickets went back on sale.</Alert>}
      {cancelError && <Alert type="error" className="mt-6">{cancelError}</Alert>}

      {/* ---------- THE TICKET ---------- */}
      <article className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(22,22,29,0.06),0_24px_48px_-24px_rgba(22,22,29,0.3)] print:shadow-none">
        <div className={`px-6 py-7 sm:px-8 ${cancelled ? 'bg-sand text-ink' : 'bg-ink text-white'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={`text-sm font-medium ${cancelled ? 'text-stone' : 'text-coral'}`}>Booking #{booking.id}</p>
            <StatusBadge booking={booking} onDark={!cancelled} />
          </div>
          <h1 className="mt-3 text-3xl leading-tight font-extrabold sm:text-4xl">
            {event?.title || `Event #${booking.event_id}`}
          </h1>
          {event && (
            <p className={`mt-3 ${cancelled ? 'text-stone' : 'text-white/70'}`}>
              {formatDateLong(event.event_date)}, {formatTime(event.event_date)}
              <br />
              {event.venue_name}
            </p>
          )}
        </div>

        {/* Tear line */}
        <div className="relative border-t-2 border-dashed border-ink/10" aria-hidden="true">
          <span className="absolute -top-4 -left-4 h-8 w-8 rounded-full bg-paper" />
          <span className="absolute -top-4 -right-4 h-8 w-8 rounded-full bg-paper" />
        </div>

        <div className="grid gap-8 px-6 py-8 sm:grid-cols-[auto_1fr] sm:px-8">
          {/* QR code */}
          <div className="flex flex-col items-center">
            <div className={`rounded-2xl border border-ink/10 p-3 ${cancelled ? 'opacity-30 grayscale' : ''}`}>
              {pending ? (
                <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-2 rounded-xl bg-teal/5 p-4 text-center text-sm text-teal">
                  <span className="font-display text-3xl font-extrabold">…</span>
                  Waiting for admin approval
                </div>
              ) : qrFailed ? (
                <div className="flex h-[200px] w-[200px] items-center justify-center p-4 text-center text-sm text-stone">
                  The QR code couldn't load. Show the ticket code below instead.
                </div>
              ) : (
                <img
                  src={qrSrc}
                  alt={`QR code for booking ${booking.id}`}
                  width="200"
                  height="200"
                  className="h-[200px] w-[200px]"
                  onError={() => setQrFailed(true)}
                />
              )}
            </div>
            <p className="mt-3 font-mono text-xs text-stone">{getTicketCode(booking)}</p>
            {cancelled && <p className="mt-1 text-sm font-semibold text-danger">Not valid for entry</p>}
            {pending && <p className="mt-1 max-w-[220px] text-center text-sm text-stone">Your QR code appears here once an admin approves the booking.</p>}
          </div>

          {/* Details */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 self-center">
            <div>
              <dt className="text-sm text-stone">Tickets</dt>
              <dd className="font-display text-2xl font-bold">{booking.quantity}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone">{approved ? 'Total paid' : 'Total'}</dt>
              <dd className="font-display text-2xl font-bold">{formatMoney(booking.total_price)}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone">Booked on</dt>
              <dd className="font-semibold">{formatDateShort(booking.booked_at)}</dd>
            </div>
            {event && (
              <div>
                <dt className="text-sm text-stone">Price each</dt>
                <dd className="font-semibold">{formatPrice(event.ticket_price)}</dd>
              </div>
            )}
          </dl>
        </div>
      </article>

      {/* ---------- ACTIONS ---------- */}
      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        {approved && <Button variant="outline" onClick={() => window.print()}>Print ticket</Button>}
        {event && <Button variant="ghost" to={`/events/${event.id}`}>View event</Button>}
        {!cancelled && !eventOver && (
          <Button variant="danger" className="sm:ml-auto" onClick={() => setConfirmOpen(true)}>Cancel booking</Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel this booking?"
        message={`Your ${booking.quantity} ${booking.quantity === 1 ? 'ticket goes' : 'tickets go'} back on sale and this QR code stops working. This can't be undone.`}
        confirmLabel="Cancel booking"
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
