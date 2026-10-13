// One event drawn as a ticket: a coloured date "stub" on top,
// a perforated tear line, and the event details below.
import { Link } from 'react-router-dom'
import { formatPrice, formatTime, getDateParts } from '../utils/format'
import SeatsBar from './SeatsBar'

// Each event gets one of three stub colours, picked from its id,
// so the same event always looks the same.
const STUB_STYLES = [
  'bg-coral text-ink',
  'bg-teal text-white',
  'bg-ink text-white',
]

export default function EventCard({ event }) {
  const date = getDateParts(event.event_date)
  const stubStyle = STUB_STYLES[event.id % STUB_STYLES.length]

  return (
    <Link
      to={`/events/${event.id}`}
      className="group relative flex flex-col rounded-2xl bg-white shadow-[0_1px_2px_rgba(22,22,29,0.06),0_8px_24px_-12px_rgba(22,22,29,0.18)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(22,22,29,0.08),0_18px_36px_-14px_rgba(22,22,29,0.3)]"
    >
      {/* Date stub */}
      <div className={`flex items-end justify-between rounded-t-2xl px-5 pt-5 pb-6 ${stubStyle}`}>
        <div>
          <p className="font-display text-5xl leading-none font-extrabold">{date.day}</p>
          <p className="mt-1 text-sm font-semibold">{date.month}</p>
        </div>
        <p className="text-right text-sm font-medium opacity-90">
          {date.weekday}
          <br />
          {formatTime(event.event_date)}
        </p>
      </div>

      {/* Tear line with two cut-out notches */}
      <div className="relative h-0 border-t-2 border-dashed border-ink/10" aria-hidden="true">
        <span className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-paper" />
        <span className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-paper" />
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col px-5 pt-5 pb-5">
        <h3 className="text-xl leading-snug font-bold decoration-coral decoration-2 underline-offset-4 group-hover:underline">
          {event.title}
        </h3>
        <p className="mt-1 text-sm text-stone">{event.venue_name}</p>

        <div className="mt-auto pt-5">
          <SeatsBar event={event} />
          <p className="mt-4 text-lg font-bold">
            {formatPrice(event.ticket_price)}
            {Number(event.ticket_price) > 0 && <span className="text-sm font-normal text-stone"> per ticket</span>}
          </p>
        </div>
      </div>
    </Link>
  )
}
