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
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
            Gestion des Membres
          </h1>
          <p className="text-gray-600 text-lg">
            Gérez les membres adhérents, bienfaiteurs et sympathisants de KARA
          </p>
        </div>
      </div>

      <MembershipList />
    </div>
  )
}