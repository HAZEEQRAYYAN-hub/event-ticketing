// EVENTS PAGE  ( /events )
// Uses: GET /api/events with search, venue_id, min_price, max_price, sort, order, page, limit
//       GET /api/venues (to fill the venue filter)
//
// The filters are saved in the address bar (e.g. /events?search=rock&page=2),
// so refresh, the Back button and shared links all keep the same results.

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getEvents } from '../api/events'
import { getVenues } from '../api/venues'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import EventCard from '../components/EventCard'
import EventCardSkeleton from '../components/EventCardSkeleton'
import PageHeader from '../components/PageHeader'
import { EVENTS_PER_PAGE } from '../config'

// Each sort choice maps to the backend's "sort" and "order" values
const SORT_OPTIONS = {
  soonest: { label: 'Date: soonest first', sort: 'event_date', order: 'asc' },
  latest: { label: 'Date: latest first', sort: 'event_date', order: 'desc' },
  cheapest: { label: 'Price: low to high', sort: 'ticket_price', order: 'asc' },
  priciest: { label: 'Price: high to low', sort: 'ticket_price', order: 'desc' },
  title: { label: 'Name: A to Z', sort: 'title', order: 'asc' },
}

const selectClass =
  'h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none focus:border-teal focus:ring-3 focus:ring-teal/15'

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Current filters, read from the address bar
  const search = searchParams.get('search') || ''
  const venueId = searchParams.get('venue_id') || ''
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const sortKey = SORT_OPTIONS[searchParams.get('sort')] ? searchParams.get('sort') : 'soonest'
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)

  // The typing boxes keep their own copy, so we don't call the backend on every key press
  const [typed, setTyped] = useState({ search, min_price: minPrice, max_price: maxPrice })
  function handleTyping(e) {
    setTyped({ ...typed, [e.target.name]: e.target.value })
  }

  const [venues, setVenues] = useState([])
  const [result, setResult] = useState({ data: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Changes one or more filters. Any filter change goes back to page 1.
  function updateFilters(changes) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in changes)) next.delete('page')
    setSearchParams(next)
  }

  // Load the venue list once, for the filter dropdown
  useEffect(() => {
    getVenues({ sort: 'name', limit: 50 })
      .then((res) => setVenues(res.data))
      .catch(() => setVenues([])) // the page still works without the venue filter
  }, [])

  // If the address bar changes some other way (Back button, a link), copy it into the boxes
  useEffect(() => {
    setTyped((current) =>
      current.search.trim() === search && current.min_price === minPrice && current.max_price === maxPrice
        ? current
        : { search, min_price: minPrice, max_price: maxPrice },
    )
  }, [search, minPrice, maxPrice])

  // Wait until typing stops for 500ms, then search.
  // This keeps us well inside the backend's limit of 100 requests per 15 minutes.
  useEffect(() => {
    const changed =
      typed.search.trim() !== search || typed.min_price !== minPrice || typed.max_price !== maxPrice
    if (!changed) return
    const timer = setTimeout(() => updateFilters({ ...typed, search: typed.search.trim() }), 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed])

  // Load events whenever a filter or the page changes
  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')
    const { sort, order } = SORT_OPTIONS[sortKey]

    getEvents({
      search,
      venue_id: venueId,
      min_price: minPrice,
      max_price: maxPrice,
      sort,
      order,
      page,
      limit: EVENTS_PER_PAGE,
    })
      .then((res) => !ignore && setResult(res))
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false))

    return () => { ignore = true }
  }, [search, venueId, minPrice, maxPrice, sortKey, page, reloadKey])

  const totalPages = Math.max(Math.ceil(result.total / EVENTS_PER_PAGE), 1)
  const hasFilters = search || venueId || minPrice || maxPrice

  function clearFilters() {
    setTyped({ search: '', min_price: '', max_price: '' })
    setSearchParams({})
  }

  return (
    <>
      <PageHeader title="All events" subtitle="Search by name, or narrow it down by venue and price." />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ---------- FILTERS ---------- */}
        <form
          onSubmit={(e) => { e.preventDefault(); updateFilters({ ...typed, search: typed.search.trim() }) }}
          className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(22,22,29,0.06)] sm:grid-cols-2 lg:grid-cols-[2fr_1.4fr_1fr_1fr_1.4fr]"
        >
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="search" className="mb-1 block text-xs font-semibold text-stone">Search</label>
            <input
              id="search"
              name="search"
              type="search"
              value={typed.search}
              onChange={handleTyping}
              placeholder="Event name or description"
              className={selectClass}
            />
          </div>

          <div>
            <label htmlFor="venue" className="mb-1 block text-xs font-semibold text-stone">Venue</label>
            <select id="venue" value={venueId} onChange={(e) => updateFilters({ venue_id: e.target.value })} className={selectClass}>
              <option value="">All venues</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}, {v.city}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="min-price" className="mb-1 block text-xs font-semibold text-stone">Min price (RM)</label>
            <input
              id="min-price" name="min_price" type="number" min="0" inputMode="decimal" placeholder="0"
              value={typed.min_price}
              onChange={handleTyping}
              className={selectClass}
            />
          </div>

          <div>
            <label htmlFor="max-price" className="mb-1 block text-xs font-semibold text-stone">Max price (RM)</label>
            <input
              id="max-price" name="max_price" type="number" min="0" inputMode="decimal" placeholder="Any"
              value={typed.max_price}
              onChange={handleTyping}
              className={selectClass}
            />
          </div>

          <div>
            <label htmlFor="sort" className="mb-1 block text-xs font-semibold text-stone">Sort by</label>
            <select id="sort" value={sortKey} onChange={(e) => updateFilters({ sort: e.target.value === 'soonest' ? '' : e.target.value })} className={selectClass}>
              {Object.entries(SORT_OPTIONS).map(([key, option]) => (
                <option key={key} value={key}>{option.label}</option>
              ))}
            </select>
          </div>
        </form>

        {/* ---------- RESULT COUNT ---------- */}
        <div className="mt-6 flex min-h-9 flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone" aria-live="polite">
            {loading ? 'Searching…' : `${result.total} ${result.total === 1 ? 'event' : 'events'} found`}
          </p>
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
        </div>

        {/* ---------- RESULTS ---------- */}
        {error ? (
          <ErrorState message={error} onRetry={() => setReloadKey(reloadKey + 1)} />
        ) : loading ? (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : result.data.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No events match"
              message="Try a different word, or remove some filters."
              actionLabel={hasFilters ? 'Clear filters' : undefined}
              onAction={clearFilters}
            />
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.map((event) => <EventCard key={event.id} event={event} />)}
            </div>

            {/* ---------- PAGES ---------- */}
            {totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pages">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateFilters({ page: page - 1 })}>
                  Previous
                </Button>
                <span className="text-sm text-stone">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateFilters({ page: page + 1 })}>
                  Next
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
    </>
  )
}
