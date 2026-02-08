// ---------------------------------------------------------------------------
// Reusable skeleton loaders
// ---------------------------------------------------------------------------

export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1.5">
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="h-3 w-20" />
        </div>
      </div>
      <SkeletonLine className="h-8 w-full rounded-lg" />
    </div>
  )
}

export function SkeletonListItem() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between">
            <SkeletonLine className="h-4 w-28" />
            <SkeletonLine className="h-4 w-16" />
          </div>
          <div className="flex gap-2">
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-3 w-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <SkeletonLine className="h-7 w-40" />
        <SkeletonLine className="h-4 w-28" />
      </div>
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
