import type { Metadata } from 'next'
import { InsuranceTariffsPage } from '@/components/vehicule/InsuranceTariffsPage'

export const metadata: Metadata = { title: 'Barèmes des assureurs | LE KARA Admin' }

export default function Page() {
  return <InsuranceTariffsPage />
}
