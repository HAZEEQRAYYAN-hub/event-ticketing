// Wrap a page with this to make it "logged in only".
// Visitors who are not logged in are sent to /login, and come back after logging in.
// Someone who just clicked Log out is sent home instead.
// Add role="admin" to make a page admin-only:  <ProtectedRoute role="admin">
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ErrorState from './ErrorState'

export default function ProtectedRoute({ children, role }) {
  const { user, isLoggedIn, loggedOutOnPurpose } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    if (loggedOutOnPurpose) return <Navigate to="/" replace />
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  // Logged in, but the wrong role (the backend would answer 403 anyway)
  if (role && user.role !== role) {
    return <ErrorState title="Admins only" message="This page is for administrator accounts." />
  }

  return children
}
