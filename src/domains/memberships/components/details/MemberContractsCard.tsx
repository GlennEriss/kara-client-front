/**
 * Carte des contrats
 * Affiche un résumé des contrats par type (caisse spéciale, caisse imprevue, placements)
 */

'use client'

import { FileText, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { MemberContracts } from '../../hooks/useMembershipDetails'

interface MemberContractsCardProps {
  contracts: MemberContracts
  onOpenContracts: (moduleKey: 'caisse-speciale' | 'caisse-imprevue' | 'placements') => void
}

export function MemberContractsCard({
  contracts,
  onOpenContracts,
}: MemberContractsCardProps) {
  return (
    <Card className="group bg-linear-to-br from-orange-50/30 to-orange-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <FileText className="w-5 h-5 text-orange-600" /> Contrats
          </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4" data-testid="member-contracts-card">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Caisse Spéciale</div>
              <div className="font-medium">
                <Badge variant="secondary">
                  {contracts.caisseSpecialeCount} contrat(s)
                  {contracts.hasActiveCaisseSpeciale && (
                    <span className="ml-2 text-emerald-600">• Actif</span>
                  )}
                </Badge>
              </div>
            </div>
            {contracts.caisseSpecialeCount > 0 && (
              <Button
                onClick={() => onOpenContracts('caisse-speciale')}
                variant="ghost"
                size="sm"
                className="h-8 px-3"
                data-testid="member-contracts-caisse-speciale-button"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Voir
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Caisse Imprevue</div>
              <div className="font-medium">
                <Badge variant="secondary">
                  {contracts.caisseImprevueCount} contrat(s)
                  {contracts.hasActiveCaisseImprevue && (
                    <span className="ml-2 text-emerald-600">• Actif</span>
                  )}
                </Badge>
              </div>
            </div>
            {contracts.caisseImprevueCount > 0 && (
              <Button
                onClick={() => onOpenContracts('caisse-imprevue')}
                variant="ghost"
                size="sm"
                className="h-8 px-3"
                data-testid="member-contracts-caisse-imprevue-button"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Voir
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Placements</div>
              <div className="font-medium">
                <Badge variant="secondary">{contracts.placementsCount} contrat(s)</Badge>
              </div>
            </div>
            {contracts.placementsCount > 0 && (
              <Button
                onClick={() => onOpenContracts('placements')}
                variant="ghost"
                size="sm"
                className="h-8 px-3"
                data-testid="member-contracts-placements-button"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Voir
              </Button>
            )}
          </div>
        </div>
        {contracts.totalCount === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Aucun contrat enregistré</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
