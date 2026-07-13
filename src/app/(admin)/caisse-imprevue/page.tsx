import { PageHero } from '@/components/ui/page-hero'
import ListContractsCIV2 from '@/domains/financial/caisse-imprevue/components/contracts/ListContractsCIV2'
import { HeartHandshake } from 'lucide-react'
import { Suspense } from 'react'

export default function CaisseImprevuePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={HeartHandshake}
        title="Caisse Imprévue"
        subtitle="Gestion des contrats et suivi des versements"
      />

      {/* useSearchParams (état de liste dans l'URL) impose une frontière Suspense au build */}
      <Suspense fallback={null}>
        <ListContractsCIV2 />
      </Suspense>
    </div>
  )
}
