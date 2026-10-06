'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import type { CreditContract } from '@/types/types'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState } from 'react'

const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`

/**
 * Clôture d'un contrat en perte (défaut de paiement), réservée au SuperAdmin :
 * récapitule ce qui est abandonné avant de demander le motif et une confirmation.
 */
export default function CreditWriteOffModal({
  isOpen,
  onClose,
  contract,
  unpaidPenalties,
  guarantorCommissionDue,
  onConfirm,
  isPending = false,
  isLoadingAmounts = false,
}: {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
  unpaidPenalties: number
  guarantorCommissionDue: number
  onConfirm: (motif: string) => Promise<void>
  isPending?: boolean
  /** Commission du garant en cours de calcul : validation bloquée. */
  isLoadingAmounts?: boolean
}) {
  const [motif, setMotif] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountRemaining = Math.max(0, contract.amountRemaining ?? 0)
  const loss = amountRemaining + unpaidPenalties
  const motifValid = motif.trim().length >= 10 && motif.trim().length <= 500

  const handleClose = () => {
    if (isPending) return
    setMotif('')
    setConfirmed(false)
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!motifValid || !confirmed) return
    setError(null)
    try {
      await onConfirm(motif.trim())
      setMotif('')
      setConfirmed(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la clôture en perte')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent size="sm">
        <ModalHeader
          title="Clôturer le contrat en perte"
          description={`${contract.clientFirstName} ${contract.clientLastName} — contrat ${contract.id}`}
        />
        <ModalBody>
          <div className="space-y-4">
            <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                À utiliser quand le membre ne remboursera plus. Le contrat sort des échéanciers et des relances, et le
                reste dû est enregistré comme perte. Les sommes récupérées plus tard pourront encore être enregistrées.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Reste dû</p>
                <p className="font-bold">{fcfa(amountRemaining)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Pénalités impayées</p>
                <p className="font-bold">{fcfa(unpaidPenalties)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Perte enregistrée</p>
                <p className="font-bold text-rose-700">{fcfa(loss)}</p>
              </div>
              {contract.guarantorId && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Commission du garant annulée
                  </p>
                  <p className="font-bold">{isLoadingAmounts ? 'Calcul…' : fcfa(guarantorCommissionDue)}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="write-off-motif">Motif</Label>
              <Textarea
                id="write-off-motif"
                value={motif}
                onChange={(event) => setMotif(event.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Ex. : membre injoignable depuis 4 mois, relances sans suite…"
              />
              <p className="text-xs text-gray-500">Entre 10 et 500 caractères ({motif.trim().length}/500).</p>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
              <Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
              <span>Je confirme que le reste dû est abandonné et que cette clôture ne peut pas être annulée.</span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!motifValid || !confirmed || isPending || isLoadingAmounts}
            className="bg-rose-700 text-white hover:bg-rose-800"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Clôturer en perte
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
