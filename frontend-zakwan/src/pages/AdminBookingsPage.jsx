// MANAGE BOOKINGS PAGE  ( /admin/bookings )  — admin accounts only
// Uses: GET /api/bookings              (an admin gets every booking)
//       GET /api/users                 (customer names and emails, admin only)
//       PATCH /api/bookings/:id/approve (Approve button, admin only)
//       PATCH /api/bookings/:id/cancel  (Reject button: cancels and returns the seats)
//
// The workflow: a customer books -> the booking is "Awaiting approval" ->
// the admin checks it (for example, that the customer has paid) -> Approve
// gives the customer their QR code, Reject cancels it.

import { useEffect, useState } from 'react'
import { approveBooking, cancelBooking, getAllBookings } from '../api/bookings'
import { getUsers } from '../api/users'
import Alert from '../components/Alert'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import PageHeader from '../components/PageHeader'
import StatusBadge, { getBookingState } from '../components/StatusBadge'
import { formatDateShort, formatMoney } from '../utils/format'

const TABS = [
  { key: 'pending', label: 'Awaiting approval' },
  { key: 'approved', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
]

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [usersById, setUsersById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [tab, setTab] = useState('pending')

  const [busyId, setBusyId] = useState(null)        // the booking being approved
  const [rejecting, setRejecting] = useState(null)  // the booking in the Reject pop-up
  const [rejectBusy, setRejectBusy] = useState(false)
  const [message, setMessage] = useState(null)      // { type, text } after an action

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    Promise.all([getAllBookings(), getUsers()])
      .then(([bookingList, userList]) => {
        if (ignore) return
        setBookings(bookingList)
        // Turn the user list into { 3: { name, email }, 4: {...} } for quick lookups
        const map = {}
        for (const u of userList) map[u.id] = u
        setUsersById(map)
      })
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false))

    return () => { ignore = true }
  }, [reloadKey])

  async function handleApprove(booking) {
    setBusyId(booking.id)
    setMessage(null)
    try {
      await approveBooking(booking.id)
      setMessage({ type: 'success', text: `Booking #${booking.id} approved. The customer can now see their QR code.` })
      setReloadKey((k) => k + 1)
    } catch (err) {
      // 409 means someone already approved or cancelled it; reload to show the truth
      setMessage({ type: 'error', text: err.message })
      if (err.status === 409 || err.status === 404) setReloadKey((k) => k + 1)
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject() {
    setRejectBusy(true)
    setMessage(null)
    try {
      await cancelBooking(rejecting.id)
      setMessage({ type: 'info', text: `Booking #${rejecting.id} rejected. ${rejecting.quantity} seats went back on sale.` })
      setRejecting(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      setRejecting(null)
    } finally {
      setRejectBusy(false)
    }
  }

  const countFor = (key) =>
    key === 'all' ? bookings.length : bookings.filter((b) => getBookingState(b) === key).length
  const shown = tab === 'all' ? bookings : bookings.filter((b) => getBookingState(b) === tab)

  return (
    <>
      <PageHeader
        title="Manage bookings"
        subtitle="Check each new booking, for example that the customer has paid, then approve it to issue the ticket."
      >
        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>Refresh</Button>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter bookings">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.key ? 'bg-ink text-white' : 'bg-white text-stone hover:text-ink'
              }`}
            >
              {t.label}
              {!loading && <span className="ml-1.5 opacity-60">{countFor(t.key)}</span>}
            </button>
          ))}
        </div>

        {message && <Alert type={message.type} className="mt-6">{message.text}</Alert>}

        <div className="mt-6">
          {loading && bookings.length === 0 ? (
            <LoadingState message="Loading bookings…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
          ) : shown.length === 0 ? (
            <EmptyState
              title={tab === 'pending' ? 'Nothing waiting for approval' : 'No bookings here'}
              message={tab === 'pending' ? 'New bookings from customers will appear here.' : undefined}
            />
          ) : (
            <ul className="space-y-3">
              {shown.map((booking) => (
                <li key={booking.id}>
                  <AdminBookingRow
                    booking={booking}
                    customer={usersById[booking.user_id]}
                    approving={busyId === booking.id}
                    onApprove={() => handleApprove(booking)}
                    onReject={() => setRejecting(booking)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(rejecting)}
        title="Reject this booking?"
        message={rejecting ? `Booking #${rejecting.id} will be cancelled and its ${rejecting.quantity} ${rejecting.quantity === 1 ? 'seat goes' : 'seats go'} back on sale. This can't be undone.` : ''}
        confirmLabel="Reject booking"
        loading={rejectBusy}
        onConfirm={handleReject}
        onCancel={() => setRejecting(null)}
      />
    </>
  )
}

// One booking: who, what, how much, and the Approve / Reject buttons
function AdminBookingRow({ booking, customer, approving, onApprove, onReject }) {
  const state = getBookingState(booking)

  return (
    <div className={`flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(22,22,29,0.06)] sm:flex-row sm:items-center ${state === 'cancelled' ? 'opacity-70' : ''}`}>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="font-sans text-lg font-bold">{booking.event_title}</h2>
          <StatusBadge booking={booking} />
        </div>
        <p className="mt-1 text-sm text-stone">
          Booking #{booking.id}, booked on {formatDateShort(booking.booked_at)}
        </p>
        <p className="mt-1 text-sm">
          {customer ? (
            <>
              <span className="font-semibold">{customer.name}</span>{' '}
              <span className="text-stone">({customer.email})</span>
            </>
          ) : (
            <span className="text-stone">Customer #{booking.user_id}</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-6 sm:text-right">
        <div>
          <p className="text-sm text-stone">{booking.quantity} {booking.quantity === 1 ? 'ticket' : 'tickets'}</p>
          <p className="font-display text-xl font-bold">{formatMoney(booking.total_price)}</p>
        </div>

        {state === 'pending' && (
          <div className="ml-auto flex gap-2">
            <Button variant="danger" size="sm" onClick={onReject} disabled={approving}>Reject</Button>
            <Button variant="primary" size="sm" onClick={onApprove} loading={approving}>Approve</Button>
          </div>
        )}
      </div>
    </div>
  )
}
