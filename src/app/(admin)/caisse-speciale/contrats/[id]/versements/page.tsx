'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { getNationalityNameByGender } from '@/constantes/nationality'
import routes from '@/constantes/routes'
import { getAdminById } from '@/db/admin.db'
import { getGroupById } from '@/db/group.db'
import { useCaisseContract, useContractPayments } from '@/domains/financial/caisse-speciale/contrats/hooks'
import { db } from '@/firebase/firestore'
import { useAuth } from '@/hooks/useAuth'
import { useMember } from '@/hooks/useMembers'
import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import jsPDF from 'jspdf'
import { AlertCircle, AlertTriangle, ArrowLeft, Calendar, CheckCircle, Clock, DollarSign, Download, FileText, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import React from 'react'
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

// Fonction pour formater les montants dans les PDFs (évite les problèmes avec jsPDF)
const formatAmountForPDF = (amount: number | undefined | null): string => {
  if (!amount && amount !== 0) return '0'
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function ContractPaymentsPage() {
  const params = useParams()
  const contractId = params.id as string
  const { user } = useAuth()

  // Récupérer les données du contrat
  const { data: contract, isLoading: isLoadingContracts, error } = useCaisseContract(contractId)

  // Récupérer les versements du contrat
  const { data: payments = [], isLoading: isLoadingPayments, error: paymentsError } = useContractPayments(contractId)
  const { data: member } = useMember(contract?.memberId)
  const { data: group } = useQuery({
    queryKey: ['group', contract?.groupeId],
    queryFn: () => getGroupById(contract?.groupeId as string),
    enabled: Boolean(contract?.groupeId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // État pour stocker les informations des administrateurs
  const [adminInfos, setAdminInfos] = React.useState<Record<string, { firstName: string; lastName: string }>>({})
  const [loadingAdmins, setLoadingAdmins] = React.useState<Set<string>>(new Set())
  
  // État pour stocker les informations du setting
  const [contractSettings, setContractSettings] = React.useState<any>(null)
  const [loadingSettings, setLoadingSettings] = React.useState(false)

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

  // Charger les informations du setting du contrat
  React.useEffect(() => {
    const fetchContractSettings = async () => {
      const settingsVersion = (contract as any)?.settingsVersion
      if (!settingsVersion || contractSettings) return
      
      setLoadingSettings(true)
      try {
        const settingsDoc = await getDoc(doc(db, firebaseCollectionNames.caisseSettings, settingsVersion))
        if (settingsDoc.exists()) {
          setContractSettings({ id: settingsDoc.id, ...settingsDoc.data() })
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des paramètres:', error)
      } finally {
        setLoadingSettings(false)
      }
    }

    fetchContractSettings()
  }, [(contract as any)?.settingsVersion, contractSettings])

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

  // Fonction pour calculer le pourcentage de bonus applicable pour un versement donné
  const getBonusPercentageForPayment = (monthIndex: number, monthsPlanned: number) => {
    // Mois 1-3 : pas de bonus
    if (monthIndex < 3) {
      return null
    }

    // Si c'est le dernier mois, utiliser le pourcentage de ce mois
    if (monthIndex + 1 === monthsPlanned) {
      const bonusKey = `M${monthIndex + 1}`
      return contractSettings?.bonusTable?.[bonusKey] || null
    }

    // Pour les autres mois (à partir du mois 4), utiliser le pourcentage du mois précédent
    if (monthIndex >= 3) {
      const bonusKey = `M${monthIndex}` // Mois précédent
      return contractSettings?.bonusTable?.[bonusKey] || null
    }

    return null
  }

  // Fonction pour exporter les versements en Excel
  const exportToExcel = () => {
    if (!payments.length) return

    // Convertit Date | Timestamp | string en Date valide (contribs = Timestamps bruts).
    const asDate = (v: unknown): Date | null => {
      if (!v) return null
      const d = typeof (v as any)?.toDate === 'function' ? (v as any).toDate() : new Date(v as any)
      return Number.isNaN(d.getTime()) ? null : d
    }

    // Préparer les données pour l'export
    const exportData = payments.map((payment, _index) => {
      const now = new Date()
      const dueDate = asDate(payment.dueAt)

      let status = ''
      if (payment.status === 'PAID') {
        status = 'Payé'
      } else if (dueDate && now > dueDate) {
        status = 'En retard'
      } else {
        status = 'En attente'
      }

      // Contrats LIBRE / paiements importés : paidAt/time/mode vivent dans
      // contribs[] — repli sur la dernière contribution (la plus récente).
      const contribs = Array.isArray(payment.contribs) ? payment.contribs : []
      const lastContrib = contribs.length
        ? contribs.reduce((last: any, c: any) => {
            const paid = asDate(c.paidAt)
            const lastPaid = asDate(last.paidAt)
            return paid && (!lastPaid || paid.getTime() > lastPaid.getTime()) ? c : last
          }, contribs[0])
        : null
      const paidAt = asDate(payment.paidAt) ?? asDate(lastContrib?.paidAt)
      const time = payment.time || lastContrib?.time || ''
      const mode = payment.mode || lastContrib?.mode || ''

      return {
        'N° Échéance': payment.dueMonthIndex,
        'ID Versement': payment.id,
        'Date d\'échéance': dueDate ? dueDate.toLocaleDateString('fr-FR') : 'Non définie',
        'Montant': payment.amount || 0,
        'Statut': status,
        'Date de paiement': paidAt ? paidAt.toLocaleDateString('fr-FR') : '',
        'Heure de paiement': time,
        'Moyen de paiement': mode,
        'Pénalité appliquée': payment.penaltyApplied || 0,
        'Jours de retard': (payment as any).penaltyDays || 0,
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
      { wch: 15 }, // Moyen de paiement
      { wch: 18 }, // Pénalité appliquée
      { wch: 15 }, // Jours de retard
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

  // Chargement du logo pour les PDF (partagé entre export complet et export single)
  const loadLogoDataUrl = async (): Promise<{ dataUrl: string; width: number; height: number } | null> => {
    try {
      const response = await fetch('/assets/caisse-speciale/caissesp-logo.png')
      if (!response.ok) return null
      const blob = await response.blob()
      const dataUrl = await new Promise<string | null>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
      if (!dataUrl) return null
      const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
        const img = new window.Image()
        img.onload = () => (img.naturalWidth && img.naturalHeight ? resolve({ width: img.naturalWidth, height: img.naturalHeight }) : resolve(null))
        img.onerror = () => resolve(null)
        img.src = dataUrl
      })
      if (!dimensions) return null
      return { dataUrl, width: dimensions.width, height: dimensions.height }
    } catch (error) {
      console.error('Erreur chargement logo export PDF:', error)
      return null
    }
  }

  // Layout commun : construit les 2 premières pages du PDF (infos membre + caisse spéciale + récap) et retourne drawPaymentBlock
  const buildVersementPDFFirstTwoPages = (
    doc: jsPDF,
    opts: {
      contract: any
      contractId: string
      member: any
      group: any
      sortedPayments: any[]
      logoDataUrl: { dataUrl: string; width: number; height: number } | null
    }
  ): { drawPaymentBlock: (payment: any, startY: number) => number; pageWidth: number; pageHeight: number; drawPageBackground: () => void; drawMainTitle: (showLogo?: boolean) => void } => {
    const { contract, contractId, member, group, sortedPayments, logoDataUrl } = opts
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 14
    const contentWidth = pageWidth - marginX * 2
    const colors = {
      navy: [21, 62, 96] as [number, number, number],
      line: [24, 24, 24] as [number, number, number],
      headerFill: [236, 242, 248] as [number, number, number],
      pageFill: [247, 249, 252] as [number, number, number],
    }
    const toDateSafe = (value: unknown): Date | null => {
      if (!value) return null
      if (value instanceof Date) return value
      if (typeof (value as any)?.toDate === 'function') return (value as any).toDate()
      const parsed = new Date(value as any)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    const formatLongDate = (value: unknown): string => {
      const date = toDateSafe(value)
      if (!date) return '-'
      return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }
    const formatMode = (mode?: string): string => {
      const modeMap: Record<string, string> = { airtel_money: 'AIRTEL-MONEY', mobicash: 'MOBICASH', cash: 'CASH', bank_transfer: 'VIREMENT' }
      return !mode ? '-' : modeMap[mode] || String(mode).toUpperCase()
    }
    const getAge = (birthDate?: string): string => {
      if (!birthDate) return '-'
      const birth = toDateSafe(birthDate)
      if (!birth) return '-'
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
      return age > 0 ? `${age} ANS` : '-'
    }
    const getPaymentRemark = (payment: any): string => {
      if (payment.status === 'PAID') return (payment.penaltyApplied || 0) > 0 ? `RETARD ${payment.penaltyDays || 0}J` : 'CONFORME'
      const dueDate = toDateSafe(payment.dueAt)
      if (dueDate && new Date() > dueDate) return 'IMPAYE'
      return 'EN ATTENTE'
    }
    const getAdminNameForExport = (payment: any): string => {
      const label = getAdminDisplayName(payment.updatedBy)
      if (!label || label === 'Chargement...') return payment.updatedBy || '-'
      return label
    }
    const caisseTypeLabelMap: Record<string, string> = {
      STANDARD: 'STANDARD', JOURNALIERE: 'JOURNALIERE', LIBRE: 'LIBRE',
      STANDARD_CHARITABLE: 'STANDARD CHARITABLE', JOURNALIERE_CHARITABLE: 'JOURNALIERE CHARITABLE', LIBRE_CHARITABLE: 'LIBRE CHARITABLE',
    }
    const caisseTypeLabel = caisseTypeLabelMap[contract.caisseType] || contract.caisseType
    const memberNameForGroup = group?.name || group?.label || 'GROUPE'
    const memberLastName = contract.contractType === 'GROUP' ? memberNameForGroup : member?.lastName || 'INCONNU'
    const memberFirstName = contract.contractType === 'GROUP' ? '-' : member?.firstName || 'INCONNU'
    const memberMatricule = member?.matricule || contract.memberId || contract.id || '-'
    const memberBirthPlace = contract.contractType === 'GROUP' ? '-' : member?.birthPlace || '-'
    const memberBirthDate = contract.contractType === 'GROUP' ? '-' : formatLongDate(member?.birthDate)
    const memberNationality = contract.contractType === 'GROUP' ? '-' : (member?.nationality ? getNationalityNameByGender(member.nationality, member?.gender) : '-')
    const memberIdDocument = contract.contractType === 'GROUP' ? '-' : member?.identityDocumentNumber || '-'
    const memberPhone1 = contract.contractType === 'GROUP' ? '-' : member?.contacts?.[0] || '-'
    const memberPhone2 = contract.contractType === 'GROUP' ? '-' : member?.contacts?.[1] || '-'
    const memberGender = contract.contractType === 'GROUP' ? '-' : (member?.gender ? String(member.gender).toUpperCase() : '-')
    const memberAge = contract.contractType === 'GROUP' ? '-' : getAge(member?.birthDate)
    const memberQuarter = contract.contractType === 'GROUP' ? '-' : member?.address?.district || member?.address?.arrondissement || member?.address?.city || '-'
    const memberProfession = contract.contractType === 'GROUP' ? '-' : member?.profession || member?.companyName || '-'
    const emergencyContactName = contract.emergencyContact ? `${contract.emergencyContact.lastName || ''} ${contract.emergencyContact.firstName || ''}`.trim() || 'INCONNU' : 'INCONNU'
    const emergencyRelation = contract.emergencyContact?.relationship || '-'
    const emergencyPhone1 = contract.emergencyContact?.phone1 || '-'
    const emergencyPhone2 = contract.emergencyContact?.phone2 || '-'
    const emergencyId = contract.emergencyContact?.idNumber || '-'
    const unpaidCount = sortedPayments.filter((p) => p.status !== 'PAID').length
    const paidCount = sortedPayments.filter((p) => p.status === 'PAID').length
    const isJournalierType = contract.caisseType === 'JOURNALIERE' || contract.caisseType === 'JOURNALIERE_CHARITABLE'
    const totalCotisation = isJournalierType
      ? sortedPayments.length * (Number(contract.monthlyAmount) || 0)
      : sortedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const totalPaid = isJournalierType
      ? sortedPayments.reduce((sum, p) => {
          if (p.contribs && Array.isArray(p.contribs)) {
            return sum + (p.contribs as any[]).reduce((s, c) => s + (Number(c.amount) || 0), 0)
          }
          return sum + (Number((p as any).accumulatedAmount) || 0)
        }, 0)
      : sortedPayments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0)
    const totalUnpaid = Math.max(totalCotisation - totalPaid, 0)
    const totalPenalties = sortedPayments.reduce((sum, p) => sum + ((p as any).penaltyApplied || 0), 0)

    const drawPageBackground = () => {
      doc.setFillColor(...colors.pageFill)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
      doc.setDrawColor(...colors.navy)
      doc.setLineWidth(0.7)
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16)
    }
    const drawMainTitle = (showLogo = false) => {
      if (showLogo && logoDataUrl) {
        const maxLogoWidth = 34, maxLogoHeight = 18
        const ratio = logoDataUrl.width / logoDataUrl.height
        let logoWidth = maxLogoWidth, logoHeight = logoWidth / ratio
        if (logoHeight > maxLogoHeight) { logoHeight = maxLogoHeight; logoWidth = logoHeight * ratio }
        const logoY = 10 + (maxLogoHeight - logoHeight) / 2
        doc.addImage(logoDataUrl.dataUrl, 'PNG', marginX, logoY, logoWidth, logoHeight)
      }
      doc.setFont('times', 'bold')
      doc.setFontSize(15)
      doc.setTextColor(...colors.navy)
      doc.text('HISTORIQUE VERSEMENT CAISSE SPECIALE', pageWidth / 2, 18, { align: 'center' })
      doc.setFontSize(10)
      doc.setTextColor(45, 45, 45)
      doc.text(`Contrat : ${contract.id || contractId}`, pageWidth / 2, 23, { align: 'center' })
    }
    const drawSectionTitle = (title: string, y: number) => {
      doc.setFillColor(...colors.headerFill)
      doc.setDrawColor(...colors.line)
      doc.setLineWidth(0.2)
      doc.rect(marginX, y, contentWidth, 8, 'FD')
      doc.setFont('times', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...colors.navy)
      doc.text(title, pageWidth / 2, y + 5.6, { align: 'center' })
    }
    const drawGridRows = (
      rows: Array<{ leftLabel: string; leftValue: string; rightLabel: string; rightValue: string }>,
      startY: number,
      options?: { leftLabelWidth?: number; rightLabelWidth?: number; labelFontSize?: number; valueFontSize?: number }
    ) => {
      const rowHeight = 8, halfWidth = contentWidth / 2
      const leftLabelWidth = options?.leftLabelWidth ?? 33, rightLabelWidth = options?.rightLabelWidth ?? 33
      const labelFontSize = options?.labelFontSize ?? 9.2, valueFontSize = options?.valueFontSize ?? 9.2
      const totalHeight = rows.length * rowHeight
      doc.setDrawColor(...colors.line)
      doc.setLineWidth(0.2)
      doc.rect(marginX, startY, contentWidth, totalHeight)
      doc.line(marginX + halfWidth, startY, marginX + halfWidth, startY + totalHeight)
      doc.line(marginX + leftLabelWidth, startY, marginX + leftLabelWidth, startY + totalHeight)
      doc.line(marginX + halfWidth + rightLabelWidth, startY, marginX + halfWidth + rightLabelWidth, startY + totalHeight)
      rows.forEach((row, index) => {
        const y = startY + index * rowHeight
        if (index > 0) doc.line(marginX, y, marginX + contentWidth, y)
        doc.setFont('times', 'bold')
        doc.setFontSize(labelFontSize)
        doc.setTextColor(35, 35, 35)
        doc.text(row.leftLabel, marginX + 2, y + 5.3)
        doc.text(row.rightLabel, marginX + halfWidth + 2, y + 5.3)
        doc.setFont('times', 'normal')
        doc.setFontSize(valueFontSize)
        doc.setTextColor(15, 15, 15)
        doc.text(row.leftValue, marginX + leftLabelWidth + 2, y + 5.3)
        doc.text(row.rightValue, marginX + halfWidth + rightLabelWidth + 2, y + 5.3)
      })
      return startY + totalHeight
    }
    const rowHeight = 8
    const formatShortDate = (value: unknown): string => {
      const date = toDateSafe(value)
      if (!date) return '-'
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    const getJournalierPeriodBounds = (p: any): { start: Date; end: Date } | null => {
      const end = toDateSafe(p.dueAt)
      if (!end) return null
      const startRef = toDateSafe(contract.contractStartAt)
      const PERIOD_DAYS = 30
      if (startRef) {
        const i = p.dueMonthIndex ?? 0
        const start = new Date(startRef)
        start.setDate(start.getDate() + i * PERIOD_DAYS)
        return { start, end }
      }
      const start = new Date(end)
      start.setDate(start.getDate() - (PERIOD_DAYS - 1))
      return { start, end }
    }
    const drawPaymentBlock = (payment: any, startY: number) => {
      const headerHeight = 8, titleHeight = 8
      const columns = [43, 41, 33, 18, 34, 36, 64]
      const isJournalierType = contract.caisseType === 'JOURNALIERE' || contract.caisseType === 'JOURNALIERE_CHARITABLE'

      doc.setFillColor(...colors.headerFill)
      doc.setDrawColor(...colors.line)
      doc.setLineWidth(0.2)
      doc.rect(marginX, startY, contentWidth, titleHeight, 'FD')
      doc.setFont('times', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...colors.navy)
      if (isJournalierType) {
        const bounds = getJournalierPeriodBounds(payment)
        const titleText = bounds
          ? `VERSEMENT ${payment.dueMonthIndex + 1} DU ${formatShortDate(bounds.start)} AU ${formatShortDate(bounds.end)}`
          : `VERSEMENT ${payment.dueMonthIndex + 1} DU ${formatLongDate(payment.dueAt)}`
        doc.text(titleText, marginX + 3, startY + 5.4)
      } else {
        doc.text(`VERSEMENT ${payment.dueMonthIndex + 1} DU ${formatLongDate(payment.dueAt)}`, marginX + 3, startY + 5.4)
      }
      const tableY = startY + titleHeight

      const valuesHeight = rowHeight
      const totalHeight = titleHeight + headerHeight + valuesHeight
      doc.setDrawColor(...colors.line)
      doc.rect(marginX, tableY, contentWidth, headerHeight + valuesHeight)
      doc.setFillColor(225, 235, 245)
      doc.rect(marginX, tableY, contentWidth, headerHeight, 'F')
      const headers = ['DATE ECHEANCE', 'DATE REMISE', 'MONTANT', 'HEURE', 'MOYEN /TRANS', 'AGENT', 'REMARQUE']
      let cursorX = marginX
      headers.forEach((header, index) => {
        const width = columns[index]
        if (index > 0) doc.line(cursorX, tableY, cursorX, tableY + headerHeight + valuesHeight)
        doc.setFont('times', 'bold')
        doc.setFontSize(8.7)
        doc.setTextColor(32, 32, 32)
        doc.text(header, cursorX + width / 2, tableY + 5.3, { align: 'center' })
        cursorX += width
      })
      doc.line(marginX, tableY + headerHeight, marginX + contentWidth, tableY + headerHeight)

      let rowValues: string[]
      if (isJournalierType) {
        const bounds = getJournalierPeriodBounds(payment)
        const contribs = Array.isArray(payment.contribs) ? payment.contribs : []
        const totalAmount = contribs.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0)
        const lastContrib =
          contribs.length > 0
            ? contribs.reduce(
                (last: any, c: any) => {
                  const paid = toDateSafe(c.paidAt)
                  const lastPaid = toDateSafe(last.paidAt)
                  return paid && (!lastPaid || paid.getTime() > lastPaid.getTime()) ? c : last
                },
                contribs[0]
              )
            : null
        const dateEcheance = bounds
          ? `${formatShortDate(bounds.start)} - ${formatShortDate(bounds.end)}`
          : formatLongDate(payment.dueAt)
        const dateRemise = lastContrib ? formatLongDate(lastContrib.paidAt) : '-'
        // Même logique que Standard : agent = admin ayant traité (updatedBy), avec repli sur payment.updatedBy
        const agentDisplay = getAdminNameForExport({
          updatedBy: lastContrib?.updatedBy ?? lastContrib?.createdBy ?? payment.updatedBy,
        })
        rowValues = [
          dateEcheance,
          dateRemise,
          `${formatAmountForPDF(totalAmount)} FCFA`,
          lastContrib?.time ?? '-',
          lastContrib ? formatMode(lastContrib.mode) : '-',
          agentDisplay,
          totalAmount > 0 ? 'CONFORME' : 'NON CONFORME',
        ]
      } else {
        const isPaymentCompleted = payment.status === 'PAID' || Boolean(payment.paidAt)
        const displayedAmount = isPaymentCompleted ? (payment.amount || 0) : 0
        // Contrats LIBRE (et paiements importés) : paidAt/time/mode vivent dans
        // contribs[] — repli sur la dernière contribution, comme le journalier.
        const contribs = Array.isArray(payment.contribs) ? payment.contribs : []
        const lastContrib =
          contribs.length > 0
            ? contribs.reduce(
                (last: any, c: any) => {
                  const paid = toDateSafe(c.paidAt)
                  const lastPaid = toDateSafe(last.paidAt)
                  return paid && (!lastPaid || paid.getTime() > lastPaid.getTime()) ? c : last
                },
                contribs[0]
              )
            : null
        const paidAt = payment.paidAt ?? lastContrib?.paidAt
        const time = payment.time ?? lastContrib?.time
        const mode = payment.mode ?? lastContrib?.mode
        rowValues = [
          formatLongDate(payment.dueAt),
          formatLongDate(paidAt),
          `${formatAmountForPDF(displayedAmount)} FCFA`,
          time || '-',
          formatMode(mode),
          getAdminNameForExport({
            updatedBy: payment.updatedBy ?? lastContrib?.updatedBy ?? lastContrib?.createdBy,
          }),
          getPaymentRemark(payment),
        ]
      }
      cursorX = marginX
      rowValues.forEach((value, index) => {
        const width = columns[index]
        doc.setFont('times', 'normal')
        doc.setFontSize(8.9)
        doc.setTextColor(18, 18, 18)
        doc.text(value, cursorX + width / 2, tableY + headerHeight + 5.3, { align: 'center' })
        cursorX += width
      })
      return startY + totalHeight
    }

    // Page 1
    drawPageBackground()
    drawMainTitle(true)
    drawSectionTitle('Informations Personnelles du Membre', 30)
    let yCursor = 38.2
    yCursor = drawGridRows(
      [
        { leftLabel: 'MATRICULE', leftValue: memberMatricule, rightLabel: 'ANNEE', rightValue: String(new Date().getFullYear()) },
        { leftLabel: 'MEMBRE', leftValue: '', rightLabel: 'CODE', rightValue: (contract.id || contractId).slice(0, 16) },
        { leftLabel: 'NOM', leftValue: memberLastName, rightLabel: 'PRENOM', rightValue: memberFirstName },
        { leftLabel: 'LIEU / NAISSANCE', leftValue: memberBirthPlace, rightLabel: 'D.NAISS', rightValue: memberBirthDate },
        { leftLabel: 'NATIONALITE', leftValue: memberNationality, rightLabel: 'N°CNI/PASS/CS', rightValue: memberIdDocument },
        { leftLabel: 'TELEPHONE 1', leftValue: memberPhone1, rightLabel: 'TELEPHONE 2', rightValue: memberPhone2 },
        { leftLabel: 'SEXE', leftValue: memberGender, rightLabel: 'AGE', rightValue: memberAge },
        { leftLabel: 'QUARTIER', leftValue: memberQuarter, rightLabel: 'PROFESSION', rightValue: memberProfession },
      ],
      yCursor
    )
    drawSectionTitle('Informations Concernant Le Contact Urgent', yCursor + 9)
    drawGridRows(
      [
        { leftLabel: 'NOM', leftValue: emergencyContactName, rightLabel: 'LIEN', rightValue: emergencyRelation },
        { leftLabel: 'TELEPHONE 1', leftValue: emergencyPhone1, rightLabel: 'TELEPHONE 2', rightValue: emergencyPhone2 },
        { leftLabel: 'N°CNI/PASS/CS', leftValue: emergencyId, rightLabel: '', rightValue: '' },
      ],
      yCursor + 17.2
    )

    // Page 2
    doc.addPage()
    drawPageBackground()
    drawMainTitle()
    drawSectionTitle('Informations concernant la Caisse Spéciale', 30)
    const typesWithEmptyAmount = ['LIBRE', 'LIBRE_CHARITABLE', 'JOURNALIERE', 'JOURNALIERE_CHARITABLE']
    const hideAmountAndObservation = typesWithEmptyAmount.includes(contract.caisseType || '')
    const contractRows = [
      { leftLabel: 'DEBUT CAISSE.S', leftValue: formatLongDate(contract.contractStartAt), rightLabel: 'FIN CAISSE.S', rightValue: formatLongDate(contract.contractEndAt) },
      { leftLabel: 'STATUT', leftValue: translateContractStatus(contract.status || ''), rightLabel: 'CONTRAT', rightValue: contract.id || contractId },
      { leftLabel: 'TYPE CAISSE.S', leftValue: caisseTypeLabel, rightLabel: 'MONTANT', rightValue: hideAmountAndObservation ? '' : `${formatAmountForPDF(contract.monthlyAmount || 0)} FCFA` },
      { leftLabel: 'ANNEE INSCRIT', leftValue: String(toDateSafe(contract.createdAt)?.getFullYear() || new Date().getFullYear()), rightLabel: 'DUREE', rightValue: `${contract.monthsPlanned || 0} MOIS` },
      { leftLabel: 'DATE REMISE', leftValue: '', rightLabel: 'OBSERVATION', rightValue: '' },
    ]
    drawGridRows(contractRows, 38.2)
    doc.setFillColor(...colors.headerFill)
    doc.setDrawColor(...colors.line)
    doc.rect(marginX, 90, contentWidth, 8, 'FD')
    doc.setFont('times', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...colors.navy)
    doc.text('GESTION DES VERSEMENTS CAISSE SPECIALE TABLEAU RECAPITULATIF CI-DESSOUS', pageWidth / 2, 95.3, { align: 'center' })
    drawGridRows(
      [
        { leftLabel: 'NOMBRE DE VERSEMENT', leftValue: String(paidCount), rightLabel: 'MOIS IMPAYE', rightValue: String(unpaidCount) },
        { leftLabel: 'MONTANT PAYE', leftValue: `${formatAmountForPDF(totalPaid)} FCFA`, rightLabel: 'MONTANT IMPAYE', rightValue: `${formatAmountForPDF(totalUnpaid)} FCFA` },
        { leftLabel: 'TOTAL PENALITES', leftValue: `${formatAmountForPDF(totalPenalties)} FCFA`, rightLabel: 'TAXI', rightValue: '' },
      ],
      99,
      { leftLabelWidth: 50, rightLabelWidth: 46, labelFontSize: 8.8, valueFontSize: 9.4 }
    )
    return { drawPaymentBlock, pageWidth, pageHeight, drawPageBackground, drawMainTitle }
  }

  // Exporter PDF d’un seul versement : même design que "Exporter PDF" (2 premières pages + bloc "VERSEMENT i DU date" pour l’échéance)
  const exportSinglePaymentToPDF = async (payment: any) => {
    if (!contract) return
    const { generateSingleVersementPDF } = await import('@/services/caisse/versementPdfExport')
    await generateSingleVersementPDF({
      contract,
      contractId,
      member: member ?? undefined,
      group: group ?? undefined,
      payments,
      payment,
      getAdminDisplayName,
    })
  }

  // Fonction pour exporter les versements en PDF
  const exportToPDF = async () => {
    if (!contract) return
    const logoDataUrl = await loadLogoDataUrl()
    const sortedPayments = [...payments].sort((a, b) => a.dueMonthIndex - b.dueMonthIndex)
    const doc = new jsPDF('l', 'mm', 'a4')
    const { drawPaymentBlock, pageWidth, pageHeight, drawPageBackground, drawMainTitle } = buildVersementPDFFirstTwoPages(doc, {
      contract,
      contractId,
      member,
      group,
      sortedPayments,
      logoDataUrl,
    })

    if (sortedPayments.length > 0) {
      drawPaymentBlock(sortedPayments[0], 130)
    }

    const remainingPayments = sortedPayments.slice(1)
    const chunkSize = 3
    for (let i = 0; i < remainingPayments.length; i += chunkSize) {
      const chunk = remainingPayments.slice(i, i + chunkSize)
      doc.addPage()
      drawPageBackground()
      drawMainTitle()
      let blockY = 30
      chunk.forEach((payment) => {
        blockY = drawPaymentBlock(payment, blockY) + 6
      })
    }

    const pageCount = doc.getNumberOfPages()
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page)
      doc.setFont('times', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(90, 90, 90)
      doc.text(
        `Page ${page} sur ${pageCount} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: 'center' }
      )
    }

    const dateStr = new Date().toISOString().split('T')[0]
    doc.save(`historique_versement_caisse_speciale_${contractId}_${dateStr}.pdf`)
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
            Une erreur est survenue lors du chargement des données : {String((error as any)?.message || error || paymentsError)}
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
    <div className="p-4 sm:p-6 space-y-6 overflow-x-hidden">
      {/* En-tête avec bouton retour */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href={routes.admin.caisseSpecialeContractDetails(contractId)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour au contrat
          </Link>
          <Link
            href={routes.admin.caisseSpecialeContractRefunds(contractId)}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-800 transition-colors"
          >
            Remboursements &amp; Déclarations →
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Historique des Versements</h1>
        <p className="text-muted-foreground break-words">
          Versements du contrat <span className="font-mono text-sm break-all">#{contract.id}</span>
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
              <p className="text-base text-gray-900">
                {['LIBRE', 'LIBRE_CHARITABLE', 'JOURNALIERE', 'JOURNALIERE_CHARITABLE'].includes(contract.caisseType)
                  ? 'Libre'
                  : `${contract.monthlyAmount?.toLocaleString() ?? 0} FCFA`}
              </p>
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

          {/* Informations sur les bonus et pénalités */}
          {contractSettings && !loadingSettings && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Barème des bonus et pénalités</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bonus */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Bonus par mois</p>
                  </div>
                  <div className="space-y-1 text-xs text-blue-800">
                    <p>• Mois 1-3: <span className="font-semibold">0%</span></p>
                    {contractSettings.bonusTable && Object.keys(contractSettings.bonusTable).sort().map((key: string) => {
                      const monthNum = key.replace('M', '')
                      return (
                        <p key={key}>• Mois {monthNum}: <span className="font-semibold">{contractSettings.bonusTable[key]}%</span></p>
                      )
                    })}
                  </div>
                </div>

                {/* Pénalités */}
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-medium text-red-900">Pénalités de retard</p>
                  </div>
                  <div className="space-y-1 text-xs text-red-800">
                    <p>• Jours 1-3: <span className="font-semibold">0%</span></p>
                    {contractSettings.penaltyRules?.day4To12?.perDay !== undefined && (
                      <p>• Jours 4-12: <span className="font-semibold">{contractSettings.penaltyRules.day4To12.perDay}% par jour</span></p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {loadingSettings && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 animate-pulse">Chargement des paramètres...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des versements */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Historique des versements ({payments.length})
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
                  <span className="hidden sm:inline">Exporter PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-1.5 sm:gap-2 border-green-300 text-green-700 hover:bg-green-50 h-9 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Exporter Excel</span>
                  <span className="sm:hidden">Excel</span>
                </Button>
              </div>
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
                
                let statusLabel = ''
                let statusColor = ''
                let statusIcon = null
                
                if (payment.status === 'PAID') {
                  statusLabel = translatePaymentStatus('PAID')
                  statusColor = 'bg-green-100 text-green-800'
                  statusIcon = <CheckCircle className="h-4 w-4 text-green-600" />
                } else if (dueDate) {
                  // Si la date d'échéance est passée et pas payé = en retard
                  if (now > dueDate) {
                    statusLabel = 'En retard'
                    statusColor = 'bg-red-100 text-red-800'
                    statusIcon = <AlertTriangle className="h-4 w-4 text-red-600" />
                  } else {
                    // Si la date d'échéance n'est pas encore arrivée = en attente
                    statusLabel = 'En attente'
                    statusColor = 'bg-yellow-100 text-yellow-800'
                    statusIcon = <Clock className="h-4 w-4 text-yellow-600" />
                  }
                } else {
                  // Pas de date d'échéance = en attente
                  statusLabel = 'En attente'
                  statusColor = 'bg-yellow-100 text-yellow-800'
                  statusIcon = <Clock className="h-4 w-4 text-yellow-600" />
                }
                
                return (
                <div key={payment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 break-words">
                        Versement <span className="font-mono text-xs break-all">#{payment.id}</span> - Mois {payment.dueMonthIndex + 1}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => exportSinglePaymentToPDF(payment)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 h-8 px-2"
                      >
                        <Download className="h-3 w-3" />
                        <span className="hidden sm:inline">PDF</span>
                      </Button>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}>
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
                  </div>

                  {/* Affichage des bonus et pénalités */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Bonus */}
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-600">Bonus:</span>
                      {(() => {
                        const bonusPercentage = contract?.monthsPlanned && payment.dueMonthIndex !== undefined 
                          ? getBonusPercentageForPayment(payment.dueMonthIndex, contract.monthsPlanned)
                          : null
                        
                        const bonusApplied = (payment as any).bonusApplied
                        const isPaid = payment.status === 'PAID' || payment.paidAt

                        if (bonusApplied && bonusApplied > 0) {
                          return (
                            <span className="font-medium text-green-700">
                              {bonusApplied.toLocaleString()} FCFA
                              {bonusPercentage && (
                                <span className="ml-1 text-xs">({bonusPercentage}%)</span>
                              )}
                            </span>
                          )
                        } else if (bonusPercentage && bonusPercentage > 0 && payment.dueMonthIndex !== undefined) {
                          // Pour LIBRE, utiliser accumulatedAmount (montant réel accumulé jusqu'au mois précédent)
                          // Pour STANDARD et JOURNALIERE, utiliser monthlyAmount * (dueMonthIndex + 1)
                          const caisseType = (contract as any)?.caisseType || 'STANDARD'
                          // Pour LIBRE, le bonus est calculé sur le montant accumulé AVANT ce paiement
                          // Pour STANDARD et JOURNALIERE, utiliser monthlyAmount * mois
                          const baseForBonus =
                            caisseType === 'LIBRE' || caisseType === 'LIBRE_CHARITABLE'
                            ? ((payment as any).accumulatedAmount || payment.amount || 0)
                            : (contract?.monthlyAmount || 0) * (payment.dueMonthIndex + 1)
                          
                          // Calculer le bonus sur le montant de base avec le pourcentage du mois précédent
                          const expectedBonusAmount = Math.round((baseForBonus * bonusPercentage) / 100)
                          
                          // Si le versement est payé, utiliser bonusApplied si disponible, sinon calculer
                          if (isPaid) {
                            // Si bonusApplied existe, l'utiliser (c'est le bonus réellement appliqué)
                            if (bonusApplied && bonusApplied > 0) {
                              return (
                                <span className="font-medium text-green-700">
                                  {bonusApplied.toLocaleString()} FCFA ({bonusPercentage}%)
                                </span>
                              )
                            }
                            // Sinon, calculer avec accumulatedAmount
                            return (
                              <span className="font-medium text-green-700">
                                {expectedBonusAmount.toLocaleString()} FCFA ({bonusPercentage}%)
                              </span>
                            )
                          }
                          
                          // Sinon, afficher comme bonus attendu
                          return (
                            <span className="font-medium text-blue-600">
                              Attendu: {expectedBonusAmount.toLocaleString()} FCFA ({bonusPercentage}%)
                            </span>
                          )
                        } else if (bonusPercentage && bonusPercentage > 0) {
                          // Si pas de montant, afficher juste le pourcentage
                          const prefix = isPaid ? '' : 'Attendu: '
                          const colorClass = isPaid ? 'text-green-700' : 'text-gray-500'
                          return (
                            <span className={`font-medium ${colorClass}`}>
                              {prefix}{bonusPercentage}%
                            </span>
                          )
                        } else {
                          return <span className="font-medium text-gray-500">Non</span>
                        }
                      })()}
                    </div>

                    {/* Pénalités */}
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-gray-600">Pénalité:</span>
                      {(() => {
                        const penaltyApplied = (payment as any).penaltyApplied
                        const penaltyDays = (payment as any).penaltyDays
                        
                        if (penaltyApplied && penaltyApplied > 0) {
                          return (
                            <div className="flex flex-col gap-1">
                            <span className="font-medium text-red-700">
                              {penaltyApplied.toLocaleString()} FCFA
                              {contractSettings?.penaltyRules?.day4To12?.perDay && (
                                <span className="ml-1 text-xs">({contractSettings.penaltyRules.day4To12.perDay}%/jour)</span>
                              )}
                            </span>
                              {penaltyDays && penaltyDays > 0 && (
                                <span className="text-xs text-red-600">
                                  {penaltyDays} jour{penaltyDays > 1 ? 's' : ''} de retard
                                </span>
                              )}
                            </div>
                          )
                        } else if (penaltyDays && penaltyDays > 0 && penaltyDays <= 3) {
                          // Période de tolérance : retard mais pas de pénalité
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-orange-700">Tolérance</span>
                              <span className="text-xs text-orange-600">
                                {penaltyDays} jour{penaltyDays > 1 ? 's' : ''} de retard
                              </span>
                            </div>
                          )
                        } else {
                          return <span className="font-medium text-gray-500">Non</span>
                        }
                      })()}
                    </div>
                  </div>

                  {payment.paidAt && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span>Payé le {new Date(payment.paidAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {payment.time && (
                          <div className="flex items-center gap-2 text-green-700">
                            <Clock className="h-4 w-4" />
                            <span>Heure: {payment.time}</span>
                          </div>
                        )}
                        {payment.mode && (
                          <div className="flex items-center gap-2 text-green-700">
                            <DollarSign className="h-4 w-4" />
                            <span>Mode: {payment.mode}</span>
                          </div>
                        )}
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

                  {/* Contributions de groupe */}
                  {(payment as any).groupContributions && (payment as any).groupContributions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Contributions de groupe ({(payment as any).groupContributions.length}):</h4>
                      </div>
                      <div className="space-y-3">
                        {(payment as any).groupContributions.map((contrib: any, _index: number) => (
                          <div key={_index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {contrib.memberFirstName} {contrib.memberLastName}
                                </span>
                                <span className="text-xs text-gray-500">({contrib.memberMatricule})</span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3" />
                                <span>Montant: {contrib.amount?.toLocaleString()} FCFA</span>
                              </div>
                              
                              {contrib.createdAt && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>Versé le {(() => {
                                    try {
                                      const createdAtAny = contrib.createdAt as any
                                      const date = createdAtAny?.toDate ? createdAtAny.toDate() : new Date(contrib.createdAt)
                                      return date.toLocaleDateString('fr-FR')
                                    } catch (error) {
                                      return 'Date invalide'
                                    }
                                  })()}</span>
                                </div>
                              )}
                              
                              {contrib.time && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span>Heure: {contrib.time}</span>
                                </div>
                              )}
                              
                              {contrib.mode && (
                                <div className="flex items-center gap-2">
                                  <span>Mode: {contrib.mode}</span>
                                </div>
                              )}

                              {/* Pénalités pour cette contribution de groupe */}
                              {(contrib.penalty !== undefined && 
                                contrib.penalty !== null && 
                                Number(contrib.penalty) > 0) && (
                                <div className="flex items-center gap-2 text-red-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Pénalité: {Number(contrib.penalty).toLocaleString('fr-FR')} FCFA</span>
                                </div>
                              )}

                              {(contrib.penaltyDays !== undefined && 
                                contrib.penaltyDays !== null && 
                                Number(contrib.penaltyDays) > 0) && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-gray-500" />
                                  <span className={
                                    Number(contrib.penaltyDays) <= 3 
                                      ? 'text-orange-600' 
                                      : 'text-red-600'
                                  }>
                                    Retard: {Number(contrib.penaltyDays)} jour{Number(contrib.penaltyDays) > 1 ? 's' : ''}
                                    {Number(contrib.penaltyDays) <= 3 && ' (tolérance)'}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {contrib.proofUrl && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <a 
                                  href={contrib.proofUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  Voir la preuve de paiement
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contributions individuelles */}
                  {payment.contribs && payment.contribs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Détail des contributions:</h4>
                      </div>
                      <div className="space-y-3">
                        {payment.contribs.map((contrib, _index) => (
                          <div key={_index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">Membre {contrib.memberId}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                contrib.paidAt ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {contrib.paidAt ? 'Payé' : 'En attente'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3" />
                                <span>Montant: {contrib.amount?.toLocaleString()} FCFA</span>
                              </div>
                              
                              {contrib.paidAt && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>Payé le {(() => {
                                    try {
                                      // Gérer les Timestamps Firestore
                                      const paidAtAny = contrib.paidAt as any
                                      const date = paidAtAny?.toDate ? paidAtAny.toDate() : new Date(contrib.paidAt)
                                      return date.toLocaleDateString('fr-FR')
                                    } catch (error) {
                                      return 'Date invalide'
                                    }
                                  })()}</span>
                                </div>
                              )}
                              
                              {contrib.time && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span>Heure: {contrib.time}</span>
                                </div>
                              )}
                              
                              {contrib.mode && (
                                <div className="flex items-center gap-2">
                                  <span>Mode: {contrib.mode}</span>
                                </div>
                              )}

                              {/* Affichage des pénalités pour cette contribution */}
                              {((contrib as any).penalty !== undefined && 
                                (contrib as any).penalty !== null && 
                                Number((contrib as any).penalty) > 0) && (
                                <div className="flex items-center gap-2 text-red-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Pénalité: {Number((contrib as any).penalty).toLocaleString('fr-FR')} FCFA</span>
                                </div>
                              )}
                              {((contrib as any).penaltyDays !== undefined && 
                                (contrib as any).penaltyDays !== null && 
                                Number((contrib as any).penaltyDays) > 0) && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-gray-500" />
                                  <span className={
                                    Number((contrib as any).penaltyDays) <= 3 
                                      ? 'text-orange-600' 
                                      : 'text-red-600'
                                  }>
                                    Retard: {Number((contrib as any).penaltyDays)} jour{Number((contrib as any).penaltyDays) > 1 ? 's' : ''}
                                    {Number((contrib as any).penaltyDays) <= 3 && ' (tolérance)'}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {contrib.proofUrl && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <a 
                                  href={contrib.proofUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  Voir la preuve de paiement
                                </a>
                              </div>
                            )}
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
