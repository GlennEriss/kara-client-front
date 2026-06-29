/**
 * Modal d'export des demandes d'adhésion V2
 * 
 * Permet d'exporter la liste des demandes en PDF ou Excel
 * avec filtres par période, nombre, et tri personnalisable
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Download, 
  Loader2, 
  FileSpreadsheet, 
  FileText, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  BanknoteIcon,
  ListFilter,
  SortAsc,
  Hash,
  CalendarRange,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MembershipRepositoryV2 } from '../../repositories/MembershipRepositoryV2'
import type { MembershipRequest } from '../../entities'
import { MEMBERSHIP_REQUEST_STATUS_LABELS } from '@/constantes/membership-requests'

type ExportFormat = 'pdf' | 'excel'
type ScopeMode = 'all' | 'period' | 'quantity'
type SortBy = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'
type StatusFilter = 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'unpaid'

interface ExportMembershipRequestsModalV2Props {
  isOpen: boolean
  onClose: () => void
}

export function ExportMembershipRequestsModalV2({
  isOpen,
  onClose,
}: ExportMembershipRequestsModalV2Props) {
  const today = new Date()
  const defaultStart = new Date(today.getFullYear(), 0, 1) // 1er janvier de l'année en cours

  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')
  const [scopeMode, setScopeMode] = useState<ScopeMode>('period')
  const [dateStart, setDateStart] = useState<string>(format(defaultStart, 'yyyy-MM-dd'))
  const [dateEnd, setDateEnd] = useState<string>(format(today, 'yyyy-MM-dd'))
  const [quantity, setQuantity] = useState<number>(100)
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')
  const [statusFilters, setStatusFilters] = useState<Record<StatusFilter, boolean>>({
    pending: false,
    under_review: false,
    approved: false,
    rejected: false,
    paid: false,
    unpaid: false,
  })
  const [isExporting, setIsExporting] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  // Helper pour normaliser les dates (peut être Date, Timestamp Firestore, ou string)
  const normalizeDate = (date: any): Date => {
    if (date instanceof Date) {
      return date
    } else if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      return date.toDate()
    } else {
      return new Date(date)
    }
  }

  // Fonction pour mettre à jour les filtres de statut
  const handleStatusFilterChange = (status: StatusFilter, checked: boolean) => {
    setStatusFilters(prev => ({ ...prev, [status]: checked }))
  }

  // Calculer l'aperçu (nombre de demandes correspondantes)
  const calculatePreview = useCallback(async () => {
    try {
      const repository = MembershipRepositoryV2.getInstance()
      let requests: MembershipRequest[] = []

      // Récupérer selon le périmètre (même logique que handleExport)
      if (scopeMode === 'all') {
        let page = 1
        const pageSize = 100
        while (true) {
          const response = await repository.getAll({}, page, pageSize)
          if (!response.items || response.items.length === 0) break
          requests.push(...response.items)
          if (!response.pagination?.hasNextPage) break
          page++
        }
      } else if (scopeMode === 'period') {
        const start = new Date(dateStart)
        const end = new Date(dateEnd)
        end.setHours(23, 59, 59, 999)

        let page = 1
        const pageSize = 100
        while (true) {
          const response = await repository.getAll({}, page, pageSize)
          if (!response.items || response.items.length === 0) break
          
          const filtered = response.items.filter((req) => {
            const createdAt = normalizeDate(req.createdAt)
            return createdAt >= start && createdAt <= end
          })
          
          requests.push(...filtered)
          if (!response.pagination?.hasNextPage) break
          page++
        }
      } else if (scopeMode === 'quantity') {
        let page = 1
        const pageSize = 100
        while (requests.length < quantity) {
          const response = await repository.getAll({}, page, pageSize)
          if (!response.items || response.items.length === 0) break
          requests.push(...response.items)
          if (requests.length >= quantity) break
          if (!response.pagination?.hasNextPage) break
          page++
        }
        requests = requests.slice(0, quantity)
      }

      // Appliquer les filtres de statut
      const activeFilters = Object.entries(statusFilters).filter(([_, checked]) => checked)
      if (activeFilters.length > 0) {
        requests = requests.filter((req) => {
          return activeFilters.some(([status]) => {
            if (status === 'paid') return req.isPaid
            if (status === 'unpaid') return !req.isPaid
            return req.status === status
          })
        })
      }

      setPreviewCount(requests.length)
    } catch (error) {
      console.error('Erreur lors du calcul de l\'aperçu:', error)
    }
  }, [scopeMode, dateStart, dateEnd, quantity, statusFilters])

  // Recalculer l'aperçu quand les paramètres changent
  useEffect(() => {
    if (isOpen) {
      calculatePreview()
    }
  }, [isOpen, calculatePreview])

  const handleExport = async () => {
    try {
      // Vérifier d'abord le nombre approximatif de demandes pour afficher un avertissement
      const repository = MembershipRepositoryV2.getInstance()
      let estimatedCount = 0

      // Estimation rapide selon le périmètre
      if (scopeMode === 'all') {
        // Pour "toutes", on ne peut pas facilement estimer sans compter
        // On supposera qu'il y en a beaucoup
        estimatedCount = 9999 // Flag pour "beaucoup"
      } else if (scopeMode === 'quantity') {
        estimatedCount = quantity
      } else if (scopeMode === 'period') {
        // Estimation basée sur previewCount si disponible
        estimatedCount = previewCount || 500
      }

      // Avertissement si export volumineux (> 1000 demandes)
      if (estimatedCount > 1000 || scopeMode === 'all') {
        const confirmed = window.confirm(
          `ATTENTION : Cet export contiendra ${estimatedCount === 9999 ? 'potentiellement un grand nombre' : `environ ${estimatedCount.toLocaleString()}`} de demandes.\n\n` +
          `La génération peut prendre plusieurs minutes.\n` +
          `Voulez-vous continuer ?`
        )
        if (!confirmed) {
          return
        }
      }

      setIsExporting(true)
      toast.info(`Génération de l'export en cours... (${estimatedCount === 9999 ? 'peut prendre du temps' : `${estimatedCount} demandes`})`, {
        duration: 5000,
      })

      // Récupérer les demandes selon le périmètre
      let requests: MembershipRequest[] = []

      if (scopeMode === 'all') {
        // Récupérer toutes les demandes (par pages)
        let page = 1
        const pageSize = 100
        while (true) {
          const response = await repository.getAll({}, page, pageSize)
          if (!response.items || response.items.length === 0) break
          requests.push(...response.items)
          if (!response.pagination?.hasNextPage) break
          page++
        }
      } else if (scopeMode === 'period') {
        // Récupérer par période
        const start = new Date(dateStart)
        const end = new Date(dateEnd)
        end.setHours(23, 59, 59, 999)

        let page = 1
        const pageSize = 100
        while (true) {
          const response = await repository.getAll({}, page, pageSize)
          if (!response.items || response.items.length === 0) break
          
          // Filtrer par période côté client
          const filtered = response.items.filter((req) => {
            const createdAt = normalizeDate(req.createdAt)
            return createdAt >= start && createdAt <= end
          })
          
          requests.push(...filtered)
          if (!response.pagination?.hasNextPage) break
          page++
        }
      } else if (scopeMode === 'quantity') {
        // Récupérer les N premières demandes (triées du plus récent au plus ancien)
        let page = 1
        const pageSize = 100
        while (requests.length < quantity) {
          const response = await repository.getAll({}, page, pageSize)
          if (!response.items || response.items.length === 0) break
          requests.push(...response.items)
          if (requests.length >= quantity) break
          if (!response.pagination?.hasNextPage) break
          page++
        }
        // Limiter à la quantité demandée
        requests = requests.slice(0, quantity)
      }

      // Appliquer les filtres de statut
      const activeFilters = Object.entries(statusFilters).filter(([_, checked]) => checked)
      if (activeFilters.length > 0) {
        requests = requests.filter((req) => {
          return activeFilters.some(([status]) => {
            if (status === 'paid') return req.isPaid
            if (status === 'unpaid') return !req.isPaid
            return req.status === status
          })
        })
      }

      if (requests.length === 0) {
        toast.info('Aucune demande à exporter selon les critères sélectionnés')
        return
      }

      // Trier les demandes
      requests.sort((a, b) => {
        if (sortBy === 'date_desc' || sortBy === 'date_asc') {
          const dateA = normalizeDate(a.createdAt)
          const dateB = normalizeDate(b.createdAt)
          return sortBy === 'date_desc' 
            ? dateB.getTime() - dateA.getTime()
            : dateA.getTime() - dateB.getTime()
        } else {
          // Tri alphabétique
          const nameA = `${a.identity.firstName} ${a.identity.lastName}`.toLowerCase()
          const nameB = `${b.identity.firstName} ${b.identity.lastName}`.toLowerCase()
          return sortBy === 'name_asc'
            ? nameA.localeCompare(nameB, 'fr')
            : nameB.localeCompare(nameA, 'fr')
        }
      })

      // Générer l'export
      if (exportFormat === 'pdf') {
        await generatePDF(requests, scopeMode, dateStart, dateEnd, quantity)
      } else {
        await generateExcel(requests, scopeMode, dateStart, dateEnd, quantity)
      }

      toast.success('Export généré avec succès', {
        description: `${requests.length} demande${requests.length > 1 ? 's' : ''} exportée${requests.length > 1 ? 's' : ''}`,
        duration: 4000,
      })
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export', {
        description: error.message || 'Une erreur est survenue',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const loadPublicImageAsDataUrl = async (
    imagePath: string
  ): Promise<{ dataUrl: string; width: number; height: number } | null> => {
    try {
      const response = await fetch(imagePath)
      if (!response.ok) return null

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      const image = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = objectUrl
      })

      if (!image) {
        URL.revokeObjectURL(objectUrl)
        return null
      }

      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height
      if (!width || !height) {
        URL.revokeObjectURL(objectUrl)
        return null
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(objectUrl)
        return null
      }

      context.drawImage(image, 0, 0)
      URL.revokeObjectURL(objectUrl)

      return await new Promise<{ dataUrl: string; width: number; height: number } | null>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result !== 'string') {
            resolve(null)
            return
          }
          resolve({
            dataUrl: reader.result,
            width,
            height,
          })
        }
        reader.onerror = () => resolve(null)
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            resolve(null)
            return
          }
          reader.readAsDataURL(pngBlob)
        }, 'image/png')
      })
    } catch {
      return null
    }
  }

  const generatePDF = async (
    requests: MembershipRequest[],
    scopeMode: ScopeMode,
    dateStart: string,
    dateEnd: string,
    quantity: number
  ) => {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF('landscape', 'mm', 'a4')
    const logoAsset = await loadPublicImageAsDataUrl('/Logo-Kara.webp')

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 14
    const logoCircleSize = 16
    const titleX = logoAsset ? marginX + logoCircleSize + 4 : marginX

    // Palette visuelle cohérente avec KARA
    const colors = {
      primary: [31, 81, 255] as [number, number, number], // kara-primary-dark
      brandDark: [35, 77, 101] as [number, number, number],
      ink: [15, 23, 42] as [number, number, number],
      muted: [100, 116, 139] as [number, number, number],
      line: [226, 232, 240] as [number, number, number],
      success: [16, 185, 129] as [number, number, number],
      danger: [239, 68, 68] as [number, number, number],
      info: [59, 130, 246] as [number, number, number],
      warning: [245, 158, 11] as [number, number, number],
    }

    const scopeLabel = scopeMode === 'period'
      ? `Du ${format(new Date(dateStart), 'dd/MM/yyyy', { locale: fr })} au ${format(new Date(dateEnd), 'dd/MM/yyyy', { locale: fr })}`
      : scopeMode === 'quantity'
        ? `${quantity} demandes les plus récentes`
        : 'Toutes les demandes'
    const generatedAtLabel = format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })

    const paidCount = requests.filter((r) => r.isPaid).length
    const unpaidCount = requests.length - paidCount
    const pendingOrReviewCount = requests.filter((r) => r.status === 'pending' || r.status === 'under_review').length
    const approvedCount = requests.filter((r) => r.status === 'approved').length

    // Header principal
    doc.setFillColor(colors.brandDark[0], colors.brandDark[1], colors.brandDark[2])
    doc.rect(0, 0, pageWidth, 30, 'F')
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2])
    doc.setLineWidth(1)
    doc.line(0, 30, pageWidth, 30)

    doc.setTextColor(255, 255, 255)
    if (logoAsset) {
      const circleX = marginX
      const circleY = 6.5
      const circleRadius = logoCircleSize / 2
      const circleCenterX = circleX + circleRadius
      const circleCenterY = circleY + circleRadius

      doc.setFillColor(255, 255, 255)
      doc.circle(circleCenterX, circleCenterY, circleRadius, 'F')

      const padding = 2
      const maxLogoW = logoCircleSize - padding * 2
      const maxLogoH = logoCircleSize - padding * 2
      const ratio = logoAsset.width / logoAsset.height

      let drawW = maxLogoW
      let drawH = maxLogoH
      if (ratio >= 1) {
        drawH = maxLogoW / ratio
      } else {
        drawW = maxLogoH * ratio
      }

      const drawX = circleX + (logoCircleSize - drawW) / 2
      const drawY = circleY + (logoCircleSize - drawH) / 2
      doc.addImage(logoAsset.dataUrl, 'PNG', drawX, drawY, drawW, drawH)
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.text('KARA', marginX, 15)
    }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Export des demandes d\'adhésion', titleX, 16)
    doc.setFont('helvetica', 'bold')
    doc.text(`Périmètre: ${scopeLabel}`, titleX, 24)

    // Badge de génération (droite)
    const badgeWidth = 92
    const badgeX = pageWidth - marginX - badgeWidth
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(badgeX, 5.5, badgeWidth, 13, 2, 2, 'F')
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('Généré le', badgeX + 4, 10.5)
    doc.setFont('helvetica', 'normal')
    doc.text(generatedAtLabel, badgeX + 4, 15.5)

    // Cartes de synthèse
    const cardsY = 38
    const cardH = 17
    const cardGap = 4
    const cardW = (pageWidth - marginX * 2 - cardGap * 3) / 4
    const cards = [
      { label: 'Total demandes', value: `${requests.length}`, bg: [239, 246, 255] as [number, number, number], fg: colors.info },
      { label: 'Paiements validés', value: `${paidCount}`, bg: [236, 253, 245] as [number, number, number], fg: colors.success },
      { label: 'Paiements en attente', value: `${unpaidCount}`, bg: [254, 242, 242] as [number, number, number], fg: colors.danger },
      { label: 'À traiter (attente + revue)', value: `${pendingOrReviewCount}`, bg: [255, 247, 237] as [number, number, number], fg: colors.warning },
    ]

    cards.forEach((card, index) => {
      const x = marginX + index * (cardW + cardGap)
      doc.setFillColor(card.bg[0], card.bg[1], card.bg[2])
      doc.roundedRect(x, cardsY, cardW, cardH, 2, 2, 'F')

      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(card.label, x + 3, cardsY + 6)

      doc.setTextColor(card.fg[0], card.fg[1], card.fg[2])
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(card.value, x + 3, cardsY + 13)
    })

    // Metadonnées complémentaires
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`Dossiers approuvés: ${approvedCount}`, marginX, cardsY + cardH + 6)

    // Préparer les données du tableau
    const headers = ['Nom & Prénom', 'Référence', 'Statut', 'Paiement', 'Date soumission']
    const bodyRows = requests.map((req) => {
      const fullName = `${req.identity.firstName} ${req.identity.lastName}`.trim()
      const reference = req.matricule || req.id?.slice(0, 12) || 'N/A'
      const status = MEMBERSHIP_REQUEST_STATUS_LABELS[req.status] || req.status
      const payment = req.isPaid ? 'Payé' : 'Non payé'
      const createdAt = normalizeDate(req.createdAt)
      const dateStr = format(createdAt, 'dd/MM/yyyy', { locale: fr })
      
      return [fullName, reference, status, payment, dateStr]
    })

    // Tableau
    autoTable(doc, {
      head: [headers],
      body: bodyRows,
      startY: cardsY + cardH + 10,
      margin: { left: marginX, right: marginX, top: 20, bottom: 16 },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: colors.ink,
        lineColor: colors.line,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: colors.brandDark,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 78 },
        1: { cellWidth: 46 },
        2: { cellWidth: 46 },
        3: { cellWidth: 34, halign: 'center' },
        4: { cellWidth: 38, halign: 'center' },
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return

        const row = requests[data.row.index]
        if (!row) return

        // Colonne statut
        if (data.column.index === 2) {
          data.cell.styles.fontStyle = 'bold'
          if (row.status === 'approved') data.cell.styles.textColor = colors.success
          else if (row.status === 'rejected') data.cell.styles.textColor = colors.danger
          else if (row.status === 'under_review') data.cell.styles.textColor = colors.info
          else data.cell.styles.textColor = colors.warning
        }

        // Colonne paiement
        if (data.column.index === 3) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.textColor = row.isPaid ? colors.success : colors.danger
        }
      },
      didDrawPage: (data: any) => {
        // En-tête minimal sur les pages suivantes
        if (data.pageNumber > 1) {
          doc.setFillColor(colors.brandDark[0], colors.brandDark[1], colors.brandDark[2])
          doc.rect(0, 0, pageWidth, 10, 'F')
          if (logoAsset) {
            const circleSize = 7
            const circleX = marginX
            const circleY = 1.3
            const circleRadius = circleSize / 2
            const circleCenterX = circleX + circleRadius
            const circleCenterY = circleY + circleRadius

            doc.setFillColor(255, 255, 255)
            doc.circle(circleCenterX, circleCenterY, circleRadius, 'F')

            const padding = 0.9
            const maxLogoW = circleSize - padding * 2
            const maxLogoH = circleSize - padding * 2
            const ratio = logoAsset.width / logoAsset.height
            let drawW = maxLogoW
            let drawH = maxLogoH

            if (ratio >= 1) {
              drawH = maxLogoW / ratio
            } else {
              drawW = maxLogoH * ratio
            }

            const drawX = circleX + (circleSize - drawW) / 2
            const drawY = circleY + (circleSize - drawH) / 2
            doc.addImage(logoAsset.dataUrl, 'PNG', drawX, drawY, drawW, drawH)
          }
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.5)
          doc.text('Export des demandes d\'adhésion', logoAsset ? marginX + 9 : marginX, 6.4)
        }
      },
    })

    // Pied de page
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)

      doc.setDrawColor(colors.line[0], colors.line[1], colors.line[2])
      doc.setLineWidth(0.2)
      doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14)

      doc.setFontSize(8)
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.text('Export des demandes d\'adhésion', marginX, pageHeight - 8)
      doc.text(
        `Page ${i} / ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      )
      if (logoAsset) {
        const circleSize = 5.8
        const circleX = pageWidth - marginX - circleSize
        const circleY = pageHeight - 12.2
        const circleRadius = circleSize / 2
        const circleCenterX = circleX + circleRadius
        const circleCenterY = circleY + circleRadius

        doc.setFillColor(255, 255, 255)
        doc.circle(circleCenterX, circleCenterY, circleRadius, 'F')

        const padding = 0.8
        const maxLogoW = circleSize - padding * 2
        const maxLogoH = circleSize - padding * 2
        const ratio = logoAsset.width / logoAsset.height
        let drawW = maxLogoW
        let drawH = maxLogoH

        if (ratio >= 1) {
          drawH = maxLogoW / ratio
        } else {
          drawW = maxLogoH * ratio
        }

        const drawX = circleX + (circleSize - drawW) / 2
        const drawY = circleY + (circleSize - drawH) / 2
        doc.addImage(logoAsset.dataUrl, 'PNG', drawX, drawY, drawW, drawH)
      } else {
        doc.text('KARA', pageWidth - marginX, pageHeight - 8, { align: 'right' })
      }
    }

    // Nom de fichier explicite avec dates si période, ou nombre si quantité
    let filename: string
    if (scopeMode === 'period') {
      const startStr = format(new Date(dateStart), 'yyyy-MM-dd', { locale: fr })
      const endStr = format(new Date(dateEnd), 'yyyy-MM-dd', { locale: fr })
      filename = `export-demandes-${startStr}_${endStr}.pdf`
    } else if (scopeMode === 'quantity') {
      filename = `export-demandes-${quantity}-dernieres-${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.pdf`
    } else {
      filename = `export-demandes-toutes-${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.pdf`
    }
    doc.save(filename)
  }

  const generateExcel = async (
    requests: MembershipRequest[],
    scopeMode: ScopeMode,
    dateStart: string,
    dateEnd: string,
    quantity: number
  ) => {
    const XLSX = await import('xlsx')

    // Préparer les données
    const rows = requests.map((req) => {
      const createdAt = normalizeDate(req.createdAt)
      const paymentDate = req.payments && req.payments.length > 0
        ? normalizeDate(req.payments[0].date)
        : null

      return {
        'Nom': req.identity.lastName || '',
        'Prénom': req.identity.firstName || '',
        'Email': req.identity.email || '',
        'Téléphone': req.identity.contacts?.[0] || '',
        'Référence': req.matricule || req.id || '',
        'Statut dossier': MEMBERSHIP_REQUEST_STATUS_LABELS[req.status] || req.status,
        'Statut paiement': req.isPaid ? 'Payé' : 'Non payé',
        'Montant': req.payments && req.payments.length > 0 ? req.payments[0].amount : '',
        'Date & heure soumission': format(createdAt, 'dd/MM/yyyy HH:mm', { locale: fr }),
        'Date paiement': paymentDate ? format(paymentDate, 'dd/MM/yyyy', { locale: fr }) : '',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandes')

    // Ajuster la largeur des colonnes
    const colWidths = [
      { wch: 20 }, // Nom
      { wch: 20 }, // Prénom
      { wch: 30 }, // Email
      { wch: 15 }, // Téléphone
      { wch: 20 }, // Référence
      { wch: 15 }, // Statut dossier
      { wch: 15 }, // Statut paiement
      { wch: 12 }, // Montant
      { wch: 20 }, // Date soumission
      { wch: 15 }, // Date paiement
    ]
    worksheet['!cols'] = colWidths

    // Nom de fichier explicite avec dates si période, ou nombre si quantité
    let filename: string
    if (scopeMode === 'period') {
      const startStr = format(new Date(dateStart), 'yyyy-MM-dd', { locale: fr })
      const endStr = format(new Date(dateEnd), 'yyyy-MM-dd', { locale: fr })
      filename = `export-demandes-${startStr}_${endStr}.xlsx`
    } else if (scopeMode === 'quantity') {
      filename = `export-demandes-${quantity}-dernieres-${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.xlsx`
    } else {
      filename = `export-demandes-toutes-${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.xlsx`
    }
    XLSX.writeFile(workbook, filename)
  }

  const handleReset = () => {
    setExportFormat('excel')
    setScopeMode('period')
    setDateStart(format(defaultStart, 'yyyy-MM-dd'))
    setDateEnd(format(today, 'yyyy-MM-dd'))
    setQuantity(100)
    setSortBy('date_desc')
    setStatusFilters({
      pending: false,
      under_review: false,
      approved: false,
      rejected: false,
      paid: false,
      unpaid: false,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isExporting && !open && onClose()}>
      <DialogContent 
        className="w-[calc(100vw-2rem)] max-w-xl sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0" 
        data-testid="modal-export-requests"
      >
        {/* Header fixe */}
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-kara-neutral-100 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg">
            <div className="p-1.5 bg-kara-primary-dark/10 rounded-lg">
              <Download className="w-4 h-4 sm:w-5 sm:h-5 text-kara-primary-dark" />
            </div>
            Exporter les demandes
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm mt-1">
            Configurez votre export avant de générer le fichier
          </DialogDescription>
        </DialogHeader>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4">
          <div className="space-y-5">
            
            {/* 1. Format du fichier */}
            <section className="space-y-3">
                  <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-kara-primary-dark shrink-0" />
                <Label className="text-sm font-semibold text-kara-neutral-800">
                  Format du fichier
                </Label>
              </div>
              <RadioGroup
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as ExportFormat)}
                disabled={isExporting}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                data-testid="export-format-group"
              >
                <label 
                  htmlFor="format-excel"
                  data-testid="export-format-excel"
                  className={`
                    relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${exportFormat === 'excel' 
                      ? 'border-green-500 bg-green-50/50' 
                      : 'border-kara-neutral-200 hover:border-kara-neutral-300 hover:bg-kara-neutral-50'
                    }
                  `}
                >
                  <RadioGroupItem value="excel" id="format-excel" className="sr-only" />
                  <div className={`p-2 rounded-lg ${exportFormat === 'excel' ? 'bg-green-100' : 'bg-kara-neutral-100'}`}>
                    <FileSpreadsheet className={`w-5 h-5 ${exportFormat === 'excel' ? 'text-green-600' : 'text-kara-neutral-500'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-kara-neutral-900">Excel (.xlsx)</p>
                    <p className="text-xs text-kara-neutral-500 truncate">Analyse, tri, archivage</p>
                  </div>
                  {exportFormat === 'excel' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  )}
                </label>
                <label 
                  htmlFor="format-pdf"
                  data-testid="export-format-pdf"
                  className={`
                    relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${exportFormat === 'pdf' 
                      ? 'border-red-500 bg-red-50/50' 
                      : 'border-kara-neutral-200 hover:border-kara-neutral-300 hover:bg-kara-neutral-50'
                    }
                  `}
                >
                  <RadioGroupItem value="pdf" id="format-pdf" className="sr-only" />
                  <div className={`p-2 rounded-lg ${exportFormat === 'pdf' ? 'bg-red-100' : 'bg-kara-neutral-100'}`}>
                    <FileText className={`w-5 h-5 ${exportFormat === 'pdf' ? 'text-red-600' : 'text-kara-neutral-500'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-kara-neutral-900">PDF</p>
                    <p className="text-xs text-kara-neutral-500 truncate">Impression, transmission</p>
                  </div>
                  {exportFormat === 'pdf' && (
                    <CheckCircle2 className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                </label>
              </RadioGroup>
            </section>

            {/* 2. Périmètre des données */}
            <section className="space-y-3">
                  <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-kara-primary-dark shrink-0" />
                <Label className="text-sm font-semibold text-kara-neutral-800">
                  Périmètre des données
                </Label>
              </div>
              <RadioGroup
                value={scopeMode}
                onValueChange={(v) => setScopeMode(v as ScopeMode)}
                disabled={isExporting}
                className="space-y-2"
                data-testid="export-scope-group"
              >
                {/* Option: Toutes */}
                <label 
                  htmlFor="scope-all"
                  data-testid="export-scope-all"
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${scopeMode === 'all' 
                      ? 'border-kara-primary-dark bg-kara-primary-dark/5' 
                      : 'border-kara-neutral-200 hover:border-kara-neutral-300'
                    }
                  `}
                >
                  <RadioGroupItem value="all" id="scope-all" className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-kara-neutral-900">Toutes les demandes</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-600">Peut être volumineux</p>
                    </div>
                  </div>
                </label>

                {/* Option: Par période */}
          <div className="space-y-2">
                  <label 
                    htmlFor="scope-period"
                    data-testid="export-scope-period"
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${scopeMode === 'period' 
                        ? 'border-kara-primary-dark bg-kara-primary-dark/5' 
                        : 'border-kara-neutral-200 hover:border-kara-neutral-300'
                      }
                    `}
                  >
                    <RadioGroupItem value="period" id="scope-period" className="shrink-0" />
                    <CalendarRange className={`w-4 h-4 shrink-0 ${scopeMode === 'period' ? 'text-kara-primary-dark' : 'text-kara-neutral-400'}`} />
                    <p className="font-medium text-sm text-kara-neutral-900">Par période</p>
                  </label>
                  
          {scopeMode === 'period' && (
                    <div className="ml-3 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-kara-primary-dark/20" data-testid="export-period-inputs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-kara-neutral-600">Du</Label>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  disabled={isExporting}
                            className="h-10 w-full text-sm"
                            data-testid="export-date-start"
                />
              </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-kara-neutral-600">Au</Label>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  disabled={isExporting}
                            className="h-10 w-full text-sm"
                            data-testid="export-date-end"
                />
                          <p className="text-[10px] text-kara-neutral-400">Par défaut : Aujourd'hui</p>
                        </div>
              </div>
            </div>
          )}
                </div>

                {/* Option: Par quantité */}
                <div className="space-y-2">
                  <label 
                    htmlFor="scope-quantity"
                    data-testid="export-scope-quantity"
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${scopeMode === 'quantity' 
                        ? 'border-kara-primary-dark bg-kara-primary-dark/5' 
                        : 'border-kara-neutral-200 hover:border-kara-neutral-300'
                      }
                    `}
                  >
                    <RadioGroupItem value="quantity" id="scope-quantity" className="shrink-0" />
                    <Hash className={`w-4 h-4 shrink-0 ${scopeMode === 'quantity' ? 'text-kara-primary-dark' : 'text-kara-neutral-400'}`} />
                    <p className="font-medium text-sm text-kara-neutral-900">Nombre de demandes</p>
                  </label>
                  
          {scopeMode === 'quantity' && (
                    <div className="ml-3 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-kara-primary-dark/20" data-testid="export-quantity-input-container">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Input
                type="number"
                min="1"
                max="10000"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 100)}
                disabled={isExporting}
                          className="h-10 w-full sm:w-24 text-sm"
                          data-testid="export-quantity-input"
              />
              <p className="text-xs text-kara-neutral-500">
                          dernières demandes (récentes → anciennes)
              </p>
                      </div>
            </div>
          )}
                </div>
              </RadioGroup>
            </section>

            {/* 3. Filtres optionnels */}
            <section className="space-y-3" data-testid="export-filters-section">
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-kara-primary-dark shrink-0" />
                <Label className="text-sm font-semibold text-kara-neutral-800">
                  Filtres optionnels
                </Label>
                <span className="text-[10px] text-kara-neutral-400 bg-kara-neutral-100 px-1.5 py-0.5 rounded">
                  Facultatif
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="export-filters-grid">
                {[
                  { id: 'pending', label: 'En attente', icon: Clock, color: 'text-amber-500' },
                  { id: 'under_review', label: 'En cours', icon: Loader2, color: 'text-blue-500' },
                  { id: 'approved', label: 'Approuvées', icon: CheckCircle2, color: 'text-green-500' },
                  { id: 'rejected', label: 'Rejetées', icon: XCircle, color: 'text-red-500' },
                  { id: 'paid', label: 'Payées', icon: Banknote, color: 'text-emerald-500' },
                  { id: 'unpaid', label: 'Non payées', icon: BanknoteIcon, color: 'text-kara-neutral-400' },
                ].map(({ id, label, icon: Icon, color }) => (
                  <label 
                    key={id}
                    htmlFor={`filter-${id}`}
                    data-testid={`export-filter-${id}`}
                    className={`
                      flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all min-h-[44px]
                      ${statusFilters[id as StatusFilter]
                        ? 'border-kara-primary-dark bg-kara-primary-dark/5'
                        : 'border-kara-neutral-200 hover:border-kara-neutral-300 hover:bg-kara-neutral-50'
                      }
                    `}
                  >
                    <Checkbox
                      id={`filter-${id}`}
                      checked={statusFilters[id as StatusFilter]}
                      onCheckedChange={(checked) => handleStatusFilterChange(id as StatusFilter, checked === true)}
                      disabled={isExporting}
                      className="shrink-0"
                      data-testid={`export-filter-checkbox-${id}`}
                    />
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                    <span className="text-xs sm:text-sm font-medium text-kara-neutral-700 truncate select-none">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* 4. Ordre de tri */}
            <section className="space-y-3" data-testid="export-sort-section">
              <div className="flex items-center gap-2">
                <SortAsc className="w-4 h-4 text-kara-primary-dark shrink-0" />
                <Label className="text-sm font-semibold text-kara-neutral-800">
                  Ordre de tri
                </Label>
              </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)} disabled={isExporting}>
                <SelectTrigger className="w-full h-10" data-testid="export-sort-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="date_desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-4 h-4 text-kara-neutral-500" />
                      <span className="text-sm">Date (récent → ancien)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="date_asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-4 h-4 text-kara-neutral-500" />
                      <span className="text-sm">Date (ancien → récent)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="name_asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-4 h-4 text-kara-neutral-500" />
                      <span className="text-sm">Nom (A → Z)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="name_desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-4 h-4 text-kara-neutral-500" />
                      <span className="text-sm">Nom (Z → A)</span>
                    </div>
                  </SelectItem>
              </SelectContent>
            </Select>
            </section>

            {/* 5. Aperçu */}
            {previewCount !== null && (
              <section className="rounded-xl bg-gradient-to-br from-kara-primary-dark/5 to-kara-primary-dark/10 border border-kara-primary-dark/20 p-4" data-testid="export-preview-section">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-kara-primary-dark" />
                  <span className="text-sm font-semibold text-kara-primary-dark">Aperçu de l'export</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white/60 rounded-lg p-2.5 text-center" data-testid="export-preview-count">
                    <p className="text-lg sm:text-xl font-bold text-kara-primary-dark">{previewCount}</p>
                    <p className="text-[10px] sm:text-xs text-kara-neutral-500 uppercase tracking-wide">Demandes</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2.5 text-center">
                    <p className="text-xs sm:text-sm font-semibold text-kara-neutral-700 truncate">
                      {scopeMode === 'period'
                        ? `${format(new Date(dateStart), 'dd/MM', { locale: fr })} - ${format(new Date(dateEnd), 'dd/MM', { locale: fr })}`
                        : scopeMode === 'quantity'
                        ? `${quantity} dernières`
                        : 'Toutes'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-kara-neutral-500 uppercase tracking-wide">Période</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2.5 text-center">
                    <p className="text-xs sm:text-sm font-semibold text-kara-neutral-700">
                      {exportFormat === 'excel' ? 'Excel (.xlsx)' : 'PDF'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-kara-neutral-500 uppercase tracking-wide">Format</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Footer fixe */}
        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t border-kara-neutral-100 shrink-0 bg-kara-neutral-50/50">
          <div className="flex flex-col-reverse sm:flex-row w-full gap-2 sm:gap-3">
            {/* Boutons secondaires */}
            <div className="flex gap-2 sm:flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isExporting}
                className="flex-1 sm:flex-initial h-9 text-kara-neutral-600 hover:text-kara-neutral-800 hover:bg-kara-neutral-100"
                title="Réinitialiser tous les champs"
                data-testid="export-reset-button"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span className="text-xs sm:text-sm">Réinitialiser</span>
              </Button>
          <Button
            variant="outline"
                size="sm"
            onClick={onClose}
            disabled={isExporting}
                className="flex-1 sm:flex-initial h-9 border-kara-neutral-200"
                data-testid="export-cancel-button"
          >
                <span className="text-xs sm:text-sm">Annuler</span>
          </Button>
            </div>
            
            {/* Bouton principal */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
              size="sm"
              className="h-10 sm:h-9 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all px-4 sm:px-6"
            data-testid="confirm-export"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-sm">Génération...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                  <span className="text-sm">Générer l'export</span>
              </>
            )}
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
