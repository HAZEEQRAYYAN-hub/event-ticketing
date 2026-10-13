// The shared frame for the Log in and Sign up pages:
// a form on one side, and a dark ticket-themed panel on the other (big screens only).
import { TicketIcon } from '../components/Logo'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
      <div className="mx-auto w-full max-w-md lg:mx-0">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
        <p className="mt-3 text-stone">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>

      <div className="relative hidden overflow-hidden rounded-3xl bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-end" aria-hidden="true">
        <TicketIcon className="absolute -top-10 -right-10 h-72 w-72 rotate-12 opacity-90" />
        <p className="relative font-display text-4xl leading-tight font-extrabold">
          Your tickets live here.
        </p>
        <p className="relative mt-3 max-w-sm text-white/70">
          Every booking you make on Tixora comes with a QR code. Open My tickets at the door and you're in.
        </p>
      </div>
    </div>
  )
}
