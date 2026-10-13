// The dark section at the bottom of every page
import { Link } from 'react-router-dom'
import { OWNER } from '../config'
import Logo from './Logo'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white/70 print:hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1.5fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Concerts, expos, festivals and runs across Malaysia. Book in a minute, show your QR code at the door.
          </p>
        </div>

        <div>
          <h2 className="font-sans text-sm font-semibold text-white">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/events" className="hover:text-white">All events</Link></li>
            <li><Link to="/my-tickets" className="hover:text-white">My tickets</Link></li>
            <li><Link to="/profile" className="hover:text-white">My profile</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="font-sans text-sm font-semibold text-white">Frontend by</h2>
          <p className="mt-3 text-sm text-white">{OWNER.name}</p>
          <p className="text-sm">Student ID: {OWNER.studentId}</p>
          <p className="mt-2 text-sm">{OWNER.course}</p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs sm:px-6">
          © {YEAR} Tixora. Event data from the group's Event Ticketing API. Ticket QR codes by QR Server (goqr.me).
        </p>
      </div>
    </footer>
  )
}
