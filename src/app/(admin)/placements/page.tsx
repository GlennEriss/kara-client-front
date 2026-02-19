import PlacementList from '@/components/placement/PlacementList'
import React from 'react'

export const metadata = {
  title: 'Placements | Kara Administration',
  description: 'Gestion des placements et suivi des bienfaiteurs',
}

export default function PlacementsPage() {
  return (
    <div className="space-y-6 p-6">
      <PlacementList />
    </div>
  )
}


