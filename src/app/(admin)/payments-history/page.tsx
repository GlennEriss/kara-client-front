import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentsHistoryIndexPage() {
  return (
    <div className="container mx-auto p-4 lg:p-8 space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/30">
        <CardHeader>
          <CardTitle className="text-xl lg:text-2xl font-bold text-gray-900">Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-600">
          Sélectionnez un dossier depuis la liste des membres ou des demandes pour voir l'historique des paiements.
        </CardContent>
      </Card>
    </div>
  )
}

