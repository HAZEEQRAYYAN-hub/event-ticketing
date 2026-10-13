// The bar at the top of every page.
// On phones the links fold into a menu that opens with the ☰ button.

import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from './Button'
import Logo from './Logo'

// Style for a menu link; "isActive" is true when we are on that page
function linkClass({ isActive }) {
  return `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-sand text-ink' : 'text-stone hover:text-ink'
  }`
}

export default function Navbar() {
  const { user, isLoggedIn, isCustomer, isAdmin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Close the phone menu whenever the page changes
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/')
  }

  const firstName = user?.name?.split(' ')[0]

  const links = (
    <>
      <NavLink to="/events" className={linkClass}>Events</NavLink>
      {isCustomer && <NavLink to="/my-tickets" className={linkClass}>My tickets</NavLink>}
      {isAdmin && <NavLink to="/admin/bookings" className={linkClass}>Manage bookings</NavLink>}
    </>
  )

  const accountButtons = isLoggedIn ? (
    <>
      <NavLink to="/profile" className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 hover:bg-sand">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
          {firstName?.[0]?.toUpperCase()}
        </span>
        <span className="text-sm font-medium">{firstName}</span>
      </NavLink>
      <Button variant="outline" size="sm" onClick={handleLogout}>Log out</Button>
    </>
  ) : (
    <>
      <Button to="/login" variant="ghost" size="sm">Log in</Button>
      <Button to="/register" size="sm">Sign up</Button>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-paper/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        {/* Desktop and tablet */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">{links}</nav>
        <div className="hidden items-center gap-2 md:flex">{accountButtons}</div>

        {/* Phone: menu button */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* Phone: the opened menu */}
      {menuOpen && (
        <div className="border-t border-ink/5 px-4 pt-3 pb-5 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Main">{links}</nav>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/5 pt-4">{accountButtons}</div>
        </div>
      )}
    </header>
  )
}
