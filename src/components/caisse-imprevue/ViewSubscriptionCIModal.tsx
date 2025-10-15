'use client'
import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SubscriptionCI } from '@/types/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdmin } from '@/hooks/caisse-imprevue/useAdmin'
import { User, UserCheck } from 'lucide-react'

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
  // Récupération des informations des admins
  const { data: createdByAdmin, isLoading: isLoadingCreatedBy } = useAdmin(subscription?.createdBy)
  const { data: updatedByAdmin, isLoading: isLoadingUpdatedBy } = useAdmin(subscription?.updatedBy)

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

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatAdminName = (admin: typeof createdByAdmin) => {
    if (!admin) return 'Inconnu'
    return `${admin.firstName} ${admin.lastName}`.trim() || 'Administrateur'
  }

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
  }

  const statusLabels = {
    ACTIVE: 'Actif',
    INACTIVE: 'Inactif',
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
              {subscription.label && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Libellé</p>
                    <p className="font-semibold text-lg">{subscription.label}</p>
                  </div>
                  <Separator />
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Code forfait</p>
                  <p className="font-semibold text-lg">{subscription.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durée</p>
                  <p className="font-semibold">{subscription.durationInMonths} mois</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Montant mensuel</p>
                  <p className="font-semibold">{formatAmount(subscription.amountPerMonth)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nominal</p>
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
                  <p className="text-sm text-muted-foreground">Taux de pénalité</p>
                  <p className="font-semibold">{subscription.penaltyRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Délai avant pénalités</p>
                  <p className="font-semibold">{subscription.penaltyDelayDays} jours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Créé par */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Créé par</p>
                  {isLoadingCreatedBy ? (
                    <Skeleton className="h-5 w-48" />
                  ) : (
                    <p className="font-semibold text-lg text-[#224D62]">
                      {formatAdminName(createdByAdmin)}
                    </p>
                  )}
                  {createdByAdmin?.email && (
                    <p className="text-sm text-muted-foreground mt-1">{createdByAdmin.email}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDateTime(subscription.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modifié par */}
          {subscription.updatedBy && subscription.updatedBy !== subscription.createdBy && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Dernière modification par</p>
                    {isLoadingUpdatedBy ? (
                      <Skeleton className="h-5 w-48" />
                    ) : (
                      <p className="font-semibold text-lg text-[#224D62]">
                        {formatAdminName(updatedByAdmin)}
                      </p>
                    )}
                    {updatedByAdmin?.email && (
                      <p className="text-sm text-muted-foreground mt-1">{updatedByAdmin.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDateTime(subscription.updatedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


