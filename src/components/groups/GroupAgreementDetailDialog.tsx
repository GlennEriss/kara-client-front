'use client'

import { useState } from 'react'
import { Handshake, Loader2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import type { User } from '@/types/types'
import type { GroupActor } from '@/domains/groups/group-service'
import {
  agreementBalance,
  agreementToday,
  AGREEMENT_KINDS,
  AGREEMENT_STATUS_LABELS,
  AGREEMENT_PAYMENT_MODES,
  type AgreementReminder,
  type GroupAgreement,
} from '@/domains/groups/agreements/agreement-model'
import {
  cancelGroupAgreement,
  recordAgreementReminder,
  voidAgreementPayment,
  voidAgreementRemittance,
} from '@/domains/groups/agreements/agreement-service'
import { generateWhatsAppUrl, resolveWhatsappNumber } from '@/domains/memberships/utils/whatsappUrl'
import { GroupAgreementMoneyDialog } from './GroupAgreementMoneyDialog'
import { useRenderMessageTemplate } from '@/domains/messaging/hooks/useMessageTemplates'

export const agreementMoney = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`
export const agreementDateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR')
const reminderLabels = {
  CONTACTED: 'Contact effectué',
  UNREACHABLE: 'Injoignable',
  PROMISE: 'Promesse de règlement',
  MESSAGE_OPENED: 'Brouillon WhatsApp préparé',
  PLANNED: 'Relance prévue',
}

export function GroupAgreementDetailDialog({
  agreement,
  members,
  actor,
  canManage,
  onClose,
  onSaved,
}: {
  agreement: GroupAgreement
  members: User[]
  actor: GroupActor
  canManage: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const balance = agreementBalance(agreement)
  const renderMessage = useRenderMessageTemplate()
  const [moneyAction, setMoneyAction] = useState<'payment' | 'remittance' | null>(null)
  const [correction, setCorrection] = useState<{
    kind: 'payment' | 'remittance' | 'cancel'
    id: string
  } | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showFollowup, setShowFollowup] = useState(false)
  const [reminderId, setReminderId] = useState(() => crypto.randomUUID())
  const [channel, setChannel] = useState<'PHONE' | 'NOTE'>('PHONE')
  const [outcome, setOutcome] = useState<AgreementReminder['outcome']>('CONTACTED')
  const [followDate, setFollowDate] = useState(agreementToday())
  const [note, setNote] = useState('')
  const debtor = members.find((m) => m.id === agreement.debtorId)
  const phone = debtor ? resolveWhatsappNumber(debtor.whatsappNumber, debtor.contacts) : ''
  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await onSaved()
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action impossible.')
      return false
    } finally {
      setBusy(false)
    }
  }
  const saveReminder = async () => {
    const ok = await run(() =>
      recordAgreementReminder(
        agreement.groupId,
        agreement.id,
        {
          id: reminderId,
          channel,
          outcome,
          note,
          ...(outcome === 'PLANNED'
            ? { plannedDate: followDate }
            : outcome === 'PROMISE'
              ? { promiseDate: followDate }
              : {}),
        },
        actor,
      ),
    )
    if (ok) {
      setShowFollowup(false)
      setNote('')
      setReminderId(crypto.randomUUID())
    }
  }
  const whatsapp = () => {
    if (!phone) return
    const message = renderMessage('groupAgreementReminder', { nom: agreement.debtorName, beneficiaire: agreement.creditorName, objet: agreement.title, reference: agreement.id, montant: agreementMoney(balance.remaining), echeance: balance.nextDue ? ` Échéance : ${agreementDateLabel(balance.nextDue.dueDate)}, ${agreementMoney(balance.nextDue.remaining)}.` : '' })
    const opened = window.open(generateWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer')
    // Browsers may return null with noopener even when the draft opens. We record
    // an opening attempt, never a sent or delivered message.
    void opened
    void run(() =>
      recordAgreementReminder(
        agreement.groupId,
        agreement.id,
        {
          id: crypto.randomUUID(),
          channel: 'WHATSAPP',
          outcome: 'MESSAGE_OPENED',
          note: 'Ouverture du brouillon demandée. Envoi à effectuer et à vérifier dans WhatsApp.',
        },
        actor,
      ),
    )
  }
  const correct = async () => {
    if (!correction) return
    const action =
      correction.kind === 'cancel'
        ? () => cancelGroupAgreement(agreement.groupId, agreement.id, reason, actor)
        : correction.kind === 'payment'
          ? () =>
              voidAgreementPayment(agreement.groupId, agreement.id, correction.id, reason, actor)
          : () =>
              voidAgreementRemittance(agreement.groupId, agreement.id, correction.id, reason, actor)
    if (await run(action)) {
      setCorrection(null)
      setReason('')
    }
  }
  const noMoney =
    !agreement.payments.some((p) => !p.voidedAt) && !agreement.remittances.some((p) => !p.voidedAt)
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose()
        }}
      >
        <ModalContent size="3xl" showCloseButton={!busy}>
          <ModalHeader
            icon={Handshake}
            title={agreement.title}
            description={`${AGREEMENT_KINDS[agreement.kind]} · ${AGREEMENT_STATUS_LABELS[balance.status]}`}
          />
          <ModalBody className="space-y-6">
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Membre qui paie</p>
                <p className="font-semibold">{agreement.debtorName}</p>
                <p className="text-xs text-gray-500">{agreement.debtorMatricule}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Bénéficiaire / créancier</p>
                <p className="font-semibold">{agreement.creditorName}</p>
                <p className="text-xs text-gray-500">{agreement.creditorMatricule}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Accord du {agreementDateLabel(agreement.agreementDate)} · {agreement.quantity} ×{' '}
              {agreementMoney(agreement.unitAmount)} ={' '}
              <strong>{agreementMoney(agreement.totalAmount)}</strong>
            </p>
            {agreement.description && (
              <p className="whitespace-pre-wrap text-sm text-gray-600">{agreement.description}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Versé par le membre', balance.paid],
                ['Reste à régler', balance.remaining],
                ['Reçu par le bénéficiaire', balance.receivedByCreditor],
                ['Détenu par KARA, à reverser', balance.heldByKara],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border p-4">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-1 font-semibold text-[#234D65]">
                    {agreementMoney(Number(value))}
                  </p>
                </div>
              ))}
            </div>
            {balance.heldByKara > 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Ces {agreementMoney(balance.heldByKara)} appartiennent au bénéficiaire. Ils ne
                constituent pas un revenu pour KARA.
              </p>
            )}
            {canManage && agreement.status === 'ACTIVE' && (
              <div className="flex flex-wrap gap-2">
                {balance.remaining > 0 && (
                  <>
                    <Button disabled={busy} onClick={() => setMoneyAction('payment')}>
                      Enregistrer un versement
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setShowFollowup(!showFollowup)}
                    >
                      Noter / planifier une relance
                    </Button>
                    <Button variant="outline" disabled={busy || !phone} onClick={whatsapp}>
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </>
                )}
                {balance.heldByKara > 0 && (
                  <Button disabled={busy} onClick={() => setMoneyAction('remittance')}>
                    Confirmer un reversement
                  </Button>
                )}
                {noMoney && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setError('')
                      setCorrection({ kind: 'cancel', id: agreement.id })
                    }}
                  >
                    Annuler l’accord
                  </Button>
                )}
              </div>
            )}
            {showFollowup && canManage && balance.remaining > 0 && (
              <fieldset disabled={busy} className="space-y-3 rounded-xl border p-4">
                <h3 className="font-semibold">Suivi du règlement</h3>
                <p className="text-xs text-gray-500">
                  Suivi dans cet accord. Les dates du contrat et les échéances restent inchangées.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="follow-channel">Canal</Label>
                    <select
                      id="follow-channel"
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as typeof channel)}
                    >
                      <option value="PHONE">Appel téléphonique</option>
                      <option value="NOTE">Note interne</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="follow-outcome">Résultat / action</Label>
                    <select
                      id="follow-outcome"
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value as typeof outcome)}
                    >
                      {Object.entries(reminderLabels)
                        .filter(([key]) => key !== 'MESSAGE_OPENED')
                        .map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                {(outcome === 'PLANNED' || outcome === 'PROMISE') && (
                  <div>
                    <Label htmlFor="follow-date">
                      {outcome === 'PROMISE' ? 'Date promise du règlement' : 'Date de relance'}
                    </Label>
                    <Input
                      id="follow-date"
                      type="date"
                      min={agreementToday()}
                      value={followDate}
                      onChange={(e) => setFollowDate(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="follow-note">Note interne (facultative)</Label>
                  <Textarea
                    id="follow-note"
                    value={note}
                    maxLength={500}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <Button onClick={saveReminder}>Enregistrer le suivi</Button>
              </fieldset>
            )}
            <section>
              <h3 className="mb-3 font-semibold">Échéancier</h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Échéance', 'Prévu', 'Réglé', 'Reste', 'Situation'].map((label) => (
                        <th key={label} className="whitespace-nowrap p-3">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {balance.installments.map((row, index) => (
                      <tr key={row.id} className="border-t">
                        <td className="whitespace-nowrap p-3">
                          {index + 1}. {agreementDateLabel(row.dueDate)}
                        </td>
                        <td className="whitespace-nowrap p-3">{agreementMoney(row.amount)}</td>
                        <td className="whitespace-nowrap p-3">{agreementMoney(row.paid)}</td>
                        <td className="whitespace-nowrap p-3">{agreementMoney(row.remaining)}</td>
                        <td className={`p-3 ${row.status === 'OVERDUE' ? 'text-red-700' : ''}`}>
                          {agreement.status === 'CANCELLED'
                            ? 'Annulé'
                            : {
                                PAID: 'Réglé',
                                OVERDUE: 'En retard',
                                PARTIAL: 'Partiel',
                                UPCOMING: 'À venir',
                              }[row.status]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Les versements couvrent les échéances les plus anciennes en premier.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="font-semibold">Versements du membre</h3>
              {!agreement.payments.length && (
                <p className="text-sm text-gray-500">Aucun versement enregistré.</p>
              )}
              {[...agreement.payments].reverse().map((p) => (
                <div
                  key={p.id}
                  className={`rounded-xl border p-3 text-sm ${p.voidedAt ? 'bg-gray-50 text-gray-500' : ''}`}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p>
                      <strong>{agreementMoney(p.amount)}</strong> · {agreementDateLabel(p.date)} ·{' '}
                      {AGREEMENT_PAYMENT_MODES[p.mode]}
                    </p>
                    {canManage && !p.voidedAt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setCorrection({ kind: 'payment', id: p.id })}
                      >
                        Corriger cette saisie
                      </Button>
                    )}
                  </div>
                  <p>
                    {p.receivedBy === 'KARA'
                      ? 'Encaissé par KARA'
                      : 'Reçu directement par le bénéficiaire'}
                  </p>
                  {p.reference && <p>Référence : {p.reference}</p>}
                  {p.note && <p className="whitespace-pre-wrap">Note interne : {p.note}</p>}
                  {p.proofUrl && (
                    <a
                      className="text-blue-700 underline"
                      href={p.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Voir le justificatif
                    </a>
                  )}
                  {p.voidedAt && (
                    <p>
                      Saisie annulée par {p.voidedByName} : {p.voidReason}
                    </p>
                  )}
                </div>
              ))}
            </section>
            <section className="space-y-3">
              <h3 className="font-semibold">Remises effectives par KARA au bénéficiaire</h3>
              {!agreement.remittances.length && (
                <p className="text-sm text-gray-500">Aucun reversement enregistré.</p>
              )}
              {[...agreement.remittances].reverse().map((p) => (
                <div key={p.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p>
                      <strong>{agreementMoney(p.amount)}</strong> · {agreementDateLabel(p.date)} ·{' '}
                      {AGREEMENT_PAYMENT_MODES[p.mode]}
                    </p>
                    {canManage && !p.voidedAt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setCorrection({ kind: 'remittance', id: p.id })}
                      >
                        Corriger cette saisie
                      </Button>
                    )}
                  </div>
                  {p.reference && <p>Référence : {p.reference}</p>}
                  {p.note && <p>Note interne : {p.note}</p>}
                  {p.proofUrl && (
                    <a
                      className="text-blue-700 underline"
                      href={p.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Voir le justificatif
                    </a>
                  )}
                  {p.voidedAt && <p className="text-gray-500">Saisie annulée : {p.voidReason}</p>}
                </div>
              ))}
            </section>
            <section className="space-y-3">
              <h3 className="font-semibold">Relances et promesses</h3>
              {!agreement.reminders.length && (
                <p className="text-sm text-gray-500">Aucun suivi enregistré.</p>
              )}
              {[...agreement.reminders].reverse().map((r) => (
                <div key={r.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                  <p className="font-medium">
                    {reminderLabels[r.outcome]}
                    {r.plannedDate
                      ? ` le ${agreementDateLabel(r.plannedDate)}`
                      : r.promiseDate
                        ? ` le ${agreementDateLabel(r.promiseDate)}`
                        : ''}
                  </p>
                  <p className="whitespace-pre-wrap">{r.note}</p>
                  <p className="text-xs text-gray-500">
                    {r.byName} · {new Date(r.recordedAt).toLocaleString('fr-FR')}
                    {balance.remaining === 0 ? ' · Accord réglé, relance devenue inutile' : ''}
                  </p>
                </div>
              ))}
            </section>
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold">Historique de l’accord</summary>
              <ul className="mt-3 space-y-3">
                {[...agreement.history].reverse().map((item) => (
                  <li key={item.id}>
                    <p>{item.description}</p>
                    <p className="text-xs text-gray-500">
                      {item.byName} · {new Date(item.at).toLocaleString('fr-FR')}
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" disabled={busy} onClick={onClose}>
              Fermer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Dialog>
      {moneyAction && (
        <GroupAgreementMoneyDialog
          key={`${agreement.id}-${moneyAction}`}
          agreement={agreement}
          remittance={moneyAction === 'remittance'}
          actor={actor}
          onClose={() => setMoneyAction(null)}
          onSaved={onSaved}
        />
      )}
      {correction && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setCorrection(null)
          }}
        >
          <ModalContent size="md" showCloseButton={!busy}>
            <ModalHeader
              title={correction.kind === 'cancel' ? 'Annuler cet accord' : 'Corriger une saisie'}
              description="L’historique est conservé. Une correction de saisie n’est pas un remboursement d’argent."
            />
            <ModalBody className="space-y-3">
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              <Label htmlFor="correction-reason">Motif obligatoire</Label>
              <Textarea
                id="correction-reason"
                disabled={busy}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" disabled={busy} onClick={() => setCorrection(null)}>
                Retour
              </Button>
              <Button disabled={busy || reason.trim().length < 3} onClick={correct}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirmer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Dialog>
      )}
    </>
  )
}
