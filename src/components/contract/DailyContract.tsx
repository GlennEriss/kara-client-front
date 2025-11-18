"use client"

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import routes from '@/constantes/routes'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import { useActiveCaisseSettingsByType } from '@/hooks/useCaisseSettings'
import { useGroupMembers, useMember } from '@/hooks/useMembers'
import { useAuth } from '@/hooks/useAuth'
import { pay, requestFinalRefund, requestEarlyRefund, approveRefund, markRefundPaid, cancelEarlyRefund, updatePaymentContribution } from '@/services/caisse/mutations'
import { getPaymentByDate } from '@/db/caisse/payments.db'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Calendar, Plus, DollarSign, TrendingUp, FileText, CheckCircle, XCircle, AlertCircle, Building2, Eye, Download, X, Trash2, ArrowLeft, History, RefreshCw, Clock, Smartphone, Banknote, Upload, Loader2, AlertTriangle } from 'lucide-react'
import PdfDocumentModal from './PdfDocumentModal'
import PdfViewerModal from './PdfViewerModal'
import RemboursementNormalPDFModal from './RemboursementNormalPDFModal'
import EmergencyContact from './standard/EmergencyContact'
import type { RefundDocument } from '@/types/types'
import { listRefunds } from '@/db/caisse/refunds.db'
import TestPaymentTools from './TestPaymentTools'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { translateContractStatus, getContractStatusConfig } from '@/utils/contract-status'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { earlyRefundSchema, earlyRefundDefaultValues, type EarlyRefundFormData } from '@/schemas/schemas'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Helper pour formater les montants correctement
const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

type Props = { id: string }

export default function DailyContract({ id }: Props) {
  const router = useRouter()
  const { data, isLoading, isError, error, refetch } = useCaisseContract(id)
  const { user } = useAuth()
  const { data: member } = useMember((data as any)?.memberId)

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false)
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false)
  const [showLatePaymentModal, setShowLatePaymentModal] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [editingContribution, setEditingContribution] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentTime, setPaymentTime] = useState('')
  const [paymentMode, setPaymentMode] = useState<'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer'>('airtel_money')
  const [paymentFile, setPaymentFile] = useState<File | undefined>()
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  // Formulaire de retrait anticipé avec React Hook Form
  const earlyRefundForm = useForm<EarlyRefundFormData>({
    resolver: zodResolver(earlyRefundSchema),
    defaultValues: earlyRefundDefaultValues
  })
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [showRemboursementPdf, setShowRemboursementPdf] = useState(false)
  const [currentRefundId, setCurrentRefundId] = useState<string | null>(null)
  const [currentDocument, setCurrentDocument] = useState<RefundDocument | null>(null)
  const [refunds, setRefunds] = useState<any[]>([])
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [refundType, setRefundType] = useState<'FINAL' | 'EARLY' | null>(null)
  const [refundReasonInput, setRefundReasonInput] = useState('')
  const [confirmDeleteDocumentId, setConfirmDeleteDocumentId] = useState<string | null>(null)
  const [refundFile, setRefundFile] = useState<File | undefined>()
  const [refundDate, setRefundDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [refundTime, setRefundTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })

  const settings = useActiveCaisseSettingsByType((data as any)?.caisseType)

  const contractStartDate = useMemo(() => {
    if (!data?.firstPaymentDate) return null
    try {
      const start = new Date(data.firstPaymentDate)
      if (isNaN(start.getTime())) return null
      start.setHours(0, 0, 0, 0)
      console.log('[DailyContract] contractStartDate:', start.toISOString())
      return start
    } catch {
      return null
    }
  }, [data?.firstPaymentDate])

  const getMonthIndexFromStart = useCallback((date: Date) => {
    if (!contractStartDate) return null

    const normalizedTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (normalizedTarget < contractStartDate) return null

    let diffMonths = (normalizedTarget.getFullYear() - contractStartDate.getFullYear()) * 12 +
      (normalizedTarget.getMonth() - contractStartDate.getMonth())

    let boundaryStart = new Date(contractStartDate)
    boundaryStart.setMonth(boundaryStart.getMonth() + diffMonths)

    while (boundaryStart > normalizedTarget && diffMonths > 0) {
      diffMonths -= 1
      boundaryStart = new Date(contractStartDate)
      boundaryStart.setMonth(boundaryStart.getMonth() + diffMonths)
    }

    let nextBoundary = new Date(boundaryStart)
    nextBoundary.setMonth(nextBoundary.getMonth() + 1)

    while (normalizedTarget >= nextBoundary) {
      diffMonths += 1
      boundaryStart = nextBoundary
      nextBoundary = new Date(boundaryStart)
      nextBoundary.setMonth(nextBoundary.getMonth() + 1)
    }

    return diffMonths
  }, [contractStartDate])

  // Fonction pour recharger les remboursements
  const reloadRefunds = React.useCallback(async () => {
    if (id) {
      try {
        const refundsData = await listRefunds(id)
        setRefunds(refundsData)
      } catch (error) {
        console.error('Error loading refunds:', error)
      }
    }
  }, [id])

  // Load refunds from subcollection
  useEffect(() => {
    reloadRefunds()
  }, [reloadRefunds])

  // Calculer les jours de retard et les pénalités
  const calculateLatePaymentInfo = (selectedDate: Date | null): { daysLate: number; penalty: number; hasPenalty: boolean } | null => {
    if (!selectedDate || !data) return null

    const paymentDate = new Date(selectedDate)
    paymentDate.setHours(0, 0, 0, 0)

    // Déterminer la date de référence (nextDueAt ou contractStartAt pour le 1er versement)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let referenceDate: Date
    if (data.nextDueAt) {
      referenceDate = new Date(data.nextDueAt)
    } else {
      // Premier versement : utiliser contractStartAt
      referenceDate = data.contractStartAt ? new Date(data.contractStartAt) : today
    }
    referenceDate.setHours(0, 0, 0, 0)

    // Calculer le nombre de jours de retard par rapport à la date d'échéance
    const diffTime = paymentDate.getTime() - referenceDate.getTime()
    const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    // Pas de retard si paiement avant ou à la date d'échéance
    if (daysLate <= 0) return null

    // Calculer les pénalités (à partir du 4ème jour)
    let penalty = 0
    if (daysLate >= 4 && settings.data?.penaltyRules?.day4To12?.perDay) {
      const penaltyRate = settings.data.penaltyRules.day4To12.perDay / 100
      penalty = penaltyRate * (data.monthlyAmount || 0) * daysLate
    }

    return {
      daysLate,
      penalty,
      hasPenalty: daysLate >= 4
    }
  }

  const latePaymentInfo = calculateLatePaymentInfo(selectedDate)

  // Synchroniser les valeurs existantes quand les données sont chargées
  useEffect(() => {
    if (data && refunds.length > 0) {
      // Trouver le remboursement en attente d'approbation
      const pendingRefund = refunds.find((r: any) => r.status === 'APPROVED')
      if (pendingRefund) {
        // Synchroniser les valeurs existantes dans le formulaire (sans reason qui est déjà saisi)
        const formData: Partial<EarlyRefundFormData> = {}

        if (pendingRefund.withdrawalDate) {
          try {
            const date = new Date(pendingRefund.withdrawalDate)
            if (!isNaN(date.getTime())) {
              formData.withdrawalDate = date.toISOString().split('T')[0]
            }
          } catch (error) {
            console.log('Erreur parsing date existante:', error)
          }
        }

        if (pendingRefund.withdrawalTime && pendingRefund.withdrawalTime !== '--:--' && pendingRefund.withdrawalTime !== 'undefined') {
          formData.withdrawalTime = pendingRefund.withdrawalTime
        }

        // Mettre à jour le formulaire avec les valeurs existantes
        if (Object.keys(formData).length > 0) {
          earlyRefundForm.reset({
            ...earlyRefundDefaultValues,
            ...formData
          })
        }
      }
    }
  }, [data, earlyRefundForm])

  if (isLoading) return <div className="p-4">Chargement…</div>
  if (isError) return <div className="p-4 text-red-600">Erreur de chargement du contrat: {(error as any)?.message}</div>
  if (!data) return <div className="p-4">Contrat introuvable</div>

  const isClosed = data.status === 'CLOSED' || data.status === 'RESCINDED'

  // Récupérer les membres du groupe si c'est un contrat de groupe
  const groupeId = (data as any).groupeId || ((data as any).memberId && (data as any).memberId.length > 20 ? (data as any).memberId : null)
  const isGroupContract = data.contractType === 'GROUP' || !!groupeId
  const { data: groupMembers, isLoading: isLoadingGroupMembers } = useGroupMembers(groupeId, isGroupContract)

  // Fonctions utilitaires pour le calendrier
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const currentDate = new Date(startDate)

    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }

  const getPaymentForDate = (date: Date) => {
    if (!data.payments) return null

    const monthIndex = getMonthIndexFromStart(date)
    if (monthIndex === null || monthIndex < 0) return null

    if (isGroupContract) {
      const payment = data.payments.find((p: any) => p.dueMonthIndex === monthIndex)
      if (!payment) return null

      if (payment.groupContributions && payment.groupContributions.length > 0) {
        const normalizedTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const hasContributionsOnDate = payment.groupContributions.some((contrib: any) => {
          if (!contrib.createdAt) return false
          let contribDate: Date
          if (contrib.createdAt instanceof Date) {
            contribDate = contrib.createdAt
          } else if (contrib.createdAt && typeof contrib.createdAt.toDate === 'function') {
            contribDate = contrib.createdAt.toDate()
          } else if (typeof contrib.createdAt === 'string') {
            contribDate = new Date(contrib.createdAt)
          } else {
            contribDate = new Date(contrib.createdAt)
          }
          const normalizedContribDate = new Date(contribDate.getFullYear(), contribDate.getMonth(), contribDate.getDate())
          return normalizedContribDate.getTime() === normalizedTargetDate.getTime()
        })

        return hasContributionsOnDate ? payment : null
      }

      return null
    }

    const payment = data.payments.find((p: any) => p.dueMonthIndex === monthIndex)
    if (!payment || !payment.contribs || !Array.isArray(payment.contribs)) return null

    const normalizedTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const hasContributionOnDate = payment.contribs.some((c: any) => {
      if (!c.paidAt) return false

      let contribDate: Date
      if (c.paidAt instanceof Date) {
        contribDate = c.paidAt
      } else if (c.paidAt && typeof c.paidAt.toDate === 'function') {
        contribDate = c.paidAt.toDate()
      } else if (typeof c.paidAt === 'string') {
        contribDate = new Date(c.paidAt)
      } else {
        contribDate = new Date(c.paidAt)
      }

      if (isNaN(contribDate.getTime())) return false
      const normalizedContribDate = new Date(contribDate.getFullYear(), contribDate.getMonth(), contribDate.getDate())
      return normalizedContribDate.getTime() === normalizedTargetDate.getTime()
    })

    return hasContributionOnDate ? payment : null
  }

  const getPaymentDetailsForDate = (date: Date) => {
    if (!data.payments) return null

    const monthIndex = getMonthIndexFromStart(date)
    if (monthIndex === null || monthIndex < 0) return null

    const payment = data.payments.find((p: any) => p.dueMonthIndex === monthIndex)
    if (!payment) return null

    if (payment.contribs && Array.isArray(payment.contribs)) {
      const contribution = payment.contribs.find((c: any) => {
        if (!c.paidAt) return false

        let contribDate: Date
        if (c.paidAt instanceof Date) {
          contribDate = c.paidAt
        } else if (c.paidAt && typeof c.paidAt.toDate === 'function') {
          contribDate = c.paidAt.toDate()
        } else if (typeof c.paidAt === 'string') {
          contribDate = new Date(c.paidAt)
        } else {
          contribDate = new Date(c.paidAt)
        }

        if (isNaN(contribDate.getTime())) return false
        const normalizedContribDate = new Date(contribDate.getFullYear(), contribDate.getMonth(), contribDate.getDate())
        const normalizedTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        return normalizedContribDate.getTime() === normalizedTargetDate.getTime()
      })

      if (contribution) {
        return { payment, contribution }
      }
    }

    if (isGroupContract && payment.groupContributions && payment.groupContributions.length > 0) {
      const normalizedTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const hasContributionsOnDate = payment.groupContributions.some((contrib: any) => {
        if (!contrib.createdAt) return false
        let contribDate: Date
        if (contrib.createdAt instanceof Date) {
          contribDate = contrib.createdAt
        } else if (contrib.createdAt && typeof contrib.createdAt.toDate === 'function') {
          contribDate = contrib.createdAt.toDate()
        } else if (typeof contrib.createdAt === 'string') {
          contribDate = new Date(contrib.createdAt)
        } else {
          contribDate = new Date(contrib.createdAt)
        }
        const normalizedContribDate = new Date(contribDate.getFullYear(), contribDate.getMonth(), contribDate.getDate())
        return normalizedContribDate.getTime() === normalizedTargetDate.getTime()
      })

      return hasContributionsOnDate ? { payment } : null
    }

    return null
  }

  const getMonthDateRange = useCallback((monthIndex: number) => {
    if (!contractStartDate) return null

    const start = new Date(contractStartDate)
    start.setMonth(start.getMonth() + monthIndex)

    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)

    return { start, end }
  }, [contractStartDate])

  const getTotalForMonth = (monthIndex: number) => {
    const payment = data.payments?.find((p: any) => p.dueMonthIndex === monthIndex)
    return payment?.accumulatedAmount || 0
  }

  const getMonthStatus = (monthIndex: number) => {
    const payment = data.payments?.find((p: any) => p.dueMonthIndex === monthIndex)
    if (!payment) return 'DUE'

    // Pour les contrats de groupe, vérifier si TOUS les jours du mois ont des contributions
    if (isGroupContract && payment.groupContributions) {
      // Calculer le nombre de jours dans ce mois
      const contractStartMonth = data.contractStartAt ? new Date(data.contractStartAt).getMonth() : new Date().getMonth()
      const targetMonth = contractStartMonth + monthIndex
      const year = data.contractStartAt ? new Date(data.contractStartAt).getFullYear() : new Date().getFullYear()
      const daysInMonth = new Date(year, targetMonth + 1, 0).getDate()

      // Vérifier si le nombre de contributions correspond au nombre de jours
      // (ou si le montant total atteint l'objectif mensuel)
      const totalContributed = payment.groupContributions.reduce((sum: number, contrib: any) => sum + contrib.amount, 0)
      const monthlyTarget = data.monthlyAmount || 0

      if (totalContributed >= monthlyTarget) {
        return 'PAID'
      } else {
        return 'PARTIAL' // Nouveau statut pour paiement partiel
      }
    }

    // Pour les contrats individuels, logique existante
    return payment.status
  }

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  const handlePdfUpload = async (document: RefundDocument | null) => {
    // Le document est maintenant persisté dans la base de données
    // On peut fermer le modal et rafraîchir les données
    setShowPdfModal(false)
    await refetch()
    await reloadRefunds() // Rafraîchir la liste des remboursements
  }

  const handleViewDocument = (refundId: string, document: RefundDocument) => {
    if (!document) {
      toast.error('Aucun document à afficher')
      return
    }
    setCurrentRefundId(refundId)
    setCurrentDocument(document)
    setShowPdfViewer(true)
  }

  const handleOpenPdfModal = (refundId: string) => {
    setCurrentRefundId(refundId)
    setShowPdfModal(true)
  }

  const handleDeleteDocument = async (refundId: string) => {
    try {
      const { updateRefund } = await import('@/db/caisse/refunds.db')

      await updateRefund(id, refundId, {
        document: null,
        updatedBy: user?.uid,
        documentDeletedAt: new Date()
      })

      await reloadRefunds() // Rafraîchir la liste des remboursements
      toast.success("Document supprimé avec succès")
    } catch (error: any) {
      console.error('Error deleting document:', error)
      toast.error(error?.message || "Erreur lors de la suppression du document")
    } finally {
      setConfirmDeleteDocumentId(null)
    }
  }

  // Fonction pour exporter les détails du versement en PDF
  const exportPaymentDetailsToPDF = async () => {
    if (!selectedDate || !paymentDetails) {
      toast.error('Aucun détail de versement à exporter')
      return
    }

    try {
      toast.info('Génération du PDF en cours...')
      const doc = new jsPDF('p', 'mm', 'a4')

      // En-tête du document
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Détails du Versement', 14, 15)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Contrat #${id}`, 14, 22)
      doc.text(`Date du versement : ${selectedDate.toLocaleDateString('fr-FR')}`, 14, 28)
      doc.text(`Date d'export : ${new Date().toLocaleDateString('fr-FR')}`, 14, 34)

      const payment = paymentDetails
      const yStart = 42

      // Informations générales du versement
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Informations générales', 14, yStart)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      let yPos = yStart + 6
      doc.text(`Statut : ${payment.status === 'PAID' ? 'Payé' : 'En cours'}`, 14, yPos)
      yPos += 6
      doc.text(`Total du mois : ${formatAmount(payment.accumulatedAmount || 0)} FCFA`, 14, yPos)
      yPos += 6
      doc.text(`Objectif mensuel : ${formatAmount(data.monthlyAmount || 0)} FCFA`, 14, yPos)
      yPos += 6

      // Afficher les pénalités si elles existent
      if (payment.penaltyApplied && payment.penaltyApplied > 0) {
        doc.setTextColor(220, 38, 38) // Rouge
        doc.text(`Pénalités appliquées : ${formatAmount(payment.penaltyApplied)} FCFA`, 14, yPos)
        yPos += 6
        if (payment.penaltyDays && payment.penaltyDays > 0) {
          doc.text(`Jours de retard : ${payment.penaltyDays}`, 14, yPos)
          yPos += 6
        }
        doc.setTextColor(0, 0, 0) // Revenir au noir
      }
      yPos += 4

      // Détails des contributions
      if (isGroupContract && payment.groupContributions && payment.groupContributions.length > 0) {
        // Contributions de groupe
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(`Contributions des membres (${payment.groupContributions.length})`, 14, yPos)
        yPos += 8

        const tableData = payment.groupContributions.map((contrib: any) => {
          const row = [
            `${contrib.memberFirstName} ${contrib.memberLastName}`,
            contrib.memberMatricule,
            `${formatAmount(contrib.amount)} FCFA`,
            contrib.time || '',
            contrib.mode === 'airtel_money' ? 'Airtel Money' :
              contrib.mode === 'mobicash' ? 'Mobicash' :
                contrib.mode === 'cash' ? 'Espèce' :
                  contrib.mode === 'bank_transfer' ? 'Virement bancaire' : 'Inconnu'
          ]

          // Ajouter les pénalités si présentes
          if (contrib.penalty && contrib.penalty > 0) {
            row.push(`${formatAmount(contrib.penalty)} FCFA`)
          } else {
            row.push('-')
          }

          return row
        })

        // Vérifier si au moins une contribution a des pénalités
        const hasPenalties = payment.groupContributions.some((c: any) => c.penalty && c.penalty > 0)

        autoTable(doc, {
          head: [hasPenalties
            ? ['Membre', 'Matricule', 'Montant', 'Heure', 'Mode', 'Pénalité']
            : ['Membre', 'Matricule', 'Montant', 'Heure', 'Mode']
          ],
          body: tableData,
          startY: yPos,
          styles: {
            fontSize: 9,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [35, 77, 101],
            textColor: 255,
            fontStyle: 'bold',
          },
          columnStyles: hasPenalties ? {
            0: { cellWidth: 40 },
            1: { cellWidth: 25 },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 30 },
            5: { cellWidth: 27, halign: 'right' },
          } : {
            0: { cellWidth: 50 },
            1: { cellWidth: 30 },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 35 },
          },
        })

        // Mettre à jour yPos après le tableau
        yPos = (doc as any).lastAutoTable.finalY + 10

        // Ajouter les preuves de versement pour chaque membre (si disponibles)
        const contribsWithProof = payment.groupContributions.filter((c: any) => c.proofUrl)
        if (contribsWithProof.length > 0) {
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text('Preuves de versement', 14, yPos)
          yPos += 8

          for (const contrib of contribsWithProof) {
            // Vérifier si on doit ajouter une nouvelle page
            if (yPos > doc.internal.pageSize.getHeight() - 80) {
              doc.addPage()
              yPos = 20
            }

            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text(`${contrib.memberFirstName} ${contrib.memberLastName} (${contrib.memberMatricule})`, 14, yPos)
            yPos += 6

            try {
              const imgData = await loadImageAsBase64(contrib.proofUrl)
              const imgWidth = 80
              const imgHeight = 60

              // Vérifier à nouveau après avoir chargé l'image
              if (yPos + imgHeight > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage()
                yPos = 20
                // Répéter le nom du membre sur la nouvelle page
                doc.setFontSize(10)
                doc.setFont('helvetica', 'bold')
                doc.text(`${contrib.memberFirstName} ${contrib.memberLastName} (${contrib.memberMatricule})`, 14, yPos)
                yPos += 6
              }

              doc.addImage(imgData, 'JPEG', 14, yPos, imgWidth, imgHeight)
              yPos += imgHeight + 8
            } catch (error) {
              console.error('Erreur lors du chargement de l\'image:', error)
              doc.setFontSize(9)
              doc.setFont('helvetica', 'italic')
              doc.setTextColor(128, 128, 128)
              doc.text('(Image non disponible)', 14, yPos)
              yPos += 8
              doc.setTextColor(0, 0, 0)
            }
          }
        }
      } else if (payment.contribs && payment.contribs.length > 0) {
        // Contribution individuelle - trouver celle correspondant à la date sélectionnée
        const contrib = payment.contribs.find((c: any) => {
          if (!c.paidAt) return false
          const contribDate = typeof c.paidAt.toDate === 'function' ? c.paidAt.toDate() : new Date(c.paidAt)
          contribDate.setHours(0, 0, 0, 0)
          const selected = new Date(selectedDate!)
          selected.setHours(0, 0, 0, 0)
          return contribDate.getTime() === selected.getTime()
        }) || payment.contribs[0] // Fallback sur la première si aucune correspondance

        console.log('📄 Export PDF - Contribution utilisée:', {
          contributionId: contrib?.id,
          proofUrl: contrib?.proofUrl,
          amount: contrib?.amount
        })

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Détail de la contribution', 14, yPos)
        yPos += 8

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Montant : ${formatAmount(contrib.amount || 0)} FCFA`, 14, yPos)
        yPos += 6
        if (contrib.time) {
          doc.text(`Heure : ${contrib.time}`, 14, yPos)
          yPos += 6
        }
        if (contrib.mode) {
          const modeLabel = contrib.mode === 'airtel_money' ? 'Airtel Money' :
            contrib.mode === 'mobicash' ? 'Mobicash' :
              contrib.mode === 'cash' ? 'Espèce' :
                contrib.mode === 'bank_transfer' ? 'Virement bancaire' : 'Inconnu'
          doc.text(`Mode : ${modeLabel}`, 14, yPos)
          yPos += 6
        }

        // Afficher les pénalités de la contribution si présentes
        if (contrib.penalty && contrib.penalty > 0) {
          doc.setTextColor(220, 38, 38) // Rouge
          doc.text(`Pénalité : ${formatAmount(contrib.penalty)} FCFA`, 14, yPos)
          yPos += 6
          if (contrib.penaltyDays && contrib.penaltyDays > 0) {
            doc.text(`Jours de retard : ${contrib.penaltyDays}`, 14, yPos)
            yPos += 6
          }
          doc.setTextColor(0, 0, 0) // Revenir au noir
        }

        // Ajouter la preuve de versement si disponible
        if (contrib.proofUrl) {
          yPos += 4
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.text('Preuve de versement :', 14, yPos)
          yPos += 6

          try {
            // Charger l'image et l'ajouter au PDF
            const imgData = await loadImageAsBase64(contrib.proofUrl)
            const imgWidth = 80 // Largeur de l'image en mm
            const imgHeight = 60 // Hauteur de l'image en mm

            // Vérifier si on doit ajouter une nouvelle page
            if (yPos + imgHeight > doc.internal.pageSize.getHeight() - 20) {
              doc.addPage()
              yPos = 20
            }

            doc.addImage(imgData, 'JPEG', 14, yPos, imgWidth, imgHeight)
            yPos += imgHeight + 5
          } catch (error) {
            console.error('Erreur lors du chargement de l\'image:', error)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(128, 128, 128)
            doc.text('(Image non disponible)', 14, yPos)
            yPos += 6
            doc.setTextColor(0, 0, 0)
          }
        }
      }

      // Pied de page
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        `Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
        doc.internal.pageSize.getWidth() / 2,
        pageHeight - 10,
        { align: 'center' }
      )

      // Télécharger le PDF
      const dateStr = selectedDate.toISOString().split('T')[0]
      const fileName = `versement_${id}_${dateStr}.pdf`
      doc.save(fileName)
      toast.success('PDF téléchargé avec succès')
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  // Fonction helper pour charger une image en base64
  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Si l'URL est déjà en base64, la retourner directement
      if (url.startsWith('data:')) {
        resolve(url)
        return
      }

      // Pour les images Firebase Storage, on doit d'abord les charger via fetch
      // car elles nécessitent des tokens d'authentification
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.blob()
        })
        .then(blob => {
          const reader = new FileReader()

          reader.onloadend = () => {
            const result = reader.result as string

            // Créer une image pour la redimensionner si nécessaire
            const img = new Image()

            img.onload = () => {
              try {
                const canvas = document.createElement('canvas')

                // Redimensionner si l'image est trop grande (max 1200px de largeur)
                const maxWidth = 1200
                let width = img.width
                let height = img.height

                if (width > maxWidth) {
                  height = (height * maxWidth) / width
                  width = maxWidth
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                  reject(new Error('Impossible de créer le contexte canvas'))
                  return
                }

                ctx.drawImage(img, 0, 0, width, height)
                const dataURL = canvas.toDataURL('image/jpeg', 0.85)
                resolve(dataURL)
              } catch (error) {
                console.error('Erreur lors du traitement de l\'image:', error)
                reject(error)
              }
            }

            img.onerror = () => {
              reject(new Error('Erreur lors du chargement de l\'image'))
            }

            img.src = result
          }

          reader.onerror = () => {
            reject(new Error('Erreur lors de la lecture du blob'))
          }

          reader.readAsDataURL(blob)
        })
        .catch(error => {
          console.error('Erreur lors du chargement de l\'image depuis Firebase:', error)
          reject(error)
        })
    })
  }

  const onDateClick = async (date: Date) => {
    if (isClosed) return

    // Vérifier si la date est antérieure au premier versement
    const firstPaymentDate = data.contractStartAt ? new Date(data.contractStartAt) : new Date()
    firstPaymentDate.setHours(0, 0, 0, 0)
    const selectedDateStart = new Date(date)
    selectedDateStart.setHours(0, 0, 0, 0)

    if (selectedDateStart < firstPaymentDate) {
      toast.error('Impossible de verser sur une date antérieure au premier versement')
      return
    }

    setSelectedDate(date)

    // Utiliser les données locales au lieu d'appeler Firestore
    const existingPayment = getPaymentForDate(date)

    if (existingPayment) {
      console.log('✅ Paiement trouvé localement:', existingPayment)

      if (isGroupContract) {
        // Pour les contrats de groupe, permettre d'ajouter de nouvelles contributions
        // ou de voir les détails existants
        setPaymentDetails(existingPayment)
        setShowPaymentDetailsModal(true)
      } else {
        // Pour les contrats individuels, afficher les détails
        setPaymentDetails(existingPayment)
        setShowPaymentDetailsModal(true)
      }
    } else {
      console.log('❌ Aucun paiement trouvé, affichage du formulaire de création')
      // Créer un nouveau versement
      setPaymentDetails(null)
      // Initialiser l'heure actuelle par défaut
      const now = new Date()
      setPaymentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
      setShowPaymentModal(true)
    }
  }

  const onPaymentSubmit = async () => {
    console.log('💰 Soumission du versement...')
    console.log('📋 Données du formulaire:', {
      selectedDate,
      paymentAmount,
      paymentTime,
      paymentFile: paymentFile ? {
        name: paymentFile.name,
        type: paymentFile.type,
        size: paymentFile.size
      } : 'undefined',
      paymentMode
    })

    if (!selectedDate || !paymentAmount || !paymentTime || !paymentFile) {
      console.error('❌ Champs manquants:', {
        selectedDate: !!selectedDate,
        paymentAmount: !!paymentAmount,
        paymentTime: !!paymentTime,
        paymentFile: !!paymentFile
      })
      toast.error('Veuillez remplir tous les champs')
      return
    }

    const amount = Number(paymentAmount)
    if (amount <= 0) {
      toast.error('Le montant doit être positif')
      return
    }

    try {
      setIsPaying(true)
      console.log('🚀 Envoi du versement à la base de données...')

      // Trouver le mois correspondant à la date sélectionnée
      const monthIndex = getMonthIndexFromStart(selectedDate)
      if (monthIndex === null || monthIndex < 0) {
        toast.error('Date de versement invalide')
        setIsPaying(false)
        return
      }

      if (isGroupContract && groupMembers) {
        // Utiliser la nouvelle fonction payGroup pour les contrats de groupe
        const selectedMember = groupMembers.find(m => m.id === selectedGroupMemberId)
        if (!selectedMember) {
          toast.error('Membre du groupe non trouvé')
          return
        }

        const { payGroup } = await import('@/services/caisse/mutations')
        console.log('📤 Envoi payGroup avec file:', paymentFile?.name)
        await payGroup({
          contractId: id,
          dueMonthIndex: monthIndex,
          memberId: selectedMember.id,
          memberName: `${selectedMember.firstName} ${selectedMember.lastName}`,
          memberMatricule: selectedMember.matricule || '',
          memberPhotoURL: selectedMember.photoURL || undefined,
          memberContacts: selectedMember.contacts || [],
          amount,
          file: paymentFile,
          paidAt: selectedDate,
          time: paymentTime,
          mode: paymentMode as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer'
        })

        console.log('✅ payGroup terminé avec succès')
        toast.success('Contribution ajoutée au versement collectif')
      } else {
        // Utiliser la fonction pay normale pour les contrats individuels
        const { pay } = await import('@/services/caisse/mutations')
        console.log('📤 Envoi pay avec file:', paymentFile?.name)
        await pay({
          contractId: id,
          dueMonthIndex: monthIndex,
          memberId: data.memberId,
          amount,
          file: paymentFile,
          paidAt: selectedDate,
          time: paymentTime,
          mode: paymentMode as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer'
        })

        console.log('✅ pay terminé avec succès')
        toast.success('Versement enregistré')
      }

      await refetch()
      setShowPaymentModal(false)
      setSelectedDate(null)
      setPaymentAmount('')
      setPaymentTime('')
      setPaymentMode('airtel_money')
      setPaymentFile(undefined)
      setSelectedGroupMemberId('')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setIsPaying(false)
    }
  }

  const onEditPaymentSubmit = async () => {
    if (!editingContribution || !paymentAmount || !paymentTime) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    const amount = Number(paymentAmount)
    if (amount <= 0) {
      toast.error('Le montant doit être positif')
      return
    }

    try {
      setIsEditing(true)

      if (isGroupContract) {
        // Pour les contrats de groupe, on ne peut pas modifier les contributions individuelles
        // On peut seulement les supprimer et en créer de nouvelles
        toast.error('Pour les contrats de groupe, vous ne pouvez pas modifier les contributions. Supprimez et recréez si nécessaire.')
        setShowEditPaymentModal(false)
        setEditingContribution(null)
        return
      }

      await updatePaymentContribution({
        contractId: id,
        paymentId: paymentDetails.payment.id,
        contributionId: editingContribution.id,
        updates: {
          amount,
          time: paymentTime,
          mode: paymentMode as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer',
          proofFile: paymentFile // Optionnel
        }
      })

      await refetch()
      toast.success('Versement modifié avec succès')
      setShowEditPaymentModal(false)
      setEditingContribution(null)
      setPaymentAmount('')
      setPaymentTime('')
      setPaymentMode('airtel_money')
      setPaymentFile(undefined)
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la modification')
    } finally {
      setIsEditing(false)
    }
  }

  const monthDays = getMonthDays(currentMonth)

  const currentRefund = useMemo(() => {
    return currentRefundId ? refunds.find((r: any) => r.id === currentRefundId) : null
  }, [currentRefundId, refunds])

  const documentMemberId = useMemo(() => {
    if ((data as any).memberId) return (data as any).memberId
    if ((data as any).groupeId) return `GROUP_${(data as any).groupeId}`
    return ''
  }, [data])

  useEffect(() => {
    if (contractStartDate) {
      setCurrentMonth(contractStartDate)
    }
  }, [contractStartDate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* En-tête avec bouton retour */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push(routes.admin.caisseSpeciale)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push(routes.admin.caisseSpecialeContractPayments(id))}
              className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <History className="h-4 w-4" />
              Historique des versements
            </Button>

            <EmergencyContact emergencyContact={(data as any)?.emergencyContact} />
            </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white text-lg px-4 py-2">
              {isGroupContract ? 'Contrat de Groupe' : 'Contrat Journalier'}
              </Badge>
            {(() => {
              const statusConfig = getContractStatusConfig(data.status)
              const StatusIcon = statusConfig.icon
              return (
                <Badge className={`${statusConfig.bg} ${statusConfig.text} text-lg px-4 py-2 flex items-center gap-1.5`}>
                  <StatusIcon className="h-4 w-4" />
                  {statusConfig.label}
                </Badge>
              )
            })()}
            {isClosed && (
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-lg px-4 py-2 flex items-center gap-1.5">
                <XCircle className="h-4 w-4" />
                Contrat fermé
              </Badge>
            )}
            </div>
          </div>

        {/* Titre principal */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] overflow-hidden">
          <CardHeader className="overflow-hidden">
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-black text-white flex items-center gap-3 break-words">
              <Calendar className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0" />
              <span className="break-words">{member?.firstName || ''} {member?.lastName || ''}</span>
            </CardTitle>
            <div className="space-y-1 text-blue-100 break-words">
              <p className="text-sm sm:text-base lg:text-lg break-words">
                Contrat <span className="font-mono text-xs sm:text-sm break-all">#{id}</span>
              </p>
              <p className="text-sm break-words">
                {member?.firstName || ''} {member?.lastName || ''} - Objectif mensuel: <span className="font-mono text-xs break-all">{formatAmount(data.monthlyAmount || 0)} FCFA</span>
              </p>
              <p className="text-xs break-words">
                Type de caisse: <span className="font-mono">{String((data as any).caisseType)}</span>
              </p>
          </div>
          </CardHeader>
        </Card>

        {/* Outils de test (DEV uniquement) */}
        <TestPaymentTools
          contractId={id}
          contractData={data}
          onPaymentSuccess={async () => {
            await refetch()
          }}
        />

      {/* Navigation du calendrier */}
        <Card className="border-0 shadow-xl">
          <CardContent className="p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const prevMonth = new Date(currentMonth)
              prevMonth.setMonth(prevMonth.getMonth() - 1)
              setCurrentMonth(prevMonth)
            }}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Mois précédent</span>
            <span className="sm:hidden">Précédent</span>
          </Button>

          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 text-center order-first sm:order-none">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextMonth = new Date(currentMonth)
              nextMonth.setMonth(nextMonth.getMonth() + 1)
              setCurrentMonth(nextMonth)
            }}
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">Mois suivant</span>
            <span className="sm:hidden">Suivant</span>
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Grille du calendrier */}
        <div className="grid grid-cols-7 gap-1">
          {/* En-têtes des jours */}
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
            <div key={day} className="p-2 lg:p-3 text-center text-xs lg:text-sm font-medium text-gray-500 bg-gray-50 rounded-lg">
              {day}
            </div>
          ))}

          {/* Jours du mois */}
          {monthDays.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
            const isToday = date.toDateString() === new Date().toDateString()
            const payment = getPaymentForDate(date)
            const hasPayment = !!payment

            // Vérifier si la date est antérieure au premier versement
            const firstPaymentDate = data.contractStartAt ? new Date(data.contractStartAt) : new Date()
            firstPaymentDate.setHours(0, 0, 0, 0)
            const dateToCheck = new Date(date)
            dateToCheck.setHours(0, 0, 0, 0)
            const isBeforeFirstPayment = dateToCheck < firstPaymentDate

            // Déterminer la couleur et le style selon le statut
            let dayStyle = ''
            let dayContent = null

            if (!isCurrentMonth) {
              // Jours d'autres mois
              dayStyle = 'bg-gray-50 text-gray-400 cursor-not-allowed'
              dayContent = null
            } else if (isBeforeFirstPayment) {
              // Jours avant la date de début
              dayStyle = 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
              dayContent = (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <XCircle className="h-3 w-3" />
                  <span className="hidden sm:inline">Non disponible</span>
                  <span className="sm:hidden">N/A</span>
                </div>
              )
            } else if (hasPayment) {
              // Jours avec versement effectué
              dayStyle = 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
              dayContent = (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span className="hidden sm:inline">Versé</span>
                  <span className="sm:hidden">✓</span>
                </div>
              )
            } else {
              // Vérifier si le jour est dans le passé (après la date de début)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const isPastDay = dateToCheck < today

              if (isPastDay) {
                // Jours passés sans versement (après la date de début)
                dayStyle = 'bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer'
                dayContent = (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">À verser</span>
                    <span className="sm:hidden">À verser</span>
                  </div>
                )
              } else {
                // Jours futurs (après la date de début mais pas encore arrivés)
                dayStyle = 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                dayContent = (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span className="hidden sm:inline">À venir</span>
                    <span className="sm:hidden">À venir</span>
                  </div>
                )
              }
            }

            // Style spécial pour aujourd'hui
            if (isToday && isCurrentMonth && !isBeforeFirstPayment) {
              // Aujourd'hui hérite de la couleur de son statut mais avec une intensité plus forte
              if (hasPayment) {
                dayStyle = 'bg-green-100 border-green-300 hover:bg-green-200 cursor-pointer'
              } else {
                // Aujourd'hui sans versement = rouge (car c'est un jour passé)
                dayStyle = 'bg-red-100 border-red-300 hover:bg-red-200 cursor-pointer'
              }
              // Ajouter un indicateur "Aujourd'hui"
              dayContent = (
                <div className="space-y-1">
                  {dayContent}
                  <div className="text-xs text-blue-600 font-medium">
                    <span className="hidden sm:inline">Aujourd'hui</span>
                    <span className="sm:hidden">Auj</span>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={index}
                className={`p-2 lg:p-3 min-h-[60px] lg:min-h-[80px] border rounded-lg transition-all duration-200 ${dayStyle}`}
                onClick={() => isCurrentMonth && !isBeforeFirstPayment && onDateClick(date)}
              >
                <div className="text-xs lg:text-sm font-medium mb-1">
                  {date.getDate()}
                </div>

                {isCurrentMonth && dayContent}
              </div>
            )
          })}
        </div>

        {/* Légende des couleurs */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-700 mb-2">Légende des couleurs :</div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded"></div>
              <span className="text-green-700">Versé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border-2 border-red-200 rounded"></div>
              <span className="text-red-700">À verser (passé)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded"></div>
              <span className="text-gray-700">À venir</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded"></div>
              <span className="text-gray-600">Non disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
              <span className="text-blue-700">Aujourd'hui</span>
            </div>
          </div>
        </div>
          </CardContent>
        </Card>

      {/* Résumé mensuel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {Array.from({ length: data.monthsPlanned || 0 }).map((_, monthIndex) => {
          const total = getTotalForMonth(monthIndex)
          const status = getMonthStatus(monthIndex)
          const target = data.monthlyAmount || 0
          const percentage = target > 0 ? Math.min(100, (total / target) * 100) : 0

          return (
            <Card key={monthIndex} className="shadow-lg border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                  Mois {monthIndex + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const range = getMonthDateRange(monthIndex)
                  if (!range) return null
                  return (
                    <div className="text-xs text-gray-500">
                      {range.start.toLocaleDateString('fr-FR')} → {range.end.toLocaleDateString('fr-FR')}
                    </div>
                  )
                })()}
                <div className="flex items-center justify-between">
                  <span className="text-xs lg:text-sm text-gray-600">Objectif</span>
                  <span className="text-sm lg:text-base font-semibold">{formatAmount(target)} FCFA</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs lg:text-sm text-gray-600">Versé</span>
                  <span className="text-sm lg:text-base font-semibold text-green-600">{formatAmount(total)} FCFA</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs lg:text-sm">
                    <span>Progression</span>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${percentage >= 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      status === 'PAID' ? 'default' :
                        status === 'PARTIAL' ? 'secondary' :
                          status === 'DUE' ? 'secondary' : 'destructive'
                    }
                    className="text-xs"
                  >
                    {status === 'PAID' ? 'Complété' : status === 'PARTIAL' ? 'Partiel' : status === 'DUE' ? 'En cours' : status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

        {/* Section Remboursements */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600">
            <CardTitle className="flex items-center gap-2 text-white">
              <RefreshCw className="h-5 w-5" />
          Remboursements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {(() => {
            const payments = data.payments || []
            const paidCount = payments.filter((x: any) => x.status === 'PAID').length
            const allPaid = payments.length > 0 && paidCount === payments.length

            // Pour DailyContract : vérifier s'il y a au moins 1 versement (contribution)
            const hasAtLeastOneContribution = payments.some((p: any) => {
              if (isGroupContract) {
                return p.groupContributions && p.groupContributions.length > 0
              } else {
                return p.contribs && p.contribs.length > 0
              }
            })

            const canEarly = hasAtLeastOneContribution && !allPaid
            const hasFinalRefund = refunds.some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED') || data.status === 'FINAL_REFUND_PENDING' || data.status === 'CLOSED'
            const hasEarlyRefund = refunds.some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED') || data.status === 'EARLY_REFUND_PENDING'
                
                // Vérifier si une demande de retrait anticipé ou remboursement final est active (PENDING ou APPROVED)
                const hasActiveRefund = refunds.some((r: any) => 
                  (r.type === 'EARLY' || r.type === 'FINAL') && 
                  (r.status === 'PENDING' || r.status === 'APPROVED')
                )

            return (
              <>
                <Button
                      variant="outline"
                      className="flex items-center justify-center gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  disabled={isRefunding || !allPaid || hasFinalRefund}
                  onClick={() => {
                    setRefundType('FINAL')
                    setRefundReasonInput('')
                    setShowReasonModal(true)
                  }}
                >
                      <TrendingUp className="h-5 w-5" />
                      Demander remboursement final
                </Button>

                <Button
                  variant="outline"
                      className="flex items-center justify-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                  disabled={isRefunding || !canEarly || hasEarlyRefund}
                  onClick={() => {
                    setRefundType('EARLY')
                    setRefundReasonInput('')
                    setShowReasonModal(true)
                  }}
                >
                      <Download className="h-5 w-5" />
                      Demander retrait anticipé
                </Button>

                <Button
                  variant="outline"
                      className="flex items-center justify-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
                      disabled={!hasActiveRefund}
                  onClick={() => setShowRemboursementPdf(true)}
                >
                      <FileText className="h-5 w-5" />
                      PDF Remboursement
                </Button>
              </>
            )
          })()}
        </div>

            {/* Liste des remboursements */}
            <div className="grid grid-cols-1 gap-6">
              {refunds.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                    <RefreshCw className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun remboursement</h3>
                  <p className="text-gray-600">Aucune demande de remboursement n'a été effectuée</p>
                </div>
              ) : (
                refunds.map((r: any) => {
                  const getRefundStatusConfig = (status: string) => {
                    switch (status) {
                      case 'PENDING':
                        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock }
                      case 'APPROVED':
                        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle }
                      case 'PAID':
                        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle }
                      default:
                        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle }
                    }
                  }

                  const statusConfig = getRefundStatusConfig(r.status)
                  const StatusIcon = statusConfig.icon

                  return (
                    <div key={r.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 rounded-lg p-2">
                            <RefreshCw className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {r.type === 'FINAL' ? 'Remboursement Final' : r.type === 'EARLY' ? 'Retrait Anticipé' : 'Remboursement par Défaut'}
                            </h3>
                            <Badge className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border mt-1`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                    {r.status === 'PENDING' ? 'En attente' : r.status === 'APPROVED' ? 'Approuvé' : r.status === 'PAID' ? 'Payé' : 'Archivé'}
                  </Badge>
                          </div>
                        </div>
                </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Montant nominal:</span>
                          <span className="font-semibold">{formatAmount(r.amountNominal || 0)} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bonus:</span>
                          <span className="font-semibold">{formatAmount(r.amountBonus || 0)} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Échéance:</span>
                          <span className="font-semibold">{r.deadlineAt ? new Date(r.deadlineAt).toLocaleDateString('fr-FR') : '—'}</span>
                        </div>
                </div>

                  {r.status === 'PENDING' && (
                        <div className="space-y-2">
                          {/* Première ligne : Approbation et Document de remboursement */}
                    <div className="flex flex-col sm:flex-row gap-2">
                            <button 
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setConfirmApproveId(r.id)}
                        disabled={(r.type === 'FINAL' && !r.document) || (r.type === 'EARLY' && !r.document)}
                      >
                        Approuver
                            </button>
                      {(r.type === 'FINAL' || r.type === 'EARLY') && (
                              <button 
                                className="flex-1 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                            onClick={() => setShowRemboursementPdf(true)}
                          >
                            <FileText className="h-4 w-4" />
                            Document de remboursement
                              </button>
                            )}
                          </div>

                          {/* Deuxième ligne : Actions sur le PDF */}
                          {(r.type === 'FINAL' || r.type === 'EARLY') && (
                            <div className="flex flex-col sm:flex-row gap-2">
                          {r.document ? (
                            <>
                                  <button 
                                    className="flex-1 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                onClick={() => handleViewDocument(r.id, r.document)}
                              >
                                <Eye className="h-4 w-4" />
                                Voir PDF
                                  </button>
                                  <button 
                                    className="flex-1 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                onClick={() => handleOpenPdfModal(r.id)}
                              >
                                <FileText className="h-4 w-4" />
                                Remplacer PDF
                                  </button>
                                  <button 
                                    className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                onClick={() => setConfirmDeleteDocumentId(r.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                                  </button>
                            </>
                          ) : (
                                <button 
                                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                              onClick={() => handleOpenPdfModal(r.id)}
                            >
                              <FileText className="h-4 w-4" />
                              Ajouter PDF
                                </button>
                          )}
                            </div>
                      )}

                          {/* Troisième ligne : Annulation (si applicable) */}
                      {r.type === 'EARLY' && !r.document && (
                            <button 
                              className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium"
                          onClick={async () => {
                            try {
                                  await cancelEarlyRefund(id, r.id); 
                                  await refetch();
                                  await reloadRefunds(); // Rafraîchir la liste des remboursements
                              toast.success('Demande anticipée annulée')
                                } catch(e: any) { 
                              toast.error(e?.message || 'Annulation impossible')
                            }
                          }}
                        >
                              Annuler la demande
                            </button>
                      )}
                    </div>
                  )}

                  {r.status === 'APPROVED' && (
                        <div className="space-y-4">
                      {/* Affichage de la cause (non modifiable) */}
                      {r.reason && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <label className="block text-xs text-blue-700 font-medium mb-1">Cause du retrait:</label>
                          <p className="text-sm text-blue-900">{r.reason}</p>
                        </div>
                      )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Date du retrait *</label>
                                <input
                                      type="date"
                                  value={refundDate}
                                  onChange={(e) => setRefundDate(e.target.value)}
                                  className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Heure du retrait *</label>
                                <input
                                      type="time"
                                  value={refundTime}
                                  onChange={(e) => setRefundTime(e.target.value)}
                                  className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Preuve du retrait *</label>
                            <input
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                const f = e.target.files?.[0]
                                if (!f) {
                                  setRefundFile(undefined)
                                          return
                                        }
                                if (!f.type.startsWith('image/')) {
                                          toast.error('La preuve doit être une image (JPG, PNG, WebP...)')
                                  setRefundFile(undefined)
                                          return
                                        }
                                setRefundFile(f)
                                        toast.success('Preuve PDF sélectionnée')
                                      }}
                              className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                            />
                          </div>

                          <button 
                            className="w-full px-4 py-3 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white rounded-lg hover:shadow-lg hover:shadow-[#234D65]/25 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                            disabled={(() => {
                              const hasFile = !!refundFile
                              const hasDate = refundDate || r.withdrawalDate
                              const hasTime = (refundTime && refundTime.trim()) || (r.withdrawalTime && r.withdrawalTime.trim() && r.withdrawalTime !== '--:--')
                              return !hasFile || !hasDate || !hasTime
                            })()}
                            onClick={async () => { 
                              try {
                                const normalizeDate = (dateValue: any): string | null => {
                                  if (!dateValue) return null
                                  try {
                                    let date: Date
                                    if (dateValue && typeof dateValue.toDate === 'function') {
                                      date = dateValue.toDate()
                                    } else if (dateValue instanceof Date) {
                                      date = dateValue
                                    } else if (typeof dateValue === 'string') {
                                      date = new Date(dateValue)
                                    } else {
                                      date = new Date(dateValue)
                                    }
                                    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
                                  } catch {
                                    return null
                                  }
                                }
                                
                                await markRefundPaid(id, r.id, refundFile, {
                                  reason: r.reason,
                                  withdrawalDate: refundDate || normalizeDate(r.withdrawalDate) || undefined,
                                  withdrawalTime: refundTime || r.withdrawalTime
                                })
                                setRefundDate('')
                                setRefundTime('')
                                setRefundFile(undefined)
                                setConfirmPaidId(null)
                                await refetch()
                                await reloadRefunds() // Rafraîchir la liste des remboursements
                                toast.success('Remboursement marqué payé')
                              } catch (error: any) {
                                toast.error(error?.message || 'Erreur lors du marquage')
                              }
                            }}
                          >
                            <CheckCircle className="h-5 w-5" />
                            Marquer comme payé
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
                  )}
                </div>
              </CardContent>
            </Card>
      </div>

      {/* Modal de versement */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Nouveau versement
            </DialogTitle>
            <DialogDescription>
              Enregistrer un versement pour le {selectedDate?.toLocaleDateString('fr-FR')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date et Heure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date de paiement *
                  <span className="text-xs text-muted-foreground">(fixe)</span>
                </Label>
                <Input
                  id="date"
                  type="text"
                  value={selectedDate?.toLocaleDateString('fr-FR') || ''}
                  disabled
                  className="w-full bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  📅 La date correspond au jour sélectionné dans le calendrier
                </p>
              </div>

              <div>
                <Label htmlFor="time" className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Heure de paiement *
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Montant */}
            <div>
              <Label htmlFor="amount" className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Montant du versement (FCFA) *
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="Ex: 10000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="100"
                step="100"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                💡 Pour les paiements quotidiens, le montant peut varier chaque jour. Montant minimum: 100 FCFA
              </p>
            </div>

            {/* Sélection du membre du groupe (si contrat de groupe) */}
            {isGroupContract && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                  <div className="space-y-2">
                    <strong>Membre du groupe qui verse *</strong>
                    <Select value={selectedGroupMemberId} onValueChange={setSelectedGroupMemberId}>
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Sélectionnez le membre qui verse" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupMembers && groupMembers.length > 0 ? (
                          groupMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.firstName} {member.lastName} ({member.matricule})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            Chargement des membres du groupe...
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-blue-600 mt-1">
                      Ce champ permet de tracer qui a effectué le versement dans le groupe
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Mode de paiement */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                Mode de paiement *
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="airtel_money"
                    checked={paymentMode === 'airtel_money'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-red-100 rounded-lg p-2">
                      <Smartphone className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="font-medium text-gray-900">Airtel Money</span>
                  </div>
                </label>

                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="mobicash"
                    checked={paymentMode === 'mobicash'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <Banknote className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">Mobicash</span>
                  </div>
                </label>

                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="cash"
                    checked={paymentMode === 'cash'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-green-100 rounded-lg p-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="font-medium text-gray-900">Espèce</span>
                  </div>
                </label>

                <label className="relative flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-[#224D62] has-[:checked]:bg-[#224D62]/5">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="bank_transfer"
                    checked={paymentMode === 'bank_transfer'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                    className="text-[#224D62] focus:ring-[#224D62]"
                  />
                  <div className="ml-3 flex items-center gap-3">
                    <div className="bg-purple-100 rounded-lg p-2">
                      <Building2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="font-medium text-gray-900">Virement bancaire</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Preuve de paiement */}
            <div>
              <Label htmlFor="proof" className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                Preuve de paiement *
              </Label>
              <Input
                id="proof"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  console.log('📎 Fichier sélectionné:', file)
                  if (!file) {
                    console.log('❌ Aucun fichier sélectionné')
                    setPaymentFile(undefined)
                    return
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    console.log('❌ Fichier trop volumineux:', file.size, 'bytes')
                    toast.error('Le fichier ne doit pas dépasser 5 MB')
                    e.target.value = ''
                    setPaymentFile(undefined)
                    return
                  }
                  console.log('✅ Fichier accepté:', {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    lastModified: new Date(file.lastModified).toLocaleString()
                  })
                  setPaymentFile(file)
                  toast.success(`Image "${file.name}" sélectionnée`)
                }}
                disabled={isPaying}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formats acceptés : JPEG, PNG, WebP (max 5 MB)
              </p>
              
              {paymentFile && (
                <Alert className="mt-2 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <strong>{paymentFile.name}</strong> ({(paymentFile.size / 1024).toFixed(2)} KB)
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Indicateur de retard et pénalités */}
            {latePaymentInfo && (
              <Alert className={latePaymentInfo.hasPenalty
                  ? 'border-red-300 bg-red-50'
                  : 'border-orange-300 bg-orange-50'
                }>
                <AlertCircle className={`h-4 w-4 ${latePaymentInfo.hasPenalty ? 'text-red-600' : 'text-orange-600'}`} />
                <AlertDescription className={latePaymentInfo.hasPenalty ? 'text-red-700' : 'text-orange-700'}>
                  <strong>Paiement en retard</strong>
                  <br />
                  Ce paiement est effectué avec <strong>{latePaymentInfo.daysLate} jour(s) de retard</strong>
                  {latePaymentInfo.hasPenalty && (
                    <>
                      <br />
                      <strong className="text-red-900">Pénalités : {formatAmount(latePaymentInfo.penalty)} FCFA</strong>
                      <br />
                      <span className="text-xs">Appliquées à partir du 4ème jour</span>
                    </>
                  )}
                  {!latePaymentInfo.hasPenalty && (
                    <>
                      <br />
                      <span className="text-xs">⚠️ Période de tolérance (jours 1-3)</span>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPaymentModal(false)
                setSelectedGroupMemberId('')
              }}
              disabled={isPaying}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={onPaymentSubmit}
              disabled={isPaying || !paymentAmount || !paymentTime || !paymentFile}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {isPaying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Enregistrer le versement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal des détails du versement */}
      <Dialog open={showPaymentDetailsModal} onOpenChange={setShowPaymentDetailsModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-lg lg:text-xl">Détails du versement</DialogTitle>
                <DialogDescription className="text-sm lg:text-base">
                  Versement du {selectedDate?.toLocaleDateString('fr-FR')}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportPaymentDetailsToPDF}
                className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {(() => {
              if (!selectedDate || !paymentDetails) {
                return <div className="text-center text-gray-500 py-8">Chargement des détails...</div>
              }

              // paymentDetails est déjà l'objet paiement, pas besoin de destructurer
              const payment = paymentDetails
              const isGroupContract = data.contractType === 'GROUP' || !!(data as any).groupeId

              // Debug: afficher les données pour vérifier
              console.log('🔍 Payment Details:', payment)
              console.log('🔍 Payment contribs:', payment.contribs)
              if (payment.contribs && payment.contribs.length > 0) {
                console.log('🔍 First contrib proofUrl:', payment.contribs[0].proofUrl)
              }

              if (isGroupContract && payment.groupContributions && payment.groupContributions.length > 0) {
                // Affichage pour les contrats de groupe
                return (
                  <div className="space-y-4">
                    {/* Informations générales */}
                    <div className="space-y-2 lg:space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-gray-700 text-xs lg:text-sm">Date:</span>
                        <span className="text-gray-900 text-xs lg:text-sm font-medium">{selectedDate?.toLocaleDateString('fr-FR')}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-blue-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-blue-700 text-xs lg:text-sm">Statut du mois:</span>
                        <Badge variant={payment.status === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                          {payment.status === 'PAID' ? 'Payé' : 'En cours'}
                        </Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-green-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-green-700 text-xs lg:text-sm">Total du mois:</span>
                        <span className="text-green-900 font-semibold text-xs lg:text-sm">
                          {formatAmount(payment.accumulatedAmount || 0)} FCFA
                        </span>
                      </div>
                    </div>

                    {/* Liste des contributions */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 text-sm">Contributions des membres :</h4>
                      {payment.groupContributions.map((contribution: any, index: number) => (
                        <div key={contribution.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            {/* Photo du membre */}
                            <div className="flex-shrink-0">
                              {contribution.memberPhotoURL ? (
                                <img
                                  src={contribution.memberPhotoURL}
                                  alt={`${contribution.memberFirstName} ${contribution.memberLastName}`}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-500 text-lg font-medium">
                                    {contribution.memberFirstName?.[0]}{contribution.memberLastName?.[0]}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Informations du membre */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-gray-900 text-sm">
                                  {contribution.memberFirstName} {contribution.memberLastName}
                                </h5>
                                <Badge variant="outline" className="text-xs">
                                  {contribution.memberMatricule}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                <div>
                                  <span className="font-medium">Montant:</span>
                                  <span className="ml-1 font-semibold text-green-600">
                                    {formatAmount(contribution.amount)} FCFA
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Heure:</span>
                                  <span className="ml-1">{contribution.time}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Mode:</span>
                                  <span className="ml-1">
                                    {contribution.mode === 'airtel_money' ? 'Airtel Money' :
                                      contribution.mode === 'mobicash' ? 'Mobicash' :
                                        contribution.mode === 'cash' ? 'Espèce' :
                                          contribution.mode === 'bank_transfer' ? 'Virement bancaire' : 'Inconnu'}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Contact:</span>
                                  <span className="ml-1">
                                    {contribution.memberContacts?.[0] || 'Non renseigné'}
                                  </span>
                                </div>
                              </div>

                              {/* Preuve de versement */}
                              {contribution.proofUrl && (
                                <div className="mt-2">
                                  <img
                                    src={contribution.proofUrl}
                                    alt="Preuve de versement"
                                    className="w-full h-20 object-cover rounded-md"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              } else if (payment.contribs && payment.contribs.length > 0) {
                // Affichage pour les contrats individuels
                // Pour les contrats journaliers, trouver la contribution correspondant à la date sélectionnée
                const contribution = payment.contribs.find((c: any) => {
                  if (!c.paidAt) return false
                  const contribDate = typeof c.paidAt.toDate === 'function' ? c.paidAt.toDate() : new Date(c.paidAt)
                  contribDate.setHours(0, 0, 0, 0)
                  const selected = new Date(selectedDate!)
                  selected.setHours(0, 0, 0, 0)
                  return contribDate.getTime() === selected.getTime()
                }) || payment.contribs[0] // Fallback sur la première si aucune correspondance

                console.log('🎯 Contribution trouvée pour la date:', selectedDate?.toLocaleDateString('fr-FR'), {
                  contributionId: contribution?.id,
                  proofUrl: contribution?.proofUrl,
                  amount: contribution?.amount,
                  totalContribs: payment.contribs.length
                })
                return (
                  <div className="space-y-2 lg:space-y-3 p-1">
                    {/* Date du versement */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                      <span className="font-medium text-gray-700 text-xs lg:text-sm">Date:</span>
                      <span className="text-gray-900 text-xs lg:text-sm font-medium">{selectedDate?.toLocaleDateString('fr-FR')}</span>
                    </div>

                    {/* Heure du versement */}
                    {contribution?.time && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-gray-700 text-xs lg:text-sm">Heure:</span>
                        <span className="text-gray-900 text-xs lg:text-sm">{contribution.time}</span>
                      </div>
                    )}

                    {/* Montant */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                      <span className="font-medium text-gray-700 text-xs lg:text-sm">Montant:</span>
                      <span className="text-gray-900 font-semibold text-xs lg:text-sm">
                        {formatAmount(contribution?.amount || 0)} FCFA
                      </span>
                    </div>

                    {/* Mode de paiement */}
                    {contribution?.mode && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                        <span className="font-medium text-gray-700 text-xs lg:text-sm">Mode:</span>
                        <span className="text-gray-900 text-xs lg:text-sm">
                          {contribution.mode === 'airtel_money' ? 'Airtel Money' :
                            contribution.mode === 'mobicash' ? 'Mobicash' :
                              contribution.mode === 'cash' ? 'Espèce' :
                                contribution.mode === 'bank_transfer' ? 'Virement bancaire' : 'Inconnu'}
                        </span>
                      </div>
                    )}

                    {/* Preuve */}
                    <div className="space-y-1 lg:space-y-2">
                      <span className="font-medium text-gray-700 text-xs lg:text-sm">Preuve de versement:</span>
                      {contribution?.proofUrl ? (
                        <div className="space-y-2">
                          <div className="p-2 lg:p-3 bg-gray-50 rounded-lg">
                            <img
                              src={contribution.proofUrl}
                              alt="Preuve de versement"
                              className="w-full h-auto max-h-60 object-contain rounded-md border border-gray-200"
                              onLoad={() => {
                                console.log('✅ Image chargée avec succès:', contribution.proofUrl)
                              }}
                              onError={(e) => {
                                console.error('❌ Erreur chargement image:', contribution.proofUrl)
                                const target = e.currentTarget as HTMLImageElement
                                target.style.display = 'none'
                                const errorDiv = document.createElement('div')
                                errorDiv.className = 'p-4 bg-red-50 border border-red-200 rounded text-center'
                                errorDiv.innerHTML = `
                                  <p class="text-sm text-red-700 font-medium mb-2">❌ Impossible de charger l'image</p>
                                  <p class="text-xs text-red-600">L'image n'est plus accessible sur Firebase Storage</p>
                                  <a href="${contribution.proofUrl}" target="_blank" class="text-xs text-blue-600 hover:underline mt-2 inline-block">Essayer d'ouvrir dans un nouvel onglet</a>
                                `
                                target.parentElement?.appendChild(errorDiv)
                              }}
                            />
                          </div>
                          {/* Debug info */}
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">🔍 Détails techniques</summary>
                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                              <p className="text-gray-700">URL: {contribution.proofUrl}</p>
                            </div>
                          </details>
                        </div>
                      ) : (
                        <div className="p-2 lg:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs text-yellow-700 italic">⚠️ Aucune preuve disponible pour cette contribution</p>
                          <p className="text-xs text-gray-500 mt-1">Le versement a été enregistré sans preuve d'image</p>
                        </div>
                      )}
                    </div>

                    {/* Statut du mois */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-blue-50 rounded-lg gap-1 lg:gap-2">
                      <span className="font-medium text-blue-700 text-xs lg:text-sm">Statut du mois:</span>
                      <Badge variant={payment.status === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                        {payment.status === 'PAID' ? 'Payé' : 'En cours'}
                      </Badge>
                    </div>

                    {/* Montant accumulé du mois */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-green-50 rounded-lg gap-1 lg:gap-2">
                      <span className="font-medium text-green-700 text-xs lg:text-sm">Total du mois:</span>
                      <span className="text-green-900 font-semibold text-xs lg:text-sm">
                        {formatAmount(payment.accumulatedAmount || 0)} FCFA
                      </span>
                    </div>
                  </div>
                )
              } else {
                return <div className="text-center text-gray-500 py-8">Aucun détail de versement disponible</div>
              }
            })()}
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-3 lg:pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDetailsModal(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Fermer
            </Button>

            {/* Bouton pour ajouter une nouvelle contribution (contrats de groupe) */}
            {isGroupContract && (
              <Button
                onClick={() => {
                  setSelectedDate(selectedDate)
                  setPaymentAmount('')
                  setPaymentTime('')
                  setPaymentMode('airtel_money')
                  setPaymentFile(undefined)
                  setSelectedGroupMemberId('')
                  setShowPaymentDetailsModal(false)
                  setShowPaymentModal(true)
                }}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto order-1 sm:order-2"
              >
                Ajouter une contribution
              </Button>
            )}

            {/* Bouton pour modifier le versement (contrats individuels uniquement) */}
            {!isGroupContract && paymentDetails?.payment?.contribs?.length > 0 && (() => {
              // Trouver la contribution correspondant à la date sélectionnée
              const payment = paymentDetails.payment
              const contribution = payment.contribs.find((c: any) => {
                if (!c.paidAt) return false
                const contribDate = typeof c.paidAt.toDate === 'function' ? c.paidAt.toDate() : new Date(c.paidAt)
                contribDate.setHours(0, 0, 0, 0)
                const selected = new Date(selectedDate!)
                selected.setHours(0, 0, 0, 0)
                return contribDate.getTime() === selected.getTime()
              }) || payment.contribs[0]

              return (
                <Button
                  onClick={() => {
                    setEditingContribution(contribution)
                    setPaymentAmount(contribution.amount?.toString() || '')
                    setPaymentTime(contribution.time || '')
                    setPaymentMode(contribution.mode || 'airtel_money')
                    setPaymentFile(undefined)
                    setShowEditPaymentModal(true)
                    setShowPaymentDetailsModal(false)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto order-1 sm:order-2"
                >
                  Modifier le versement
                </Button>
              )
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de modification du versement */}
      <Dialog open={showEditPaymentModal} onOpenChange={setShowEditPaymentModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg lg:text-xl">Modifier le versement</DialogTitle>
            <DialogDescription className="text-sm lg:text-base">
              Modifier le versement du {selectedDate?.toLocaleDateString('fr-FR')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-3 lg:space-y-4 p-1">
              {/* Date du versement (non modifiable) */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-100 rounded-lg gap-1 lg:gap-2">
                <span className="font-medium text-gray-700 text-xs lg:text-sm">Date:</span>
                <span className="text-gray-900 text-xs lg:text-sm font-medium">{selectedDate?.toLocaleDateString('fr-FR')}</span>
              </div>

              {/* Heure du versement */}
              <div>
                <Label htmlFor="edit-time" className="text-xs lg:text-sm">Heure du versement</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  required
                  className="w-full mt-1"
                />
              </div>

              {/* Montant */}
              <div>
                <Label htmlFor="edit-amount" className="text-xs lg:text-sm">Montant (FCFA)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="100"
                  step="100"
                  required
                  className="w-full mt-1"
                />
              </div>

              {/* Mode de paiement */}
              <div>
                <Label className="text-xs lg:text-sm">Mode de paiement</Label>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editPaymentMode"
                      value="airtel_money"
                      checked={paymentMode === 'airtel_money'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-xs lg:text-sm">Airtel Money</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editPaymentMode"
                      value="mobicash"
                      checked={paymentMode === 'mobicash'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-xs lg:text-sm">Mobicash</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editPaymentMode"
                      value="cash"
                      checked={paymentMode === 'cash'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-xs lg:text-sm">Espèce</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editPaymentMode"
                      value="bank_transfer"
                      checked={paymentMode === 'bank_transfer'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-xs lg:text-sm">Virement bancaire</span>
                  </label>
                </div>
              </div>

              {/* Sélection du membre du groupe (si contrat de groupe) */}
              {isGroupContract && (
                <div>
                  <Label htmlFor="edit-groupMember" className="text-xs lg:text-sm">Membre du groupe qui verse *</Label>
                  <Select value={selectedGroupMemberId} onValueChange={setSelectedGroupMemberId}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Sélectionnez le membre qui verse" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupMembers && groupMembers.length > 0 ? (
                        groupMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({member.matricule})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          Chargement des membres du groupe...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Ce champ permet de tracer qui a effectué le versement dans le groupe
                  </p>
                </div>
              )}

              {/* Preuve de versement (optionnelle) */}
              <div>
                <Label htmlFor="edit-proof" className="text-xs lg:text-sm">
                  Nouvelle preuve de versement (optionnel)
                </Label>
                <Input
                  id="edit-proof"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast.error('Le fichier ne doit pas dépasser 5 MB')
                      e.target.value = ''
                      return
                    }
                    setPaymentFile(file)
                  }}
                  className="w-full mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formats acceptés : JPEG, PNG, WebP (max 5 MB)
                </p>
                {editingContribution?.proofUrl && (
                  <p className="text-xs text-gray-500 mt-1">
                    Preuve actuelle conservée si aucune nouvelle n'est fournie
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-3 lg:pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditPaymentModal(false)
                setEditingContribution(null)
                setPaymentAmount('')
                setPaymentTime('')
                setPaymentMode('airtel_money')
                setPaymentFile(undefined)
                setSelectedGroupMemberId('')
              }}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annuler
            </Button>
            <Button
              onClick={onEditPaymentSubmit}
              disabled={isEditing || !paymentAmount || !paymentTime}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto order-1 sm:order-2"
            >
              {isEditing ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de versement en retard */}
      <Dialog open={showLatePaymentModal} onOpenChange={setShowLatePaymentModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg lg:text-xl">Versement en retard</DialogTitle>
            <DialogDescription className="text-sm lg:text-base">
              Enregistrer un versement pour une date passée (quand l'admin a reçu l'argent mais oublié d'enregistrer)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-4 p-1">
              {/* Date du versement (sélection manuelle) */}
              <div>
                <Label htmlFor="late-date" className="text-sm font-medium">Date du versement *</Label>
                <Input
                  id="late-date"
                  type="date"
                  value={(() => {
                    // Initialiser avec la date d'hier par défaut pour un versement en retard
                    const yesterday = new Date()
                    yesterday.setDate(yesterday.getDate() - 1)
                    return yesterday.toISOString().split('T')[0]
                  })()}
                  onChange={(e) => {
                    // Mettre à jour la date sélectionnée
                    const selectedDate = new Date(e.target.value)
                    setSelectedDate(selectedDate)
                  }}
                  max={new Date().toISOString().split('T')[0]} // Pas de dates futures
                  required
                  className="w-full mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sélectionnez la date réelle du versement (pas de dates futures)
                </p>
              </div>

              {/* Heure du versement */}
              <div>
                <Label htmlFor="late-time" className="text-sm font-medium">Heure du versement *</Label>
                <Input
                  id="late-time"
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  required
                  className="w-full mt-1"
                />
              </div>

              {/* Montant */}
              <div>
                <Label htmlFor="late-amount" className="text-sm font-medium">Montant (FCFA) *</Label>
                <Input
                  id="late-amount"
                  type="number"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="100"
                  step="100"
                  required
                  className="w-full mt-1"
                />
              </div>

              {/* Mode de paiement */}
              <div>
                <Label className="text-sm font-medium">Mode de paiement *</Label>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="latePaymentMode"
                      value="airtel_money"
                      checked={paymentMode === 'airtel_money'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Airtel Money</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="latePaymentMode"
                      value="mobicash"
                      checked={paymentMode === 'mobicash'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Mobicash</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="latePaymentMode"
                      value="cash"
                      checked={paymentMode === 'cash'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Espèce</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="latePaymentMode"
                      value="bank_transfer"
                      checked={paymentMode === 'bank_transfer'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Virement bancaire</span>
                  </label>
                </div>
              </div>

              {/* Sélection du membre du groupe (si contrat de groupe) */}
              {isGroupContract && (
                <div>
                  <Label htmlFor="late-groupMember" className="text-sm font-medium">Membre du groupe qui verse *</Label>
                  <Select value={selectedGroupMemberId} onValueChange={setSelectedGroupMemberId}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Sélectionnez le membre qui verse" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupMembers && groupMembers.length > 0 ? (
                        groupMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({member.matricule})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          Chargement des membres du groupe...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Ce champ permet de tracer qui a effectué le versement dans le groupe
                  </p>
                </div>
              )}

              {/* Preuve de versement */}
              <div>
                <Label htmlFor="late-proof" className="text-sm font-medium">Preuve de versement *</Label>
                <Input
                  id="late-proof"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    console.log('📎 [Versement retard] Fichier sélectionné:', file)
                    if (!file) {
                      console.log('❌ Aucun fichier sélectionné')
                      setPaymentFile(undefined)
                      return
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      console.log('❌ Fichier trop volumineux:', file.size, 'bytes')
                      toast.error('Le fichier ne doit pas dépasser 5 MB')
                      e.target.value = ''
                      setPaymentFile(undefined)
                      return
                    }
                    console.log('✅ Fichier accepté:', {
                      name: file.name,
                      type: file.type,
                      size: file.size
                    })
                    setPaymentFile(file)
                    toast.success(`Image "${file.name}" sélectionnée`)
                  }}
                  required
                  className="w-full mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formats acceptés : JPEG, PNG, WebP (max 5 MB)
                </p>
                {paymentFile && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700">
                      ✅ Fichier prêt : <strong>{paymentFile.name}</strong> ({(paymentFile.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>

              {/* Indicateur de retard et pénalités pour versement en retard */}
              {(() => {
                const lateInfo = calculateLatePaymentInfo(selectedDate)
                return lateInfo ? (
                  <div className={`rounded-lg p-3 border-2 ${lateInfo.hasPenalty
                      ? 'bg-red-50 border-red-300'
                      : 'bg-orange-50 border-orange-300'
                    }`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${lateInfo.hasPenalty ? 'text-red-600' : 'text-orange-600'
                        }`} />
                      <div className="flex-1">
                        <h4 className={`font-semibold text-sm ${lateInfo.hasPenalty ? 'text-red-900' : 'text-orange-900'
                          }`}>
                          Paiement en retard
                        </h4>
                        <p className={`text-xs mt-1 ${lateInfo.hasPenalty ? 'text-red-800' : 'text-orange-800'
                          }`}>
                          Ce paiement est effectué avec <strong>{lateInfo.daysLate} jour(s) de retard</strong>
                        </p>
                        {lateInfo.hasPenalty && (
                          <div className="mt-2 p-2 bg-red-100 rounded-md border border-red-200">
                            <p className="text-xs font-bold text-red-900">
                              Pénalités : {formatAmount(lateInfo.penalty)} FCFA
                            </p>
                            <p className="text-xs text-red-700 mt-0.5">
                              Appliquées à partir du 4ème jour
                            </p>
                          </div>
                        )}
                        {!lateInfo.hasPenalty && (
                          <p className="text-xs text-orange-700 mt-1">
                            ⚠️ Période de tolérance (jours 1-3)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null
              })()}

              {/* Informations supplémentaires */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-orange-800">
                    <p className="font-medium mb-1">⚠️ Versement en retard</p>
                    <p>Ce versement sera enregistré pour la date sélectionnée. Assurez-vous que :</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>L'argent a bien été reçu</li>
                      <li>La date correspond au jour réel du versement</li>
                      <li>La preuve est claire et lisible</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-3 lg:pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowLatePaymentModal(false)
                setSelectedDate(null)
                setPaymentAmount('')
                setPaymentTime('')
                setPaymentMode('airtel_money')
                setPaymentFile(undefined)
                setSelectedGroupMemberId('')
              }}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!selectedDate || !paymentAmount || !paymentTime || !paymentFile) {
                  toast.error('Veuillez remplir tous les champs obligatoires')
                  return
                }

                // Validation spécifique pour les contrats de groupe
                if (isGroupContract && !selectedGroupMemberId) {
                  toast.error('Veuillez sélectionner le membre du groupe qui a effectué le versement')
                  return
                }

                const amount = Number(paymentAmount)
                if (amount <= 0) {
                  toast.error('Le montant doit être positif')
                  return
                }

                try {
                  setIsPaying(true)

                  // Trouver le mois correspondant à la date sélectionnée
                  const monthIndex = getMonthIndexFromStart(selectedDate)
                  if (monthIndex === null || monthIndex < 0) {
                    toast.error('Date de versement invalide')
                    setIsPaying(false)
                    return
                  }

                  if (isGroupContract && groupMembers) {
                    // Utiliser la nouvelle fonction payGroup pour les contrats de groupe
                    const selectedMember = groupMembers.find(m => m.id === selectedGroupMemberId)
                    if (!selectedMember) {
                      toast.error('Membre du groupe non trouvé')
                      return
                    }

                    const { payGroup } = await import('@/services/caisse/mutations')
                    await payGroup({
                      contractId: id,
                      dueMonthIndex: monthIndex,
                      memberId: selectedMember.id,
                      memberName: `${selectedMember.firstName} ${selectedMember.lastName}`,
                      memberMatricule: selectedMember.matricule || '',
                      memberPhotoURL: selectedMember.photoURL || undefined,
                      memberContacts: selectedMember.contacts || [],
                      amount,
                      file: paymentFile,
                      paidAt: selectedDate,
                      time: paymentTime,
                      mode: paymentMode as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer'
                    })

                    toast.success('Contribution en retard ajoutée au versement collectif')
                  } else {
                    // Utiliser la fonction pay normale pour les contrats individuels
                    const { pay } = await import('@/services/caisse/mutations')
                    await pay({
                      contractId: id,
                      dueMonthIndex: monthIndex,
                      memberId: data.memberId,
                      amount,
                      file: paymentFile,
                      paidAt: selectedDate,
                      time: paymentTime,
                      mode: paymentMode as 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer'
                    })

                    toast.success('Versement en retard enregistré avec succès')
                  }

                  await refetch()
                  toast.success('Versement en retard enregistré avec succès')
                  setShowLatePaymentModal(false)
                  setSelectedDate(null)
                  setPaymentAmount('')
                  setPaymentTime('')
                  setPaymentMode('airtel_money')
                  setPaymentFile(undefined)
                  setSelectedGroupMemberId('')
                } catch (err: any) {
                  toast.error(err?.message || 'Erreur lors de l\'enregistrement')
                } finally {
                  setIsPaying(false)
                }
              }}
              disabled={isPaying || !selectedDate || !paymentAmount || !paymentTime || !paymentFile}
              className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto order-1 sm:order-2"
            >
              {isPaying ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Enregistrer le versement en retard
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals de confirmation */}
      {confirmApproveId && (
        <Dialog open={!!confirmApproveId} onOpenChange={() => setConfirmApproveId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer l'approbation</DialogTitle>
              <DialogDescription>
                Voulez-vous approuver ce remboursement ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmApproveId(null)}>
                Annuler
              </Button>
              <Button
                onClick={async () => {
                  await approveRefund(id, confirmApproveId)
                  setConfirmApproveId(null)
                  await refetch()
                  await reloadRefunds() // Rafraîchir la liste des remboursements
                  toast.success('Remboursement approuvé')
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modale de saisie de la cause du retrait */}
      {showReasonModal && (
        <Dialog open={showReasonModal} onOpenChange={setShowReasonModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {refundType === 'FINAL' ? 'Demande de remboursement final' : 'Demande de retrait anticipé'}
              </DialogTitle>
              <DialogDescription>
                Veuillez indiquer la raison de cette demande
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="reason">Cause du retrait *</Label>
                <Textarea
                  id="reason"
                  placeholder="Expliquez la raison du retrait..."
                  className="w-full resize-none mt-2"
                  rows={4}
                  value={refundReasonInput}
                  onChange={(e) => setRefundReasonInput(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cette information sera incluse dans le document de remboursement
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReasonModal(false)
                  setRefundType(null)
                  setRefundReasonInput('')
                }}
              >
                Annuler
              </Button>
              <Button
                className="bg-[#234D65] hover:bg-[#2c5a73] text-white"
                disabled={!refundReasonInput.trim() || isRefunding}
                onClick={async () => {
                  try {
                    setIsRefunding(true)

                    if (refundType === 'FINAL') {
                      await requestFinalRefund(id, refundReasonInput)
                      toast.success('Remboursement final demandé')
                    } else {
                      await requestEarlyRefund(id, { reason: refundReasonInput })
                      toast.success('Retrait anticipé demandé')
                    }

                    await refetch()
                    await reloadRefunds() // Rafraîchir la liste des remboursements

                    setShowReasonModal(false)
                    setRefundType(null)
                    setRefundReasonInput('')

                    // Afficher le PDF de remboursement
                    setShowRemboursementPdf(true)
                  } catch (e: any) {
                    toast.error(e?.message || 'Action impossible')
                  } finally {
                    setIsRefunding(false)
                  }
                }}
              >
                {isRefunding ? 'Traitement...' : 'Confirmer et voir le PDF'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal PDF Document */}
      {currentRefund && (
        <PdfDocumentModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          onDocumentUploaded={handlePdfUpload}
          contractId={id}
          refundId={currentRefundId || ""}
          existingDocument={currentRefund.document}
          title={currentRefund.type === 'FINAL' ? 'Document de Remboursement Final' : 'Document de Retrait Anticipé'}
          description={currentRefund.type === 'FINAL' ? 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le remboursement final.' : 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le retrait anticipé.'}
          documentType={currentRefund.type === 'FINAL' ? 'FINAL_REFUND_CS' : 'EARLY_REFUND_CS'}
          memberId={documentMemberId}
          documentLabel={`${currentRefund.type === 'FINAL' ? 'Remboursement final' : 'Retrait anticipé'} - Contrat ${id}`}
        />
      )}

      {/* Modal PDF Viewer */}
      {currentDocument && (
        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          document={currentDocument}
        />
      )}
    </div>
  )
}