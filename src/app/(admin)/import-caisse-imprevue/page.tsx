import { PageHero } from '@/components/ui/page-hero'
import { ExcelImportPage } from '@/domains/financial/caisse-imprevue/import/ExcelImportPage'
import { FileSpreadsheet } from 'lucide-react'

export default function ImportCaisseImprevueRoute() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon={FileSpreadsheet}
        title="Import Excel — Caisse Imprévue"
        subtitle="Importe les contrats (feuilles GESTION ENTRAIDE ACTIF / ADHESION VOLET ENTRAIDE), vérifie le résumé, puis lance l'import."
      />
      <ExcelImportPage scope="caisse-imprevue" />
    </div>
  )
}
