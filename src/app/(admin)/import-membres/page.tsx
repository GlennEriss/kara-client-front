import { PageHero } from '@/components/ui/page-hero'
import { ExcelImportPage } from '@/domains/financial/caisse-imprevue/import/ExcelImportPage'
import { Users } from 'lucide-react'

export default function ImportMembresRoute() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon={Users}
        title="Import Excel — Membres"
        subtitle="Importe la feuille ADHESION MEMBRES : crée les comptes membres manquants (type de compte inclus), enrichis depuis la feuille MEMBRES."
      />
      <ExcelImportPage scope="members" />
    </div>
  )
}
