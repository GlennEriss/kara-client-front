/**
 * En-tête de la vue détails membre
 * Affiche le titre, le matricule, et les actions principales
 */

'use client'

import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MemberDetails } from '../../hooks/useMembershipDetails'

interface MemberDetailsHeaderProps {
  member: MemberDetails | null
  onBack: () => void
  onOpenMembershipRequest: () => void
}

export function MemberDetailsHeader({
  member,
  onBack,
  onOpenMembershipRequest,
}: MemberDetailsHeaderProps) {
  if (!member) return null

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between bg-gradient-to-r from-white to-gray-50/50 p-4 lg:p-8 rounded-2xl shadow-lg border-0 space-y-4 lg:space-y-0">
      <div className="flex flex-col lg:flex-row lg:items-start space-y-3 lg:space-y-0 lg:space-x-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-10 lg:h-12 px-3 lg:px-4 bg-white hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl border self-start"
          data-testid="member-details-back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="text-sm lg:text-base">Retour</span>
        </Button>
        <div className="space-y-1 lg:space-y-2">
          <h1 className="text-xl lg:text-3xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent leading-tight" data-testid="member-details-title">
            {member.displayName}
          </h1>
          <div className="flex items-center gap-2 text-gray-600">
            <Badge variant="outline" className="text-xs" data-testid="member-details-matricule">
              Matricule: {member.matricule}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-4 self-start lg:self-auto">
        {member.dossier && (
          <Button
            onClick={onOpenMembershipRequest}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-11 lg:h-12 px-6 lg:px-8"
            data-testid="member-details-view-dossier-button"
          >
            <ExternalLink className="w-4 h-4 mr-2" /> Voir le dossier
          </Button>
        )}
      </div>
    </div>
  )
}
