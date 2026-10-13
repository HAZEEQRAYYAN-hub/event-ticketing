// A grey placeholder in the shape of an EventCard, shown while events load
export default function EventCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white" aria-hidden="true">
      <div className="h-28 rounded-t-2xl bg-sand" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 rounded bg-sand" />
        <div className="h-4 w-1/2 rounded bg-sand" />
        <div className="h-1.5 w-full rounded bg-sand" />
        <div className="h-5 w-1/3 rounded bg-sand" />
      </div>
    </div>
  )
}
