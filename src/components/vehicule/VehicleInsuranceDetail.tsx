'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMyAccess } from '@/hooks/useMyAccess'
import { VehicleInsurance } from '@/types/types'
import {
  Building2,
  CalendarDays,
  Car,
  Download,
  FileCheck2,
  Gauge,
  History,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { VehicleInsuranceBadge } from './VehicleInsuranceBadge'
import { VehicleRewardsSection } from './VehicleRewards'

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: 'Voiture', motorcycle: 'Moto', truck: 'Camion', bus: 'Bus', maison: 'Habitation', other: 'Autre',
}

const ENERGY_LABELS: Record<string, string> = {
  essence: 'Essence', diesel: 'Diesel', electrique: 'Électrique', hybride: 'Hybride', gaz: 'Gaz', autre: 'Autre',
}

interface Props {
  insurance?: VehicleInsurance | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-slate-800">{children || '—'}</div>
    </div>
  )
}

function SectionCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#234D65]/10 text-[#234D65]">{icon}</span>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="text-[#234D65]">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-base font-bold text-slate-900 sm:text-lg">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
    </div>
  )
}

export function VehicleInsuranceDetail({ insurance, open, onOpenChange }: Props) {
  const { canDownloadDocuments, can } = useMyAccess()
  if (!insurance) return null

  const holderFirstName = (insurance.holderType === 'member' ? insurance.memberFirstName : insurance.nonMemberFirstName) || ''
  const holderLastName = (insurance.holderType === 'member' ? insurance.memberLastName : insurance.nonMemberLastName) || ''
  const holderName = `${holderFirstName} ${holderLastName}`.trim() || 'Titulaire non renseigné'
  const holderLabel = insurance.holderType === 'member' ? 'Membre LE KARA' : 'Non-membre'
  const holderReference = insurance.holderType === 'member' ? (insurance.memberMatricule || 'Matricule inconnu') : 'Externe'
  const phone = insurance.primaryPhone || insurance.memberContacts?.[0] || insurance.nonMemberPhone1 || ''
  const vehicleTypeLabel = VEHICLE_TYPE_LABELS[insurance.vehicleType] || insurance.vehicleType
  const energyLabel = insurance.energySource ? (ENERGY_LABELS[insurance.energySource] || insurance.energySource) : '—'
  const vehicleName = [insurance.vehicleBrand, insurance.vehicleModel].filter(Boolean).join(' ') || vehicleTypeLabel
  const currency = insurance.currency || 'FCFA'
  const formatDate = (date?: Date) => date ? date.toLocaleDateString('fr-FR') : '—'
  const formatAmount = (amount: number) => `${amount.toLocaleString('fr-FR')} ${currency}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100vw-1rem)] !max-w-6xl max-h-[95dvh] overflow-hidden border-0 bg-slate-50 p-0 shadow-2xl sm:!w-[95vw] [&>button]:right-4 [&>button]:top-4 [&>button]:text-white [&>button]:opacity-90">
        <DialogHeader className="relative space-y-0 bg-gradient-to-r from-[#1d4053] via-[#234D65] to-[#2f6b86] px-5 py-5 pr-14 text-left text-white sm:px-7 sm:py-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 sm:h-12 sm:w-12">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="truncate text-xl font-bold text-white sm:text-2xl">{vehicleName}</DialogTitle>
                <VehicleInsuranceBadge status={insurance.status} />
              </div>
              <DialogDescription className="mt-1 text-sm text-white/75">
                {holderName} · {vehicleTypeLabel}{insurance.plateNumber ? ` · ${insurance.plateNumber}` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(95dvh-104px)] overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric icon={<ReceiptText className="h-4 w-4" />} label="Prime" value={formatAmount(insurance.premiumAmount)} detail={insurance.warrantyMonths ? `${insurance.warrantyMonths} mois de garantie` : undefined} />
            <Metric icon={<CalendarDays className="h-4 w-4" />} label="Échéance" value={formatDate(insurance.endDate)} detail={`Début : ${formatDate(insurance.startDate)}`} />
            <Metric icon={<Building2 className="h-4 w-4" />} label="Assureur" value={insurance.insuranceCompany || '—'} detail={insurance.policyNumber ? `Police ${insurance.policyNumber}` : 'Police non renseignée'} />
            <Metric icon={<History className="h-4 w-4" />} label="Renouvellements" value={String(insurance.renewalCount || 0)} detail={insurance.lastRenewedAt ? `Dernier : ${formatDate(insurance.lastRenewedAt)}` : 'Aucun renouvellement'} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SectionCard icon={<UserRound className="h-4 w-4" />} title="Titulaire">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Nom complet">{holderName}</DetailItem>
                <DetailItem label="Type / référence">{holderLabel} · {holderReference}</DetailItem>
                <DetailItem label="Ville"><span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{insurance.city || '—'}</span></DetailItem>
                <DetailItem label="Contact"><span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{phone || '—'}</span></DetailItem>
              </div>
            </SectionCard>

            <SectionCard icon={<Car className="h-4 w-4" />} title="Bien assuré">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Type / modèle">{vehicleTypeLabel} · {vehicleName}</DetailItem>
                <DetailItem label={insurance.vehicleType === 'maison' ? 'Référence' : 'Immatriculation'}>{insurance.plateNumber || '—'}</DetailItem>
                <DetailItem label="Année">{insurance.vehicleYear || '—'}</DetailItem>
                <DetailItem label="Énergie">{energyLabel}</DetailItem>
                <DetailItem label="Puissance"><span className="inline-flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 text-slate-400" />{insurance.fiscalPower || '—'}</span></DetailItem>
                <DetailItem label="Parrain">{insurance.sponsorName || '—'}{insurance.sponsorMatricule ? ` · ${insurance.sponsorMatricule}` : ''}</DetailItem>
              </div>
            </SectionCard>
          </div>

          {insurance.declarationCorrections && insurance.declarationCorrections.length > 0 && (
            <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-950"><FileCheck2 className="h-4 w-4" />Corrections retenues après vérification</div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {insurance.declarationCorrections.map((correction) => (
                  <div key={correction.field} className="rounded-xl bg-white/80 px-3 py-2 text-sm text-blue-950">
                    <span className="font-semibold">{correction.label} :</span>{' '}
                    <span className="text-blue-500 line-through">{correction.declared}</span>{' → '}
                    <span className="font-bold">{correction.retained}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(insurance.notes || (canDownloadDocuments && insurance.attachments?.receiptUrl)) && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {insurance.notes && <SectionCard icon={<ReceiptText className="h-4 w-4" />} title="Notes"><p className="whitespace-pre-line text-sm leading-6 text-slate-700">{insurance.notes}</p></SectionCard>}
              {canDownloadDocuments && insurance.attachments?.receiptUrl && (
                <SectionCard icon={<FileCheck2 className="h-4 w-4" />} title="Pièces justificatives">
                  <div className="flex flex-wrap gap-2">
                    {insurance.attachments.receiptUrl && <Button asChild variant="outline" size="sm" className="rounded-xl"><a href={insurance.attachments.receiptUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4" />Reçu</a></Button>}
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <VehicleRewardsSection insurance={insurance} canManage={can('vehicules.edit')} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
