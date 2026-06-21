import { PageHero } from '@/components/ui/page-hero'
import { PurgeDatabasePage } from '@/components/admin/PurgeDatabasePage'
import { ShieldAlert } from 'lucide-react'

export default function ReinitialisationRoute() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHero
        icon={ShieldAlert}
        title="Réinitialisation de la base"
        subtitle="Zone réservée au superAdmin — supprime toutes les données sauf le compte superAdmin."
      />
      <PurgeDatabasePage />
    </div>
  )
}
