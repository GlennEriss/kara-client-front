'use client'

import GuarantorRemunerationsList from '@/components/credit-speciale/GuarantorRemunerationsList'
import { Card, CardContent } from '@/components/ui/card'
import { PageHero } from '@/components/ui/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import { useMember } from '@/hooks/useMembers'
import { Wallet } from 'lucide-react'
import { useParams } from 'next/navigation'
import { Suspense } from 'react'

export default function GuarantorRemunerationsPage() {
  const params = useParams()
  const memberId = params.id as string
  const { data: member, isLoading } = useMember(memberId)

  const subtitle = isLoading
    ? 'Chargement…'
    : member
      ? `Historique des rémunérations pour ${member.firstName} ${member.lastName}`
      : 'Historique des rémunérations'

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={Wallet}
        title="Rémunérations de garant"
        subtitle={subtitle}
      />

      <Suspense fallback={
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      }>
        <GuarantorRemunerationsList guarantorId={memberId} />
      </Suspense>
    </div>
  )
}

