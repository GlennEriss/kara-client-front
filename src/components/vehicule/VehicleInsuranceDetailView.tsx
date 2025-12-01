'use client'

import { useVehicleInsurance } from '@/hooks/vehicule/useVehicleInsurances'
import { VehicleInsuranceBadge } from './VehicleInsuranceBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import routes from '@/constantes/routes'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: 'Voiture',
  motorcycle: 'Moto',
  truck: 'Camion',
  bus: 'Bus',
  maison: 'Maison',
  other: 'Autre',
}

const ENERGY_LABELS: Record<string, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  electrique: 'Électrique',
  hybride: 'Hybride',
  gaz: 'Gaz',
  autre: 'Autre',
}

interface Props {
  insuranceId: string
}

export function VehicleInsuranceDetailView({ insuranceId }: Props) {
  const { data, isLoading } = useVehicleInsurance(insuranceId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">Assurance introuvable.</CardContent>
      </Card>
    )
  }

  const holderFirstName = (data.holderType === 'member' ? data.memberFirstName : data.nonMemberFirstName) || ''
  const holderLastName = (data.holderType === 'member' ? data.memberLastName : data.nonMemberLastName) || ''
  const holderLabel = data.holderType === 'member' ? 'Membre KARA' : 'Non-membre'
  const holderReference = data.holderType === 'member' ? (data.memberMatricule || 'Matricule inconnu') : 'Externe'
  const phone = data.primaryPhone || data.memberContacts?.[0] || data.nonMemberPhone1 || ''
  const vehicleTypeLabel = VEHICLE_TYPE_LABELS[data.vehicleType] || data.vehicleType
  const energyLabel = data.energySource ? (ENERGY_LABELS[data.energySource] || data.energySource) : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-gray-500 tracking-wide">Fiche assurance</p>
          <h1 className="text-3xl font-black text-gray-900">
            {holderFirstName} {holderLastName}
          </h1>
          <p className="text-sm text-gray-500">Plaque {data.plateNumber}</p>
        </div>
        <div className="flex gap-2">
          <VehicleInsuranceBadge status={data.status} />
          <Button variant="outline" asChild>
            <Link href={routes.admin.vehicules}>Retour à la liste</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Titulaire</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <DetailRow label="Type">{holderLabel}</DetailRow>
          <DetailRow label="Référence">{holderReference}</DetailRow>
          <DetailRow label="Ville">{data.city || 'Non renseignée'}</DetailRow>
          <DetailRow label="Contact">{phone || 'Non renseigné'}</DetailRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Véhicule</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <DetailRow label="Type">{vehicleTypeLabel}</DetailRow>
          <DetailRow label="Marque">{data.vehicleBrand}</DetailRow>
          <DetailRow label="Modèle">{data.vehicleModel}</DetailRow>
          <DetailRow label="Plaque">{data.plateNumber}</DetailRow>
          <DetailRow label="Année">{data.vehicleYear || '—'}</DetailRow>
          <DetailRow label="Source d'énergie">{energyLabel || '—'}</DetailRow>
          <DetailRow label="Puissance fiscale">{data.fiscalPower || '—'}</DetailRow>
          <DetailRow label="Parrain">
            {data.sponsorMemberId ? (
              <div className="space-y-1">
                <p>{data.sponsorName || '—'}</p>
                {data.sponsorMatricule && (
                  <p className="text-xs text-gray-500 font-normal">Matricule : {data.sponsorMatricule}</p>
                )}
                {data.sponsorContacts && data.sponsorContacts.length > 0 && (
                  <p className="text-xs text-gray-500 font-normal">{data.sponsorContacts[0]}</p>
                )}
              </div>
            ) : (
              <span>Non renseigné</span>
            )}
          </DetailRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assurance</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <DetailRow label="Compagnie">{data.insuranceCompany}</DetailRow>
          <DetailRow label="Numéro de police">{data.policyNumber}</DetailRow>
          <DetailRow label="Montant annuel">
            {data.premiumAmount.toLocaleString('fr-FR')} {data.currency}
          </DetailRow>
          <DetailRow label="Durée de garantie">
            {data.warrantyMonths ? `${data.warrantyMonths} mois` : 'Non renseignée'}
          </DetailRow>
          <DetailRow label="Période">
            {data.startDate.toLocaleDateString('fr-FR')} → {data.endDate.toLocaleDateString('fr-FR')}
          </DetailRow>
          <DetailRow label="Renouvellements">{data.renewalCount || 0}</DetailRow>
        </CardContent>
      </Card>

      {data.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-line">{data.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <div className="font-semibold text-gray-900">{children}</div>
    </div>
  )
}

