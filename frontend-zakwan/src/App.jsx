// The list of every page on the website and its address.
// <Layout> wraps them all, so every page gets the navbar and footer.

import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminBookingsPage from './pages/AdminBookingsPage'
import EventDetailsPage from './pages/EventDetailsPage'
import EventsPage from './pages/EventsPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MyTicketsPage from './pages/MyTicketsPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import TicketPage from './pages/TicketPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Open to everyone */}
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Logged-in users only */}
        <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
        <Route path="/my-tickets/:id" element={<ProtectedRoute><TicketPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Admin accounts only */}
        <Route path="/admin/bookings" element={<ProtectedRoute role="admin"><AdminBookingsPage /></ProtectedRoute>} />

        {/* Any other address */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
