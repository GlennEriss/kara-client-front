'use client'
import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SubscriptionCI, CAISSE_IMPREVUE_PLANS } from '@/types/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface ViewSubscriptionCIModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: SubscriptionCI | null
}

export default function ViewSubscriptionCIModal({ 
  open, 
  onOpenChange, 
  subscription 
}: ViewSubscriptionCIModalProps) {
  if (!subscription) return null

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
    SUSPENDED: 'bg-orange-100 text-orange-800',
  }

  const statusLabels = {
    ACTIVE: 'Actif',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé',
    SUSPENDED: 'Suspendu',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-[#224D62]">
              Détails du forfait {subscription.code}
            </DialogTitle>
            {subscription.status && (
              <Badge className={statusColors[subscription.status]}>
                {statusLabels[subscription.status]}
              </Badge>
            )}
          </div>
          <DialogDescription>
            Informations complètes de la souscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations du forfait */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Code forfait</p>
                  <p className="font-semibold text-lg">{subscription.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fréquence de paiement</p>
                  <Badge variant="outline">
                    {subscription.paymentFrequency === 'DAILY' ? 'Journalier' : 'Mensuel'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Montant mensuel</p>
                  <p className="font-semibold">{formatAmount(subscription.amountPerMonth)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nominal (12 mois)</p>
                  <p className="font-semibold">{formatAmount(subscription.nominal)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Appui minimum</p>
                  <p className="font-semibold">{formatAmount(subscription.supportMin)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Appui maximum</p>
                  <p className="font-semibold text-green-600">{formatAmount(subscription.supportMax)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Durée</p>
                  <p className="font-semibold">{subscription.durationInMonths} mois</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pénalités</p>
                  <p className="font-semibold">{subscription.penaltyRate}% après {subscription.penaltyDelayDays} jours</p>
                </div>
              </div>

              {subscription.totalPaid !== undefined && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total versé</p>
                      <p className="font-semibold text-blue-600">{formatAmount(subscription.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mois payés</p>
                      <p className="font-semibold">{subscription.monthsPaid || 0} / {subscription.durationInMonths}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contact d'urgence */}
          {subscription.emergencyContact && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Contact d'urgence</h3>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nom</p>
                    <p className="font-medium">{subscription.emergencyContact.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Relation</p>
                    <p className="font-medium">{subscription.emergencyContact.relationship}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{subscription.emergencyContact.phone}</p>
                  </div>
                  {subscription.emergencyContact.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{subscription.emergencyContact.email}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Métadonnées */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date de création</p>
                  <p className="font-medium">{formatDate(subscription.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dernière mise à jour</p>
                  <p className="font-medium">{formatDate(subscription.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

