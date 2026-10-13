// A thin bar that fills up as tickets are sold, with a label like "Only 8 left"
import { getSeatsInfo } from '../utils/format'

export default function SeatsBar({ event, dark = false }) {
  const seats = getSeatsInfo(event)
  const nearlyGone = seats.soldOut || seats.label.startsWith('Only')

  return (
    <div>
      <div className={`h-1.5 overflow-hidden rounded-full ${dark ? 'bg-white/15' : 'bg-sand'}`}>
        <div
          className={`h-full rounded-full ${nearlyGone ? 'bg-coral' : dark ? 'bg-white/70' : 'bg-teal'}`}
          style={{ width: `${Math.max(seats.percentSold, 3)}%` }}
        />
      </div>
      <p className={`mt-1.5 text-xs font-medium ${nearlyGone ? (dark ? 'text-coral' : 'text-danger') : dark ? 'text-white/70' : 'text-stone'}`}>
        {seats.label}
      </p>
    </div>
  )
}
