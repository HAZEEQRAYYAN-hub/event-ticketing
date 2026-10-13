// One button style for the whole website.
// Use "to" for a button that goes to another page, or "onClick" for an action.
//   <Button to="/events">Browse events</Button>
//   <Button variant="accent" onClick={save} loading={saving}>Save</Button>

import { Link } from 'react-router-dom'
import Spinner from './Spinner'

const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink/85',
  accent: 'bg-coral text-ink hover:bg-coral-dark',
  outline: 'border border-ink/15 bg-white text-ink hover:border-ink',
  ghost: 'text-teal hover:bg-sand',
  danger: 'border border-danger/30 bg-white text-danger hover:bg-danger hover:text-white',
}

const SIZES = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
}

export default function Button({
  to,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
    'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}
