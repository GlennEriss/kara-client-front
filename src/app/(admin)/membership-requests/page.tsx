/**
 * Page de gestion des demandes d'adhésion V2
 * 
 * Utilise le nouveau design défini dans WIREFRAME_UI.md
 * avec les composants V2 du domaine memberships
 */

import { MembershipRequestsPageV2 } from '@/domains/memberships/components/page'
import { Suspense } from 'react'

export default function MembershipRequestsPage() {
  // useSearchParams (état de liste dans l'URL) impose une frontière Suspense au build
  return (
    <Suspense fallback={null}>
      <MembershipRequestsPageV2 />
    </Suspense>
  )
}
