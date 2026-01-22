/**
 * Carte de contacts (email, téléphones)
 */

'use client'

import { Phone, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MemberDetails } from '../../hooks/useMembershipDetails'

interface MemberContactCardProps {
  member: MemberDetails | null
}

export function MemberContactCard({ member }: MemberContactCardProps) {
  if (!member) return null

  return (
    <Card className="group bg-gradient-to-br from-emerald-50/30 to-emerald-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Phone className="w-5 h-5 text-green-600" /> Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3" data-testid="member-contact-card">
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Email</div>
          <div className="font-medium flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" /> {member.email || 'Non renseigné'}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Téléphones</div>
          <div className="font-medium">{member.contacts?.join(', ') || 'Non renseigné'}</div>
        </div>
      </CardContent>
    </Card>
  )
}
