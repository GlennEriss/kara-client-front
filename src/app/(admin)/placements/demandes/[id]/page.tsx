import PlacementDemandDetail from '@/components/placement/PlacementDemandDetail'
import { Suspense } from 'react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PlacementDemandDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <div className="space-y-6 p-6">
      <Suspense fallback={<div>Chargement...</div>}>
        <PlacementDemandDetail demandId={id} />
      </Suspense>
    </div>
  )
}

