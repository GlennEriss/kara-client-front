'use client'

import React, { Suspense } from 'react'
import { useParams } from 'next/navigation'
import GuarantorRemunerationsList from '@/components/credit-speciale/GuarantorRemunerationsList'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useMember } from '@/hooks/useMembers'

export default function GuarantorRemunerationsPage() {
  const params = useParams()
  const memberId = params.id as string
  const { data: member, isLoading } = useMember(memberId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Rémunérations de garant
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              {isLoading ? (
                <Skeleton className="h-5 w-64 mt-2" />
              ) : member ? (
                `Historique des rémunérations pour ${member.firstName} ${member.lastName}`
              ) : (
                'Historique des rémunérations'
              )}
            </p>
          </div>
        </div>

        {/* Composant principal */}
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
    </div>
  )
}

