'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Minus, Star } from 'lucide-react'
import { useState } from 'react'
import { useCharityStarAdjustments, useMemberCharityStars } from '../hooks/useCharityStars'
import { CharityStars } from './CharityStars'
import { DeductCharityStarModal } from './DeductCharityStarModal'

const formatDateTime = (value: Date) =>
  value.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

/** Bloc « Étoiles de charité » de la fiche membre : solde, retrait, historique. */
export function MemberCharityStarsCard({
  memberId,
  memberName,
  canDeduct = true,
}: {
  memberId: string
  memberName: string
  canDeduct?: boolean
}) {
  const { data: stars, isLoading } = useMemberCharityStars(memberId)
  const { data: adjustments = [] } = useCharityStarAdjustments(memberId)
  const [isDeductOpen, setIsDeductOpen] = useState(false)

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-[#234D65]">
            <Star className="h-5 w-5 text-[#CBB171]" />
            Étoiles de charité
          </CardTitle>
          {canDeduct && (stars?.stars ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeductOpen(true)}
              className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <Minus className="h-4 w-4" />
              Retrancher une étoile
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <CharityStars stars={stars?.stars ?? 0} variant="full" />
        )}

        {stars && stars.deductedStars > 0 && (
          <p className="text-xs text-slate-500">
            {stars.activeStars.length} acquise{stars.activeStars.length > 1 ? 's' : ''} par
            participation, {stars.deductedStars} retranchée{stars.deductedStars > 1 ? 's' : ''}.
          </p>
        )}

        {stars?.nextExpiryAt && (
          <p className="text-xs text-slate-500">
            Prochaine expiration : {stars.nextExpiryAt.toLocaleDateString('fr-FR')} — une étoile
            vaut six ans.
          </p>
        )}

        {adjustments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Historique des retraits
            </p>
            {adjustments.map((adjustment) => (
              <div key={adjustment.id} className="rounded-lg bg-gray-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{formatDateTime(adjustment.createdAt)}</span>
                  <span>{adjustment.createdByName || adjustment.createdBy}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{adjustment.reason}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <DeductCharityStarModal
        isOpen={isDeductOpen}
        onClose={() => setIsDeductOpen(false)}
        memberId={memberId}
        memberName={memberName}
        currentStars={stars?.stars ?? 0}
      />
    </Card>
  )
}
