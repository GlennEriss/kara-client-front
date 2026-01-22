/**
 * Carte d'adresse
 */

'use client'

import { MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MemberDetails } from '../../hooks/useMembershipDetails'

interface MemberAddressCardProps {
  member: MemberDetails | null
}

export function MemberAddressCard({ member }: MemberAddressCardProps) {
  if (!member || !member.address) return null

  return (
    <Card className="group bg-gradient-to-br from-rose-50/30 to-pink-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <MapPin className="w-5 h-5 text-rose-600" /> Adresse
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3" data-testid="member-address-card">
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Province</div>
          <div className="font-medium">{member.address.province}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Ville</div>
          <div className="font-medium">{member.address.city}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Quartier</div>
          <div className="font-medium">{member.address.district}</div>
        </div>
        {member.address.arrondissement && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Arrondissement</div>
            <div className="font-medium">{member.address.arrondissement}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
