import { PageHero } from '@/components/ui/page-hero'
import { ExcelImportPage } from '@/domains/financial/caisse-imprevue/import/ExcelImportPage'
import { FileSpreadsheet } from 'lucide-react'

export default function ImportCaisseImprevueRoute() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon={FileSpreadsheet}
        title="Import Excel — Caisse Imprévue"
        subtitle="Importe une feuille du classeur, vérifie le résumé de ce qui sera créé, puis lance l'import."
      />
      <ExcelImportPage />
    </div>
  )
}
