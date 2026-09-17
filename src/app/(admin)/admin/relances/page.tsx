import CallLogPage from '@/components/admin/CallLogPage'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Journal des relances | KARA Admin',
  description: 'Historique des appels et messages adressés aux retardataires',
}

export default function Page() {
  // useSearchParams (état de liste dans l'URL) impose une frontière Suspense au build
  return (
    <Suspense fallback={null}>
      <CallLogPage />
    </Suspense>
  )
}
