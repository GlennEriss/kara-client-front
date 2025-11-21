'use client'

import { useVehicleInsurance } from '@/hooks/vehicule/useVehicleInsurances'
import { VehicleInsuranceBadge } from './VehicleInsuranceBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import routes from '@/constantes/routes'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-gray-500 tracking-wide">Fiche assurance</p>
          <h1 className="text-3xl font-black text-gray-900">
            {data.memberFirstName} {data.memberLastName}
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
          <CardTitle>Véhicule</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <DetailRow label="Type">{data.vehicleType}</DetailRow>
          <DetailRow label="Marque">{data.vehicleBrand}</DetailRow>
          <DetailRow label="Modèle">{data.vehicleModel}</DetailRow>
          <DetailRow label="Plaque">{data.plateNumber}</DetailRow>
          <DetailRow label="Année">{data.vehicleYear || '—'}</DetailRow>
          <DetailRow label="Parrain">{data.sponsorName || 'Non renseigné'}</DetailRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assurance</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <DetailRow label="Compagnie">{data.insuranceCompany}</DetailRow>
          <DetailRow label="Numéro de police">{data.policyNumber}</DetailRow>
          <DetailRow label="Couverture">{data.coverageType || '—'}</DetailRow>
          <DetailRow label="Montant annuel">
            {data.premiumAmount.toLocaleString('fr-FR')} {data.currency}
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
      <p className="font-semibold text-gray-900">{children}</p>
    </div>
  )
}

