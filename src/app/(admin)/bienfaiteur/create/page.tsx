import { Metadata } from 'next'
import CreateCharityEventForm from '@/components/bienfaiteur/CreateCharityEventForm'

export const metadata: Metadata = {
  title: 'Créer un Évènement | KARA Admin',
  description: 'Créer un nouvel évènement caritatif'
}

export default function CreateBienfaiteurPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
          Créer un Évènement Bienfaiteur
        </h1>
        <p className="text-gray-600 text-lg">
          Lancez une nouvelle action de solidarité
        </p>
      </div>

      <CreateCharityEventForm />
    </div>
  )
}

