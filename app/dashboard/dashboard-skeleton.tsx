import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="space-y-5">
            <div className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl border bg-white p-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-4 h-9 w-16" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <Skeleton className="h-6 w-32" />
          <div className="mt-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl border p-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-56" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-10 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.8fr)]">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-48" />
            <div className="mt-5 space-y-3">
              {[...Array(4)].map((__, j) => (
                <div key={j} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-10 w-20" />
            <Skeleton className="mt-3 h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}
