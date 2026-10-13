// Shown while data is loading from the backend
import Spinner from './Spinner'

export default function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-stone" role="status">
      <Spinner className="h-7 w-7 text-coral" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
