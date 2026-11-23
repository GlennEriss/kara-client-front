import { AdminProspectsPage } from '@/components/vehicule/InsuranceProspectsPage'
import { Button } from '@/components/ui/button'
import routes from '@/constantes/routes'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Prospection en assurance | LE KARA Admin',
  description: 'Suivi des prospects, des relances et des demandes d’assurance',
}

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <Button asChild variant="outline">
        <Link href={routes.admin.vehicules}><ArrowLeft aria-hidden="true" /> Voir les assurances</Link>
      </Button>
      <AdminProspectsPage />
    </div>
  )
}
