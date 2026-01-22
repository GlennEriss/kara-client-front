/**
 * Carte de profession / entreprise
 */

'use client'

import { Briefcase } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MemberDetails } from '../../hooks/useMembershipDetails'

interface MemberProfessionCardProps {
  member: MemberDetails | null
}

export function MemberProfessionCard({ member }: MemberProfessionCardProps) {
  if (!member) return null

  return (
    <Card className="group bg-gradient-to-br from-amber-50/30 to-yellow-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Briefcase className="w-5 h-5 text-amber-600" /> Profession
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3" data-testid="member-profession-card">
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Profession</div>
          <div className="font-medium">{member.profession || 'Non renseigné'}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Entreprise</div>
          <div className="font-medium">{member.companyName || 'Non renseigné'}</div>
        </div>
      </CardContent>
    </Card>
  )
}
