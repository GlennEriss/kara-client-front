'use client'

/**
 * Déclarations d'intention de contribution faites par les MEMBRES (app membre).
 * Affichée en tête de l'onglet Contributions : le gestionnaire confirme
 * (création de la contribution réelle) ou refuse chaque déclaration en attente.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCancelCharityDeclaration,
  useCharityDeclarations,
  useConfirmCharityDeclaration,
  type CharityDeclaration,
} from '@/hooks/bienfaiteur/useCharityDeclarations'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BellRing, Check, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const STATUS_BADGE: Record<CharityDeclaration['status'], { label: string; cls: string }> = {
  pending: { label: 'En attente', cls: 'border-amber-300 bg-amber-50 text-amber-700' },
  confirmed: { label: 'Confirmée', cls: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  canceled: { label: 'Refusée', cls: 'border-gray-300 bg-gray-50 text-gray-500' },
}

export default function CharityDeclarationsSection({ eventId }: { eventId: string }) {
  const { data: declarations = [], isLoading } = useCharityDeclarations(eventId)
  const confirm = useConfirmCharityDeclaration()
  const cancel = useCancelCharityDeclaration()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const pending = declarations.filter((d) => d.status === 'pending')
  // Sans déclaration, la section reste invisible (pas de bruit sur la fiche).
  if (!isLoading && declarations.length === 0) return null

  const handleConfirm = async (d: CharityDeclaration) => {
    setProcessingId(d.id)
    try {
      await confirm.mutateAsync({ declaration: d })
      toast.success(`Contribution de ${d.participantName} confirmée`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la confirmation')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancel = async (d: CharityDeclaration) => {
    setProcessingId(d.id)
    try {
      await cancel.mutateAsync(d)
      toast.success('Déclaration refusée')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors du refus')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <Card className="border border-amber-200/70 bg-amber-50/30 shadow-sm">
      <CardContent className="space-y-3 p-4 md:p-5">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-bold text-gray-900">Déclarations des membres</h3>
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {pending.length} à traiter
            </span>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="space-y-2">
            {declarations.map((d) => {
              const busy = processingId === d.id
              const badge = STATUS_BADGE[d.status]
              return (
                <div
                  key={d.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                      {d.participantName}
                      <span className="font-mono text-xs text-gray-400">{d.participantId}</span>
                      <Badge variant="outline" className={`text-[10px] ${badge.cls}`}>
                        {badge.label}
                      </Badge>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      {d.contributionType === 'money'
                        ? `${(d.amount ?? 0).toLocaleString('fr-FR')} FCFA`
                        : `En nature — ${d.inKindDescription || '—'}${d.estimatedValue ? ` (~${d.estimatedValue.toLocaleString('fr-FR')} FCFA)` : ''}`}
                      {' · '}déclaré le {format(d.createdAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      {d.notes && <span className="text-gray-400"> · {d.notes}</span>}
                    </p>
                  </div>
                  {d.status === 'pending' && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(d)}
                        disabled={busy}
                        className="h-8 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                        Confirmer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(d)}
                        disabled={busy}
                        className="h-8 border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Refuser
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
