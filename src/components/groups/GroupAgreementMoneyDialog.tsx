'use client'

import { useState } from 'react'
import { Banknote, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import type { GroupActor } from '@/domains/groups/group-service'
import {
  agreementBalance,
  agreementToday,
  AGREEMENT_PAYMENT_MODES,
  type AgreementPaymentMode,
  type GroupAgreement,
} from '@/domains/groups/agreements/agreement-model'
import {
  recordAgreementPayment,
  recordAgreementRemittance,
} from '@/domains/groups/agreements/agreement-service'
import { uploadAgreementPaymentProof } from '@/domains/groups/agreements/agreement-proof'

export function GroupAgreementMoneyDialog({
  agreement,
  remittance,
  actor,
  onClose,
  onSaved,
}: {
  agreement: GroupAgreement
  remittance: boolean
  actor: GroupActor
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const balance = agreementBalance(agreement)
  const [id] = useState(() => crypto.randomUUID())
  const [amount, setAmount] = useState(
    remittance ? balance.heldByKara : balance.nextDue?.remaining || balance.remaining,
  )
  const [date, setDate] = useState(agreementToday())
  const [route, setRoute] = useState<'CREDITOR' | 'KARA'>('CREDITOR')
  const [mode, setMode] = useState<AgreementPaymentMode>('CASH')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const limit = remittance ? balance.heldByKara : balance.remaining
  const save = async () => {
    setError('')
    setBusy(true)
    try {
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > limit)
        throw new Error('Vérifiez le montant : il ne doit pas dépasser le solde disponible.')
      const proofUrl = file
        ? await uploadAgreementPaymentProof(agreement.groupId, agreement.id, id, file)
        : undefined
      const input = { id, amount, date, mode, reference, note, ...(proofUrl ? { proofUrl } : {}) }
      if (remittance) await recordAgreementRemittance(agreement.groupId, agreement.id, input, actor)
      else
        await recordAgreementPayment(
          agreement.groupId,
          agreement.id,
          { ...input, receivedBy: route },
          actor,
        )
      await onSaved()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <ModalContent size="lg" showCloseButton={!busy}>
        <ModalHeader
          icon={Banknote}
          title={remittance ? 'Remettre les fonds au bénéficiaire' : 'Enregistrer un versement'}
          description={`${agreement.debtorName} → ${agreement.creditorName} · ${agreement.title}`}
        />
        <ModalBody className="space-y-4">
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <p className="rounded-xl bg-blue-50 p-3 text-sm text-[#234D65]">
            {remittance
              ? `À confirmer uniquement après remise effective à ${agreement.creditorName}. Cette opération ne constitue pas un nouveau versement de l’acheteur.`
              : 'Enregistrez uniquement une somme effectivement versée. Le choix du destinataire détermine si KARA doit encore remettre l’argent au bénéficiaire.'}
          </p>
          <fieldset disabled={busy} className="space-y-4">
            {!remittance && (
              <div className="space-y-1.5">
                <Label htmlFor="payment-route">Qui a reçu l’argent ?</Label>
                <select
                  id="payment-route"
                  value={route}
                  onChange={(e) => setRoute(e.target.value as typeof route)}
                  className="h-10 w-full rounded-md border px-3 text-sm"
                >
                  <option value="CREDITOR">
                    Directement le bénéficiaire : {agreement.creditorName}
                  </option>
                  <option value="KARA">LE KARA : somme à reverser au bénéficiaire</option>
                </select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="agreement-payment-amount">Montant (FCFA)</Label>
                <Input
                  id="agreement-payment-amount"
                  type="number"
                  min="1"
                  max={limit}
                  step="1"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <p className="text-xs text-gray-500">
                  Maximum : {limit.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agreement-payment-date">Date effective</Label>
                <Input
                  id="agreement-payment-date"
                  type="date"
                  min={agreement.agreementDate}
                  max={agreementToday()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agreement-payment-mode">Mode de règlement</Label>
              <select
                id="agreement-payment-mode"
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={mode}
                onChange={(e) => setMode(e.target.value as AgreementPaymentMode)}
              >
                {Object.entries(AGREEMENT_PAYMENT_MODES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agreement-payment-ref">Référence (facultative)</Label>
              <Input
                id="agreement-payment-ref"
                maxLength={120}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agreement-payment-note">Note interne (facultative)</Label>
              <Textarea
                id="agreement-payment-note"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agreement-payment-proof">Justificatif (facultatif)</Label>
              <Input
                id="agreement-payment-proof"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500">
                Image ou PDF, 5 Mo maximum. Réservé à l’administration.
              </p>
            </div>
          </fieldset>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={busy} onClick={save}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {remittance ? 'Confirmer la remise effective' : 'Confirmer le versement reçu'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
