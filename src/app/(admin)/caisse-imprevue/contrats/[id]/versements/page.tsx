'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  Users,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  TrendingUp,
  History,
  Smartphone,
  Banknote,
  Building2,
  User,
} from 'lucide-react'
import routes from '@/constantes/routes'
import { useContractCI, usePaymentsCI, usePaymentsCIStats } from '@/hooks/caisse-imprevue'
import { CONTRACT_CI_STATUS_LABELS, PaymentCI, VersementCI } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ServiceFactory } from '@/factories/ServiceFactory'
import Image from 'next/image'

const PAYMENT_MODE_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèce',
  bank_transfer: 'Virement bancaire',
  other: 'Autre',
}

const PAYMENT_STATUS_LABELS = {
  DUE: 'À payer',
  PAID: 'Payé',
  PARTIAL: 'Partiel',
}

export default function ContractCIPaymentsPage() {
  const params = useParams() as { id: string }
  const contractId = params.id
  const router = useRouter()

  // Récupération des données
  const { data: contract, isLoading: isLoadingContract, isError: isErrorContract, error: errorContract } = useContractCI(contractId)
  const { data: payments = [], isLoading: isLoadingPayments, isError: isErrorPayments, error: errorPayments } = usePaymentsCI(contractId)
  
  // Calcul des statistiques
  const stats = usePaymentsCIStats(contract || null, payments)

  // États pour stocker les informations des administrateurs
  const [adminInfos, setAdminInfos] = useState<Record<string, { firstName: string; lastName: string }>>({})
  const [loadingAdmins, setLoadingAdmins] = useState<Set<string>>(new Set())

  // Fonction pour récupérer les informations d'un administrateur
  const fetchAdminInfo = useCallback(async (adminId: string) => {
    if (adminInfos[adminId] || loadingAdmins.has(adminId)) return

    setLoadingAdmins(prev => new Set(prev).add(adminId))

    try {
      const service = ServiceFactory.getCaisseImprevueService()
      const adminData = await service.getAdminById(adminId)
      
      if (adminData) {
        setAdminInfos(prev => ({
          ...prev,
          [adminId]: {
            firstName: adminData.firstName,
            lastName: adminData.lastName
          }
        }))
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
  }, [adminInfos, loadingAdmins])

  // Charger les informations des administrateurs pour tous les versements
  useEffect(() => {
    if (!payments.length) return

    const uniqueAdminIds = new Set<string>()
    
    payments.forEach(payment => {
      if (payment.createdBy) uniqueAdminIds.add(payment.createdBy)
      if (payment.updatedBy) uniqueAdminIds.add(payment.updatedBy)
      
      payment.versements?.forEach(versement => {
        if (versement.createdBy) uniqueAdminIds.add(versement.createdBy)
      })
    })

    Array.from(uniqueAdminIds).forEach(adminId => {
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
    
    return 'Chargement...'
  }

  // Fonction pour exporter vers Excel
  const exportToExcel = () => {
    if (!payments.length || !contract) return

    const exportData: any[] = []

    payments.forEach((payment) => {
      payment.versements?.forEach((versement, vIndex) => {
        exportData.push({
          'Mois': `M${payment.monthIndex + 1}`,
          'N° Versement': vIndex + 1,
          'Date': versement.date,
          'Heure': versement.time,
          'Montant': versement.amount,
          'Mode de paiement': PAYMENT_MODE_LABELS[versement.mode] || versement.mode,
          'Pénalité': versement.penalty || 0,
          'Jours de retard': versement.daysLate || 0,
          'Créé par': getAdminDisplayName(versement.createdBy),
          'Statut du mois': PAYMENT_STATUS_LABELS[payment.status],
          'Cumulé du mois': payment.accumulatedAmount,
          'Objectif du mois': payment.targetAmount,
        })
      })
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Versements')

    const colWidths = [
      { wch: 8 },  // Mois
      { wch: 12 }, // N° Versement
      { wch: 15 }, // Date
      { wch: 10 }, // Heure
      { wch: 15 }, // Montant
      { wch: 18 }, // Mode
      { wch: 12 }, // Pénalité
      { wch: 15 }, // Jours retard
      { wch: 25 }, // Créé par
      { wch: 15 }, // Statut
      { wch: 18 }, // Cumulé
      { wch: 18 }, // Objectif
    ]
    ws['!cols'] = colWidths

    const dateStr = format(new Date(), 'ddMMyyyy')
    const fileName = `Versements_CI_${contract.memberLastName}_${contract.memberFirstName}_${dateStr}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Fonction pour exporter vers PDF (global)
  const exportToPDF = () => {
    if (!payments.length || !contract) return

    const doc = new jsPDF('l', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()

    // En-tête
    doc.setFillColor(35, 77, 101)
    doc.rect(0, 0, pageWidth, 35, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('HISTORIQUE DES VERSEMENTS', pageWidth / 2, 15, { align: 'center' })
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Caisse Imprévue - ${contract.memberFirstName} ${contract.memberLastName}`, pageWidth / 2, 25, { align: 'center' })

    let yPos = 45

    // Informations du contrat
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(`Contrat: ${contract.id.slice(-8).toUpperCase()}`, 14, yPos)
    doc.text(`Forfait: ${contract.subscriptionCICode}`, 80, yPos)
    doc.text(`Montant mensuel: ${contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA`, 150, yPos)
    doc.text(`Statut: ${CONTRACT_CI_STATUS_LABELS[contract.status]}`, 230, yPos)
    
    yPos += 6
    doc.text(`Durée: ${contract.subscriptionCIDuration} mois`, 14, yPos)
    doc.text(`Fréquence: ${contract.paymentFrequency === 'MONTHLY' ? 'Mensuelle' : 'Quotidienne'}`, 80, yPos)
    doc.text(`Date d'export: ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 230, yPos)

    yPos += 10

    // Tableau des versements
    const tableData: any[] = []
    
    payments.forEach((payment) => {
      payment.versements?.forEach((versement, vIndex) => {
        tableData.push([
          `M${payment.monthIndex + 1}`,
          `#${vIndex + 1}`,
          format(new Date(versement.date), 'dd/MM/yyyy', { locale: fr }),
          versement.time,
          PAYMENT_MODE_LABELS[versement.mode] || versement.mode,
          `${versement.amount.toLocaleString('fr-FR')} FCFA`,
          versement.penalty && versement.penalty > 0 ? `${versement.penalty.toLocaleString('fr-FR')} FCFA` : '-',
          PAYMENT_STATUS_LABELS[payment.status],
          getAdminDisplayName(versement.createdBy),
        ])
      })
    })

    autoTable(doc, {
      startY: yPos,
      head: [['Mois', 'N°', 'Date', 'Heure', 'Mode', 'Montant', 'Pénalité', 'Statut', 'Créé par']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [35, 77, 101],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 28 },
        3: { cellWidth: 20 },
        4: { cellWidth: 35 },
        5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 30, halign: 'right' },
        7: { cellWidth: 25 },
        8: { cellWidth: 50, halign: 'left' },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages()
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Page ${data.pageNumber} sur ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }
    })

    const dateStr = format(new Date(), 'ddMMyyyy')
    const fileName = `Versements_CI_${contract.memberLastName}_${contract.memberFirstName}_${dateStr}.pdf`
    doc.save(fileName)
  }

  // Fonction pour exporter un paiement individuel en PDF
  const exportSinglePaymentToPDF = (payment: PaymentCI) => {
    if (!contract) return

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()

    // En-tête
    doc.setFillColor(35, 77, 101)
    doc.rect(0, 0, pageWidth, 35, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('DÉTAIL DU PAIEMENT', pageWidth / 2, 15, { align: 'center' })
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Mois ${payment.monthIndex + 1} - ${contract.memberFirstName} ${contract.memberLastName}`, pageWidth / 2, 25, { align: 'center' })

    let yPos = 45

    // Informations
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Contrat: ${contract.id.slice(-8).toUpperCase()}`, 14, yPos)
    doc.text(`Statut: ${PAYMENT_STATUS_LABELS[payment.status]}`, pageWidth - 14, yPos, { align: 'right' })
    
    yPos += 7
    doc.text(`Objectif du mois: ${payment.targetAmount.toLocaleString('fr-FR')} FCFA`, 14, yPos)
    doc.text(`Total versé: ${payment.accumulatedAmount.toLocaleString('fr-FR')} FCFA`, pageWidth - 14, yPos, { align: 'right' })

    yPos += 15

    // Tableau des versements
    const tableData = payment.versements.map((versement: VersementCI, index: number) => [
      `#${index + 1}`,
      format(new Date(versement.date), 'dd/MM/yyyy', { locale: fr }),
      versement.time,
      PAYMENT_MODE_LABELS[versement.mode] || versement.mode,
      `${versement.amount.toLocaleString('fr-FR')} FCFA`,
      versement.penalty && versement.penalty > 0 ? `${versement.penalty.toLocaleString('fr-FR')} FCFA` : '-',
      getAdminDisplayName(versement.createdBy),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['N°', 'Date', 'Heure', 'Mode', 'Montant', 'Pénalité', 'Créé par']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [35, 77, 101],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 30, halign: 'right' },
        6: { cellWidth: 45, halign: 'left' },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    })

    const dateStr = format(new Date(), 'ddMMyyyy')
    const fileName = `Paiement_CI_M${payment.monthIndex + 1}_${contract.memberLastName}_${dateStr}.pdf`
    doc.save(fileName)
  }

  // États de chargement
  if (isLoadingContract || isLoadingPayments) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  // Gestion des erreurs
  if (isErrorContract || isErrorPayments) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-700 font-medium">
              Erreur lors du chargement des données : {errorContract?.message || errorPayments?.message || 'Erreur inconnue'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Alert className="border-0 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-700 font-medium">
              Contrat introuvable
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(routes.admin.caisseImprevueContractDetails(contractId))}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au contrat
          </Button>

          <Badge className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white text-lg px-4 py-2">
            {CONTRACT_CI_STATUS_LABELS[contract.status]}
          </Badge>
        </div>

        {/* Titre */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73]">
          <CardHeader>
            <CardTitle className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <History className="h-7 w-7 lg:h-8 lg:w-8" />
              Historique des Versements
            </CardTitle>
            <div className="space-y-1 text-blue-100">
              <p className="text-base lg:text-lg">
                {contract.memberFirstName} {contract.memberLastName} - Contrat #{contract.id.slice(-8).toUpperCase()}
              </p>
              <p className="text-sm">
                Forfait {contract.subscriptionCICode} - {contract.paymentFrequency === 'MONTHLY' ? 'Paiement Mensuel' : 'Paiement Quotidien'}
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total versé</p>
                  <p className="font-bold text-lg text-green-600">
                    {stats.totalVerse.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total dû</p>
                  <p className="font-bold text-lg text-red-600">
                    {stats.totalDue.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Versements</p>
                  <p className="font-bold text-lg text-gray-900">
                    {stats.nombreVersements}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {stats.totalPenalties > 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pénalités</p>
                    <p className="font-bold text-lg text-orange-600">
                      {stats.totalPenalties.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progression</p>
                  <p className="font-bold text-lg text-purple-600">
                    {stats.tauxProgression.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informations du contrat */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <FileText className="h-5 w-5" />
              Informations du Contrat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Membre</p>
                <p className="font-semibold">{contract.memberFirstName} {contract.memberLastName}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Forfait</p>
                <p className="font-semibold">{contract.subscriptionCICode} - {contract.subscriptionCILabel || 'Caisse Imprévue'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Fréquence</p>
                <p className="font-semibold">{contract.paymentFrequency === 'MONTHLY' ? 'Mensuelle' : 'Quotidienne'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Montant mensuel</p>
                <p className="font-semibold">{contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Durée</p>
                <p className="font-semibold">{contract.subscriptionCIDuration} mois</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Nominal total</p>
                <p className="font-semibold">{contract.subscriptionCINominal.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historique des paiements */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Liste des Paiements ({payments.length} mois)
              </CardTitle>
              {payments.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={exportToPDF}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center gap-1.5 sm:gap-2 border-red-300 text-red-700 hover:bg-red-50 h-9 px-2 sm:px-3 text-xs sm:text-sm"
                  >
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Export PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                  <Button
                    onClick={exportToExcel}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center gap-1.5 sm:gap-2 border-green-300 text-green-700 hover:bg-green-50 h-9 px-2 sm:px-3 text-xs sm:text-sm"
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Export Excel</span>
                    <span className="sm:hidden">Excel</span>
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <div className="space-y-6">
                {payments.map((payment) => (
                  <Card key={payment.id} className="border-2 hover:border-[#224D62] transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-[#224D62] text-white text-base px-3 py-1">
                            Mois {payment.monthIndex + 1}
                          </Badge>
                          <Badge className={
                            payment.status === 'PAID' ? 'bg-green-100 text-green-700 border-green-200' :
                            payment.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-red-100 text-red-700 border-red-200'
                          }>
                            {PAYMENT_STATUS_LABELS[payment.status]}
                          </Badge>
                        </div>
                        
                        <Button
                          onClick={() => exportSinglePaymentToPDF(payment)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </Button>
                      </div>

                      {/* Résumé du mois */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Objectif:</span>
                          <span className="font-semibold">{payment.targetAmount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Versé:</span>
                          <span className="font-semibold text-green-600">{payment.accumulatedAmount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Versements:</span>
                          <span className="font-semibold">{payment.versements.length}</span>
                        </div>
                      </div>

                      {/* Liste des versements */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Détails des {payment.versements.length} versement{payment.versements.length > 1 ? 's' : ''}
                        </h4>

                        {payment.versements.map((versement: VersementCI, index: number) => (
                          <div key={versement.id} className="bg-white border rounded-lg p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                              {/* Informations principales */}
                              <div className="lg:col-span-3 space-y-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <Badge variant="outline" className="font-mono">
                                    Versement #{index + 1}
                                  </Badge>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(new Date(versement.date), 'dd MMMM yyyy', { locale: fr })}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{versement.time}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-lg">
                                    {versement.mode === 'airtel_money' && <Smartphone className="h-4 w-4 text-red-600" />}
                                    {versement.mode === 'mobicash' && <Banknote className="h-4 w-4 text-blue-600" />}
                                    {versement.mode === 'cash' && <DollarSign className="h-4 w-4 text-green-600" />}
                                    {versement.mode === 'bank_transfer' && <Building2 className="h-4 w-4 text-purple-600" />}
                                    <span className="text-sm font-medium">
                                      {PAYMENT_MODE_LABELS[versement.mode] || versement.mode}
                                    </span>
                                  </div>

                                  <div className="text-2xl font-bold text-[#224D62]">
                                    {versement.amount.toLocaleString('fr-FR')} <span className="text-sm">FCFA</span>
                                  </div>

                                  {versement.penalty && versement.penalty > 0 && (
                                    <Badge variant="destructive">
                                      Pénalité: {versement.penalty.toLocaleString('fr-FR')} FCFA
                                      {versement.daysLate && versement.daysLate > 0 && ` (${versement.daysLate}j)`}
                                    </Badge>
                                  )}
                                </div>

                                {/* Informations admin */}
                                <div className="pt-2 border-t border-gray-200">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <User className="h-4 w-4" />
                                    <span>Enregistré par:</span>
                                    <span className={`font-medium ${loadingAdmins.has(versement.createdBy) ? 'animate-pulse' : ''}`}>
                                      {getAdminDisplayName(versement.createdBy)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Preuve de paiement */}
                              <div className="flex flex-col items-center justify-center">
                                <div className="w-full aspect-[4/3] relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#224D62] transition-colors group">
                                  <Image
                                    src={versement.proofUrl}
                                    alt={`Preuve #${index + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 200px"
                                  />
                                </div>
                                <a 
                                  href={versement.proofUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline mt-2"
                                >
                                  Voir la preuve
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-700 font-medium">
                  Aucun versement enregistré pour ce contrat.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

