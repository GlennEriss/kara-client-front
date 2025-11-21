'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { VehicleInsurance } from '@/types/types'
import { VehicleInsuranceBadge } from './VehicleInsuranceBadge'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Props {
  insurance?: VehicleInsurance | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VehicleInsuranceDetail({ insurance, open, onOpenChange }: Props) {
  if (!insurance) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {insurance.memberFirstName} {insurance.memberLastName}
            </span>
            <VehicleInsuranceBadge status={insurance.status} />
          </DialogTitle>
          <DialogDescription>Informations détaillées sur l’assurance du véhicule.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Véhicule</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Type / Modèle</p>
                <p className="font-medium text-gray-900">
                  {insurance.vehicleType} • {insurance.vehicleBrand} {insurance.vehicleModel}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Plaque</p>
                <p className="font-medium text-gray-900">{insurance.plateNumber}</p>
              </div>
              <div>
                <p className="text-gray-500">Année</p>
                <p className="font-medium text-gray-900">{insurance.vehicleYear || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Parrain</p>
                <p className="font-medium text-gray-900">{insurance.sponsorName || 'Non renseigné'}</p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Assurance</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Compagnie</p>
                <p className="font-medium text-gray-900">{insurance.insuranceCompany}</p>
                {insurance.insuranceAgent && <p className="text-xs text-gray-500">Agent : {insurance.insuranceAgent}</p>}
              </div>
              <div>
                <p className="text-gray-500">Police</p>
                <p className="font-medium text-gray-900">{insurance.policyNumber}</p>
              </div>
              <div>
                <p className="text-gray-500">Couverture</p>
                <p className="font-medium text-gray-900">{insurance.coverageType || 'Non spécifiée'}</p>
              </div>
              <div>
                <p className="text-gray-500">Montant</p>
                <p className="font-medium text-gray-900">
                  {insurance.premiumAmount.toLocaleString('fr-FR')} {insurance.currency}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Validité</p>
                <p className="font-medium text-gray-900">
                  {insurance.startDate.toLocaleDateString('fr-FR')} → {insurance.endDate.toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Renouvellements</p>
                <p className="font-medium text-gray-900">{insurance.renewalCount || 0}</p>
                {insurance.lastRenewedAt && <p className="text-xs text-gray-500">Dernier : {insurance.lastRenewedAt.toLocaleDateString('fr-FR')}</p>}
              </div>
            </div>
          </section>

          {insurance.notes && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{insurance.notes}</p>
              </section>
            </>
          )}

          {insurance.attachments && (insurance.attachments.policyUrl || insurance.attachments.receiptUrl) && (
            <>
              <Separator />
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase">Pièces jointes</h3>
                <div className="flex flex-wrap gap-3">
                  {insurance.attachments.policyUrl && (
                    <Button asChild variant="outline" size="sm">
                      <a href={insurance.attachments.policyUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Police d’assurance
                      </a>
                    </Button>
                  )}
                  {insurance.attachments.receiptUrl && (
                    <Button asChild variant="outline" size="sm">
                      <a href={insurance.attachments.receiptUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Reçu
                      </a>
                    </Button>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

