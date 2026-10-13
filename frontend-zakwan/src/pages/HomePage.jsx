// HOME PAGE  ( / )
// Uses: GET /api/events (the next 6 events) and GET /api/venues (venue list)

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getEvents } from '../api/events'
import { getVenues } from '../api/venues'
import Button from '../components/Button'
import ErrorState from '../components/ErrorState'
import EventCard from '../components/EventCard'
import EventCardSkeleton from '../components/EventCardSkeleton'
import SeatsBar from '../components/SeatsBar'
import { formatDateLong, formatPrice, formatTime, isPast } from '../utils/format'

export default function HomePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [events, setEvents] = useState([])
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load events and venues together. "reloadKey" changes when Try again is clicked.
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    let ignore = false // stops an old request from updating the page after we leave
    setLoading(true)
    setError('')

    Promise.all([
      getEvents({ sort: 'event_date', order: 'asc', limit: 12 }),
      getVenues({ sort: 'name', limit: 6 }),
    ])
      .then(([eventResult, venueResult]) => {
        if (ignore) return
        // Only show events that haven't happened yet
        setEvents(eventResult.data.filter((e) => !isPast(e.event_date)))
        setVenues(venueResult.data)
      })
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false))

    return () => { ignore = true }
  }, [reloadKey])

  function handleSearch(e) {
    e.preventDefault()
    navigate(search.trim() ? `/events?search=${encodeURIComponent(search.trim())}` : '/events')
  }

  const nextEvent = events[0]
  const comingUp = events.slice(0, 6)

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
        <div>
          <h1 className="text-5xl leading-[1.02] font-extrabold sm:text-6xl lg:text-7xl">
            Find your next night out.
          </h1>
          <p className="mt-5 max-w-md text-lg text-stone">
            Concerts, expos, festivals and runs across Malaysia. Pick your seats in a minute and keep your tickets on your phone.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex max-w-lg gap-2 rounded-full bg-white p-1.5 shadow-[0_8px_30px_-12px_rgba(22,22,29,0.25)]" role="search">
            <label htmlFor="home-search" className="sr-only">Search events</label>
            <input
              id="home-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Try “rock” or “expo”"
              className="min-w-0 flex-1 rounded-full bg-transparent px-4 text-base outline-none"
            />
            <Button type="submit" variant="accent">Search</Button>
          </form>
        </div>

        {/* The next event, drawn as a big ticket */}
        <div>
          {loading ? (
            <div className="h-80 animate-pulse rounded-3xl bg-ink/90" aria-hidden="true" />
          ) : nextEvent ? (
            <NextEventTicket event={nextEvent} />
          ) : null}
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey(reloadKey + 1)} />
      ) : (
        <>
          {/* ---------- COMING UP ---------- */}
          <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-3xl font-extrabold sm:text-4xl">Coming up</h2>
              <Link to="/events" className="text-sm font-semibold text-teal hover:underline">See all events</Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {loading
                ? Array.from({ length: 3 }, (_, i) => <EventCardSkeleton key={i} />)
                : comingUp.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
            {!loading && comingUp.length === 0 && (
              <p className="mt-6 text-stone">No upcoming events right now. Check back soon.</p>
            )}
          </section>

          {/* ---------- VENUES ---------- */}
          {venues.length > 0 && (
            <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
              <h2 className="text-3xl font-extrabold sm:text-4xl">Where it happens</h2>
              <p className="mt-2 text-stone">Pick a venue to see what's on there.</p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {venues.map((venue) => (
                  <li key={venue.id}>
                    <Link
                      to={`/events?venue_id=${venue.id}`}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white px-5 py-4 transition-colors hover:border-ink"
                    >
                      <span>
                        <span className="block font-semibold">{venue.name}</span>
                        <span className="text-sm text-stone">{venue.city}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-stone">
                        {Number(venue.capacity).toLocaleString('en-MY')}
                        <br />seats
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ---------- HOW IT WORKS (a real sequence, so it is numbered) ---------- */}
          <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="rounded-3xl bg-sand px-6 py-10 sm:px-10">
              <h2 className="text-3xl font-extrabold sm:text-4xl">Booking takes three steps</h2>
              <ol className="mt-8 grid gap-8 md:grid-cols-3">
                {[
                  ['Find an event', 'Search by name, or filter by venue and price.'],
                  ['Choose your tickets', 'Book up to 10 tickets at once. Your total is shown before you confirm.'],
                  ['Show your QR code', 'Each booking gets a QR code. Show it at the door from My tickets.'],
                ].map(([title, text], index) => (
                  <li key={title}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-lg font-bold text-white">
                      {index + 1}
                    </span>
                    <h3 className="mt-4 text-xl font-bold">{title}</h3>
                    <p className="mt-1 text-stone">{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </>
      )}
    </>
  )
}

// The big dark ticket in the hero, showing the next event
function NextEventTicket({ event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="group relative block -rotate-2 rounded-3xl bg-ink p-7 text-white shadow-[0_30px_60px_-25px_rgba(22,22,29,0.6)] transition-transform duration-300 hover:rotate-0 sm:p-8"
    >
      <p className="text-sm font-medium text-coral">Next up</p>
      <h2 className="mt-2 text-3xl leading-tight font-extrabold sm:text-4xl">{event.title}</h2>
      <p className="mt-3 text-white/70">
        {formatDateLong(event.event_date)}, {formatTime(event.event_date)}
        <br />
        {event.venue_name}
      </p>

      {/* Tear line with notches cut out of both sides */}
      <div className="relative my-7 border-t-2 border-dashed border-white/20" aria-hidden="true">
        <span className="absolute -top-4 -left-11 h-8 w-8 rounded-full bg-paper sm:-left-12" />
        <span className="absolute -top-4 -right-11 h-8 w-8 rounded-full bg-paper sm:-right-12" />
      </div>

      <div className="flex items-end justify-between gap-6">
        <div className="flex-1">
          <SeatsBar event={event} dark />
        </div>
        <div className="text-right">
          <p className="text-xs text-white/60">From</p>
          <p className="font-display text-3xl font-extrabold text-coral">{formatPrice(event.ticket_price)}</p>
        </div>
      </div>
    </Link>
  )
}
