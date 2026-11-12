'use client'

import { useEffect, useRef, useState } from 'react'
import { Handshake, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import type { User } from '@/types/types'
import type { GroupActor } from '@/domains/groups/group-service'
import { isIdentifiedGroupMember } from '@/domains/groups/group-guarantor'
import { memberName } from '@/domains/groups/group-model'
import { createGroupAgreements } from '@/domains/groups/agreements/agreement-service'
import {
  AGREEMENT_KINDS,
  agreementToday,
  firstAgreementDueDate,
  generateAgreementSchedule,
  validateAgreementBatch,
  type AgreementBatchDraft,
  type AgreementBuyerDraft,
  type AgreementFrequency,
  type AgreementKind,
} from '@/domains/groups/agreements/agreement-model'

type BuyerTerms = { quantity: number; unitAmount?: number; count?: number; firstDueDate?: string }
const inputClass = 'h-10 rounded-md border border-gray-200 bg-white px-3 text-sm'
const money = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`

export function CreateGroupAgreementsDialog({
  groupId,
  members,
  actor,
  onClose,
  onCreated,
}: {
  groupId: string
  members: User[]
  actor: GroupActor
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [requestId] = useState(() => crypto.randomUUID())
  const [step, setStep] = useState(1)
  const [kind, setKind] = useState<AgreementKind>('SALE')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creditorId, setCreditorId] = useState('')
  const [date, setDate] = useState(agreementToday())
  const [unitAmount, setUnitAmount] = useState(0)
  const [count, setCount] = useState(3)
  const [firstDue, setFirstDue] = useState(firstAgreementDueDate(agreementToday()))
  const [frequency, setFrequency] = useState<AgreementFrequency>('MONTHLY')
  const [selected, setSelected] = useState<Record<string, BuyerTerms>>({})
  const [buyers, setBuyers] = useState<AgreementBuyerDraft[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0
  }, [step, error])
  const people = members.filter(isIdentifiedGroupMember)
  const byId = new Map(people.map((member) => [member.id, member]))
  const creditor = byId.get(creditorId)
  const candidates = people.filter(
    (member) =>
      member.id !== creditorId &&
      `${memberName(member)} ${member.matricule || ''}`
        .toLocaleLowerCase('fr')
        .includes(search.toLocaleLowerCase('fr')),
  )
  const terms = (id: string, changes: Partial<BuyerTerms>) =>
    setSelected((current) => ({ ...current, [id]: { ...current[id], ...changes } }))
  const payload = (rows: AgreementBuyerDraft[]): AgreementBatchDraft => ({
    requestId,
    groupId,
    creditorId,
    kind,
    title,
    description,
    agreementDate: date,
    buyers: rows,
  })
  const next = () => {
    setError('')
    try {
      const rows = Object.entries(selected).map(([debtorId, plan]) => {
        const price = plan.unitAmount ?? unitAmount,
          quantity = kind === 'SALE' ? plan.quantity : 1
        return {
          debtorId,
          quantity,
          unitAmount: price,
          schedule: generateAgreementSchedule(
            price * quantity,
            plan.count ?? count,
            plan.firstDueDate || firstDue,
            frequency,
          ),
        }
      })
      validateAgreementBatch(payload(rows))
      setBuyers(rows)
      setStep(2)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Vérifiez les conditions.')
    }
  }
  const changeSchedule = (
    index: number,
    rowIndex: number,
    change: Record<string, string | number>,
  ) =>
    setBuyers((current) =>
      current.map((buyer, i) =>
        i === index
          ? {
              ...buyer,
              schedule: buyer.schedule.map((row, j) =>
                j === rowIndex ? { ...row, ...change } : row,
              ),
            }
          : buyer,
      ),
    )
  const addInstallment = (index: number) => {
    setError('')
    try {
      const dueDate = firstAgreementDueDate(buyers[index].schedule.at(-1)?.dueDate || date)
      setBuyers((current) =>
        current.map((buyer, i) =>
          i === index
            ? {
                ...buyer,
                schedule: [...buyer.schedule, { id: crypto.randomUUID(), dueDate, amount: 1 }],
              }
            : buyer,
        ),
      )
    } catch {
      setError('Renseignez une date valide sur la dernière échéance avant d’en ajouter une autre.')
    }
  }
  const create = async () => {
    setBusy(true)
    setError('')
    try {
      await createGroupAgreements(payload(buyers), actor)
      await onCreated()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer les accords.')
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
      <ModalContent size="3xl" showCloseButton={!busy}>
        <ModalHeader
          icon={Handshake}
          title={step === 1 ? 'Accords entre membres' : 'Vérifier chaque échéancier'}
          description="Un accord indépendant par membre qui paie, sous la supervision de LE KARA."
        />
        <ModalBody ref={body} className="space-y-5">
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            {step === 1 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="agreement-kind">Type d’accord</Label>
                    <select
                      id="agreement-kind"
                      className={`${inputClass} w-full`}
                      value={kind}
                      onChange={(event) => setKind(event.target.value as AgreementKind)}
                    >
                      {Object.entries(AGREEMENT_KINDS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="agreement-creditor">
                      {kind === 'SALE'
                        ? 'Vendeur / bénéficiaire'
                        : kind === 'LOAN'
                          ? 'Membre prêteur / bénéficiaire'
                          : 'Prestataire / bénéficiaire'}
                    </Label>
                    <select
                      id="agreement-creditor"
                      className={`${inputClass} w-full`}
                      value={creditorId}
                      onChange={(event) => {
                        const id = event.target.value
                        setCreditorId(id)
                        setSelected((current) =>
                          Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)),
                        )
                      }}
                    >
                      <option value="">Choisir un membre du groupe</option>
                      {people.map((member) => (
                        <option key={member.id} value={member.id}>
                          {memberName(member)} · {member.matricule || member.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="agreement-title">Objet de l’accord</Label>
                    <Input
                      id="agreement-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={120}
                      placeholder="Ex. : Ventilateurs, équipement, avance…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="agreement-date">Date de l’accord</Label>
                    <Input
                      id="agreement-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agreement-description">
                    Description et conditions partagées avec les deux membres
                  </Label>
                  <Textarea
                    id="agreement-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    rows={2}
                    placeholder="Objet remis, conditions convenues, informations utiles…"
                  />
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-[#234D65]">
                    Conditions proposées par défaut
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="agreement-price">
                        {kind === 'SALE' ? 'Prix unitaire (FCFA)' : 'Montant (FCFA)'}
                      </Label>
                      <Input
                        id="agreement-price"
                        type="number"
                        min="1"
                        step="1"
                        value={unitAmount || ''}
                        onChange={(e) => setUnitAmount(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="agreement-count">Nombre d’échéances</Label>
                      <Input
                        id="agreement-count"
                        type="number"
                        min="1"
                        max="60"
                        step="1"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="agreement-first-due">Première échéance</Label>
                      <Input
                        id="agreement-first-due"
                        type="date"
                        value={firstDue}
                        onChange={(e) => setFirstDue(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="agreement-frequency">Rythme</Label>
                      <select
                        id="agreement-frequency"
                        className={`${inputClass} w-full`}
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as AgreementFrequency)}
                      >
                        <option value="MONTHLY">Mensuel</option>
                        <option value="WEEKLY">Hebdomadaire</option>
                        <option value="DAILY">Journalier</option>
                      </select>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Les conditions restent modifiables pour chaque membre. Une avance peut être
                    ajoutée comme première échéance à la date de l’accord ; aucun paiement n’est
                    enregistré à la création.
                  </p>
                </div>
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#234D65]">
                      Membres qui paient ({Object.keys(selected).length})
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!creditorId || people.length - 1 > 50}
                      onClick={() =>
                        setSelected(
                          Object.fromEntries(
                            people
                              .filter((m) => m.id !== creditorId)
                              .map((m) => [m.id, { quantity: 1 }]),
                          ),
                        )
                      }
                    >
                      Sélectionner tous
                    </Button>
                  </div>
                  <Input
                    aria-label="Rechercher un membre pour un accord"
                    placeholder="Nom ou matricule"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {!creditorId && (
                    <p className="text-sm text-gray-500">Choisissez d’abord le bénéficiaire.</p>
                  )}
                  {creditorId && (
                    <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-100">
                      {candidates.slice(0, 50).map((member) => (
                        <label
                          key={member.id}
                          className="flex cursor-pointer items-center gap-3 border-b border-gray-100 p-3 last:border-0"
                        >
                          <Checkbox
                            checked={!!selected[member.id]}
                            onCheckedChange={(checked) =>
                              setSelected((current) => {
                                const next = { ...current }
                                if (checked) next[member.id] = { quantity: 1 }
                                else delete next[member.id]
                                return next
                              })
                            }
                          />
                          <span className="min-w-0 text-sm">
                            <span className="font-medium">{memberName(member)}</span>
                            <span className="ml-2 text-xs text-gray-500">
                              {member.matricule || member.id}
                            </span>
                          </span>
                        </label>
                      ))}
                      {!candidates.length && (
                        <p className="p-3 text-sm text-gray-500">Aucun autre membre disponible.</p>
                      )}
                    </div>
                  )}
                  {candidates.length > 50 && (
                    <p className="text-xs text-gray-500">
                      50 premiers résultats affichés. Affinez la recherche ; une création contient
                      au maximum 50 membres.
                    </p>
                  )}
                </section>
                {Object.entries(selected).map(([id, plan]) => (
                  <div key={id} className="space-y-3 rounded-xl border border-gray-100 p-4">
                    <p className="text-sm font-semibold text-[#234D65]">
                      {byId.get(id) ? memberName(byId.get(id)!) : id}
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {kind === 'SALE' && (
                        <div className="space-y-1.5">
                          <Label htmlFor={`qty-${id}`}>Quantité</Label>
                          <Input
                            id={`qty-${id}`}
                            type="number"
                            min="1"
                            step="1"
                            value={plan.quantity}
                            onChange={(e) => terms(id, { quantity: Number(e.target.value) })}
                          />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label htmlFor={`price-${id}`}>
                          {kind === 'SALE' ? 'Prix unitaire' : 'Montant'}
                        </Label>
                        <Input
                          id={`price-${id}`}
                          type="number"
                          min="1"
                          step="1"
                          value={plan.unitAmount ?? (unitAmount || '')}
                          onChange={(e) => terms(id, { unitAmount: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`count-${id}`}>Échéances</Label>
                        <Input
                          id={`count-${id}`}
                          type="number"
                          min="1"
                          max="60"
                          value={plan.count ?? count}
                          onChange={(e) => terms(id, { count: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`due-${id}`}>Première date</Label>
                        <Input
                          id={`due-${id}`}
                          type="date"
                          value={plan.firstDueDate || firstDue}
                          onChange={(e) => terms(id, { firstDueDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p className="rounded-xl bg-[#234D65]/5 p-3 text-sm">
                  Bénéficiaire : <strong>{creditor ? memberName(creditor) : creditorId}</strong>.
                  Chaque membre aura son propre accord. Les versements pourront être faits
                  directement au bénéficiaire ou encaissés puis reversés par LE KARA.
                </p>
                {buyers.map((buyer, index) => (
                  <section
                    key={buyer.debtorId}
                    className="space-y-3 rounded-xl border border-gray-100 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-[#234D65]">
                        {byId.get(buyer.debtorId)
                          ? memberName(byId.get(buyer.debtorId)!)
                          : buyer.debtorId}
                      </h3>
                      <p className="text-sm font-semibold">
                        {buyer.quantity} × {money(buyer.unitAmount)} ={' '}
                        {money(buyer.quantity * buyer.unitAmount)}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {buyer.schedule.map((row, rowIndex) => (
                        <div className="flex items-start gap-2" key={row.id}>
                          <span className="mt-3 w-4 shrink-0 text-xs text-gray-500">
                            {rowIndex + 1}
                          </span>
                          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                            <Input
                              aria-label={`Date ${index + 1}-${rowIndex + 1}`}
                              type="date"
                              value={row.dueDate}
                              onChange={(e) =>
                                changeSchedule(index, rowIndex, { dueDate: e.target.value })
                              }
                            />
                            <Input
                              aria-label={`Montant ${index + 1}-${rowIndex + 1}`}
                              type="number"
                              min="1"
                              step="1"
                              value={row.amount || ''}
                              onChange={(e) =>
                                changeSchedule(index, rowIndex, { amount: Number(e.target.value) })
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Retirer échéance ${index + 1}-${rowIndex + 1}`}
                            disabled={buyer.schedule.length <= 1}
                            onClick={() =>
                              setBuyers((current) =>
                                current.map((b, i) =>
                                  i === index
                                    ? { ...b, schedule: b.schedule.filter((p) => p.id !== row.id) }
                                    : b,
                                ),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={buyer.schedule.length >= 60}
                        onClick={() => addInstallment(index)}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Ajouter une échéance
                      </Button>
                      <span
                        className={`text-sm ${buyer.schedule.reduce((sum, row) => sum + row.amount, 0) === buyer.quantity * buyer.unitAmount ? 'text-emerald-700' : 'text-red-700'}`}
                      >
                        Échéancier :{' '}
                        {money(buyer.schedule.reduce((sum, row) => sum + row.amount, 0))}
                      </span>
                    </div>
                  </section>
                ))}
              </>
            )}
          </fieldset>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={
              step === 1
                ? onClose
                : () => {
                    setError('')
                    setStep(1)
                  }
            }
          >
            {step === 1 ? 'Annuler' : 'Modifier les conditions'}
          </Button>
          <Button
            className="bg-[#234D65] hover:bg-[#2c5a73]"
            disabled={busy}
            onClick={step === 1 ? next : create}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 1 ? 'Vérifier les échéanciers' : 'Créer les accords'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
