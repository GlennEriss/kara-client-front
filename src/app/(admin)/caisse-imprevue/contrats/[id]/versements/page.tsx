'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import routes from '@/constantes/routes'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAgentsActifs } from '@/hooks/agent-recouvrement'
import { useContractCI, usePaymentsCI, usePaymentsCIStats } from '@/hooks/caisse-imprevue'
import { useMember } from '@/hooks/useMembers'
import { generateSingleVersementCIPDF } from '@/services/caisse-imprevue/generateSingleVersementCIPDF'
import { CONTRACT_CI_STATUS_LABELS, PaymentCI, VersementCI } from '@/types/types'
import { addMonths, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import jsPDF from 'jspdf'
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Banknote,
    Building2,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    Download,
    FileText,
    History,
    Smartphone,
    TrendingUp,
    User,
    UserCircle
} from 'lucide-react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import * as XLSX from 'xlsx'

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

/** Formate un montant pour l'affichage PDF (espace comme séparateur de milliers, pas de caractère fr-FR qui peut s'afficher en "/"). */
function formatAmountForPDF(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function ContractCIPaymentsPage() {
  const params = useParams() as { id: string }
  const contractId = params.id
  const router = useRouter()

  // Récupération des données
  const { data: contract, isLoading: isLoadingContract, isError: isErrorContract, error: errorContract } = useContractCI(contractId)
  const { data: payments = [], isLoading: isLoadingPayments, isError: isErrorPayments, error: errorPayments } = usePaymentsCI(contractId)
  const { data: member } = useMember(contract?.memberId)
  const { data: agents = [] } = useAgentsActifs()
  const agentsMap = Object.fromEntries(agents.map((a) => [a.id, a]))
  
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
          'Moyen de paiement': PAYMENT_MODE_LABELS[versement.mode] || versement.mode,
          'Pénalité': versement.penalty || 0,
          'Jours de retard': versement.daysLate || 0,
          'Créé par': getAdminDisplayName(versement.createdBy),
          'Agent de recouvrement': versement.agentRecouvrementId && agentsMap[versement.agentRecouvrementId]
            ? `${agentsMap[versement.agentRecouvrementId].nom} ${agentsMap[versement.agentRecouvrementId].prenom}`
            : '-',
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
  const exportToPDF = async () => {
    if (!payments.length || !contract) return

    const loadLogoDataUrl = async (): Promise<{ dataUrl: string; width: number; height: number } | null> => {
      try {
        const response = await fetch('/assets/caisse-imprevue/image1.png')
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
          img.onload = () => {
            if (!img.naturalWidth || !img.naturalHeight) {
              resolve(null)
              return
            }
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
          }
          img.onerror = () => resolve(null)
          img.src = dataUrl
        })

        if (!dimensions) return null
        return {
          dataUrl,
          width: dimensions.width,
          height: dimensions.height,
        }
      } catch (error) {
        console.error('Erreur chargement logo export PDF:', error)
        return null
      }
    }

    const logoDataUrl = await loadLogoDataUrl()
    const sortedPayments = [...payments].sort((a, b) => a.monthIndex - b.monthIndex)
    const doc = new jsPDF('l', 'mm', 'a4')
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
      if (typeof value === 'string') {
        const parsedIso = parseISO(value)
        if (!Number.isNaN(parsedIso.getTime())) return parsedIso
      }
      const parsed = new Date(value as any)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    const formatLongDate = (value: unknown): string => {
      const date = toDateSafe(value)
      if (!date) return '-'
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }

    const formatShortDate = (value: unknown): string => {
      const date = toDateSafe(value)
      if (!date) return '-'
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const formatMode = (mode?: string): string => {
      const modeMap: Record<string, string> = {
        airtel_money: 'AIRTEL-MONEY',
        mobicash: 'MOBICASH',
        cash: 'CASH',
        bank_transfer: 'VIREMENT',
      }
      if (!mode) return '-'
      return modeMap[mode] || String(mode).toUpperCase()
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

    const getPaymentDueAt = (payment: PaymentCI): Date | null => {
      const first = toDateSafe(contract.firstPaymentDate)
      if (!first) return null
      return addMonths(first, payment.monthIndex)
    }

    const getPaymentPaidAt = (payment: PaymentCI): Date | null => {
      const lastVersement = payment.versements?.length ? payment.versements[payment.versements.length - 1] : null
      return lastVersement?.date ? toDateSafe(lastVersement.date) : null
    }

    const getPaymentTime = (payment: PaymentCI): string => {
      const lastVersement = payment.versements?.length ? payment.versements[payment.versements.length - 1] : null
      return lastVersement?.time || '-'
    }

    const getPaymentMode = (payment: PaymentCI): string => {
      const lastVersement = payment.versements?.length ? payment.versements[payment.versements.length - 1] : null
      return lastVersement?.mode ? formatMode(lastVersement.mode) : '-'
    }

    const getPaymentPenaltyAmount = (payment: PaymentCI): number => {
      return (payment.versements || []).reduce((sum, v) => sum + (v.penalty || 0), 0)
    }

    const getPaymentPenaltyDays = (payment: PaymentCI): number => {
      return Math.max(0, ...(payment.versements || []).map((v) => v.daysLate || 0))
    }

    const getPaymentRemark = (payment: PaymentCI): string => {
      if (payment.status === 'PAID') {
        const penaltyDays = getPaymentPenaltyDays(payment)
        const penaltyAmount = getPaymentPenaltyAmount(payment)
        if (penaltyAmount > 0 || penaltyDays > 0) return `RETARD ${penaltyDays}J`
        return 'CONFORME'
      }
      if (payment.status === 'PARTIAL') return 'PARTIEL'
      const dueAt = getPaymentDueAt(payment)
      if (dueAt && new Date() > dueAt) return 'IMPAYE'
      return 'EN ATTENTE'
    }

    const getAdminNameForExport = (payment: PaymentCI): string => {
      const label = getAdminDisplayName(payment.updatedBy)
      if (!label || label === 'Chargement...') return payment.updatedBy || '-'
      return label
    }

    const isQuotidien = contract.paymentFrequency !== 'MONTHLY'
    const PERIOD_DAYS = 30
    const getQuotidienPeriodBounds = (p: PaymentCI): { start: Date; end: Date } | null => {
      const first = toDateSafe(contract.firstPaymentDate)
      if (!first) return null
      const start = addMonths(first, p.monthIndex)
      const end = new Date(start)
      end.setDate(end.getDate() + PERIOD_DAYS - 1)
      return { start, end }
    }

    const memberLastName = member?.lastName || contract.memberLastName || 'INCONNU'
    const memberFirstName = member?.firstName || contract.memberFirstName || 'INCONNU'
    const memberMatricule = member?.matricule || contract.memberId || contract.id || '-'
    const memberBirthPlace = member?.birthPlace || '-'
    const memberBirthDate = formatLongDate(member?.birthDate || contract.memberBirthDate)
    const memberNationality = member?.nationality || contract.memberNationality || '-'
    const memberIdDocument = member?.identityDocumentNumber || '-'
    const memberPhone1 = member?.contacts?.[0] || contract.memberContacts?.[0] || '-'
    const memberPhone2 = member?.contacts?.[1] || contract.memberContacts?.[1] || '-'
    const memberGender = (member?.gender || contract.memberGender) ? String(member?.gender || contract.memberGender).toUpperCase() : '-'
    const memberAge = getAge(member?.birthDate || contract.memberBirthDate)
    const memberQuarter =
      member?.address?.district ||
      member?.address?.arrondissement ||
      member?.address?.city ||
      contract.memberAddress ||
      '-'
    const memberProfession = member?.profession || contract.memberProfession || '-'

    const emergencyContactName = contract.emergencyContact
      ? `${contract.emergencyContact.lastName || ''} ${contract.emergencyContact.firstName || ''}`.trim() || 'INCONNU'
      : 'INCONNU'
    const emergencyRelation = contract.emergencyContact?.relationship || '-'
    const emergencyPhone1 = contract.emergencyContact?.phone1 || '-'
    const emergencyPhone2 = contract.emergencyContact?.phone2 || '-'
    const emergencyId = contract.emergencyContact?.idNumber || '-'

    const unpaidCount = sortedPayments.filter((payment) => payment.status !== 'PAID').length
    const paidCount = sortedPayments.filter((payment) => payment.status === 'PAID').length
    const totalCotisation = sortedPayments.reduce((sum, payment) => sum + (payment.targetAmount || 0), 0)
    const totalPaid = sortedPayments.reduce((sum, payment) => sum + (payment.accumulatedAmount || 0), 0)
    const totalUnpaid = Math.max(totalCotisation - totalPaid, 0)
    const totalPenalties = sortedPayments.reduce((sum, payment) => sum + getPaymentPenaltyAmount(payment), 0)
    const firstPaidDate = sortedPayments
      .flatMap((p) => p.versements || [])
      .map((v) => toDateSafe(v.date))
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => a.getTime() - b.getTime())[0]

    const drawPageBackground = () => {
      doc.setFillColor(...colors.pageFill)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
      doc.setDrawColor(...colors.navy)
      doc.setLineWidth(0.7)
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16)
    }

    const drawMainTitle = (showLogo = false) => {
      if (showLogo && logoDataUrl) {
        const maxLogoWidth = 34
        const maxLogoHeight = 18
        const ratio = logoDataUrl.width / logoDataUrl.height
        let logoWidth = maxLogoWidth
        let logoHeight = logoWidth / ratio
        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight
          logoWidth = logoHeight * ratio
        }
        const logoY = 10 + (maxLogoHeight - logoHeight) / 2
        doc.addImage(logoDataUrl.dataUrl, 'PNG', marginX, logoY, logoWidth, logoHeight)
      }
      doc.setFont('times', 'bold')
      doc.setFontSize(15)
      doc.setTextColor(...colors.navy)
      doc.text('HISTORIQUE VERSEMENT CAISSE IMPREVUE', pageWidth / 2, 18, { align: 'center' })
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
      options?: {
        leftLabelWidth?: number
        rightLabelWidth?: number
        labelFontSize?: number
        valueFontSize?: number
      }
    ) => {
      const rowHeight = 8
      const halfWidth = contentWidth / 2
      const leftLabelWidth = options?.leftLabelWidth ?? 33
      const rightLabelWidth = options?.rightLabelWidth ?? 33
      const labelFontSize = options?.labelFontSize ?? 9.2
      const valueFontSize = options?.valueFontSize ?? 9.2
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

    const drawPaymentBlock = (payment: PaymentCI, startY: number) => {
      const headerHeight = 8
      const valuesHeight = 8
      const titleHeight = 8
      const totalHeight = titleHeight + headerHeight + valuesHeight
      const columns = [43, 41, 33, 18, 34, 36, 64]

      doc.setFillColor(...colors.headerFill)
      doc.setDrawColor(...colors.line)
      doc.setLineWidth(0.2)
      doc.rect(marginX, startY, contentWidth, titleHeight, 'FD')
      doc.setFont('times', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...colors.navy)
      if (isQuotidien) {
        const bounds = getQuotidienPeriodBounds(payment)
        const titleText = bounds
          ? `VERSEMENT ${payment.monthIndex + 1} DU ${formatShortDate(bounds.start)} AU ${formatShortDate(bounds.end)}`
          : `VERSEMENT ${payment.monthIndex + 1} DU ${formatLongDate(getPaymentDueAt(payment))}`
        doc.text(titleText, marginX + 3, startY + 5.4)
      } else {
        doc.text(`VERSEMENT ${payment.monthIndex + 1} DU ${formatLongDate(getPaymentDueAt(payment))}`, marginX + 3, startY + 5.4)
      }

      const tableY = startY + titleHeight
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

      const isPaymentCompleted = payment.status === 'PAID' || payment.accumulatedAmount >= payment.targetAmount
      const displayedAmount = payment.accumulatedAmount ?? 0

      const rowValues = [
        isQuotidien && getQuotidienPeriodBounds(payment)
          ? formatLongDate(getQuotidienPeriodBounds(payment)!.end)
          : formatLongDate(getPaymentDueAt(payment)),
        formatLongDate(getPaymentPaidAt(payment)),
        `${formatAmountForPDF(displayedAmount)} FCFA`,
        getPaymentTime(payment),
        getPaymentMode(payment),
        getAdminNameForExport(payment),
        getPaymentRemark(payment),
      ]

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

    drawPageBackground()
    drawMainTitle(true)
    drawSectionTitle('Informations Personnelles du Membre', 30)
    let yCursor = 38.2
    yCursor = drawGridRows(
      [
        {
          leftLabel: 'MATRICULE',
          leftValue: memberMatricule,
          rightLabel: 'ANNEE',
          rightValue: String(new Date().getFullYear()),
        },
        {
          leftLabel: 'MEMBRE',
          leftValue: 'INDIVIDUEL',
          rightLabel: 'CODE',
          rightValue: (contract.id || contractId).slice(0, 16),
        },
        { leftLabel: 'NOM', leftValue: memberLastName, rightLabel: 'PRENOM', rightValue: memberFirstName },
        {
          leftLabel: 'LIEU / NAISSANCE',
          leftValue: memberBirthPlace,
          rightLabel: 'D.NAISS',
          rightValue: memberBirthDate,
        },
        {
          leftLabel: 'NATIONALITE',
          leftValue: memberNationality,
          rightLabel: 'N°CNI/PASS/CS',
          rightValue: memberIdDocument,
        },
        {
          leftLabel: 'TELEPHONE 1',
          leftValue: memberPhone1,
          rightLabel: 'TELEPHONE 2',
          rightValue: memberPhone2,
        },
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

    doc.addPage()
    drawPageBackground()
    drawMainTitle()
    drawSectionTitle('Informations concernant la Caisse Imprévue', 30)
    const endDate = (() => {
      const start = toDateSafe(contract.firstPaymentDate)
      if (!start) return null
      return addMonths(start, contract.subscriptionCIDuration || 0)
    })()
    const contractRows = [
      {
        leftLabel: 'PRENOM',
        leftValue: memberFirstName,
        rightLabel: 'LIENS',
        rightValue: emergencyRelation,
      },
      {
        leftLabel: 'DEBUT CAISSE.I',
        leftValue: formatLongDate(contract.firstPaymentDate),
        rightLabel: 'FIN CAISSE.I',
        rightValue: formatLongDate(endDate),
      },
      {
        leftLabel: 'STATUT',
        leftValue: CONTRACT_CI_STATUS_LABELS[contract.status] || contract.status,
        rightLabel: 'CONTRAT',
        rightValue: contract.id || contractId,
      },
      {
        leftLabel: 'FORFAIT',
        leftValue: contract.subscriptionCICode || '-',
        rightLabel: 'MONTANT',
        rightValue: `${formatAmountForPDF(contract.subscriptionCIAmountPerMonth || 0)} FCFA`,
      },
      {
        leftLabel: 'ANNEE INSCRIT',
        leftValue: String(toDateSafe(contract.createdAt)?.getFullYear() || new Date().getFullYear()),
        rightLabel: 'DUREE',
        rightValue: `${contract.subscriptionCIDuration || 0} MOIS`,
      },
      {
        leftLabel: 'DATE REMISE',
        leftValue: formatLongDate(firstPaidDate),
        rightLabel: 'OBSERVATION',
        rightValue: 'TABLEAU RECAPITULATIF',
      },
    ]
    drawGridRows(contractRows, 38.2)

    doc.setFillColor(...colors.headerFill)
    doc.setDrawColor(...colors.line)
    doc.rect(marginX, 90, contentWidth, 8, 'FD')
    doc.setFont('times', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...colors.navy)
    doc.text('GESTION DES VERSEMENTS CAISSE IMPREVUE TABLEAU RECAPITULATIF CI-DESSOUS', pageWidth / 2, 95.3, { align: 'center' })

    drawGridRows(
      [
        {
          leftLabel: 'NOMBRE DE VERSEMENT',
          leftValue: String(paidCount),
          rightLabel: 'MOIS IMPAYE',
          rightValue: String(unpaidCount),
        },
        {
          leftLabel: 'MONTANT PAYE',
          leftValue: `${formatAmountForPDF(totalPaid)} FCFA`,
          rightLabel: 'MONTANT IMPAYE',
          rightValue: `${formatAmountForPDF(totalUnpaid)} FCFA`,
        },
        {
          leftLabel: 'TOTAL PENALITES',
          leftValue: `${formatAmountForPDF(totalPenalties)} FCFA`,
          rightLabel: 'TAXI',
          rightValue: '',
        },
      ],
      99,
      {
        leftLabelWidth: 50,
        rightLabelWidth: 46,
        labelFontSize: 8.8,
        valueFontSize: 9.4,
      }
    )

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
    doc.save(`historique_versement_caisse_imprevue_${contractId}_${dateStr}.pdf`)
  }

  // Fonction pour exporter un paiement individuel en PDF (même PDF que « Télécharger en PDF » du modal reçu / page contrat)
  const exportSinglePaymentToPDF = async (payment: PaymentCI) => {
    if (!payments.length || !contract) return
    await generateSingleVersementCIPDF(contract, payment, {
      contractId,
      getAdminDisplayName,
    })
  }

  // (Le PDF single est généré par generateSingleVersementCIPDF pour être identique au « Télécharger en PDF » du modal reçu.)

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

                      {/* Modifié le / Motif (si le paiement a été modifié) */}
                      {(payment.modificationReason ?? payment.updatedAt) && (
                        <div className="mb-4 p-4 rounded-lg border border-amber-200 bg-amber-50 space-y-1 text-sm text-gray-600">
                          {payment.updatedAt && (() => {
                            const u = payment.updatedAt
                            const modDate = u instanceof Date ? u : (typeof (u as { toDate?: () => Date })?.toDate === 'function' ? (u as { toDate: () => Date }).toDate() : u ? new Date(u as string | number) : null)
                            if (!modDate || isNaN(modDate.getTime())) return null
                            return (
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className="font-medium">Modifié le:</span>
                                <span>{modDate.toLocaleDateString('fr-FR')} à {modDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )
                          })()}
                          {payment.modificationReason && (
                            <div>
                              <span className="font-medium">Motif:</span>
                              <span className="ml-1">{payment.modificationReason}</span>
                            </div>
                          )}
                        </div>
                      )}

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

                                {/* Informations admin et agent */}
                                <div className="pt-2 border-t border-gray-200 space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <User className="h-4 w-4" />
                                    <span>Enregistré par:</span>
                                    <span className={`font-medium ${loadingAdmins.has(versement.createdBy) ? 'animate-pulse' : ''}`}>
                                      {getAdminDisplayName(versement.createdBy)}
                                    </span>
                                  </div>
                                  {versement.agentRecouvrementId && agentsMap[versement.agentRecouvrementId] && (
                                    <div className="flex items-center gap-2 text-sm text-[#234D65]">
                                      <UserCircle className="h-4 w-4" />
                                      <span>Agent de recouvrement:</span>
                                      <span className="font-medium">
                                        {agentsMap[versement.agentRecouvrementId].nom} {agentsMap[versement.agentRecouvrementId].prenom}
                                      </span>
                                    </div>
                                  )}
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
