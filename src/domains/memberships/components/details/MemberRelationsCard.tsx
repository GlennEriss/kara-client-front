/**
 * Carte des relations / liens vers autres modules
 * Regroupe les liens vers véhicules, groupes, etc.
 */

'use client'

import { Car, Users, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { UseMembershipDetailsResult } from '../../hooks/useMembershipDetails'

interface MemberRelationsCardProps {
  onOpenVehicles: () => void
}

export function MemberRelationsCard({
  onOpenVehicles,
}: MemberRelationsCardProps) {
  return (
    <Card className="group bg-gradient-to-br from-violet-50/30 to-violet-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Users className="w-5 h-5 text-violet-600" /> Autres modules
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3" data-testid="member-relations-card">
        <Button
          onClick={onOpenVehicles}
          variant="outline"
          className="w-full border-[#234D65]/20 text-[#234D65] hover:bg-[#234D65]/5 justify-start"
          data-testid="member-relations-vehicles-button"
        >
          <Car className="w-4 h-4 mr-2" />
          Voir les véhicules
          <ExternalLink className="w-4 h-4 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  )
}
