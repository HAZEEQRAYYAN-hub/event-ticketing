// Shown when there is nothing to list, with an optional action button
import Button from './Button'

export default function EmptyState({ title, message, actionLabel, actionTo, onAction }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-ink/15 px-6 py-14 text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      {message && <p className="mt-2 text-stone">{message}</p>}
      {actionLabel && (
        <Button className="mt-6" to={actionTo} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
