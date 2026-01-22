'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Plus,
  User
} from 'lucide-react'
import { useMemberSubscriptions, useMemberWithSubscription } from '@/hooks/useMembers'
import { Subscription } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface MemberSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  memberId: string
}

const MemberSubscriptionModal = ({ isOpen, onClose, memberId }: MemberSubscriptionModalProps) => {
  const { data: subscriptions, isLoading } = useMemberSubscriptions(memberId)
  const { data: member } = useMemberWithSubscription(memberId)

  const formatDate = (date: Date) => {
    try {
      return format(date, 'dd MMMM yyyy', { locale: fr })
    } catch {
      return 'Date invalide'
    }
  }

  const formatShortDate = (date: Date) => {
    try {
      return format(date, 'dd/MM/yyyy', { locale: fr })
    } catch {
      return 'Date invalide'
    }
  }

  const isSubscriptionValid = (subscription: Subscription) => {
    return subscription.dateEnd > new Date()
  }

  const getSubscriptionStatusBadge = (subscription: Subscription) => {
    const isValid = isSubscriptionValid(subscription)
    
    if (isValid) {
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
          <CheckCircle className="h-3 w-3 mr-1.5" />
          Actif
        </Badge>
      )
    }
    
    return (
      <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
        <XCircle className="h-3 w-3 mr-1.5" />
        Expiré
      </Badge>
    )
  }

  const getDaysRemaining = (endDate: Date) => {
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return `Expiré depuis ${Math.abs(diffDays)} jour(s)`
    } else if (diffDays === 0) {
      return 'Expire aujourd\'hui'
    } else if (diffDays <= 30) {
      return `Expire dans ${diffDays} jour(s)`
    } else {
      return `${diffDays} jours restants`
    }
  }

  const getDaysRemainingColor = (endDate: Date) => {
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'text-rose-600'
    if (diffDays <= 7) return 'text-orange-600'
    if (diffDays <= 30) return 'text-yellow-600'
    return 'text-emerald-600'
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader className="pb-6">
            <DialogTitle>Abonnements du membre</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Stats skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </Card>
              ))}
            </div>
            
            {/* Subscriptions skeleton */}
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader className="pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {member?.firstName} {member?.lastName}
              </DialogTitle>
              {member && (
                <p className="text-sm text-gray-500 mt-1">
                  Matricule: {member.matricule}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Statistiques */}
          {subscriptions && subscriptions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-6 text-center border-0 bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-3xl font-bold text-slate-700 mb-2">
                  {subscriptions.length}
                </div>
                <p className="text-sm text-slate-600 font-medium">Total abonnements</p>
              </Card>
              
              <Card className="p-6 text-center border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
                <div className="text-3xl font-bold text-emerald-700 mb-2">
                  {subscriptions.filter(isSubscriptionValid).length}
                </div>
                <p className="text-sm text-emerald-700 font-medium">Actifs</p>
              </Card>
              
              <Card className="p-6 text-center border-0 bg-gradient-to-br from-rose-50 to-rose-100">
                <div className="text-3xl font-bold text-rose-700 mb-2">
                  {subscriptions.filter(s => !isSubscriptionValid(s)).length}
                </div>
                <p className="text-sm text-rose-700 font-medium">Expirés</p>
              </Card>
            </div>
          )}

          {/* Liste des abonnements */}
          {subscriptions && subscriptions.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Historique des abonnements
                </h3>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel abonnement
                </Button>
              </div>
              
              <div className="space-y-4">
                {subscriptions.map((subscription, index) => {
                  const isActive = isSubscriptionValid(subscription)
                  return (
                    <Card 
                      key={subscription.id} 
                      className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg border-0 ${
                        isActive 
                          ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/50 ring-1 ring-emerald-200' 
                          : 'bg-white shadow-sm border border-gray-100'
                      }`}
                    >
                      {/* Indicateur visuel pour abonnement actif */}
                      {isActive && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
                      )}
                      
                      <CardContent className="p-6">
                        {/* En-tête */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">
                                Abonnement {subscription.type}
                              </h4>
                              {index === 0 && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  Le plus récent
                                </Badge>
                              )}
                            </div>
                          </div>
                          {getSubscriptionStatusBadge(subscription)}
                        </div>

                        {/* Informations principales */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Date de début
                              </p>
                              <p className="font-semibold text-gray-900 truncate">
                                {formatShortDate(subscription.dateStart)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Date de fin
                              </p>
                              <p className="font-semibold text-gray-900 truncate">
                                {formatShortDate(subscription.dateEnd)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Afficher le montant seulement s'il existe */}
                          {subscription.montant != null && (
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <CreditCard className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  Montant
                                </p>
                                <p className="font-semibold text-gray-900 truncate">
                                  {subscription.montant} {subscription.currency || 'XOF'}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Clock className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Statut
                              </p>
                              <p className={`font-semibold text-sm truncate ${getDaysRemainingColor(subscription.dateEnd)}`}>
                                {getDaysRemaining(subscription.dateEnd)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Période de validité */}
                        <div className="bg-gray-50 p-4 rounded-xl mb-6">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Période de validité:</span> Du{' '}
                            <span className="font-semibold">{formatDate(subscription.dateStart)}</span> au{' '}
                            <span className="font-semibold">{formatDate(subscription.dateEnd)}</span>
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            variant="outline"
                            className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Voir fiche d'adhésion
                          </Button>
                          
                          {isActive && (
                            <Button
                              variant="outline"
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger certificat
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            // État vide
            <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100 ">
              <CardContent className="text-center py-16 px-6">
                <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <Calendar className="h-10 w-10 text-gray-400" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Aucun abonnement trouvé
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Ce membre n'a pas encore d'abonnement enregistré. Créez-en un pour commencer.
                    </p>
                  </div>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un abonnement
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberSubscriptionModal