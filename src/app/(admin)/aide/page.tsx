import HelpCenterPage from '@/domains/help/components/HelpCenterPage'
import { Suspense } from 'react'

export default function AidePage() {
  return (
    <Suspense>
      <HelpCenterPage />
    </Suspense>
  )
}
