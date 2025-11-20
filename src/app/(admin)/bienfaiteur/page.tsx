import { Metadata } from 'next'
import CharityEventsList from '@/components/bienfaiteur/CharityEventsList'

export const metadata: Metadata = {
  title: 'Évènements Bienfaiteur | KARA Admin',
  description: 'Gestion des évènements caritatifs et récollections de l\'Association LE KARA'
}

export default function BienfaiteurPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
            Évènements Bienfaiteur
          </h1>
          <p className="text-gray-600 text-lg">
            Gérez les actions de solidarité, leurs participants et les contributions associées
          </p>
        </div>
      </div>

      <CharityEventsList />
    </div>
  )
}

