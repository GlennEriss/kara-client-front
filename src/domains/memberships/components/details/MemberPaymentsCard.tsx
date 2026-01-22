/**
 * Carte des paiements
 * Affiche un résumé des paiements (à implémenter plus tard si nécessaire)
 * Pour l'instant, cette carte peut être optionnelle ou afficher un message
 */

'use client'

import { CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MemberPaymentsCardProps {
  // TODO: Ajouter les props nécessaires quand les données de paiements seront disponibles
}

export function MemberPaymentsCard({}: MemberPaymentsCardProps) {
  return (
    <Card className="group bg-gradient-to-br from-teal-50/30 to-teal-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <CreditCard className="w-5 h-5 text-teal-600" /> Paiements
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4" data-testid="member-payments-card">
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Résumé des paiements à venir</p>
          <p className="text-xs text-gray-400 mt-2">Cette fonctionnalité sera disponible prochainement</p>
        </div>
      </CardContent>
    </Card>
  )
}
