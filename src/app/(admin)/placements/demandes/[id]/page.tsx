import PlacementDemandDetail from '@/components/placement/PlacementDemandDetail'
import React, { Suspense } from 'react'

interface PageProps {
  params: {
    id: string
  }
}

export default function PlacementDemandDetailPage({ params }: PageProps) {
  return (
    <div className="space-y-6 p-6">
      <Suspense fallback={<div>Chargement...</div>}>
        <PlacementDemandDetail demandId={params.id} />
      </Suspense>
    </div>
  )
}

