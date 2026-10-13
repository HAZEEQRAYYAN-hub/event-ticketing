import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL
const API_KEY = import.meta.env.VITE_API_KEY

export default function App() {
  const [status, setStatus] = useState('loading')
  const [eventCount, setEventCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/events?limit=1`, {
      headers: { 'x-api-key': API_KEY }, 
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `Error ${response.status}`)
        setEventCount(data.total)
        setStatus('ok')
      })
      .catch((error) => {
        setErrorMessage(
          error.message === 'Failed to fetch'
            ? 'Cannot reach the backend. Is "node app.js" running?'
            : error.message,
        )
        setStatus('error')
      })
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-16">
      <h1 className="text-6xl font-extrabold sm:text-7xl">
        Tixora<span className="text-coral">.</span>
      </h1>
      <p className="mt-4 text-lg text-stone">
        Find something on tonight, and get in.
      </p>

      <div className="mt-10 rounded-2xl border border-sand bg-white p-6">
        <h2 className="text-xl font-bold">Backend connection</h2>

        {status === 'loading' && <p className="mt-2 text-stone">Checking…</p>}

        {status === 'ok' && (
          <p className="mt-2 font-medium text-success">
            Connected. The backend has {eventCount} published events.
          </p>
        )}

        {status === 'error' && (
          <p className="mt-2 font-medium text-danger">Not connected: {errorMessage}</p>
        )}

        <p className="mt-4 text-sm text-stone">API address: {API_URL}</p>
      </div>
    </main>
  )
}