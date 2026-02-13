'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Bell,
  Calendar,
  User,
  Shield,
  Receipt,
  FileSignature,
  TrendingUp,
  TrendingDown,
  Loader2,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CreditDemand, CreditContract, CreditPayment, CreditPenalty, Notification } from '@/types/types'
import { useCreditHistory } from '@/hooks/useCreditSpeciale'

interface CreditHistoryTimelineProps {
  contractId: string
}

interface HistoryItem {
  id: string
  type: 'demand' | 'contract' | 'payment' | 'penalty' | 'notification'
  date: Date
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
  badge?: string
  badgeColor?: string
  metadata?: any
}

export default function CreditHistoryTimeline({ contractId }: CreditHistoryTimelineProps) {
  const { data: history, isLoading, isError } = useCreditHistory(contractId)

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique complet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError || !history) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement de l'historique.
        </AlertDescription>
      </Alert>
    )
  }

  // Fonction helper pour convertir une date en Date
  const toDate = (date: Date | string | any): Date | null => {
    if (!date) return null
    
    let dateObj: Date
    
    if (date instanceof Date) {
      dateObj = date
    } else if (typeof date === 'string') {
      dateObj = new Date(date)
    } else if (date?.toDate) {
      dateObj = date.toDate()
    } else {
      dateObj = new Date(date)
    }
    
    // Vérifier si la date est valide
    if (isNaN(dateObj.getTime())) {
      return null
    }
    
    return dateObj
  }

  // Construire la timeline avec tous les événements
  const timelineItems: HistoryItem[] = []
  
  // Fonction helper pour formater une date de manière sécurisée
  const formatDateSafe = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return 'Date invalide'
    try {
      return format(date, 'dd MMMM yyyy à HH:mm', { locale: fr })
    } catch (error) {
      return 'Date invalide'
    }
  }

  // Ajouter la création de la demande
  if (history.demand) {
    const demandCreatedDate = toDate(history.demand.createdAt)
    if (demandCreatedDate) {
      timelineItems.push({
        id: `demand-${history.demand.id}`,
        type: 'demand',
        date: demandCreatedDate,
        title: 'Demande créée',
        description: `Demande de crédit ${history.demand.creditType} de ${history.demand.amount.toLocaleString('fr-FR')} FCFA`,
        icon: FileText,
        color: '#3b82f6',
        badge: history.demand.status,
        badgeColor: history.demand.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    history.demand.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700',
      })
    }

    // Ajouter les changements de statut de la demande
    if (history.demand.status === 'APPROVED' && history.demand.updatedAt) {
      const approvedDate = toDate(history.demand.updatedAt)
      if (approvedDate) {
        timelineItems.push({
          id: `demand-approved-${history.demand.id}`,
          type: 'demand',
          date: approvedDate,
          title: 'Demande approuvée',
          description: history.demand.adminComments || 'Demande approuvée par un administrateur',
          icon: CheckCircle,
          color: '#10b981',
          badge: 'APPROVED',
          badgeColor: 'bg-green-100 text-green-700',
        })
      }
    } else if (history.demand.status === 'REJECTED' && history.demand.updatedAt) {
      const rejectedDate = toDate(history.demand.updatedAt)
      if (rejectedDate) {
        timelineItems.push({
          id: `demand-rejected-${history.demand.id}`,
          type: 'demand',
          date: rejectedDate,
          title: 'Demande rejetée',
          description: history.demand.adminComments || 'Demande rejetée par un administrateur',
          icon: XCircle,
          color: '#ef4444',
          badge: 'REJECTED',
          badgeColor: 'bg-red-100 text-red-700',
        })
      }
    }
  }

  // Ajouter la création du contrat
  if (history.contract) {
    const contractCreatedDate = toDate(history.contract.createdAt)
    if (contractCreatedDate) {
      timelineItems.push({
        id: `contract-${history.contract.id}`,
        type: 'contract',
        date: contractCreatedDate,
        title: 'Contrat créé',
        description: `Contrat de crédit ${history.contract.creditType} créé avec une durée de ${history.contract.duration} mois`,
        icon: FileSignature,
        color: '#8b5cf6',
        badge: history.contract.status,
        badgeColor: history.contract.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    history.contract.status === 'DISCHARGED' ? 'bg-blue-100 text-blue-700' :
                    history.contract.status === 'TRANSFORMED' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700',
      })
    }

    // Ajouter l'activation du contrat
    if (history.contract.activatedAt) {
      const activatedDate = toDate(history.contract.activatedAt)
      if (activatedDate) {
        timelineItems.push({
          id: `contract-activated-${history.contract.id}`,
          type: 'contract',
          date: activatedDate,
          title: 'Contrat activé',
          description: 'Le contrat a été signé et activé. Les fonds ont été remis au client.',
          icon: CheckCircle,
          color: '#10b981',
          badge: 'ACTIVE',
          badgeColor: 'bg-green-100 text-green-700',
        })
      }
    }

    // Ajouter la transformation de contrat
    if (history.contract.transformedAt) {
      const transformedDate = toDate(history.contract.transformedAt)
      if (transformedDate) {
        const isAideContract = history.contract.creditType === 'AIDE'
        timelineItems.push({
          id: `contract-transformed-${history.contract.id}`,
          type: 'contract',
          date: transformedDate,
          title: isAideContract
            ? 'Contrat aide transformé en crédit spéciale'
            : 'Contrat transformé en crédit fixe',
          description: isAideContract
            ? (history.contract.blockedReason || 'Le crédit aide a atteint son terme (3 mois) avec un solde restant à transformer en crédit spéciale.')
            : 'Le crédit spéciale a été transformé en crédit fixe après 7 mois. Les intérêts ont été supprimés.',
          icon: TrendingDown,
          color: '#8b5cf6',
          badge: 'TRANSFORMED',
          badgeColor: 'bg-purple-100 text-purple-700',
        })
      }
    }
  }

  // Ajouter les paiements
  history.payments.forEach((payment) => {
    const paymentDate = toDate(payment.paymentDate)
    if (paymentDate) {
      timelineItems.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        date: paymentDate,
        title: `Paiement de ${payment.amount.toLocaleString('fr-FR')} FCFA`,
        description: `Paiement effectué par ${payment.mode}${payment.reference ? ` - Réf: ${payment.reference}` : ''}`,
        icon: DollarSign,
        color: '#10b981',
        badge: 'PAYÉ',
        badgeColor: 'bg-green-100 text-green-700',
        metadata: payment,
      })
    }
  })

  // Ajouter les pénalités
  history.penalties.forEach((penalty) => {
    const penaltyDate = toDate(penalty.createdAt)
    if (penaltyDate) {
      timelineItems.push({
        id: `penalty-${penalty.id}`,
        type: 'penalty',
        date: penaltyDate,
        title: `Pénalité de ${penalty.amount.toLocaleString('fr-FR')} FCFA`,
        description: `Pénalité pour ${penalty.daysLate} jour(s) de retard${penalty.paid ? ' - Payée' : ' - En attente'}`,
        icon: AlertCircle,
        color: penalty.paid ? '#10b981' : '#f59e0b',
        badge: penalty.paid ? 'PAYÉE' : 'EN ATTENTE',
        badgeColor: penalty.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700',
        metadata: penalty,
      })
    }
  })

  // Ajouter les notifications
  history.notifications.forEach((notification: Notification) => {
    const notificationDate = toDate(notification.createdAt)
    if (!notificationDate) return
    
    let icon = Bell
    let color = '#6b7280'
    
    if (notification.type === 'contract_created') {
      icon = CheckCircle
      color = '#10b981'
    } else if (notification.type === 'contract_finished') {
      icon = CheckCircle
      color = '#3b82f6'
    } else if (notification.type === 'reminder') {
      icon = Clock
      color = '#f59e0b'
    }

    timelineItems.push({
      id: `notification-${notification.id}`,
      type: 'notification',
      date: notificationDate,
      title: notification.title,
      description: notification.message,
      icon,
      color,
      badge: notification.isRead ? 'LU' : 'NON LU',
      badgeColor: notification.isRead ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700',
      metadata: notification,
    })
  })

  // Trier par date (plus récent en premier)
  timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique complet
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timelineItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun historique disponible.</p>
        ) : (
          <div className="relative">
            {/* Ligne verticale */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Items de la timeline */}
            <div className="space-y-6">
              {timelineItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <div key={item.id} className="relative flex items-start gap-4">
                    {/* Point sur la ligne */}
                    <div
                      className={cn(
                        'relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 border-white shadow-md',
                        'bg-white'
                      )}
                      style={{ backgroundColor: `${item.color}15`, borderColor: item.color }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                            {item.badge && (
                              <Badge className={cn('text-xs', item.badgeColor)}>
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {formatDateSafe(item.date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
