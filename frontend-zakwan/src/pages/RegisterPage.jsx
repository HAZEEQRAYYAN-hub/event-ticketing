// SIGN UP PAGE  ( /register )
// Uses: POST /api/auth/register, then POST /api/auth/login (through useAuth().register)

import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Alert from '../components/Alert'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useAuth } from '../context/AuthContext'
import AuthLayout from './AuthLayout'

export default function RegisterPage() {
  const { register, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const goTo = location.state?.from?.pathname || '/events'

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isLoggedIn && !submitting) return <Navigate to={goTo} replace />

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  // The same rules as the backend (name required, valid email, password 8+ characters),
  // plus a "type it twice" check
  function validate() {
    const found = {}
    if (!form.name.trim()) found.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) found.email = 'Enter a valid email address.'
    if (form.password.length < 8) found.password = 'Use at least 8 characters.'
    if (form.confirmPassword !== form.password) found.confirmPassword = "The passwords don't match."
    setErrors(found)
    return Object.keys(found).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      await register(form.name.trim(), form.email.trim(), form.password)
      navigate(goTo, { replace: true })
    } catch (err) {
      // 409 = this email is already in the database
      setFormError(err.status === 409 ? 'An account with this email already exists. Try logging in instead.' : err.message)
      setErrors(err.fieldErrors || {})
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="It's free, and you'll be booking in under a minute.">
      {formError && <Alert type="error" className="mb-6">{formError}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField
          label="Full name" name="name" autoComplete="name"
          value={form.name} onChange={handleChange} error={errors.name}
        />
        <FormField
          label="Email" name="email" type="email" autoComplete="email"
          value={form.email} onChange={handleChange} error={errors.email}
        />
        <FormField
          label="Password" name="password" type="password" autoComplete="new-password"
          hint="At least 8 characters."
          value={form.password} onChange={handleChange} error={errors.password}
        />
        <FormField
          label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password"
          value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword}
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-stone">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-teal hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  )
}
