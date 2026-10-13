// A pop-up box that asks "Are you sure?" before something that cannot be undone.
// It uses the browser's built-in <dialog>, which also closes with the Esc key.
import { useEffect, useRef } from 'react'
import Button from './Button'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Keep it',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)

  // Open or close the real <dialog> when "open" changes
  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => { e.preventDefault(); if (!loading) onCancel() }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-ink backdrop:bg-ink/50"
    >
      <div className="p-6">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-stone">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  )
}
