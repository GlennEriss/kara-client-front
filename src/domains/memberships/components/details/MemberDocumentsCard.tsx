/**
 * Carte de documents / dossier
 * Affiche un résumé des documents et un bouton pour voir le dossier
 */

'use client'

import { FileText, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { UseMembershipDetailsResult } from '../../hooks/useMembershipDetails'

interface MemberDocumentsCardProps {
  documentsCount: number
  onOpenMembershipRequest: () => void
  onOpenDocuments: () => void
}

export function MemberDocumentsCard({
  documentsCount,
  onOpenMembershipRequest,
  onOpenDocuments,
}: MemberDocumentsCardProps) {
  return (
    <Card className="group bg-gradient-to-br from-slate-50/30 to-slate-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <FileText className="w-5 h-5 text-slate-600" /> Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4" data-testid="member-documents-card">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Nombre de documents</div>
            <div className="font-medium">
              <Badge variant="secondary">{documentsCount} document(s)</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={onOpenMembershipRequest}
            variant="outline"
            className="w-full border-[#234D65]/20 text-[#234D65] hover:bg-[#234D65]/5"
            data-testid="member-documents-dossier-button"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Voir le dossier
          </Button>
          <Button
            onClick={onOpenDocuments}
            variant="outline"
            className="w-full border-[#234D65]/20 text-[#234D65] hover:bg-[#234D65]/5"
            data-testid="member-documents-list-button"
          >
            <FileText className="w-4 h-4 mr-2" />
            Voir tous les documents
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
