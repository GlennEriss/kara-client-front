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
  Download
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
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Actif
        </Badge>
      )
    }
    
    return (
      <Badge className="bg-red-100 text-red-700">
        <XCircle className="h-3 w-3 mr-1" />
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

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Abonnements du membre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#224D62]">
            Abonnements de {member?.firstName} {member?.lastName}
          </DialogTitle>
          {member && (
            <p className="text-sm text-gray-600">
              Matricule: {member.matricule}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Résumé */}
          {subscriptions && subscriptions.length > 0 && (
            <Card className="bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-[#224D62]">
                      {subscriptions.length}
                    </div>
                    <p className="text-sm text-gray-600">Total abonnements</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {subscriptions.filter(isSubscriptionValid).length}
                    </div>
                    <p className="text-sm text-gray-600">Actifs</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {subscriptions.filter(s => !isSubscriptionValid(s)).length}
                    </div>
                    <p className="text-sm text-gray-600">Expirés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des abonnements */}
          {subscriptions && subscriptions.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Historique des abonnements
              </h3>
              
              {subscriptions.map((subscription, index) => (
                <Card 
                  key={subscription.id} 
                  className={`transition-all duration-200 hover:shadow-md ${
                    index === 0 && isSubscriptionValid(subscription) 
                      ? 'border-green-200 bg-green-50/50' 
                      : 'border-gray-200'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        Abonnement {subscription.type}
                        {index === 0 && (
                          <Badge variant="secondary" className="ml-2">
                            Le plus récent
                          </Badge>
                        )}
                      </CardTitle>
                      {getSubscriptionStatusBadge(subscription)}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Informations principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-[#224D62]" />
                        <div>
                          <p className="text-xs text-gray-500">Date de début</p>
                          <p className="font-medium">{formatShortDate(subscription.dateStart)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-[#CBB171]" />
                        <div>
                          <p className="text-xs text-gray-500">Date de fin</p>
                          <p className="font-medium">{formatShortDate(subscription.dateEnd)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500">Montant</p>
                          <p className="font-medium">
                            {subscription.montant} {subscription.currency}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Statut</p>
                          <p className="font-medium text-sm">
                            {getDaysRemaining(subscription.dateEnd)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Période de validité */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Période de validité:</span> Du{' '}
                        {formatDate(subscription.dateStart)} au{' '}
                        {formatDate(subscription.dateEnd)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#224D62] border-[#224D62] hover:bg-[#224D62] hover:text-white"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Voir fiche d'adhésion
                      </Button>
                      
                      {isSubscriptionValid(subscription) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[#CBB171] border-[#CBB171] hover:bg-[#CBB171] hover:text-white"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Télécharger certificat
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center p-8">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Aucun abonnement trouvé
                  </h3>
                  <p className="text-gray-500 mt-1">
                    Ce membre n'a pas encore d'abonnement enregistré.
                  </p>
                </div>
                <Button className="bg-[#224D62] hover:bg-[#224D62]/90">
                  Créer un abonnement
                </Button>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberSubscriptionModal