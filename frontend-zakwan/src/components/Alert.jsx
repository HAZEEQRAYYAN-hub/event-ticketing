// A coloured message box. type can be "error", "success" or "info".
const STYLES = {
  error: 'border-danger/20 bg-danger/5 text-danger',
  success: 'border-success/20 bg-success/5 text-success',
  info: 'border-teal/20 bg-teal/5 text-teal',
}

export default function Alert({ type = 'info', children, className = '' }) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${STYLES[type]} ${className}`}
    >
      {children}
    </div>
  )
}
