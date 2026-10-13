// A small coloured label for a booking: Cancelled, Awaiting approval or Confirmed.
//
// A booking has two fields in the database:
//   status           'confirmed' or 'cancelled'
//   approval_status  'pending' or 'approved'  (added for the admin approval step)
// This turns the two into one simple state.
export function getBookingState(booking) {
  if (booking.status === 'cancelled') return 'cancelled'
  // Older databases without the approval column count as approved
  if (booking.approval_status === 'pending') return 'pending'
  return 'approved'
}

const STYLES = {
  cancelled: { label: 'Cancelled', light: 'bg-danger/10 text-danger', dark: 'bg-danger text-white' },
  pending: { label: 'Awaiting approval', light: 'bg-teal/10 text-teal', dark: 'bg-white text-teal' },
  approved: { label: 'Confirmed', light: 'bg-success/10 text-success', dark: 'bg-success text-white' },
}

// "onDark" makes the badge readable on the dark ticket header
export default function StatusBadge({ booking, onDark = false }) {
  const style = STYLES[getBookingState(booking)]
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${onDark ? style.dark : style.light}`}>
      {style.label}
    </span>
  )
}
