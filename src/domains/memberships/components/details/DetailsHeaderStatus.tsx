/**
 * En-tête avec titre, statut, matricule, dates et navigation
 */

'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadgeV2 } from '../shared'
import { formatDateDetailed } from '../../utils/details'
import type { MembershipRequest } from '../../entities'

interface DetailsHeaderStatusProps {
  request: MembershipRequest
}

export function DetailsHeaderStatus({ request }: DetailsHeaderStatusProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between bg-gradient-to-r from-white to-gray-50/50 p-4 lg:p-8 rounded-2xl shadow-lg border-0 space-y-4 lg:space-y-0" data-testid="details-header">
      <div className="flex flex-col lg:flex-row lg:items-start space-y-3 lg:space-y-0 lg:space-x-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="h-10 lg:h-12 px-3 lg:px-4 bg-white hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl border self-start"
          data-testid="details-back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="text-sm lg:text-base">Retour</span>
        </Button>
        <div className="space-y-1 lg:space-y-2">
          <h1 className="text-xl lg:text-3xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent leading-tight">
            Demande de {request.identity.firstName} {request.identity.lastName}
          </h1>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="font-medium text-sm lg:text-base">Créée le {formatDateDetailed(request.createdAt)}</span>
          </div>
          {request.matricule && (
            <div className="text-xs text-gray-400 font-mono" data-testid="details-matricule">
              #{request.matricule}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 self-start lg:self-auto" data-testid="details-status-badge">
        <StatusBadgeV2 status={request.status} />
      </div>
    </div>
  )
}
