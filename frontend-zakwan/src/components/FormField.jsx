// A labelled text box with an error message underneath.
//   <FormField label="Email" name="email" type="email" value={email} onChange={...} error={errors.email} />
export default function FormField({ label, name, error, hint, className = '', ...inputProps }) {
  const errorId = `${name}-error`
  const hintId = `${name}-hint`

  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`h-12 w-full rounded-xl border bg-white px-4 text-base transition-colors outline-none placeholder:text-stone/60 focus:border-teal focus:ring-3 focus:ring-teal/15 ${
          error ? 'border-danger' : 'border-ink/15'
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">{error}</p>
      ) : (
        hint && <p id={hintId} className="mt-1.5 text-sm text-stone">{hint}</p>
      )}
    </div>
  )
}
