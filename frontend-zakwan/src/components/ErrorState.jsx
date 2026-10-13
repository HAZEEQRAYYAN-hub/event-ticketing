// Shown when a request to the backend fails. "onRetry" adds a Try again button.
import Button from './Button'

export default function ErrorState({ title = "This didn't load", message, onRetry }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center" role="alert">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-xl font-bold text-danger">
        !
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      {message && <p className="mt-2 text-stone">{message}</p>}
      {onRetry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
