import AuditLogPage from '@/components/admin/AuditLogPage'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Journalisation | KARA Admin',
  description: 'Historique des actions des administrateurs',
}

export default function Page() {
  // useSearchParams (état de liste dans l'URL) impose une frontière Suspense au build
  return (
    <Suspense fallback={null}>
      <AuditLogPage />
    </Suspense>
  )
}
