"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import routes from '@/constantes/routes'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import { useActiveCaisseSettingsByType } from '@/hooks/useCaisseSettings'
import { useGroupMembers } from '@/hooks/useMembers'
import { useAuth } from '@/hooks/useAuth'
import { pay, requestFinalRefund, requestEarlyRefund, approveRefund, markRefundPaid, cancelEarlyRefund, updatePaymentContribution } from '@/services/caisse/mutations'
import { getPaymentByDate } from '@/db/caisse/payments.db'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Calendar, Plus, DollarSign, TrendingUp, FileText, CheckCircle, XCircle, AlertCircle, Building2, Eye, Download, X, Trash2 } from 'lucide-react'
import PdfDocumentModal from './PdfDocumentModal'
import PdfViewerModal from './PdfViewerModal'
import RemboursementNormalPDFModal from './RemboursementNormalPDFModal'
import type { RefundDocument } from '@/types/types'
import { listRefunds } from '@/db/caisse/refunds.db'
import TestPaymentTools from './TestPaymentTools'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { earlyRefundSchema, earlyRefundDefaultValues, type EarlyRefundFormData } from '@/schemas/schemas'

type Props = { id: string }

export default function DailyContract({ id }: Props) {
  const { data, isLoading, isError, error, refetch } = useCaisseContract(id)
  const { user } = useAuth()

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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Si le versement est enregistré pour une date future, pas de pénalité
    if (paymentDate > today) return null

    // Déterminer la date de référence (nextDueAt ou contractStartAt pour le 1er versement)
    let referenceDate: Date
    if (data.nextDueAt) {
      referenceDate = new Date(data.nextDueAt)
    } else {
      // Premier versement : utiliser contractStartAt
      referenceDate = data.contractStartAt ? new Date(data.contractStartAt) : today
    }
    referenceDate.setHours(0, 0, 0, 0)

    // Calculer le nombre de jours de retard
    const diffTime = paymentDate.getTime() - referenceDate.getTime()
    const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24))

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
  const settings = useActiveCaisseSettingsByType((data as any).caisseType)

  // Récupérer les membres du groupe si c'est un contrat de groupe
  const groupeId = (data as any).groupeId || ((data as any).memberId && (data as any).memberId.length > 20 ? (data as any).memberId : null)
  const isGroupContract = data.contractType === 'GROUP' || !!groupeId
  const { data: groupMembers, isLoading: isLoadingGroupMembers } = useGroupMembers(groupeId, isGroupContract)

  // Debug: afficher les informations du contrat
  console.log('DailyContract Debug:', {
    contractId: id,
    contractType: data.contractType,
    groupeId: groupeId,
    memberId: (data as any).memberId,
    isGroupContract,
    hasGroupMembers: !!groupMembers,
    groupMembersCount: groupMembers?.length,
    isLoadingGroupMembers
  })

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

    console.log('🔍 getPaymentForDate - Recherche pour la date:', date.toDateString())
    console.log('🔍 isGroupContract:', isGroupContract)

    // Pour les contrats de groupe, chercher par jour spécifique
    if (isGroupContract) {
      // Calculer l'index du mois pour cette date
      const contractStartMonth = data.contractStartAt ? new Date(data.contractStartAt).getMonth() : new Date().getMonth()
      const targetMonth = date.getMonth()
      const monthIndex = targetMonth - contractStartMonth

      console.log('🔍 Recherche par mois - monthIndex:', monthIndex, 'targetMonth:', targetMonth, 'contractStartMonth:', contractStartMonth)

      // Chercher le paiement pour ce mois
      const payment = data.payments.find((p: any) => p.dueMonthIndex === monthIndex)

      if (payment && payment.groupContributions && payment.groupContributions.length > 0) {
        // Vérifier si cette date spécifique a des contributions
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

          // Normaliser les dates pour la comparaison
          const normalizedContribDate = new Date(contribDate.getFullYear(), contribDate.getMonth(), contribDate.getDate())
          const normalizedTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

          return normalizedContribDate.getTime() === normalizedTargetDate.getTime()
        })

        if (hasContributionsOnDate) {
          console.log('✅ Paiement de groupe trouvé pour la date spécifique:', date.toDateString())
          return payment
        } else {
          console.log('❌ Pas de contribution pour cette date spécifique:', date.toDateString())
          return null
        }
      }

      console.log('❌ Aucun paiement de groupe trouvé pour le mois:', monthIndex)
      return null
    }

    // Pour les contrats individuels, logique existante
    console.log('🔍 Recherche par jour pour contrat individuel')

    // Rechercher dans tous les paiements pour trouver une contribution à cette date exacte
    for (const payment of data.payments) {
      if (payment.contribs && Array.isArray(payment.contribs)) {
        const hasContributionOnDate = payment.contribs.some((c: any) => {
          if (!c.paidAt) return false

          let contribDate: Date

          // Gérer les différents types de date (Date, Timestamp, string)
          if (c.paidAt instanceof Date) {
            contribDate = c.paidAt
          } else if (c.paidAt && typeof c.paidAt.toDate === 'function') {
            // Firestore Timestamp
            contribDate = c.paidAt.toDate()
          } else if (typeof c.paidAt === 'string') {
            contribDate = new Date(c.paidAt)
          } else {
            contribDate = new Date(c.paidAt)
          }

          // Vérifier que la date est valide
          if (isNaN(contribDate.getTime())) return false

          // Normaliser les dates pour la comparaison (ignorer l'heure)
          const normalizedContribDate = new Date(contribDate.getFullYear(), contribDate.getMonth(), contribDate.getDate())
          const normalizedTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

          return normalizedContribDate.getTime() === normalizedTargetDate.getTime()
        })

        if (hasContributionOnDate) {
          console.log('✅ Paiement individuel trouvé pour la date:', date.toDateString())
          return payment
        }
      }
    }

    console.log('❌ Aucun paiement trouvé pour la date:', date.toDateString())
    return null
  }

  const getPaymentDetailsForDate = (date: Date) => {
    if (!data.payments) return null

    // Rechercher dans tous les paiements pour trouver une contribution à cette date exacte
    for (const payment of data.payments) {
      if (payment.contribs && Array.isArray(payment.contribs)) {
        const contribution = payment.contribs.find((c: any) => {
          if (!c.paidAt) return false

          let contribDate: Date

          // Gérer les différents types de date (Date, Timestamp, string)
          if (c.paidAt instanceof Date) {
            contribDate = c.paidAt
          } else if (c.paidAt && typeof c.paidAt.toDate === 'function') {
            // Firestore Timestamp
            contribDate = c.paidAt.toDate()
          } else if (typeof c.paidAt === 'string') {
            contribDate = new Date(c.paidAt)
          } else {
            contribDate = new Date(c.paidAt)
          }

          // Vérifier que la date est valide
          if (isNaN(contribDate.getTime())) return false

          // Normaliser les dates pour la comparaison (ignorer l'heure)
          const normalizedContribDate = new Date(contribDate.getFullYear(), contribDate.getMonth(), contribDate.getDate())
          const normalizedTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

          return normalizedContribDate.getTime() === normalizedTargetDate.getTime()
        })

        if (contribution) {
          return { payment, contribution }
        }
      }
    }
    return null
  }

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

  const handlePdfUpload = async (document: RefundDocument) => {
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

    // Vérifier si la date est dans le futur (bloqué en production uniquement)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDateStart > today && process.env.NODE_ENV === 'production') {
      toast.error('Impossible de verser sur une date future')
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
    if (!selectedDate || !paymentAmount || !paymentTime || !paymentFile) {
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

      // Trouver le mois correspondant à la date sélectionnée
      const monthIndex = selectedDate.getMonth() - (data.contractStartAt ? new Date(data.contractStartAt).getMonth() : new Date().getMonth())

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

        toast.success('Contribution ajoutée au versement collectif')
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 p-6">
          {/* Debug info pour les contrats de groupe */}
          {isGroupContract && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Debug Contrat de Groupe:</strong>
                ID: {groupeId} |
                Type: {data.contractType || 'Non défini'} |
                Membres: {groupMembers?.length || 0} |
                Chargement: {isLoadingGroupMembers ? 'Oui' : 'Non'}
              </p>
            </div>
          )}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                Contrat Journalier #{id}
              </h1>
              <p className="text-gray-600 mt-2">
                Objectif mensuel: <span className="font-semibold">{(data.monthlyAmount || 0).toLocaleString('fr-FR')} FCFA</span>
              </p>
              <div className="text-sm text-gray-500 mt-1">
                Paramètres actifs ({String((data as any).caisseType)}): {settings.data ? (settings.data as any).id : '—'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={data.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-sm">
                {data.status === 'ACTIVE' ? 'Actif' : data.status === 'LATE_NO_PENALTY' ? 'Retard (J+0..3)' :
                  data.status === 'LATE_WITH_PENALTY' ? 'Retard (J+4..12)' : data.status}
              </Badge>
            </div>
          </div>

          {/* Lien vers l'historique des versements */}
          <div className="mt-6 flex justify-center">
            <Link
              href={routes.admin.caisseSpecialeContractPayments(id)}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              <FileText className="h-4 w-4" />
              Historique des versements
            </Link>
          </div>
        </div>

        {/* Outils de test (DEV uniquement) */}
        <TestPaymentTools 
          contractId={id}
          contractData={data}
          onPaymentSuccess={async () => {
            await refetch()
          }}
        />
      </div>

      {/* Navigation du calendrier */}
      <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 p-4 lg:p-6">
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
      </div>

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
                <div className="flex items-center justify-between">
                  <span className="text-xs lg:text-sm text-gray-600">Objectif</span>
                  <span className="text-sm lg:text-base font-semibold">{target.toLocaleString('fr-FR')} FCFA</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs lg:text-sm text-gray-600">Versé</span>
                  <span className="text-sm lg:text-base font-semibold text-green-600">{total.toLocaleString('fr-FC')} FCFA</span>
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

      {/* Remboursements */}
      <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-emerald-600" />
          Remboursements
        </h2>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          {(() => {
            const payments = data.payments || []
            const paidCount = payments.filter((x: any) => x.status === 'PAID').length
            const allPaid = payments.length > 0 && paidCount === payments.length
            const canEarly = paidCount >= 1 && !allPaid
            const hasFinalRefund = refunds.some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED') || data.status === 'FINAL_REFUND_PENDING' || data.status === 'CLOSED'
            const hasEarlyRefund = refunds.some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED') || data.status === 'EARLY_REFUND_PENDING'

            return (
              <>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                  disabled={isRefunding || !allPaid || hasFinalRefund}
                  onClick={() => {
                    setRefundType('FINAL')
                    setRefundReasonInput('')
                    setShowReasonModal(true)
                  }}
                >
                  <span className="hidden sm:inline">Demander remboursement final</span>
                  <span className="sm:hidden">Remboursement final</span>
                </Button>

                <Button
                  variant="outline"
                  disabled={isRefunding || !canEarly || hasEarlyRefund}
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setRefundType('EARLY')
                    setRefundReasonInput('')
                    setShowReasonModal(true)
                  }}
                >
                  <span className="hidden sm:inline">Demander retrait anticipé</span>
                  <span className="sm:hidden">Retrait anticipé</span>
                </Button>

                <Button
                  variant="outline"
                  disabled={isClosed}
                  className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => setShowLatePaymentModal(true)}
                >
                  <span className="hidden sm:inline">Versement en retard</span>
                  <span className="sm:hidden">En retard</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => setShowRemboursementPdf(true)}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">PDF Remboursement</span>
                  <span className="sm:hidden">PDF Remb.</span>
                </Button>
              </>
            )
          })()}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {refunds.map((r: any) => (
            <Card key={r.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="font-medium">
                    {r.type === 'FINAL' ? 'Final' : r.type === 'EARLY' ? 'Anticipé' : 'Défaut'}
                  </div>
                  <Badge
                    variant={
                      r.status === 'PENDING' ? 'secondary' :
                        r.status === 'APPROVED' ? 'default' :
                          r.status === 'PAID' ? 'default' : 'secondary'
                    }
                    className="text-xs self-start sm:self-auto"
                  >
                    {r.status === 'PENDING' ? 'En attente' : r.status === 'APPROVED' ? 'Approuvé' : r.status === 'PAID' ? 'Payé' : 'Archivé'}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs lg:text-sm text-gray-600">
                  <div>Nominal: <span className="font-medium">{(r.amountNominal || 0).toLocaleString('fr-FR')} FCFA</span></div>
                  <div>Bonus: <span className="font-medium">{(r.amountBonus || 0).toLocaleString('fr-FR')} FCFA</span></div>
                  <div>Échéance: <span className="font-medium">{r.deadlineAt ? new Date(r.deadlineAt).toLocaleDateString('fr-FR') : '—'}</span></div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
                      {r.status === 'PENDING' && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            onClick={() => setConfirmApproveId(r.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={(r.type === 'FINAL' && !r.document) || (r.type === 'EARLY' && !r.document)}
                          >
                            Approuver
                          </Button>
                          {(r.type === 'FINAL' || r.type === 'EARLY') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowRemboursementPdf(true)}
                                className="border-green-300 text-green-600 hover:bg-green-50 w-full sm:w-auto flex items-center justify-center gap-2"
                              >
                                <FileText className="h-4 w-4" />
                                Document de remboursement
                              </Button>
                              {r.document ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewDocument(r.id, r.document)}
                                    className="border-green-300 text-green-600 hover:bg-green-50 w-full sm:w-auto flex items-center justify-center gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Voir PDF
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenPdfModal(r.id)}
                                    className="border-blue-300 text-blue-600 hover:bg-blue-50 w-full sm:w-auto flex items-center justify-center gap-2"
                                  >
                                    <FileText className="h-4 w-4" />
                                    Remplacer PDF
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setConfirmDeleteDocumentId(r.id)}
                                    className="border-red-300 text-red-600 hover:bg-red-50 w-full sm:w-auto flex items-center justify-center gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Supprimer
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenPdfModal(r.id)}
                                  className="border-red-300 text-red-600 hover:bg-red-50 w-full sm:w-auto flex items-center justify-center gap-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  Ajouter PDF
                                </Button>
                              )}
                            </>
                          )}
                          {r.type === 'EARLY' && !r.document && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50 w-full sm:w-auto"
                              onClick={async () => {
                                try {
                                  await cancelEarlyRefund(id, r.id)
                                  await refetch()
                                  await reloadRefunds() // Rafraîchir la liste des remboursements
                                  toast.success('Demande anticipée annulée')
                                } catch (e: any) {
                                  toast.error(e?.message || 'Annulation impossible')
                                }
                              }}
                            >
                              Annuler
                            </Button>
                          )}
                        </div>
                      )}

                  {r.status === 'APPROVED' && (
                    <>
                      {/* Affichage de la cause (non modifiable) */}
                      {r.reason && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                          <label className="block text-xs text-blue-700 font-medium mb-1">Cause du retrait:</label>
                          <p className="text-sm text-blue-900">{r.reason}</p>
                        </div>
                      )}

                      <Form {...earlyRefundForm}>
                        <form onSubmit={earlyRefundForm.handleSubmit(async (data) => {
                          try {
                            await markRefundPaid(id, r.id, data.proof, {
                              reason: r.reason,
                              withdrawalDate: data.withdrawalDate,
                              withdrawalTime: data.withdrawalTime
                            })

                            // Réinitialiser le formulaire
                            earlyRefundForm.reset(earlyRefundDefaultValues)
                            setConfirmPaidId(null)
                            await refetch()
                            await reloadRefunds() // Rafraîchir la liste des remboursements
                            toast.success('Remboursement marqué payé')
                          } catch (error: any) {
                            toast.error(error?.message || 'Erreur lors du marquage')
                          }
                        })}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">

                            {/* Date du retrait */}
                            <FormField
                              control={earlyRefundForm.control}
                              name="withdrawalDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs text-gray-600">Date du retrait *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      className="w-full text-xs"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />

                            {/* Heure du retrait */}
                            <FormField
                              control={earlyRefundForm.control}
                              name="withdrawalTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs text-gray-600">Heure du retrait *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="time"
                                      className="w-full text-xs"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />

                            {/* Preuve du retrait */}
                            <FormField
                              control={earlyRefundForm.control}
                              name="proof"
                              render={({ field: { onChange, value, ...field } }) => (
                                <FormItem>
                                  <FormLabel className="text-xs text-gray-600">Preuve du retrait *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="file"
                                      accept="application/pdf"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) {
                                          onChange(undefined)
                                          return
                                        }
                                        if (file.type !== 'application/pdf') {
                                          toast.error('La preuve doit être un fichier PDF')
                                          onChange(undefined)
                                          return
                                        }
                                        onChange(file)
                                        toast.success('Preuve PDF sélectionnée')
                                      }}
                                      className="w-full text-xs"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </div>

                          <Button
                            type="submit"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                            disabled={!earlyRefundForm.formState.isValid || earlyRefundForm.formState.isSubmitting}
                          >
                            {earlyRefundForm.formState.isSubmitting ? 'Traitement...' : 'Marquer payé'}
                          </Button>
                        </form>
                      </Form>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {refunds.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun remboursement</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de versement */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Nouveau versement</DialogTitle>
            <DialogDescription>
              Enregistrer un versement pour le {selectedDate?.toLocaleDateString('fr-FR')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date du versement (grisée) */}
            <div>
              <Label htmlFor="date">Date du versement</Label>
              <Input
                id="date"
                type="text"
                value={selectedDate?.toLocaleDateString('fr-FR') || ''}
                disabled
                className="w-full bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Heure du versement */}
            <div>
              <Label htmlFor="time">Heure du versement</Label>
              <Input
                id="time"
                type="time"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {/* Montant */}
            <div>
              <Label htmlFor="amount">Montant (FCFA)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="100"
                step="100"
                required
                className="w-full"
              />
            </div>

            {/* Mode de paiement */}
            <div>
              <Label htmlFor="mode">Mode de paiement</Label>
              <div className="flex gap-3 mt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
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
                    name="paymentMode"
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
                    name="paymentMode"
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
                    name="paymentMode"
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
                <Label htmlFor="groupMember">Membre du groupe qui verse *</Label>
                <Select value={selectedGroupMemberId} onValueChange={setSelectedGroupMemberId}>
                  <SelectTrigger className="w-full">
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
              <Label htmlFor="proof">Preuve de versement</Label>
              <Input
                id="proof"
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentFile(e.target.files?.[0])}
                required
                className="w-full"
              />
            </div>

            {/* Indicateur de retard et pénalités */}
            {latePaymentInfo && (
              <div className={`rounded-lg p-3 border-2 ${
                latePaymentInfo.hasPenalty 
                  ? 'bg-red-50 border-red-300' 
                  : 'bg-orange-50 border-orange-300'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                    latePaymentInfo.hasPenalty ? 'text-red-600' : 'text-orange-600'
                  }`} />
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm ${
                      latePaymentInfo.hasPenalty ? 'text-red-900' : 'text-orange-900'
                    }`}>
                      Paiement en retard
                    </h4>
                    <p className={`text-xs mt-1 ${
                      latePaymentInfo.hasPenalty ? 'text-red-800' : 'text-orange-800'
                    }`}>
                      Ce paiement est effectué avec <strong>{latePaymentInfo.daysLate} jour(s) de retard</strong>
                    </p>
                    {latePaymentInfo.hasPenalty && (
                      <div className="mt-2 p-2 bg-red-100 rounded-md border border-red-200">
                        <p className="text-xs font-bold text-red-900">
                          Pénalités : {latePaymentInfo.penalty.toLocaleString('fr-FR')} FCFA
                        </p>
                        <p className="text-xs text-red-700 mt-0.5">
                          Appliquées à partir du 4ème jour
                        </p>
                      </div>
                    )}
                    {!latePaymentInfo.hasPenalty && (
                      <p className="text-xs text-orange-700 mt-1">
                        ⚠️ Période de tolérance (jours 1-3)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentModal(false)
                setSelectedGroupMemberId('')
              }}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              onClick={onPaymentSubmit}
              disabled={isPaying || !paymentAmount || !paymentTime || !paymentFile}
              className="bg-[#234D65] hover:bg-[#2c5a73] text-white w-full sm:w-auto"
            >
              {isPaying ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal des détails du versement */}
      <Dialog open={showPaymentDetailsModal} onOpenChange={setShowPaymentDetailsModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg lg:text-xl">Détails du versement</DialogTitle>
            <DialogDescription className="text-sm lg:text-base">
              Versement du {selectedDate?.toLocaleDateString('fr-FR')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {(() => {
              if (!selectedDate || !paymentDetails) {
                return <div className="text-center text-gray-500 py-8">Chargement des détails...</div>
              }

              // paymentDetails est déjà l'objet paiement, pas besoin de destructurer
              const payment = paymentDetails
              const isGroupContract = data.contractType === 'GROUP' || !!(data as any).groupeId

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
                          {payment.accumulatedAmount?.toLocaleString('fr-FR')} FCFA
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
                                    {contribution.amount.toLocaleString('fr-FR')} FCFA
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
                const contribution = payment.contribs[0] // Prendre la première contribution
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
                        {contribution?.amount?.toLocaleString('fr-FR')} FCFA
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
                    {contribution?.proofUrl && (
                      <div className="space-y-1 lg:space-y-2">
                        <span className="font-medium text-gray-700 text-xs lg:text-sm">Preuve de versement:</span>
                        <div className="p-2 lg:p-3 bg-gray-50 rounded-lg">
                          <img
                            src={contribution.proofUrl}
                            alt="Preuve de versement"
                            className="w-full h-20 lg:h-28 object-cover rounded-md"
                          />
                        </div>
                      </div>
                    )}

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
                        {payment.accumulatedAmount?.toLocaleString('fr-FR')} FCFA
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
            {!isGroupContract && paymentDetails?.contribution && (
              <Button
                onClick={() => {
                  setEditingContribution(paymentDetails.contribution)
                  setPaymentAmount(paymentDetails.contribution.amount?.toString() || '')
                  setPaymentTime(paymentDetails.contribution.time || '')
                  setPaymentMode(paymentDetails.contribution.mode || 'airtel_money')
                  setPaymentFile(undefined)
                  setShowEditPaymentModal(true)
                  setShowPaymentDetailsModal(false)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto order-1 sm:order-2"
              >
                Modifier le versement
              </Button>
            )}
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
                  onChange={(e) => setPaymentFile(e.target.files?.[0])}
                  className="w-full mt-1"
                />
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
                  onChange={(e) => setPaymentFile(e.target.files?.[0])}
                  required
                  className="w-full mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Capture d'écran ou photo de la transaction
                </p>
              </div>

              {/* Indicateur de retard et pénalités pour versement en retard */}
              {(() => {
                const lateInfo = calculateLatePaymentInfo(selectedDate)
                return lateInfo ? (
                  <div className={`rounded-lg p-3 border-2 ${
                    lateInfo.hasPenalty 
                      ? 'bg-red-50 border-red-300' 
                      : 'bg-orange-50 border-orange-300'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        lateInfo.hasPenalty ? 'text-red-600' : 'text-orange-600'
                      }`} />
                      <div className="flex-1">
                        <h4 className={`font-semibold text-sm ${
                          lateInfo.hasPenalty ? 'text-red-900' : 'text-orange-900'
                        }`}>
                          Paiement en retard
                        </h4>
                        <p className={`text-xs mt-1 ${
                          lateInfo.hasPenalty ? 'text-red-800' : 'text-orange-800'
                        }`}>
                          Ce paiement est effectué avec <strong>{lateInfo.daysLate} jour(s) de retard</strong>
                        </p>
                        {lateInfo.hasPenalty && (
                          <div className="mt-2 p-2 bg-red-100 rounded-md border border-red-200">
                            <p className="text-xs font-bold text-red-900">
                              Pénalités : {lateInfo.penalty.toLocaleString('fr-FR')} FCFA
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
                  const monthIndex = selectedDate.getMonth() - (data.contractStartAt ? new Date(data.contractStartAt).getMonth() : new Date().getMonth())

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
      <PdfDocumentModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        onDocumentUploaded={handlePdfUpload}
        contractId={id}
        refundId={currentRefundId || ""}
        existingDocument={currentRefundId ? refunds.find((r: any) => r.id === currentRefundId)?.document : undefined}
        title={currentRefundId ? (refunds.find((r: any) => r.id === currentRefundId)?.type === 'FINAL' ? 'Document de Remboursement Final' : 'Document de Retrait Anticipé') : 'Document de Remboursement'}
        description={currentRefundId ? (refunds.find((r: any) => r.id === currentRefundId)?.type === 'FINAL' ? 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le remboursement final.' : 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le retrait anticipé.') : 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le remboursement.'}
      />

      {/* Modal PDF Viewer */}
      {currentDocument && (
        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          document={currentDocument}
          title={currentRefundId ? (refunds.find((r: any) => r.id === currentRefundId)?.type === 'FINAL' ? 'Document de Remboursement Final' : 'Document de Retrait Anticipé') : 'Document de Remboursement'}
        />
      )}

      {/* Modal de confirmation de suppression */}
      {confirmDeleteDocumentId && (
        <Dialog open={!!confirmDeleteDocumentId} onOpenChange={() => setConfirmDeleteDocumentId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Voulez-vous vraiment supprimer ce document PDF ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteDocumentId(null)}>
                Annuler
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDeleteDocument(confirmDeleteDocumentId)}
              >
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal PDF Remboursement */}
      <RemboursementNormalPDFModal
        isOpen={showRemboursementPdf}
        onClose={() => setShowRemboursementPdf(false)}
        contractId={id}
        contractData={data}
      />
    </div>
  )
}


