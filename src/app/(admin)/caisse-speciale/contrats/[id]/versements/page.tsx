'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, FileText, Calendar, DollarSign, Users, ArrowLeft, CheckCircle, Clock, AlertTriangle, Download } from 'lucide-react'
import { useContracts } from '@/hooks/useContracts'
import { useContractPayments } from '@/hooks/useContractPayments'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import routes from '@/constantes/routes'
import { useAuth } from '@/hooks/useAuth'
import { getAdminById } from '@/db/admin.db'
import { Button } from '@/components/ui/button'
import * as XLSX from 'xlsx'

// Fonction de traduction des statuts de contrat
const translateContractStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': 'En cours',
    'ACTIVE': 'Actif',
    'LATE_NO_PENALTY': 'Retard (J+0..3)',
    'LATE_WITH_PENALTY': 'Retard (J+4..12)',
    'DEFAULTED_AFTER_J12': 'Résilié (>J+12)',
    'EARLY_WITHDRAW_REQUESTED': 'Retrait anticipé demandé',
    'FINAL_REFUND_PENDING': 'Remboursement final en attente',
    'EARLY_REFUND_PENDING': 'Remboursement anticipé en attente',
    'RESCINDED': 'Résilié',
    'CLOSED': 'Clos'
  }
  return statusMap[status] || status
}

// Fonction de traduction des statuts de versement
const translatePaymentStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'PAID': 'Payé',
    'PENDING': 'En attente',
    'OVERDUE': 'En retard'
  }
  return statusMap[status] || status
}

export default function ContractPaymentsPage() {
  const params = useParams()
  const contractId = params.id as string
  const { user } = useAuth()

  // Récupérer les données du contrat
  const { contracts, isLoading: isLoadingContracts, error } = useContracts()
  const contract = contracts.find(c => c.id === contractId)

  // Récupérer les versements du contrat
  const { payments, isLoading: isLoadingPayments, error: paymentsError } = useContractPayments(contractId)

  // État pour stocker les informations des administrateurs
  const [adminInfos, setAdminInfos] = React.useState<Record<string, { firstName: string; lastName: string }>>({})
  const [loadingAdmins, setLoadingAdmins] = React.useState<Set<string>>(new Set())

  // Fonction pour récupérer les informations d'un administrateur
  const fetchAdminInfo = React.useCallback(async (adminId: string) => {
    if (adminInfos[adminId] || loadingAdmins.has(adminId)) return

    setLoadingAdmins(prev => new Set(prev).add(adminId))
    
    try {
      // Si c'est l'utilisateur connecté, utiliser ses informations
      if (user?.uid === adminId) {
        setAdminInfos(prev => ({
          ...prev,
          [adminId]: {
            firstName: user.displayName?.split(' ')[0] || 'Utilisateur',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || 'Connecté'
          }
        }))
      } else {
        // Sinon, récupérer les informations depuis la collection admins
        const adminData = await getAdminById(adminId)
        if (adminData) {
          setAdminInfos(prev => ({
            ...prev,
            [adminId]: {
              firstName: adminData.firstName,
              lastName: adminData.lastName
            }
          }))
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'administrateur:', error)
    } finally {
      setLoadingAdmins(prev => {
        const newSet = new Set(prev)
        newSet.delete(adminId)
        return newSet
      })
    }
  }, [adminInfos, loadingAdmins, user])

  // Charger les informations des administrateurs pour tous les versements
  React.useEffect(() => {
    if (!payments.length) return

    const uniqueAdminIds = [...new Set(payments.map(p => p.updatedBy).filter((id): id is string => Boolean(id)))]
    uniqueAdminIds.forEach(adminId => {
      fetchAdminInfo(adminId)
    })
  }, [payments, fetchAdminInfo])

  // Fonction pour obtenir le nom de l'administrateur
  const getAdminDisplayName = (adminId?: string) => {
    if (!adminId) return 'Non renseigné'
    
    if (loadingAdmins.has(adminId)) {
      return 'Chargement...'
    }
    
    const adminInfo = adminInfos[adminId]
    if (adminInfo) {
      return `${adminInfo.firstName} ${adminInfo.lastName}`
    }
    
    // Si on n'est pas en train de charger mais qu'on n'a pas d'info, on reste sur "Chargement..."
    // pour éviter l'effet de clignotement entre ID et nom
    return 'Chargement...'
  }

  // Fonction pour exporter les versements en Excel
  const exportToExcel = () => {
    if (!payments.length) return

    // Préparer les données pour l'export
    const exportData = payments.map((payment, index) => {
      const now = new Date()
      const dueDate = payment.dueAt ? new Date(payment.dueAt) : null
      
      let status = ''
      if (payment.status === 'PAID') {
        status = 'Payé'
      } else if (dueDate && now > dueDate) {
        status = 'En retard'
      } else {
        status = 'En attente'
      }

      return {
        'N° Échéance': payment.dueMonthIndex,
        'ID Versement': payment.id,
        'Date d\'échéance': payment.dueAt ? new Date(payment.dueAt).toLocaleDateString('fr-FR') : 'Non définie',
        'Montant': payment.amount || 0,
        'Statut': status,
        'Date de paiement': payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('fr-FR') : '',
        'Heure de paiement': payment.time || '',
        'Mode de paiement': payment.mode || '',
        'Pénalité appliquée': payment.penaltyApplied || 0,
        'Traité par': getAdminDisplayName(payment.updatedBy),
        'Nombre de contributions': payment.contribs?.length || 0,
        'Montant accumulé': payment.accumulatedAmount || payment.amount || 0,
        'Montant cible': payment.targetAmount || payment.amount || 0,
        'Preuve de paiement': payment.proofUrl ? 'Oui' : 'Non'
      }
    })

    // Créer le workbook et la feuille
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Versements')

    // Définir la largeur des colonnes
    const colWidths = [
      { wch: 12 }, // N° Échéance
      { wch: 25 }, // ID Versement
      { wch: 15 }, // Date d'échéance
      { wch: 12 }, // Montant
      { wch: 12 }, // Statut
      { wch: 15 }, // Date de paiement
      { wch: 15 }, // Heure de paiement
      { wch: 15 }, // Mode de paiement
      { wch: 18 }, // Pénalité appliquée
      { wch: 20 }, // Traité par
      { wch: 20 }, // Nombre de contributions
      { wch: 18 }, // Montant accumulé
      { wch: 15 }, // Montant cible
      { wch: 18 }  // Preuve de paiement
    ]
    ws['!cols'] = colWidths

    // Générer le nom du fichier avec la date
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const fileName = `versements_contrat_${contractId}_${dateStr}.xlsx`

    // Télécharger le fichier
    XLSX.writeFile(wb, fileName)
  }

  if (isLoadingContracts || isLoadingPayments) {
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

  if (error || paymentsError) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Historique des Versements</h1>
          <p className="text-muted-foreground">
            Erreur lors du chargement des données
          </p>
        </div>
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des données : {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Historique des Versements</h1>
          <p className="text-muted-foreground">
            Contrat introuvable
          </p>
        </div>
        <Alert className="border-0 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-700 font-medium">
            Le contrat avec l'ID {contractId} n'a pas été trouvé.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête avec bouton retour */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Link
            href={routes.admin.caisseSpecialeContractDetails(contractId)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour au contrat
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Historique des Versements</h1>
        <p className="text-muted-foreground">
          Versements du contrat #{contract.id}
        </p>
      </div>

      {/* Informations du contrat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informations du contrat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Statut</p>
                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                 contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                 contract.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                 contract.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                 'bg-red-100 text-red-800'
               }`}>
                 {translateContractStatus(contract.status)}
               </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Type</p>
              <p className="text-base text-gray-900">{contract.contractType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Montant mensuel</p>
              <p className="text-base text-gray-900">{contract.monthlyAmount?.toLocaleString()} FCFA</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Durée</p>
              <p className="text-base text-gray-900">{contract.monthsPlanned} mois</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Montant nominal payé</p>
              <p className="text-base text-gray-900">{contract.nominalPaid?.toLocaleString()} FCFA</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Prochaine échéance</p>
              <p className="text-base text-gray-900">
                {contract.nextDueAt ? new Date(contract.nextDueAt).toLocaleDateString('fr-FR') : 'Non définie'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique des versements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Historique des versements ({payments.length})
            </CardTitle>
            {payments.length > 0 && (
              <Button
                onClick={exportToExcel}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exporter Excel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => {
                // Calculer le statut réel basé sur la date actuelle
                const now = new Date()
                const dueDate = payment.dueAt ? new Date(payment.dueAt) : null
                
                let realStatus = payment.status
                let statusLabel = ''
                let statusColor = ''
                let statusIcon = null
                
                if (payment.status === 'PAID') {
                  realStatus = 'PAID'
                  statusLabel = translatePaymentStatus('PAID')
                  statusColor = 'bg-green-100 text-green-800'
                  statusIcon = <CheckCircle className="h-4 w-4 text-green-600" />
                } else if (dueDate) {
                  // Si la date d'échéance est passée et pas payé = en retard
                  if (now > dueDate) {
                    realStatus = 'DUE'
                    statusLabel = 'En retard'
                    statusColor = 'bg-red-100 text-red-800'
                    statusIcon = <AlertTriangle className="h-4 w-4 text-red-600" />
                  } else {
                    // Si la date d'échéance n'est pas encore arrivée = en attente
                    realStatus = 'DUE'
                    statusLabel = 'En attente'
                    statusColor = 'bg-yellow-100 text-yellow-800'
                    statusIcon = <Clock className="h-4 w-4 text-yellow-600" />
                  }
                } else {
                  // Pas de date d'échéance = en attente
                  realStatus = 'DUE'
                  statusLabel = 'En attente'
                  statusColor = 'bg-yellow-100 text-yellow-800'
                  statusIcon = <Clock className="h-4 w-4 text-yellow-600" />
                }
                
                return (
                <div key={payment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">
                      Versement #{payment.id} - Mois {payment.dueMonthIndex}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                      {statusIcon}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Échéance:</span>
                      <span className="font-medium">
                        {payment.dueAt ? new Date(payment.dueAt).toLocaleDateString('fr-FR') : 'Non définie'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Montant:</span>
                      <span className="font-medium">{payment.amount?.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Contributions:</span>
                      <span className="font-medium">{payment.contribs?.length || 0}</span>
                    </div>
                  </div>

                  {payment.paidAt && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <span>Payé le {new Date(payment.paidAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  )}

                  {payment.updatedBy && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>Traité par:</span>
                        <span className={`font-medium ${loadingAdmins.has(payment.updatedBy) ? 'animate-pulse' : ''}`}>
                          {getAdminDisplayName(payment.updatedBy)}
                        </span>
                      </div>
                    </div>
                  )}

                  {payment.contribs && payment.contribs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Détail des contributions:</h4>
                      <div className="space-y-2">
                        {payment.contribs.map((contrib, index) => (
                          <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                            <span className="text-gray-600">Membre {contrib.memberId}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{contrib.amount?.toLocaleString()} FCFA</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                contrib.paidAt ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {contrib.paidAt ? 'Payé' : 'En attente'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                                         </div>
                   )}
                 </div>
               )
               })}
             </div>
          ) : (
            <Alert className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-700 font-medium">
                Aucun versement trouvé pour ce contrat.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
