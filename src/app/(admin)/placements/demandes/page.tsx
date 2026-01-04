import ListPlacementDemandes from '@/components/placement/ListPlacementDemandes'
import React, { Suspense } from 'react'

export default function PlacementDemandesPage() {
  return (
    <div className="space-y-6 p-6">
      <Suspense fallback={<div>Chargement...</div>}>
        <ListPlacementDemandes />
      </Suspense>
    </div>
  )
}

