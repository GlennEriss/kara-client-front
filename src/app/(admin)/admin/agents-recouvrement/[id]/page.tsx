'use client'

import { useParams, useRouter } from 'next/navigation'
import { AgentDetailsPage } from '@/components/agent-recouvrement/AgentDetailsPage'
import routes from '@/constantes/routes'

export default function AgentRecouvrementDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  if (!id) {
    router.push(routes.admin.agentsRecouvrement)
    return null
  }

  return <AgentDetailsPage agentId={id} />
}
