import { Metadata } from 'next'
import CharityEventDetail from '@/components/bienfaiteur/CharityEventDetail'

export const metadata: Metadata = {
  title: 'Détail Évènement | KARA Admin',
  description: 'Détails d\'un évènement caritatif'
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BienfaiteurDetailPage({ params }: PageProps) {
  const { id } = await params
  return <CharityEventDetail eventId={id} />
}

