import AuditLogPage from '@/components/admin/AuditLogPage'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Journalisation | KARA Admin',
  description: 'Historique des actions des administrateurs',
}

export default function Page() {
  return <AuditLogPage />
}
