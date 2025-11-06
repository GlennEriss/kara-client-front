'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertCircle,
  Calendar,
  DollarSign,
  Eye,
  FileText,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useMemberContractsCI } from '@/hooks/caisse-imprevue'
import { CONTRACT_CI_STATUS_LABELS } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import routes from '@/constantes/routes'
import { useRouter } from 'next/navigation'

interface MemberContractsCIListProps {
  memberId: string
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  FINISHED: 'bg-gray-100 text-gray-700 border-gray-200',
  CANCELED: 'bg-red-100 text-red-700 border-red-200',
}

export default function MemberContractsCIList({ memberId }: MemberContractsCIListProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const { data: contracts = [], isLoading, error } = useMemberContractsCI(memberId)

  // Pagination côté client
  const totalPages = Math.ceil(contracts.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedContracts = contracts.slice(startIndex, endIndex)

  // Réinitialiser la page si le nombre de contrats change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [contracts.length, currentPage, totalPages])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des contrats : {error instanceof Error ? error.message : 'Erreur inconnue'}
        </AlertDescription>
      </Alert>
    )
  }

  if (contracts.length === 0) {
    return (
      <Card className="border-0 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-purple-400 mb-4" />
          <AlertDescription className="text-purple-700 font-medium">
            Aucun contrat Caisse Imprévue trouvé pour ce membre.
          </AlertDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Contrats Caisse Imprévue ({contracts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paginatedContracts.map((contract) => (
        <Card key={contract.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 space-y-3 min-w-0">
                {/* En-tête */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg text-gray-900 break-words">
                      {contract.subscriptionCILabel}
                    </h3>
                    <p className="text-sm text-gray-500 break-words">
                      Forfait <span className="font-mono text-xs">{contract.subscriptionCICode}</span>
                    </p>
                  </div>
                  <Badge className={`${STATUS_COLORS[contract.status] || 'bg-gray-100'} shrink-0 self-start sm:self-auto`}>
                    {CONTRACT_CI_STATUS_LABELS[contract.status]}
                  </Badge>
                </div>

                {/* Informations */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Date de création</p>
                      <p className="text-sm font-medium text-gray-900">
                        {format(contract.createdAt, 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Montant total</p>
                      <p className="text-sm font-medium text-gray-900">
                        {contract.subscriptionCINominal.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Durée</p>
                      <p className="text-sm font-medium text-gray-900">
                        {contract.subscriptionCIDuration} mois
                      </p>
                    </div>
                  </div>
                </div>

                {/* Paiement */}
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Fréquence de paiement</p>
                      <p className="text-sm font-medium text-gray-900">
                        {contract.paymentFrequency === 'DAILY' ? 'Quotidien' : 'Mensuel'}
                        {contract.paymentFrequency === 'MONTHLY' && (
                          <span className="text-gray-500 ml-1">
                            ({contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA/mois)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-row sm:flex-col gap-2 sm:ml-4 shrink-0 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!contract.contractStartId}
                  onClick={() => router.push(routes.admin.caisseImprevueContractDetails(contract.id))}
                  className="gap-2 whitespace-nowrap flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  <Eye className="h-4 w-4" />
                  Voir contrat
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(routes.admin.caisseImprevueContractPayments(contract.id))}
                  className="gap-2 whitespace-nowrap flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  <History className="h-4 w-4" />
                  Versements
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-600">
              Affichage de {startIndex + 1} à {Math.min(endIndex, contracts.length)} sur {contracts.length} contrats
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-10"
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

