import PlacementDemandDetail from '@/components/placement/PlacementDemandDetail'
import { DetailHeroSkeleton } from '@/components/ui/detail-hero'
import { Suspense } from 'react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PlacementDemandDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
        <Suspense fallback={<DetailHeroSkeleton cards={2} />}>
          <PlacementDemandDetail demandId={id} />
        </Suspense>
      </div>
    </div>
  )
}
