import { Card, CardContent } from '@/components/ui/card'
import { PageHero } from '@/components/ui/page-hero'
import { Banknote } from 'lucide-react'

export default function PaymentsHistoryIndexPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
      <PageHero
        icon={Banknote}
        title="Historique des paiements"
        subtitle="Centralisation des paiements par membre et par demande"
      />
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/30">
        <CardContent className="text-gray-600 p-6">
          Sélectionnez un dossier depuis la liste des membres ou des demandes pour voir l'historique des paiements.
        </CardContent>
      </Card>
    </div>
  )
}
