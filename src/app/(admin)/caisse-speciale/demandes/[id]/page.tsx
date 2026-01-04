import React, { Suspense } from 'react'
import DemandDetail from '@/components/caisse-speciale/DemandDetail'
import { Skeleton } from '@/components/ui/skeleton'

function DemandDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

interface DemandDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DemandDetailPage({ params }: DemandDetailPageProps) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <Suspense fallback={<DemandDetailSkeleton />}>
          <DemandDetail demandId={id} />
        </Suspense>
      </div>
    </div>
  )
}

