'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, FileText, Calendar, DollarSign, Users } from 'lucide-react'
import { useContractsByMember } from '@/hooks/useCaisseContracts'
import { useMember } from '@/hooks/useMembers'
import { Skeleton } from '@/components/ui/skeleton'
import routes from '@/constantes/routes'
import Link from 'next/link'

export default function ContractsHistoryDetailsPage() {
  const params = useParams()
  const memberId = params.id as string

  // Récupérer les données du membre directement par son ID
  const { data: member, isLoading: isLoadingMember } = useMember(memberId)

  // Récupérer les contrats du membre directement
  const { data: memberContracts = [], isLoading: isLoadingContracts, error } = useContractsByMember(memberId)

  if (isLoadingMember || isLoadingContracts) {
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

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Historique des Contrats</h1>
          <p className="text-muted-foreground">
            Erreur lors du chargement des données
          </p>
        </div>
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des contrats : {error?.message || 'Erreur inconnue'}
          </AlertDescription>
        </Alert>
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

      {/* Liste des contrats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrats ({memberContracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memberContracts.length > 0 ? (
            <div className="space-y-4">
              {memberContracts.map((contract: any) => (
                <div key={contract.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                     <div className="flex items-center justify-between mb-3">
                     <h3 className="font-semibold text-gray-900">
                       Contrat #{contract.id}
                     </h3>
                                           <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          contract.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                          contract.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {contract.status}
                        </span>
                        <Link
                          href={routes.admin.caisseSpecialeContractDetails(contract.id)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-200 transition-colors"
                        >
                          Voir le contrat
                        </Link>
                        <Link
                          href={routes.admin.caisseSpecialeContractPayments(contract.id)}
                          className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full hover:bg-green-200 transition-colors"
                        >
                          Versements
                        </Link>
                      </div> 
                   </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{contract.contractType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Montant mensuel:</span>
                      <span className="font-medium">{contract.monthlyAmount?.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Durée:</span>
                      <span className="font-medium">{contract.monthsPlanned} mois</span>
                    </div>
                  </div>

                  {contract.contractStartAt && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Début:</span>
                          <span className="ml-2 font-medium">
                            {new Date(contract.contractStartAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {contract.contractEndAt && (
                          <div>
                            <span className="text-gray-600">Fin:</span>
                            <span className="ml-2 font-medium">
                              {new Date(contract.contractEndAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Alert className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-700 font-medium">
                Aucun contrat trouvé pour ce membre.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
