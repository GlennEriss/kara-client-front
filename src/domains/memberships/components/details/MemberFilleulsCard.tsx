/**
 * Carte des filleuls / parrainage
 * Affiche le nombre de filleuls et un bouton pour voir la liste complète
 */

'use client'

import { Users, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { UseMembershipDetailsResult } from '../../hooks/useMembershipDetails'

interface MemberFilleulsCardProps {
  filleulsCount: number
  onOpenFilleuls: () => void
}

export function MemberFilleulsCard({
  filleulsCount,
  onOpenFilleuls,
}: MemberFilleulsCardProps) {
  return (
    <Card className="group bg-gradient-to-br from-cyan-50/30 to-cyan-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Users className="w-5 h-5 text-cyan-600" /> Filleuls
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4" data-testid="member-filleuls-card">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Nombre de filleuls</div>
            <div className="font-medium">
              <Badge variant="secondary">{filleulsCount} filleul(s)</Badge>
            </div>
          </div>
        </div>
        <Button
          onClick={onOpenFilleuls}
          variant="outline"
          className="w-full border-[#234D65]/20 text-[#234D65] hover:bg-[#234D65]/5"
          data-testid="member-filleuls-list-button"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Voir la liste des filleuls
        </Button>
      </CardContent>
    </Card>
  )
}
