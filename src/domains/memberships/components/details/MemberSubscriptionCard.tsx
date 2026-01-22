/**
 * Carte d'abonnements
 * Affiche le statut de l'abonnement actuel et un bouton pour voir l'historique
 */

'use client'

import { Calendar, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Subscription } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { UseMembershipDetailsResult } from '../../hooks/useMembershipDetails'

interface MemberSubscriptionCardProps {
  lastSubscription: Subscription | null
  isSubscriptionValid: boolean
  onOpenSubscriptionHistory: () => void
}

export function MemberSubscriptionCard({
  lastSubscription,
  isSubscriptionValid,
  onOpenSubscriptionHistory,
}: MemberSubscriptionCardProps) {
  const formatDate = (date: Date) => {
    try {
      return format(date, 'dd MMMM yyyy', { locale: fr })
    } catch {
      return 'Date invalide'
    }
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

  return (
    <Card className="group bg-gradient-to-br from-purple-50/30 to-purple-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Calendar className="w-5 h-5 text-purple-600" /> Abonnement
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4" data-testid="member-subscription-card">
        {lastSubscription ? (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Statut</div>
                <div className="flex items-center gap-2">
                  {isSubscriptionValid ? (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      <CheckCircle className="h-3 w-3 mr-1.5" />
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                      <XCircle className="h-3 w-3 mr-1.5" />
                      Expiré
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Date de début</div>
                <div className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  {formatDate(lastSubscription.dateStart)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Date de fin</div>
                <div className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  {formatDate(lastSubscription.dateEnd)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Temps restant</div>
                <div className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  {getDaysRemaining(lastSubscription.dateEnd)}
                </div>
              </div>
            </div>
            <Button
              onClick={onOpenSubscriptionHistory}
              variant="outline"
              className="w-full border-[#234D65]/20 text-[#234D65] hover:bg-[#234D65]/5"
              data-testid="member-subscription-history-button"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Voir l'historique
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Aucun abonnement enregistré</p>
            <Button
              onClick={onOpenSubscriptionHistory}
              variant="outline"
              className="mt-3 border-[#234D65]/20 text-[#234D65] hover:bg-[#234D65]/5"
              data-testid="member-subscription-history-button"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Voir l'historique
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
