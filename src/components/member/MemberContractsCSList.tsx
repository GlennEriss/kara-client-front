'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useContractsByMember } from '@/hooks/useCaisseContracts'
import routes from '@/constantes/routes'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface MemberContractsCSListProps {
  memberId: string
}

// Fonction pour convertir et formater une date en toute sécurité
const safeFormatDate = (dateValue: any, formatPattern: string = 'dd/MM/yyyy'): string => {
  if (!dateValue) return 'N/A'
  
  let date: Date | null = null
  
  // Si c'est un Timestamp Firestore
  if (dateValue && typeof dateValue.toDate === 'function') {
    date = dateValue.toDate()
  }
  // Si c'est déjà une Date
  else if (dateValue instanceof Date) {
    date = dateValue
  }
  // Si c'est une string ou un number
  else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    date = new Date(dateValue)
  }
  
  // Vérifier si la date est valide
  if (!date || isNaN(date.getTime())) {
    console.warn('Date invalide:', dateValue)
    return 'Date invalide'
  }
  
  try {
    return format(date, formatPattern, { locale: fr })
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error, dateValue)
    return 'Erreur de formatage'
  }
}

export default function MemberContractsCSList({ memberId }: MemberContractsCSListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const { data: memberContracts = [], isLoading, error } = useContractsByMember(memberId)

  // Pagination côté client
  const totalPages = Math.ceil(memberContracts.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedContracts = memberContracts.slice(startIndex, endIndex)

  // Réinitialiser la page si le nombre de contrats change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [memberContracts.length, currentPage, totalPages])

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
          Erreur lors du chargement des contrats : {error?.message || 'Erreur inconnue'}
        </AlertDescription>
      </Alert>
    )
  }

  if (memberContracts.length === 0) {
    return (
      <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-blue-400 mb-4" />
          <AlertDescription className="text-blue-700 font-medium">
            Aucun contrat Caisse Spéciale trouvé pour ce membre.
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
          Contrats Caisse Spéciale ({memberContracts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paginatedContracts.map((contract: any) => (
            <div key={contract.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 break-words">
                    Contrat <span className="text-xs font-mono text-gray-600 break-all">#{contract.id}</span>
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    contract.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                    contract.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {contract.status}
                  </span>
                  {(() => {
                    const hasValidContractPdf = (contract: any) => {
                      const contractPdf = contract.contractPdf
                      if (!contractPdf || typeof contractPdf !== 'object') {
                        return false
                      }
                      const requiredProperties = ['fileSize', 'originalFileName', 'path', 'uploadedAt', 'url']
                      return requiredProperties.every(prop => contractPdf.hasOwnProperty(prop) && contractPdf[prop] !== null && contractPdf[prop] !== undefined)
                    }

                    if (hasValidContractPdf(contract)) {
                      return (
                        <Link
                          href={routes.admin.caisseSpecialeContractDetails(contract.id)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-200 transition-colors whitespace-nowrap"
                        >
                          Voir le contrat
                        </Link>
                      )
                    } else {
                      return (
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full cursor-not-allowed whitespace-nowrap">
                          PDF requis
                        </span>
                      )
                    }
                  })()}
                  <Link
                    href={routes.admin.caisseSpecialeContractPayments(contract.id)}
                    className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full hover:bg-green-200 transition-colors whitespace-nowrap"
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
                        {safeFormatDate(contract.contractStartAt, 'dd/MM/yyyy')}
                      </span>
                    </div>
                    {contract.contractEndAt && (
                      <div>
                        <span className="text-gray-600">Fin:</span>
                        <span className="ml-2 font-medium">
                          {safeFormatDate(contract.contractEndAt, 'dd/MM/yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-600">
              Affichage de {startIndex + 1} à {Math.min(endIndex, memberContracts.length)} sur {memberContracts.length} contrats
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

