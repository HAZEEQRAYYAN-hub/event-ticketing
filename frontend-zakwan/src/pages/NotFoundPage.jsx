// Shown for any address that doesn't exist, e.g. /abc
import Button from '../components/Button'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-8xl font-extrabold text-coral">404</p>
      <h1 className="mt-4 text-3xl font-extrabold">This page doesn't exist</h1>
      <p className="mt-3 text-stone">The link may be wrong, or the page may have moved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button to="/">Go home</Button>
        <Button to="/events" variant="outline">Browse events</Button>
      </div>
    </div>
  )
}
