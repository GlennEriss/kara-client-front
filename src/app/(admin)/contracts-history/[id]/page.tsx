'use client'

import React, { lazy, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Users, Package } from 'lucide-react'
import { useMember } from '@/hooks/useMembers'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load components
const MemberContractsCSList = lazy(() => import('@/components/member/MemberContractsCSList'))
const MemberContractsCIList = lazy(() => import('@/components/member/MemberContractsCIList'))

export default function ContractsHistoryDetailsPage() {
  const params = useParams()
  const memberId = params.id as string

  // Récupérer les données du membre directement par son ID
  const { data: member, isLoading: isLoadingMember } = useMember(memberId)

  if (isLoadingMember) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Historique des Contrats</h1>
          <p className="text-muted-foreground">
            Membre introuvable
          </p>
        </div>
        <Alert className="border-0 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-700 font-medium">
            Le membre avec l'ID {memberId} n'a pas été trouvé.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Historique des Contrats</h1>
        <p className="text-muted-foreground">
          Contrats de {member.firstName} {member.lastName} ({member.matricule})
        </p>
      </div>

      {/* Informations du membre */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informations du membre
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Nom complet</p>
              <p className="text-base text-gray-900">{member.firstName} {member.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Matricule</p>
              <p className="text-base text-gray-900">{member.matricule}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Email</p>
              <p className="text-base text-gray-900">{member.email || 'Non renseigné'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Téléphone</p>
              <p className="text-base text-gray-900">{member.contacts?.[0] || 'Non renseigné'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs des contrats */}
      <Tabs defaultValue="caisse-speciale" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="caisse-speciale" className="gap-2">
            <Package className="h-4 w-4" />
            Caisse Spéciale
          </TabsTrigger>
          <TabsTrigger value="caisse-imprevue" className="gap-2">
            <Package className="h-4 w-4" />
            Caisse Imprévue
          </TabsTrigger>
        </TabsList>

        {/* Contrats Caisse Spéciale */}
        <TabsContent value="caisse-speciale">
          <Suspense fallback={
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          }>
            <MemberContractsCSList memberId={memberId} />
          </Suspense>
        </TabsContent>

        {/* Contrats Caisse Imprévue */}
        <TabsContent value="caisse-imprevue">
          <Suspense fallback={
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          }>
            <MemberContractsCIList memberId={memberId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
