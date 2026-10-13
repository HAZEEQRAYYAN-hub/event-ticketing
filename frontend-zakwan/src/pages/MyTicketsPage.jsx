// MY TICKETS PAGE  ( /my-tickets )  — logged-in customers only
// Uses: GET /api/bookings  (the backend only returns this customer's own bookings)

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings } from '../api/bookings'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { formatDateShort, formatMoney } from '../utils/format'

const TABS = [
  { key: 'confirmed', label: 'Active' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
]

export default function MyTicketsPage() {
  const { isCustomer, isAdmin } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('confirmed')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isCustomer) return
    let ignore = false
    setLoading(true)
    setError('')
    getMyBookings()
      .then((data) => !ignore && setBookings(data))
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false))
    return () => { ignore = true }
  }, [isCustomer, reloadKey])

  // Staff accounts have no tickets of their own. Admins manage everyone's
  // bookings on their own page; organisers use the staff console.
  if (!isCustomer) {
    return (
      <div className="px-4 py-16">
        <EmptyState
          title="My tickets is for customers"
          message={isAdmin
            ? "You're logged in as an admin. Approve and manage bookings on the Manage bookings page."
            : "You're logged in with a staff account. Staff manage bookings in the Box Office console."}
          actionLabel={isAdmin ? 'Manage bookings' : 'Browse events'}
          actionTo={isAdmin ? '/admin/bookings' : '/events'}
        />
      </div>
    )
  }

  const shown = tab === 'all' ? bookings : bookings.filter((b) => b.status === tab)
  const countFor = (key) => (key === 'all' ? bookings.length : bookings.filter((b) => b.status === key).length)

  return (
    <>
      <PageHeader
        title="My tickets"
        subtitle="New bookings are checked by an admin first. Once approved, open the ticket to see its QR code."
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Tabs */}
        <div className="flex gap-2" role="tablist" aria-label="Filter tickets">
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

        <div className="mt-6">
          {loading ? (
            <LoadingState message="Loading your tickets…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setReloadKey(reloadKey + 1)} />
          ) : shown.length === 0 ? (
            <EmptyState
              title={tab === 'cancelled' ? 'No cancelled tickets' : 'No tickets yet'}
              message={tab === 'cancelled' ? 'Tickets you cancel will show up here.' : 'Find something you like and book your first one.'}
              actionLabel={tab === 'cancelled' ? undefined : 'Browse events'}
              actionTo="/events"
            />
          ) : (
            <ul className="space-y-3">
              {shown.map((booking) => (
                <li key={booking.id}>
                  <BookingRow booking={booking} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

// One booking in the list, drawn as a slim ticket
function BookingRow({ booking }) {
  const cancelled = booking.status === 'cancelled'

  return (
    <Link
      to={`/my-tickets/${booking.id}`}
      className={`group flex items-stretch overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(22,22,29,0.06)] transition-shadow hover:shadow-[0_12px_28px_-14px_rgba(22,22,29,0.3)] ${cancelled ? 'opacity-70' : ''}`}
    >
      {/* Ticket count stub */}
      <div className={`flex w-20 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-paper sm:w-24 ${cancelled ? 'bg-sand text-stone' : 'bg-coral text-ink'}`}>
        <span className="font-display text-3xl font-extrabold">{booking.quantity}</span>
        <span className="text-xs font-semibold">{booking.quantity === 1 ? 'ticket' : 'tickets'}</span>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4">
        <div>
          <h2 className="font-sans text-lg font-bold group-hover:underline">{booking.event_title}</h2>
          <p className="text-sm text-stone">
            Booking #{booking.id}, booked on {formatDateShort(booking.booked_at)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-semibold">{formatMoney(booking.total_price)}</span>
          <StatusBadge booking={booking} />
        </div>
      </div>
    </Link>
  )
}
