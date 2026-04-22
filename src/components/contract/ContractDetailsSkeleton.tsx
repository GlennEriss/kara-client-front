import { Skeleton } from "@/components/ui/skeleton"

export default function ContractDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-10 w-40 rounded-xl" />
            <Skeleton className="h-10 w-56 rounded-xl" />
          </div>
          <div className="hidden lg:flex flex-wrap gap-2">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:hidden">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] p-6 shadow-xl space-y-4">
          <Skeleton className="h-9 w-72 max-w-full bg-white/25" />
          <Skeleton className="h-4 w-64 max-w-full bg-white/20" />
          <Skeleton className="h-4 w-80 max-w-full bg-white/20" />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-md space-y-3">
          <Skeleton className="h-4 w-52 rounded-full" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-40 rounded-full" />
        </div>

        <div className="rounded-2xl border bg-white shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b p-6">
            <Skeleton className="h-6 w-56 rounded-full" />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-7 w-14 rounded-lg" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-4 w-4/5 rounded-full" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
