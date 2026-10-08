'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Banknote, CheckCircle2, ExternalLink, HandCoins, Loader2, Percent, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAYMENT_MODE_LABELS } from '@/constantes/membership-requests'
import {
  useInsurancePartnerMutations,
  useInsurancePartners,
  useInsuranceRewards,
  useVehicleRewardMutations,
  useVehicleRewards,
} from '@/hooks/vehicule/useVehicleRewards'
import { cn } from '@/lib/utils'
import {
  VEHICLE_REWARD_STATUS_LABELS,
  type PaymentMode,
  type VehicleInsurance,
  type VehicleInsurancePartner,
  type VehicleInsuranceReward,
  type VehicleRewardStatus,
} from '@/types/types'
import { computeVehicleReward, findInsurancePartner, memberShareOf } from '@/utils/vehicle-rewards'

const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`
const day = (date?: Date) => (date && !Number.isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy') : '—')
const todayInput = () => format(new Date(), 'yyyy-MM-dd')

const STATUS_CLASS: Record<VehicleRewardStatus, string> = {
  AWAITING_PARTNER: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  TO_PAY: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  PAID: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
}

// ==================== Estimation à la validation ====================

/** Montant que le membre pourra réclamer, d'après le taux de l'assureur. */
export function VehicleRewardEstimate({
  insuranceCompany,
  premiumAmount,
}: {
  insuranceCompany?: string
  premiumAmount?: number
}) {
  const { data: partners = [] } = useInsurancePartners()
  const partner = findInsurancePartner(partners, insuranceCompany)
  if (!partner) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Aucun taux enregistré pour l&apos;assureur « {insuranceCompany || '—'} » : le reversement au membre sera à
        compléter (bouton « Taux des assureurs »).
      </p>
    )
  }
  const { expectedCommission, memberAmount } = computeVehicleReward(premiumAmount ?? 0, partner)
  return (
    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
      Le membre pourra réclamer <b>{fcfa(memberAmount)}</b> ({partner.memberSharePercent} % de la commission de{' '}
      {fcfa(expectedCommission)} attendue de {partner.name}, soit {partner.commissionRate} % de la prime).
    </p>
  )
}

// ==================== Dialogues d'action ====================

function PartnerReceiptDialog({ reward, onClose }: { reward: VehicleInsuranceReward | null; onClose: () => void }) {
  const { partnerReceipt } = useVehicleRewardMutations()
  const [amount, setAmount] = useState('')
  const [share, setShare] = useState('')
  const [date, setDate] = useState(todayInput())
  const [reference, setReference] = useState('')

  useEffect(() => {
    if (!reward) return
    setAmount(reward.expectedCommission ? String(reward.expectedCommission) : '')
    setShare(reward.memberSharePercent ? String(reward.memberSharePercent) : '')
    setDate(todayInput())
    setReference('')
  }, [reward])

  if (!reward) return null
  const shareValue = Number(share.replace(',', '.')) || 0
  const memberAmount = memberShareOf(Number(amount) || 0, shareValue)

  const submit = async () => {
    if (!(Number(amount) > 0)) return toast.error('Indiquez le montant reçu de l’assureur')
    if (shareValue <= 0 || shareValue > 100) return toast.error('Indiquez la part du membre (entre 1 et 100 %)')
    try {
      await partnerReceipt.mutateAsync({
        reward,
        amount: Number(amount),
        memberSharePercent: shareValue,
        receivedAt: new Date(date),
        reference,
      })
      toast.success('Commission enregistrée', { description: `À verser au membre : ${fcfa(memberAmount)}` })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Commission reçue de l&apos;assureur</DialogTitle>
          <DialogDescription>
            {reward.insuranceCompany} · {reward.plateNumber || 'véhicule'} · période du {day(reward.startDate)} au{' '}
            {day(reward.endDate)}. Attendu : {fcfa(reward.expectedCommission)}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Montant reçu (FCFA)</Label>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Part du membre (%)</Label>
              <Input inputMode="decimal" value={share} onChange={(e) => setShare(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Date de réception</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Référence</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Facultatif" />
            </div>
          </div>
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
            À verser à {reward.beneficiaryName} : <b>{fcfa(memberAmount)}</b>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={partnerReceipt.isPending}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={partnerReceipt.isPending} className="bg-[#234D65] hover:bg-[#2c5a73]">
            {partnerReceipt.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MemberPaymentDialog({ reward, onClose }: { reward: VehicleInsuranceReward | null; onClose: () => void }) {
  const { memberPayment } = useVehicleRewardMutations()
  const [date, setDate] = useState(todayInput())
  const [mode, setMode] = useState<PaymentMode | ''>('')
  const [reference, setReference] = useState('')
  const [proofFile, setProofFile] = useState<File | undefined>()

  useEffect(() => {
    if (!reward) return
    setDate(todayInput())
    setMode('')
    setReference('')
    setProofFile(undefined)
  }, [reward])

  if (!reward) return null

  const submit = async () => {
    if (!mode) return toast.error('Choisissez le moyen de versement')
    try {
      await memberPayment.mutateAsync({ reward, paidAt: new Date(date), mode, reference, proofFile })
      toast.success('Reversement enregistré', { description: 'Le membre a été prévenu.' })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verser au membre</DialogTitle>
          <DialogDescription>
            {fcfa(reward.memberAmount)} à {reward.beneficiaryName}
            {reward.beneficiaryMatricule ? ` (${reward.beneficiaryMatricule})` : ''} pour l&apos;assurance du véhicule{' '}
            {reward.plateNumber || ''}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Date du versement</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Moyen</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as PaymentMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {(['airtel_money', 'mobicash', 'cash', 'bank_transfer'] as PaymentMode[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {PAYMENT_MODE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Référence</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Facultatif" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Preuve (image)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0])} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={memberPayment.isPending}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={memberPayment.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {memberPayment.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Marquer comme versé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== Lignes de reversement ====================

function RewardRows({
  rewards,
  canManage,
  showVehicle,
}: {
  rewards: VehicleInsuranceReward[]
  canManage: boolean
  showVehicle?: boolean
}) {
  const [receiptFor, setReceiptFor] = useState<VehicleInsuranceReward | null>(null)
  const [paymentFor, setPaymentFor] = useState<VehicleInsuranceReward | null>(null)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-[10px] uppercase tracking-wider text-gray-400">
            <tr>
              {showVehicle && <th className="py-2 pr-3">Véhicule</th>}
              <th className="py-2 pr-3">Période</th>
              <th className="py-2 pr-3">Membre</th>
              <th className="py-2 pr-3 text-right">Prime</th>
              <th className="py-2 pr-3 text-right">Commission</th>
              <th className="py-2 pr-3 text-right">Pour le membre</th>
              <th className="py-2 pr-3">Statut</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rewards.map((reward) => (
              <tr key={reward.id} className="border-t border-gray-100 align-top">
                {showVehicle && (
                  <td className="py-2 pr-3">
                    <p className="font-medium text-gray-900">{reward.plateNumber || '—'}</p>
                    <p className="text-xs text-gray-500">{reward.insuranceCompany}</p>
                  </td>
                )}
                <td className="py-2 pr-3 text-gray-700">
                  {day(reward.startDate)} → {day(reward.endDate)}
                  {reward.periodIndex > 0 && <p className="text-xs text-gray-400">Renouvellement {reward.periodIndex}</p>}
                </td>
                <td className="py-2 pr-3 text-gray-700">
                  {reward.beneficiaryName}
                  {reward.beneficiaryMatricule && <p className="text-xs text-gray-400">{reward.beneficiaryMatricule}</p>}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{fcfa(reward.premiumAmount)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {reward.partnerReceipt ? (
                    <>
                      {fcfa(reward.partnerReceipt.amount)}
                      <p className="text-xs text-gray-400">reçue le {day(reward.partnerReceipt.receivedAt)}</p>
                    </>
                  ) : (
                    <>
                      {fcfa(reward.expectedCommission)}
                      <p className="text-xs text-gray-400">attendue ({reward.commissionRate} %)</p>
                    </>
                  )}
                </td>
                <td className="py-2 pr-3 text-right font-semibold tabular-nums text-[#234D65]">
                  {fcfa(reward.memberAmount)}
                  <p className="text-xs font-normal text-gray-400">{reward.memberSharePercent} %</p>
                </td>
                <td className="py-2 pr-3">
                  <Badge className={STATUS_CLASS[reward.status]}>{VEHICLE_REWARD_STATUS_LABELS[reward.status]}</Badge>
                  {reward.memberPayment && (
                    <p className="mt-1 text-xs text-gray-500">
                      le {day(reward.memberPayment.paidAt)} · {PAYMENT_MODE_LABELS[reward.memberPayment.mode] ?? reward.memberPayment.mode}
                      {reward.memberPayment.proofUrl && (
                        <a
                          href={reward.memberPayment.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1 inline-flex items-center gap-0.5 text-[#234D65] underline"
                        >
                          preuve <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </p>
                  )}
                </td>
                <td className="py-2 text-right">
                  {canManage && reward.status === 'AWAITING_PARTNER' && (
                    <Button size="sm" variant="outline" onClick={() => setReceiptFor(reward)}>
                      <Banknote className="mr-1 h-4 w-4" /> Commission reçue
                    </Button>
                  )}
                  {canManage && reward.status === 'TO_PAY' && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setPaymentFor(reward)}>
                      <HandCoins className="mr-1 h-4 w-4" /> Verser
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {receiptFor && <PartnerReceiptDialog reward={receiptFor} onClose={() => setReceiptFor(null)} />}
      {paymentFor && <MemberPaymentDialog reward={paymentFor} onClose={() => setPaymentFor(null)} />}
    </>
  )
}

/** Reversements d'une assurance, dans sa fiche. */
export function VehicleRewardsSection({
  insurance,
  canManage,
}: {
  insurance: VehicleInsurance
  canManage: boolean
}) {
  const { data: rewards = [], isLoading } = useInsuranceRewards(insurance.id)
  const { openPeriod } = useVehicleRewardMutations()
  const validated = !insurance.declarationStatus || insurance.declarationStatus === 'validated'
  const currentMissing = validated && !rewards.some((r) => r.periodIndex === (insurance.renewalCount || 0))

  if (!validated) return null

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-[#234D65]">
          <HandCoins className="h-4 w-4" /> Reversement au membre
        </p>
        {canManage && currentMissing && !isLoading && (
          <Button
            size="sm"
            variant="outline"
            disabled={openPeriod.isPending}
            onClick={() =>
              openPeriod.mutate(insurance, {
                onSuccess: (reward) =>
                  reward
                    ? toast.success('Reversement ouvert pour la période en cours')
                    : toast.error('Aucun membre bénéficiaire : indiquez le titulaire membre ou le parrain'),
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Ouvrir la période en cours
          </Button>
        )}
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      ) : rewards.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun reversement pour cette assurance.</p>
      ) : (
        <RewardRows rewards={rewards} canManage={canManage} />
      )}
    </div>
  )
}

/** Onglet « Reversements » : tous les reversements, avec les totaux. */
export function VehicleRewardsPanel({ canManage }: { canManage: boolean }) {
  const { data: rewards = [], isLoading } = useVehicleRewards()
  const [status, setStatus] = useState<VehicleRewardStatus | 'all'>('all')

  const totals = useMemo(
    () =>
      rewards.reduce(
        (acc, r) => {
          if (r.status === 'AWAITING_PARTNER') acc.awaiting += r.expectedCommission
          if (r.status === 'TO_PAY') acc.toPay += r.memberAmount
          if (r.status === 'PAID') acc.paid += r.memberAmount
          if (r.partnerReceipt) acc.kept += r.partnerReceipt.amount - r.memberAmount
          return acc
        },
        { awaiting: 0, toPay: 0, paid: 0, kept: 0 },
      ),
    [rewards],
  )
  const visible = status === 'all' ? rewards : rewards.filter((r) => r.status === status)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Commissions à recevoir', value: totals.awaiting, className: 'text-amber-700' },
          { label: 'À verser aux membres', value: totals.toPay, className: 'text-blue-700' },
          { label: 'Versé aux membres', value: totals.paid, className: 'text-emerald-700' },
          { label: 'Gardé par LE KARA', value: totals.kept, className: 'text-[#234D65]' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{card.label}</p>
            <p className={cn('text-sm font-black tabular-nums', card.className)}>{fcfa(card.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'AWAITING_PARTNER', 'TO_PAY', 'PAID'] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={status === value ? 'default' : 'outline'}
            className={status === value ? 'bg-[#234D65] hover:bg-[#2c5a73]' : ''}
            onClick={() => setStatus(value)}
          >
            {value === 'all' ? 'Tous' : VEHICLE_REWARD_STATUS_LABELS[value]}
            <span className="ml-1 text-xs opacity-70">
              {value === 'all' ? rewards.length : rewards.filter((r) => r.status === value).length}
            </span>
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Aucun reversement.</p>
        ) : (
          <RewardRows rewards={visible} canManage={canManage} showVehicle />
        )}
      </div>
    </div>
  )
}

// ==================== Taux des assureurs ====================

export function InsurancePartnersDialog({
  open,
  onOpenChange,
  companies,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Noms d'assureurs déjà saisis sur les assurances, proposés à l'ajout. */
  companies: string[]
}) {
  const { data: partners = [], isLoading } = useInsurancePartners()
  const { save, remove } = useInsurancePartnerMutations()
  const [draft, setDraft] = useState<{ id?: string; name: string; commissionRate: string; memberSharePercent: string } | null>(
    null,
  )

  const missing = companies.filter((name) => name && !findInsurancePartner(partners, name))

  const startEdit = (partner?: VehicleInsurancePartner, name = '') =>
    setDraft({
      id: partner?.id,
      name: partner?.name ?? name,
      commissionRate: partner ? String(partner.commissionRate) : '',
      memberSharePercent: partner ? String(partner.memberSharePercent) : '',
    })

  const submit = async () => {
    if (!draft) return
    const commissionRate = Number(draft.commissionRate.replace(',', '.'))
    const memberSharePercent = Number(draft.memberSharePercent.replace(',', '.'))
    if (!draft.name.trim()) return toast.error("Indiquez le nom de l'assureur")
    if (!(commissionRate > 0 && commissionRate <= 100)) return toast.error('Commission entre 0 et 100 % de la prime')
    if (!(memberSharePercent > 0 && memberSharePercent <= 100)) return toast.error('Part du membre entre 0 et 100 %')
    try {
      await save.mutateAsync({ id: draft.id, name: draft.name, commissionRate, memberSharePercent })
      toast.success('Taux enregistré')
      setDraft(null)
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" /> Taux des assureurs partenaires
          </DialogTitle>
          <DialogDescription>
            Commission versée par l&apos;assureur à LE KARA (en % de la prime) et part reversée au membre qui a enregistré
            le véhicule (en % de cette commission). Un changement vaut pour les prochaines périodes.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <div className="space-y-3">
            {partners.length === 0 && !draft && <p className="text-sm text-gray-500">Aucun taux enregistré.</p>}
            {partners.map((partner) => (
              <div key={partner.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                <div>
                  <p className="font-medium text-gray-900">{partner.name}</p>
                  <p className="text-xs text-gray-500">
                    Commission {partner.commissionRate} % de la prime · membre {partner.memberSharePercent} % de la commission
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => startEdit(partner)}>
                    Modifier
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => confirm(`Supprimer le taux de ${partner.name} ?`) && remove.mutate(partner.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {draft ? (
              <div className="space-y-3 rounded-lg border border-[#234D65]/20 bg-[#234D65]/5 p-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-xs text-gray-500">Assureur</Label>
                    <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Commission (% de la prime)</Label>
                    <Input
                      inputMode="decimal"
                      value={draft.commissionRate}
                      onChange={(e) => setDraft({ ...draft, commissionRate: e.target.value })}
                      placeholder="Ex : 10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Part du membre (% de la commission)</Label>
                    <Input
                      inputMode="decimal"
                      value={draft.memberSharePercent}
                      onChange={(e) => setDraft({ ...draft, memberSharePercent: e.target.value })}
                      placeholder="Ex : 30"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
                    Annuler
                  </Button>
                  <Button size="sm" onClick={submit} disabled={save.isPending} className="bg-[#234D65] hover:bg-[#2c5a73]">
                    {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                    Enregistrer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button size="sm" variant="outline" onClick={() => startEdit()}>
                  <Plus className="mr-1 h-4 w-4" /> Ajouter un assureur
                </Button>
                {missing.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                    Assureurs sans taux :
                    {missing.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => startEdit(undefined, name)}
                        className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800 hover:bg-amber-100"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
