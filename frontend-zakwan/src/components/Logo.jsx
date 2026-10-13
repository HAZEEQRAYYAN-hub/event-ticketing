// The Tixora logo: a small ticket icon and the name
import { Link } from 'react-router-dom'

export function TicketIcon({ className = 'h-7 w-7' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M4 8a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v4a4 4 0 0 0 0 8v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a4 4 0 0 0 0-8z"
        fill="#FF5A3C"
      />
      <path d="M12 11h8M16 11v10" stroke="#16161D" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export default function Logo({ light = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2" aria-label="Tixora home">
      <TicketIcon />
      <span className={`font-display text-2xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        Tixora
      </span>
    </Link>
  )
}
