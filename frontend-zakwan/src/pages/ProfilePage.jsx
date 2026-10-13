// PROFILE PAGE  ( /profile )  — logged-in users only
// Uses: GET /api/users/:id  (name, email, role)
//       PUT /api/users/:id  (change name; the backend only allows the name to change)
//       GET /api/bookings   (for the small summary)

import { useEffect, useState } from 'react'
import { getMyBookings } from '../api/bookings'
import { getUser, updateUserName } from '../api/users'
import Alert from '../components/Alert'
import Button from '../components/Button'
import ErrorState from '../components/ErrorState'
import FormField from '../components/FormField'
import LoadingState from '../components/LoadingState'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../utils/format'

const ROLE_NAMES = { customer: 'Customer', organiser: 'Organiser', admin: 'Administrator' }

export default function ProfilePage() {
  const { user, isCustomer, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    // Customers also get a summary of their bookings
    const requests = [getUser(user.id), isCustomer ? getMyBookings() : Promise.resolve(null)]
    Promise.all(requests)
      .then(([profileData, bookings]) => {
        if (ignore) return
        setProfile(profileData)
        setName(profileData.name)
        if (bookings) {
          const active = bookings.filter((b) => b.status === 'confirmed')
          setStats({
            bookings: active.length,
            tickets: active.reduce((sum, b) => sum + b.quantity, 0),
            spent: active.reduce((sum, b) => sum + Number(b.total_price), 0),
          })
        }
      })
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false))

    return () => { ignore = true }
  }, [user.id, isCustomer, reloadKey])

  async function handleSave(e) {
    e.preventDefault()
    setSaved(false)
    setSaveError('')
    if (!name.trim()) {
      setNameError('Enter your name.')
      return
    }

    setSaving(true)
    try {
      await updateUserName(user.id, name.trim())
      updateUser({ name: name.trim() }) // so the navbar shows the new name straight away
      setProfile({ ...profile, name: name.trim() })
      setSaved(true)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading your profile…" />
  if (error) return <ErrorState message={error} onRetry={() => setReloadKey(reloadKey + 1)} />

  return (
    <>
      <PageHeader title={`Hi, ${profile.name.split(' ')[0]}`} subtitle="Your account details." />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        {/* ---------- ACCOUNT ---------- */}
        <section className="rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(22,22,29,0.06)] sm:p-8">
          <h2 className="text-2xl font-bold">Account</h2>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-stone">Email</dt>
              <dd className="mt-1 font-semibold break-all">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone">Account type</dt>
              <dd className="mt-1 font-semibold">{ROLE_NAMES[profile.role] || profile.role}</dd>
            </div>
          </dl>

          <form onSubmit={handleSave} noValidate className="mt-8 border-t border-ink/10 pt-6">
            <FormField
              label="Display name" name="name" autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); setSaved(false) }}
              error={nameError}
            />
            {saved && <Alert type="success" className="mt-4">Name saved.</Alert>}
            {saveError && <Alert type="error" className="mt-4">{saveError}</Alert>}
            <Button type="submit" className="mt-5" loading={saving} disabled={name.trim() === profile.name}>
              Save name
            </Button>
            <p className="mt-3 text-xs text-stone">Your email and password can't be changed here yet.</p>
          </form>
        </section>

        {/* ---------- SUMMARY ---------- */}
        {stats && (
          <section className="rounded-3xl bg-ink p-6 text-white sm:p-8">
            <h2 className="text-2xl font-bold">Your bookings</h2>
            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-sm text-white/60">Active bookings</dt>
                <dd className="font-display text-4xl font-extrabold">{stats.bookings}</dd>
              </div>
              <div>
                <dt className="text-sm text-white/60">Tickets held</dt>
                <dd className="font-display text-4xl font-extrabold">{stats.tickets}</dd>
              </div>
              <div>
                <dt className="text-sm text-white/60">Total spent</dt>
                <dd className="font-display text-4xl font-extrabold text-coral">{formatMoney(stats.spent)}</dd>
              </div>
            </dl>
            <Button to="/my-tickets" variant="accent" className="mt-8">See my tickets</Button>
          </section>
        )}
      </div>
    </>
  )
}
