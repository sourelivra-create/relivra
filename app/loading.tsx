export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero skeleton */}
      <div className="skeleton h-48 rounded-3xl mb-10" />

      {/* Filtros skeleton */}
      <div className="skeleton h-11 rounded-xl mb-6" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-[3/4] skeleton" />
            <div className="p-3.5 space-y-2">
              <div className="h-4 skeleton w-16 rounded-full" />
              <div className="h-4 skeleton w-full" />
              <div className="h-3 skeleton w-24" />
              <div className="h-5 skeleton w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
