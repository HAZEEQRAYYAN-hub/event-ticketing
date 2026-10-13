// The title area at the top of inner pages
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-2xl text-stone">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
