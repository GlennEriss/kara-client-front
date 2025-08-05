import { Metadata } from 'next'
import MembershipList from '@/components/memberships/MembershipList'

export const metadata: Metadata = {
  title: 'Gestion des Membres | KARA Admin',
  description: 'Gestion des membres adhérents, bienfaiteurs et sympathisants de la mutuelle KARA'
}

export default function MembershipsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#224D62]">Gestion des Membres</h1>
          <p className="text-gray-600 mt-2">
            Gérez les membres adhérents, bienfaiteurs et sympathisants de KARA
          </p>
        </div>
      </div>
      
      <MembershipList />
    </div>
  )
}