// LOG IN PAGE  ( /login )
// Uses: POST /api/auth/login (through useAuth().login)

import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Alert from '../components/Alert'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useAuth } from '../context/AuthContext'
import AuthLayout from './AuthLayout'

export default function LoginPage() {
  const { login, isLoggedIn, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Where to go after logging in: the page they came from, or My tickets
  const goTo = location.state?.from?.pathname || '/my-tickets'

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already logged in? No need to be here.
  if (isLoggedIn && !submitting) return <Navigate to={goTo} replace />

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  // Check the form in the browser first, so obvious mistakes don't need the backend
  function validate() {
    const found = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email)) found.email = 'Enter a valid email address.'
    if (!form.password) found.password = 'Enter your password.'
    setErrors(found)
    return Object.keys(found).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const user = await login(form.email.trim(), form.password)
      // Customers go back where they were; admins go to Manage bookings;
      // organisers have no tickets here, so they go to the events list
      const staffHome = user.role === 'admin' ? '/admin/bookings' : '/events'
      navigate(user.role === 'customer' ? goTo : staffHome, { replace: true })
    } catch (err) {
      setFormError(err.status === 401 ? 'That email and password don\'t match. Check them and try again.' : err.message)
      setErrors(err.fieldErrors || {})
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to book tickets and see the ones you have.">
      {sessionExpired && (
        <Alert type="info" className="mb-6">Your session ended after 2 hours. Please log in again.</Alert>
      )}
      {formError && <Alert type="error" className="mb-6">{formError}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField
          label="Email" name="email" type="email" autoComplete="email"
          value={form.email} onChange={handleChange} error={errors.email}
        />
        <FormField
          label="Password" name="password" type="password" autoComplete="current-password"
          value={form.password} onChange={handleChange} error={errors.password}
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-stone">
        New to Tixora?{' '}
        <Link to="/register" state={location.state} className="font-semibold text-teal hover:underline">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
