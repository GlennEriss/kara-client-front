import type { Metadata } from 'next'
import { InsuranceSimulator } from '@/components/vehicule/InsuranceSimulator'

export const metadata: Metadata = { title: 'Simulateur d’assurance | LE KARA Admin' }

export default function Page() {
  return <InsuranceSimulator />
}
