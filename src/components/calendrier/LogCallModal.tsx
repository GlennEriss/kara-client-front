"use client"

/**
 * Compte rendu après un appel passé à un retardataire.
 *
 * S'ouvre automatiquement après un clic sur « Appeler », mais reste fermable :
 * un clic accidentel ou un appel qui n'a pas pu être lancé ne doit pas piéger
 * l'utilisateur. Fermer sans enregistrer ne laisse aucune trace.
 *
 * L'appel est toujours attribué à l'administrateur connecté.
 */

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRecordCall } from '@/hooks/useCallLogs'
import {
  CALL_OUTCOME_LABELS,
  CONTACT_CHANNEL_LABELS,
  type CallOutcome,
  type ContactChannel,
} from '@/services/call-logs/callLog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Loader2, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/** Le retardataire concerné, tel que le tableau des retards le connaît. */
export interface CallTarget {
  personKey: string
  memberId?: string
  groupId?: string
  matricule?: string
  name: string
  isGroup: boolean
  product: string
  totalOverdue: number
  overdueCount: number
  maxDaysOverdue: number
}

interface LogCallModalProps {
  open: boolean
  target: CallTarget | null
  /** Canal du contact : décidé par le bouton qui a ouvert la fenêtre. */
  channel: ContactChannel
  /** Appelé après enregistrement réussi. */
  onRecorded: () => void
  /** Fermeture sans enregistrer (croix, Échap, clic extérieur, « Annuler »). */
  onCancel: () => void
}

/** Ordre d'affichage : les issues les plus fréquentes en premier. */
const OUTCOME_ORDER: CallOutcome[] = [
  'promesse_paiement',
  'paiement_effectue',
  'injoignable',
  'a_rappeler',
  'refus',
  'numero_invalide',
  'autre',
]

const SUMMARY_MIN_LENGTH = 5

export function LogCallModal({ open, target, channel, onRecorded, onCancel }: LogCallModalProps) {
  const { record, isPending } = useRecordCall()

  const [outcome, setOutcome] = useState<CallOutcome | ''>('')
  const [summary, setSummary] = useState('')
  const [promiseDate, setPromiseDate] = useState('')
  const [promiseAmount, setPromiseAmount] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Remise à zéro à chaque nouvelle cible : sans cela, le compte rendu du
  // retardataire précédent resterait pré-rempli sur le suivant.
  useEffect(() => {
    if (open) {
      setOutcome('')
      setSummary('')
      setPromiseDate('')
      setPromiseAmount('')
      setSubmitted(false)
    }
  }, [open, target?.personKey])

  if (!target) return null

  const needsPromiseDate = outcome === 'promesse_paiement'
  const summaryTooShort = summary.trim().length < SUMMARY_MIN_LENGTH
  const missingPromiseDate = needsPromiseDate && !promiseDate

  const handleSubmit = async () => {
    setSubmitted(true)
    if (!outcome || summaryTooShort || missingPromiseDate) return

    const parsedPromiseDate = promiseDate ? new Date(`${promiseDate}T12:00:00`) : undefined
    const parsedPromiseAmount = promiseAmount.trim() ? Number(promiseAmount.replace(/\s/g, '')) : undefined

    try {
      await record({
        personKey: target.personKey,
        memberId: target.memberId,
        groupId: target.groupId,
        matricule: target.matricule,
        name: target.name,
        isGroup: target.isGroup,
        product: target.product,
        channel,
        outcome,
        summary,
        totalOverdue: target.totalOverdue,
        overdueCount: target.overdueCount,
        maxDaysOverdue: target.maxDaysOverdue,
        promiseToPayAt: needsPromiseDate ? parsedPromiseDate : undefined,
        promiseAmount:
          needsPromiseDate && parsedPromiseAmount && !Number.isNaN(parsedPromiseAmount)
            ? parsedPromiseAmount
            : undefined,
      })
      toast.success('Compte rendu enregistré')
      onRecorded()
    } catch (error) {
      console.error('[callLog] enregistrement impossible:', error)
      toast.error("Le compte rendu n'a pas pu être enregistré. Réessayez.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#234D65]" />
            Compte rendu — {CONTACT_CHANNEL_LABELS[channel]}
          </DialogTitle>
          <DialogDescription>
            {target.name} • {target.product} • {target.totalOverdue.toLocaleString('fr-FR')} FCFA dus
            {' '}({target.overdueCount} versement{target.overdueCount > 1 ? 's' : ''}, {target.maxDaysOverdue} j de retard)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Issue */}
          <div className="space-y-1.5">
            <Label>Comment ça s&apos;est passé ?</Label>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {OUTCOME_ORDER.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  aria-pressed={outcome === o}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    outcome === o
                      ? 'border-[#234D65] bg-[#234D65]/5 font-medium text-[#234D65]'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {CALL_OUTCOME_LABELS[o]}
                </button>
              ))}
            </div>
            {submitted && !outcome && (
              <p className="text-xs text-red-600">Choisissez une issue.</p>
            )}
          </div>

          {/* Promesse de paiement */}
          {needsPromiseDate && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="promise-date">Date promise</Label>
                <Input
                  id="promise-date"
                  type="date"
                  value={promiseDate}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setPromiseDate(e.target.value)}
                />
                {submitted && missingPromiseDate && (
                  <p className="text-xs text-red-600">Indiquez la date promise.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promise-amount">Montant promis (facultatif)</Label>
                <Input
                  id="promise-amount"
                  inputMode="numeric"
                  placeholder={String(target.totalOverdue)}
                  value={promiseAmount}
                  onChange={(e) => setPromiseAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Commentaire */}
          <div className="space-y-1.5">
            <Label htmlFor="call-summary">Votre commentaire</Label>
            <Textarea
              id="call-summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Ex. : dit qu'il paiera vendredi après sa paie"
            />
            {submitted && summaryTooShort && (
              <p className="text-xs text-red-600">Décrivez l&apos;échange en quelques mots.</p>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Sera enregistré le {format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })} à votre nom.
            Un compte rendu ne peut plus être modifié ensuite ; fermer sans enregistrer ne laisse
            aucune trace de l&apos;appel.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="w-full sm:w-auto">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer le compte rendu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
