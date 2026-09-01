"use client"
import dynamic from 'next/dynamic'
import EmergencyContactMemberSelector from '@/components/shared/EmergencyContactMemberSelector'
import SelectApp, { SelectOption } from '@/components/forms/SelectApp'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ListPagination } from '@/components/ui/list-pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import routes from '@/constantes/routes'
import { DOCUMENT_TYPE_OPTIONS } from '@/domains/infrastructure/documents/constants/document-types'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { getStorageInstance } from '@/firebase/storage'
import { useAuth } from '@/hooks/useAuth'
import { useMember, useSearchMembers } from '@/hooks/useMembers'
import { useEarlyExit, usePlacementCommissions, usePlacementMutations, usePlacements, usePlacementStats, type PlacementListFilter } from '@/hooks/usePlacements'
import { cn } from '@/lib/utils'
import { RelationshipEnum } from '@/schemas/emergency-contact.schema'
import { ImageCompressionService } from '@/services/imageCompressionService'
import type { CommissionPaymentPlacement, CommissionStatus, PayoutMode, Placement, User } from '@/types/types'
import {
  calculateMonthlyCommission,
  calculateTotalCommissions,
  roundFcfa,
} from '@/utils/placementMoney'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { AlertCircle, AlertTriangle, Banknote, Calendar, CheckCircle, ChevronDown, Clock, DollarSign, Download, Eye, FileDown, FileSpreadsheet, FileText, IdCard, Loader2, Phone, PiggyBank, Plus, Receipt, RefreshCw, Search, Trash2, TrendingUp, Upload, User as UserIcon, Users, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useMemo, useRef, useState } from 'react'
import { useListUrlSync } from '@/hooks/useListUrlSync'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMyAccess } from '@/hooks/useMyAccess'
import { useForm } from 'react-hook-form'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { toast } from 'sonner'
import { z } from 'zod'
const CommissionReceiptModal = dynamic(() => import('./CommissionReceiptModal'), {
  ssr: false,
})
import EarlyExitForm from './EarlyExitForm'
import FiltersPlacement, { countActivePlacementFilters, DEFAULT_PLACEMENT_FILTERS, PlacementFilters } from './FiltersPlacement'
import PayCommissionModal, { CommissionPaymentFormData } from './PayCommissionModal'
import PlacementCard from './PlacementCard'
const PlacementContractPDFModal = dynamic(() => import('./PlacementContractPDFModal'), {
  ssr: false,
})
import PlacementDocumentUploadModal from './PlacementDocumentUploadModal'
const PlacementEarlyExitQuittanceModal = dynamic(
  () => import('./PlacementEarlyExitQuittanceModal'),
  { ssr: false },
)
const PlacementFinalQuittanceModal = dynamic(
  () => import('./PlacementFinalQuittanceModal'),
  { ssr: false },
)
import ViewPlacementDocumentModal from './ViewPlacementDocumentModal'

// Composant wrapper pour le modal de paiement de commission
function PayCommissionModalWrapper({
  payCommissionId,
  payCommissionPlacementId,
  onClose,
  onSubmit,
  isPaying,
}: {
  payCommissionId: string | null
  payCommissionPlacementId: string | null
  onClose: () => void
  onSubmit: (commissionId: string, data: CommissionPaymentFormData) => Promise<void>
  isPaying: boolean
}) {
  const { data: placementCommissions = [] } = usePlacementCommissions(payCommissionPlacementId || undefined)
  const commission = payCommissionId ? placementCommissions.find(c => c.id === payCommissionId) : null

  if (!payCommissionId || !payCommissionPlacementId || !commission) return null

  return (
    <PayCommissionModal
      isOpen={!!payCommissionId}
      onClose={onClose}
      onSubmit={async (data) => {
        await onSubmit(payCommissionId, data)
        onClose()
      }}
      commission={commission}
      isPaying={isPaying}
    />
  )
}

const DEFAULT_PHONE_PREFIX = '+241 '
const PHONE_DIGITS_LIMIT = 8

const formatPhoneValue = (value: string, allowEmpty = false) => {
  // Supprimer tous les espaces et caractères non numériques sauf le + initial
  const cleaned = value.replace(/\s/g, '').replace(/[^\d+]/g, '')
  
  if (allowEmpty && cleaned === '' || cleaned === '+') {
    return ''
  }

  // Extraire uniquement les chiffres
  let digits = cleaned.replace(/[^0-9]/g, '')

  // Supprimer tous les préfixes 241 répétés
  while (digits.startsWith('241')) {
    digits = digits.slice(3)
  }

  // Limiter à 8 chiffres maximum
  const normalized = digits.slice(0, PHONE_DIGITS_LIMIT)
  
  if (!normalized) {
    return allowEmpty ? '' : DEFAULT_PHONE_PREFIX
  }

  // Grouper les chiffres par paires avec espaces
  const grouped = normalized.replace(/(\d{2})(?=\d)/g, '$1 ')
  return `${DEFAULT_PHONE_PREFIX}${grouped}`.trimEnd()
}

const relationshipOptions: SelectOption[] = RelationshipEnum.options.map(rel => ({
  value: rel,
  label: rel,
}))
const placementSchema = z.object({
  benefactorId: z.string().min(1, 'Le bienfaiteur est requis'),
  amount: z.coerce
    .number()
    .int('Le capital doit être un montant entier en FCFA')
    .min(1000, 'Le capital minimum est de 1 000 FCFA')
    .max(100000000, 'Le capital maximum est de 100 000 000 FCFA'),
  rate: z.coerce
    .number()
    .min(0, 'Le taux doit être >= 0')
    .max(10, 'Le taux doit être <= 10'),
  periodMonths: z.coerce.number().int().min(1, 'Minimum 1 mois').max(7, 'Maximum 7 mois'),
  payoutMode: z.enum(['MonthlyCommission_CapitalEnd', 'CapitalPlusCommission_End']),
  startDate: z.string().min(1, 'La date de début du placement est requise'),
  urgentName: z.string().trim().min(2, 'Nom requis').optional(),
  urgentFirstName: z.string().trim().min(2, 'Prénom requis').optional().or(z.literal('')),
  urgentPhone: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s/g, '')) // Supprime les espaces pour la validation
    .pipe(
      z.string()
        .refine((val) => {
          if (!val || val === '+241' || val === '241') return true // Vide ou seulement le préfixe = optionnel
          return /^(\+241|241)?(60|62|65|66|74|76|77)[0-9]{6,8}$/.test(val)
        }, 'Format de téléphone invalide. Les numéros gabonais commencent par +241 60, 62, 65, 66, 74, 76 ou 77')
    )
    .optional(),
  urgentPhone2: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s/g, '')) // Supprime les espaces pour la validation
    .pipe(
      z.string()
        .refine((val) => {
          if (!val || val === '+241' || val === '241' || val === '') return true // Vide ou seulement le préfixe = optionnel
          return /^(\+241|241)?(60|62|65|66|74|76|77)[0-9]{6,8}$/.test(val)
        }, 'Format de téléphone invalide')
    )
    .optional()
    .or(z.literal('')),
  urgentRelationship: z.string().optional(),
  urgentIdNumber: z.string().trim().min(2, 'N° pièce requis').optional(),
  urgentTypeId: z.string().trim().min(2, 'Type de pièce requis').optional(),
  urgentDocumentUrl: z.string().url('URL de la pièce invalide').optional().or(z.literal('')).or(z.literal('INCONNU')),
})

type PlacementFormData = z.infer<typeof placementSchema>

type EarlyExitFormData = {
  commissionDue: number
  payoutAmount: number
}

type PlacementDetailState = {
  placementId: string | null
}

type PayCommissionFormData = {
  proofDocumentId?: string
}

const payoutLabels: Record<PayoutMode, string> = {
  MonthlyCommission_CapitalEnd: 'Commission mensuelle + capital à la fin',
  CapitalPlusCommission_End: 'Capital + commissions à la fin',
}

type PlacementFinancialExportRow = {
  placement: Placement
  commissions: CommissionPaymentPlacement[]
  capital: number
  monthlyCommission: number
  plannedCommissions: number
  paidCommissions: number
  remainingCommissions: number
  contractualTotal: number
}

type BenefactorFinancialExportRow = {
  benefactorId: string
  benefactorName: string
  benefactorPhone: string
  placementCount: number
  capital: number
  monthlyCommission: number
  plannedCommissions: number
  paidCommissions: number
  remainingCommissions: number
  contractualTotal: number
}

type FinancialTotals = Pick<
  PlacementFinancialExportRow,
  | 'capital'
  | 'monthlyCommission'
  | 'plannedCommissions'
  | 'paidCommissions'
  | 'remainingCommissions'
  | 'contractualTotal'
>

const sumFinancialRows = (rows: readonly FinancialTotals[]): FinancialTotals =>
  rows.reduce<FinancialTotals>(
    (total, row) => ({
      capital: total.capital + row.capital,
      monthlyCommission: total.monthlyCommission + row.monthlyCommission,
      plannedCommissions: total.plannedCommissions + row.plannedCommissions,
      paidCommissions: total.paidCommissions + row.paidCommissions,
      remainingCommissions: total.remainingCommissions + row.remainingCommissions,
      contractualTotal: total.contractualTotal + row.contractualTotal,
    }),
    {
      capital: 0,
      monthlyCommission: 0,
      plannedCommissions: 0,
      paidCommissions: 0,
      remainingCommissions: 0,
      contractualTotal: 0,
    },
  )

const sumPaidCommissions = (commissions: readonly CommissionPaymentPlacement[]): number =>
  commissions.reduce((total, commission) => {
    if (commission.status !== 'Paid') return total
    return total + roundFcfa(commission.paidAmount ?? commission.amount)
  }, 0)

const sumRemainingCommissions = (commissions: readonly CommissionPaymentPlacement[]): number =>
  commissions.reduce((total, commission) => {
    const dueAmount = roundFcfa(commission.amount)
    if (commission.status === 'Due') return total + dueAmount
    if (commission.status === 'Partial') {
      return total + Math.max(0, dueAmount - roundFcfa(commission.paidAmount ?? 0))
    }
    return total
  }, 0)

const csvCell = (value: unknown): string => {
  const normalized = value == null ? '' : String(value)
  return `"${normalized.replace(/"/g, '""')}"`
}

const buildCsv = (rows: readonly (readonly unknown[])[]): string =>
  `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`

const downloadCsv = (filename: string, rows: readonly (readonly unknown[])[]) => {
  const blob = new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const formatFcfa = (value: unknown): string =>
  `${roundFcfa(Number(value)).toLocaleString('fr-FR')} FCFA`

const writePrintableTable = ({
  win,
  title,
  headers,
  rows,
  footer,
}: {
  win: Window
  title: string
  headers: string[]
  rows: unknown[][]
  footer: unknown[]
}) => {
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')
  const rowsHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')
  const footerHtml = footer.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')

  win.document.write(`
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; color: #1f2937; }
          h1 { color: #234D65; font-size: 20px; }
          table { border-collapse: collapse; width: 100%; font-size: 9px; }
          th, td { border: 1px solid #cbd5e1; padding: 5px; text-align: right; vertical-align: top; }
          th { background: #e8eef2; color: #234D65; }
          th:first-child, td:first-child, th:nth-child(2), td:nth-child(2) { text-align: left; }
          tfoot th { background: #dbe7ed; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot><tr>${footerHtml}</tr></tfoot>
        </table>
      </body>
    </html>
  `)
  win.document.close()
  win.focus()
  win.print()
}

const TYPE_ID_OPTIONS = ['CNI', 'Passeport', 'Carte consulaire', 'Carte étudiant', 'Autre']

export default function PlacementList() {
  // État initialisé depuis l'URL : le retour navigateur retrouve la liste au même endroit.
  const searchParams = useSearchParams()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [filters, setFilters] = useState<PlacementFilters>({
    ...DEFAULT_PLACEMENT_FILTERS,
    search: searchParams.get('q') || '',
  })
  const [earlyExitPlacementId, setEarlyExitPlacementId] = useState<string | null>(null)
  const [detailState, setDetailState] = useState<PlacementDetailState>({ placementId: null })
  const [payCommissionId, setPayCommissionId] = useState<string | null>(null)
  const [payCommissionPlacementId, setPayCommissionPlacementId] = useState<string | null>(null)
  const [uploadContractPlacementId, setUploadContractPlacementId] = useState<string | null>(null)
  const [uploadQuittancePlacementId, setUploadQuittancePlacementId] = useState<string | null>(null)
  const [viewDocumentId, setViewDocumentId] = useState<string | null>(null)
  const [viewDocumentTitle, setViewDocumentTitle] = useState<string>('')
  const [contractPdfPlacementId, setContractPdfPlacementId] = useState<string | null>(null)
  const [showCommissionReceipt, setShowCommissionReceipt] = useState(false)
  const [selectedCommissionForReceipt, setSelectedCommissionForReceipt] = useState<{ placement: Placement; commission: CommissionPaymentPlacement } | null>(null)
  const [finalQuittancePlacementId, setFinalQuittancePlacementId] = useState<string | null>(null)
  const [earlyExitQuittancePlacementId, setEarlyExitQuittancePlacementId] = useState<string | null>(null)
  const [deletePlacementId, setDeletePlacementId] = useState<string | null>(null)
  const [isUploadingUrgentDoc, setIsUploadingUrgentDoc] = useState(false)
  const [urgentMemberId, setUrgentMemberId] = useState<string | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'all')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  // Miroir URL (les valeurs par défaut restent absentes de l'URL).
  useListUrlSync({
    tab: activeTab !== 'all' ? activeTab : null,
    page: page > 1 ? page : null,
    q: filters.search || null,
  })
  const pageSize = 6
  const router = useRouter()
  const earlyExitForm = useForm<EarlyExitFormData>({
    defaultValues: {
      commissionDue: 0,
      payoutAmount: 0,
    },
  })
  const payCommissionForm = useForm<PayCommissionFormData>({
    defaultValues: { proofDocumentId: '' },
  })
  
  const { data: memberResults = [] } = useSearchMembers(memberSearch, memberSearch.length >= 2)
  // Filtre serveur selon l'onglet actif : on ne charge que le sous-ensemble
  // utile au lieu de toute la collection (scalabilité).
  const serverFilter = useMemo<PlacementListFilter>(() => {
    switch (activeTab) {
      case 'actifs': return { statuses: ['Active'] }
      case 'brouillons': return { statuses: ['Draft'] }
      case 'clos': return { statuses: ['Closed'] }
      case 'early': return { statuses: ['EarlyExit'] }
      // Commissions du mois / retards ne concernent que les placements actifs.
      case 'month':
      case 'late': return { statuses: ['Active'] }
      case 'mensuel': return { payoutMode: 'MonthlyCommission_CapitalEnd' }
      case 'final': return { payoutMode: 'CapitalPlusCommission_End' }
      default: return {}
    }
  }, [activeTab])
  const { data: placements = [], isLoading, error, refetch } = usePlacements(serverFilter)
  // Mobile : étiquettes extérieures des camemberts coupées → on les masque (tooltip + légende suffisent).
  const isMobile = useIsMobile()
  // Permissions fines : les actions ne sont proposées que si l'admin les détient.
  const { can } = useMyAccess()
  const { create, update, requestEarlyExit, payCommission, remove } = usePlacementMutations()
  const { user } = useAuth()
  const [editingPlacementId, setEditingPlacementId] = useState<string | null>(null)
  const editingPlacementIdRef = useRef<string | null>(null)

  const openPlacementContractModal = (placement: Placement) => {
    setContractPdfPlacementId(placement.id)
  }
  
  // Récupérer le placement en cours d'édition
  const editingPlacement = editingPlacementId ? placements.find(p => p.id === editingPlacementId) : null
  
  // Synchroniser la ref avec l'état
  React.useEffect(() => {
    editingPlacementIdRef.current = editingPlacementId
  }, [editingPlacementId])

  const { data: commissions = [], refetch: refetchCommissions } = usePlacementCommissions(detailState.placementId || undefined)
  const { data: earlyExitInfo } = useEarlyExit(detailState.placementId || undefined)
  const { data: placementStats } = usePlacementStats()
  const queryClient = useQueryClient()
  
  // Récupérer le placement actuel pour obtenir le benefactorId
  const currentPlacementForDetails = placements.find(p => p.id === detailState.placementId)
  const { data: benefactorMember, isLoading: isLoadingMember } = useMember(
    currentPlacementForDetails?.benefactorId || undefined
  )

  const placementFormResolver = zodResolver(placementSchema) as any

  const form = useForm<PlacementFormData>({
    resolver: placementFormResolver,
    defaultValues: {
      benefactorId: '',
      amount: 0,
      rate: 0,
      periodMonths: 1,
      payoutMode: 'MonthlyCommission_CapitalEnd',
      startDate: new Date().toISOString().slice(0, 10),
      urgentName: '',
      urgentFirstName: '',
      urgentPhone: DEFAULT_PHONE_PREFIX,
      urgentPhone2: DEFAULT_PHONE_PREFIX,
      urgentRelationship: '',
      urgentIdNumber: '',
      urgentTypeId: '',
      urgentDocumentUrl: '',
    },
  })

  const isMonthlyPayout = form.watch('payoutMode') === 'MonthlyCommission_CapitalEnd'

  // Pré-remplir le formulaire quand on ouvre en mode édition
  React.useEffect(() => {
    if (editingPlacement && isCreateOpen && editingPlacementId) {
      const placement = editingPlacement
      form.reset({
        benefactorId: placement.benefactorId,
        amount: placement.amount,
        rate: placement.rate,
        periodMonths: placement.periodMonths,
        payoutMode: placement.payoutMode,
        startDate: placement.startDate ? new Date(placement.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        urgentName: placement.urgentContact?.name || '',
        urgentFirstName: placement.urgentContact?.firstName || '',
        urgentPhone: placement.urgentContact?.phone || DEFAULT_PHONE_PREFIX,
        urgentPhone2: placement.urgentContact?.phone2 || DEFAULT_PHONE_PREFIX,
        urgentRelationship: placement.urgentContact?.relationship || '',
        urgentIdNumber: placement.urgentContact?.idNumber || '',
        urgentTypeId: placement.urgentContact?.typeId || '',
        urgentDocumentUrl: placement.urgentContact?.documentPhotoUrl || '',
      })
      setMemberSearch('') // Réinitialiser la recherche de membre
    } else if (!isCreateOpen && !editingPlacementId) {
      // Réinitialiser le formulaire quand on ferme sans être en mode édition
      form.reset()
      setUrgentMemberId(undefined)
    }
  }, [editingPlacement, isCreateOpen, editingPlacementId, form])

  const filtered = useMemo(() => {
    // Normalise une valeur Firestore (Timestamp | Date | string) en Date.
    const asDate = (value: any): Date | null => {
      if (!value) return null
      const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
      return Number.isNaN(date.getTime()) ? null : date
    }

    let result = [...placements]

    // Recherche textuelle : n° de placement, matricule/id du bienfaiteur, nom, téléphone.
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase()
      // Les chiffres seuls permettent de retrouver un téléphone saisi avec des espaces.
      const digits = q.replace(/\D/g, '')
      result = result.filter(p => {
        const name = (p.benefactorName || '').toLowerCase()
        const phone = (p.benefactorPhone || '').toLowerCase()
        const phoneDigits = phone.replace(/\D/g, '')
        return (
          p.id.toLowerCase().includes(q) ||
          p.benefactorId.toLowerCase().includes(q) ||
          name.includes(q) ||
          phone.includes(q) ||
          (digits.length >= 3 && phoneDigits.includes(digits))
        )
      })
    }

    // Durée du placement
    if (filters.periodMonths === '1-3') {
      result = result.filter(p => p.periodMonths >= 1 && p.periodMonths <= 3)
    } else if (filters.periodMonths === '4-7') {
      result = result.filter(p => p.periodMonths >= 4 && p.periodMonths <= 7)
    }

    // Fourchette de montants
    const amountMin = filters.amountMin ? Number(filters.amountMin) : null
    const amountMax = filters.amountMax ? Number(filters.amountMax) : null
    if (amountMin !== null) result = result.filter(p => (p.amount || 0) >= amountMin)
    if (amountMax !== null) result = result.filter(p => (p.amount || 0) <= amountMax)

    // Fenêtre de prochaine échéance
    if (filters.dueFrom || filters.dueTo) {
      const from = filters.dueFrom ? new Date(`${filters.dueFrom}T00:00:00`) : null
      const to = filters.dueTo ? new Date(`${filters.dueTo}T23:59:59`) : null
      result = result.filter(p => {
        const next = asDate(p.nextCommissionDate)
        if (!next) return false
        if (from && next < from) return false
        if (to && next > to) return false
        return true
      })
    }

    // Présence du contrat signé (suivi administratif)
    if (filters.contractDoc === 'with') {
      result = result.filter(p => !!p.contractDocumentId)
    } else if (filters.contractDoc === 'without') {
      result = result.filter(p => !p.contractDocumentId)
    }

    // Tri
    const time = (value: any) => asDate(value)?.getTime() ?? null
    result.sort((a, b) => {
      switch (filters.sort) {
        case 'amountDesc':
          return (b.amount || 0) - (a.amount || 0)
        case 'amountAsc':
          return (a.amount || 0) - (b.amount || 0)
        case 'dueAsc': {
          // Les placements sans échéance passent en fin de liste.
          const da = time(a.nextCommissionDate)
          const db = time(b.nextCommissionDate)
          if (da === null && db === null) return 0
          if (da === null) return 1
          if (db === null) return -1
          return da - db
        }
        default:
          return (time(b.createdAt) ?? 0) - (time(a.createdAt) ?? 0)
      }
    })

    return result
  }, [placements, filters])

  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') return filtered
    if (activeTab === 'mensuel') return filtered.filter(p => p.payoutMode === 'MonthlyCommission_CapitalEnd')
    if (activeTab === 'final') return filtered.filter(p => p.payoutMode === 'CapitalPlusCommission_End')
    if (activeTab === 'actifs') return filtered.filter(p => p.status === 'Active')
    if (activeTab === 'brouillons') return filtered.filter(p => p.status === 'Draft')
    if (activeTab === 'clos') return filtered.filter(p => p.status === 'Closed')
    if (activeTab === 'early') return filtered.filter(p => p.status === 'EarlyExit')
    // Commissions du mois : placements actifs dont la prochaine échéance est dans le mois actuel
    if (activeTab === 'month') {
      const now = new Date()
      const sameMonth = (d?: any) => {
        if (!d) return false
        const date = typeof d === 'string' ? new Date(d) : d
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
      }
      return filtered.filter(p => {
        if (p.status !== 'Active') return false
        // Vérifier si la prochaine échéance est dans le mois actuel
        return sameMonth((p as any).nextCommissionDate)
      })
    }
    if (activeTab === 'late') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return filtered.filter(p => {
        if (p.status !== 'Active') return false
        // Vérifier si le placement a des commissions en retard
        // Soit via le flag hasOverdueCommission, soit en vérifiant directement nextCommissionDate
        if ((p as any).hasOverdueCommission === true) return true
        const nextDate = (p as any).nextCommissionDate
        if (nextDate) {
          const dueDate = typeof nextDate === 'string' ? new Date(nextDate) : nextDate
          dueDate.setHours(0, 0, 0, 0)
          // La commission est en retard si la date d'échéance est passée
          return dueDate < today
        }
        return false
      })
    }
    return filtered
  }, [filtered, activeTab])

  const totalPages = Math.max(1, Math.ceil(filteredByTab.length / pageSize))
  // La page restaurée depuis l'URL peut dépasser le nombre de pages du jeu filtré.
  const currentPage = Math.min(page, totalPages)
  const paginated = filteredByTab.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Changer de filtre ou d'onglet ramène en page 1 — mais pas au montage, sinon
  // la page restaurée depuis l'URL (`?page=3`) serait immédiatement écrasée.
  const isFirstRenderRef = useRef(true)
  React.useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      return
    }
    setPage(1)
  }, [filters, activeTab])

  const stats = useMemo(() => {
    const total = filteredByTab.length
    const totalAmount = filteredByTab.reduce((sum, p) => sum + roundFcfa(p.amount), 0)
    const draft = filteredByTab.filter(p => p.status === 'Draft').length
    const active = filteredByTab.filter(p => p.status === 'Active').length
    const closed = filteredByTab.filter(p => p.status === 'Closed').length
    const early = filteredByTab.filter(p => p.status === 'EarlyExit').length
    return { total, totalAmount, draft, active, closed, early }
  }, [filteredByTab])

  const loadFinancialExportRows = async (): Promise<PlacementFinancialExportRow[]> => {
    const service = ServiceFactory.getPlacementService()
    const commissionsByPlacement = await Promise.all(
      filteredByTab.map((placement) => service.listCommissions(placement.id)),
    )

    return filteredByTab.map((placement, index) => {
      const placementCommissions = commissionsByPlacement[index] ?? []
      const capital = roundFcfa(placement.amount)
      const monthlyCommission = calculateMonthlyCommission(placement.amount, placement.rate)
      const plannedCommissions = calculateTotalCommissions(
        placement.amount,
        placement.rate,
        placement.periodMonths,
      )
      const paidCommissions = sumPaidCommissions(placementCommissions)
      const remainingCommissions =
        placement.status === 'EarlyExit' || placement.status === 'Canceled'
          ? 0
          : placementCommissions.length === 0
            ? plannedCommissions
            : sumRemainingCommissions(placementCommissions)

      return {
        placement,
        commissions: placementCommissions,
        capital,
        monthlyCommission,
        plannedCommissions,
        paidCommissions,
        remainingCommissions,
        contractualTotal: roundFcfa(capital + plannedCommissions),
      }
    })
  }

  const aggregateBenefactorRows = (
    rows: PlacementFinancialExportRow[],
  ): BenefactorFinancialExportRow[] => {
    const byBenefactor = new Map<string, BenefactorFinancialExportRow>()

    rows.forEach((row) => {
      const current = byBenefactor.get(row.placement.benefactorId) ?? {
        benefactorId: row.placement.benefactorId,
        benefactorName: row.placement.benefactorName || row.placement.benefactorId,
        benefactorPhone: row.placement.benefactorPhone || '',
        placementCount: 0,
        capital: 0,
        monthlyCommission: 0,
        plannedCommissions: 0,
        paidCommissions: 0,
        remainingCommissions: 0,
        contractualTotal: 0,
      }

      current.placementCount += 1
      current.capital += row.capital
      current.monthlyCommission += row.monthlyCommission
      current.plannedCommissions += row.plannedCommissions
      current.paidCommissions += row.paidCommissions
      current.remainingCommissions += row.remainingCommissions
      current.contractualTotal += row.contractualTotal
      byBenefactor.set(row.placement.benefactorId, current)
    })

    return Array.from(byBenefactor.values()).sort((a, b) =>
      a.benefactorName.localeCompare(b.benefactorName, 'fr'),
    )
  }

  const placementExportHeaders = [
    'ID placement',
    'ID bienfaiteur',
    'Bienfaiteur',
    'Statut',
    'Mode de règlement',
    'Taux (%)',
    'Période (mois)',
    'Capital (FCFA)',
    'Commission mensuelle (FCFA)',
    'Commissions prévues (FCFA)',
    'Commissions payées (FCFA)',
    'Commissions restantes (FCFA)',
    'Total contractuel capital + commissions (FCFA)',
  ]

  const placementExportValues = (row: PlacementFinancialExportRow): unknown[] => [
    row.placement.id,
    row.placement.benefactorId,
    row.placement.benefactorName || '',
    row.placement.status,
    payoutLabels[row.placement.payoutMode],
    row.placement.rate,
    row.placement.periodMonths,
    row.capital,
    row.monthlyCommission,
    row.plannedCommissions,
    row.paidCommissions,
    row.remainingCommissions,
    row.contractualTotal,
  ]

  const exportCSV = async () => {
    try {
      const rows = await loadFinancialExportRows()
      if (rows.length === 0) {
        toast.info('Aucun placement à exporter')
        return
      }
      const totals = sumFinancialRows(rows)
      downloadCsv('placements.csv', [
        placementExportHeaders,
        ...rows.map(placementExportValues),
        [
          `TOTAL (${rows.length} placements)`, '', '', '', '', '', '',
          totals.capital,
          totals.monthlyCommission,
          totals.plannedCommissions,
          totals.paidCommissions,
          totals.remainingCommissions,
          totals.contractualTotal,
        ],
      ])
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de l’export des placements')
    }
  }

  const exportPDF = async () => {
    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Autorisez les fenêtres contextuelles pour générer le PDF')
      return
    }

    try {
      const rows = await loadFinancialExportRows()
      if (rows.length === 0) {
        win.close()
        toast.info('Aucun placement à exporter')
        return
      }
      const totals = sumFinancialRows(rows)
      writePrintableTable({
        win,
        title: 'Liste financière des placements',
        headers: placementExportHeaders,
        rows: rows.map((row) => {
          const values = placementExportValues(row)
          return values.map((value, index) => index >= 7 ? formatFcfa(value) : value)
        }),
        footer: [
          `TOTAL (${rows.length} placements)`, '', '', '', '', '', '',
          formatFcfa(totals.capital),
          formatFcfa(totals.monthlyCommission),
          formatFcfa(totals.plannedCommissions),
          formatFcfa(totals.paidCommissions),
          formatFcfa(totals.remainingCommissions),
          formatFcfa(totals.contractualTotal),
        ],
      })
    } catch (error: any) {
      win.close()
      toast.error(error?.message || 'Erreur lors de l’export PDF des placements')
    }
  }

  const benefactorExportHeaders = [
    'ID bienfaiteur',
    'Bienfaiteur',
    'Téléphone',
    'Nombre de placements',
    'Capital (FCFA)',
    'Commission mensuelle cumulée (FCFA)',
    'Commissions prévues (FCFA)',
    'Commissions payées (FCFA)',
    'Commissions restantes (FCFA)',
    'Total contractuel capital + commissions (FCFA)',
  ]

  const benefactorExportValues = (row: BenefactorFinancialExportRow): unknown[] => [
    row.benefactorId,
    row.benefactorName,
    row.benefactorPhone,
    row.placementCount,
    row.capital,
    row.monthlyCommission,
    row.plannedCommissions,
    row.paidCommissions,
    row.remainingCommissions,
    row.contractualTotal,
  ]

  const exportBenefactorsCSV = async () => {
    try {
      const rows = aggregateBenefactorRows(await loadFinancialExportRows())
      if (rows.length === 0) {
        toast.info('Aucun bienfaiteur à exporter')
        return
      }
      const totals = sumFinancialRows(rows)
      downloadCsv('bienfaiteurs.csv', [
        benefactorExportHeaders,
        ...rows.map(benefactorExportValues),
        [
          `TOTAL (${rows.length} bienfaiteurs)`, '', '',
          rows.reduce((sum, row) => sum + row.placementCount, 0),
          totals.capital,
          totals.monthlyCommission,
          totals.plannedCommissions,
          totals.paidCommissions,
          totals.remainingCommissions,
          totals.contractualTotal,
        ],
      ])
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de l’export des bienfaiteurs')
    }
  }

  const exportBenefactorsPDF = async () => {
    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Autorisez les fenêtres contextuelles pour générer le PDF')
      return
    }

    try {
      const rows = aggregateBenefactorRows(await loadFinancialExportRows())
      if (rows.length === 0) {
        win.close()
        toast.info('Aucun bienfaiteur à exporter')
        return
      }
      const totals = sumFinancialRows(rows)
      writePrintableTable({
        win,
        title: 'Synthèse financière des bienfaiteurs',
        headers: benefactorExportHeaders,
        rows: rows.map((row) => {
          const values = benefactorExportValues(row)
          return values.map((value, index) => index >= 4 ? formatFcfa(value) : value)
        }),
        footer: [
          `TOTAL (${rows.length} bienfaiteurs)`, '', '',
          rows.reduce((sum, row) => sum + row.placementCount, 0),
          formatFcfa(totals.capital),
          formatFcfa(totals.monthlyCommission),
          formatFcfa(totals.plannedCommissions),
          formatFcfa(totals.paidCommissions),
          formatFcfa(totals.remainingCommissions),
          formatFcfa(totals.contractualTotal),
        ],
      })
    } catch (error: any) {
      win.close()
      toast.error(error?.message || 'Erreur lors de l’export PDF des bienfaiteurs')
    }
  }

  const receiptExportHeaders = [
    'ID placement',
    'Bienfaiteur',
    'IDs commissions',
    'Échéances',
    'Références reçus',
    'Nombre de reçus',
    'Montant des reçus (FCFA)',
    'Capital (FCFA)',
    'Commission mensuelle (FCFA)',
    'Commissions prévues (FCFA)',
    'Commissions payées (FCFA)',
    'Commissions restantes (FCFA)',
    'Total contractuel capital + commissions (FCFA)',
  ]

  const buildReceiptRows = (rows: PlacementFinancialExportRow[]) =>
    rows
      .map((row) => {
        const receipts = row.commissions.filter(
          (commission) => commission.status === 'Paid' && commission.receiptDocumentId,
        )
        return {
          ...row,
          receipts,
          receiptAmount: sumPaidCommissions(receipts),
        }
      })
      .filter((row) => row.receipts.length > 0)

  const receiptExportValues = (
    row: ReturnType<typeof buildReceiptRows>[number],
  ): unknown[] => [
    row.placement.id,
    row.placement.benefactorName || row.placement.benefactorId,
    row.receipts.map((commission) => commission.id).join(' | '),
    row.receipts
      .map((commission) => new Date(commission.dueDate).toLocaleDateString('fr-FR'))
      .join(' | '),
    row.receipts.map((commission) => commission.receiptDocumentId).join(' | '),
    row.receipts.length,
    row.receiptAmount,
    row.capital,
    row.monthlyCommission,
    row.plannedCommissions,
    row.paidCommissions,
    row.remainingCommissions,
    row.contractualTotal,
  ]

  const exportReceiptsCSV = async () => {
    try {
      const rows = buildReceiptRows(await loadFinancialExportRows())
      if (rows.length === 0) {
        toast.info('Aucun reçu disponible sur la sélection')
        return
      }
      const totals = sumFinancialRows(rows)
      downloadCsv('receipts.csv', [
        receiptExportHeaders,
        ...rows.map(receiptExportValues),
        [
          `TOTAL (${rows.reduce((sum, row) => sum + row.receipts.length, 0)} reçus)`, '', '', '', '',
          rows.reduce((sum, row) => sum + row.receipts.length, 0),
          rows.reduce((sum, row) => sum + row.receiptAmount, 0),
          totals.capital,
          totals.monthlyCommission,
          totals.plannedCommissions,
          totals.paidCommissions,
          totals.remainingCommissions,
          totals.contractualTotal,
        ],
      ])
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de l’export des reçus')
    }
  }

  const exportReceiptsPDF = async () => {
    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Autorisez les fenêtres contextuelles pour générer le PDF')
      return
    }

    try {
      const rows = buildReceiptRows(await loadFinancialExportRows())
      if (rows.length === 0) {
        win.close()
        toast.info('Aucun reçu disponible sur la sélection')
        return
      }
      const totals = sumFinancialRows(rows)
      const receiptCount = rows.reduce((sum, row) => sum + row.receipts.length, 0)
      writePrintableTable({
        win,
        title: 'Synthèse financière des reçus de commissions',
        headers: receiptExportHeaders,
        rows: rows.map((row) => {
          const values = receiptExportValues(row)
          return values.map((value, index) => index >= 6 ? formatFcfa(value) : value)
        }),
        footer: [
          `TOTAL (${receiptCount} reçus)`, '', '', '', '', receiptCount,
          formatFcfa(rows.reduce((sum, row) => sum + row.receiptAmount, 0)),
          formatFcfa(totals.capital),
          formatFcfa(totals.monthlyCommission),
          formatFcfa(totals.plannedCommissions),
          formatFcfa(totals.paidCommissions),
          formatFcfa(totals.remainingCommissions),
          formatFcfa(totals.contractualTotal),
        ],
      })
    } catch (error: any) {
      win.close()
      toast.error(error?.message || 'Erreur lors de l’export PDF des reçus')
    }
  }

  const statsItems = useMemo(() => {
    const total = stats.total || 0
    const pct = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0)
    const statsData = placementStats || {
      total: stats.total,
      totalAmount: stats.totalAmount,
      draft: stats.draft,
      active: stats.active,
      closed: stats.closed,
      earlyExit: stats.early,
      canceled: 0,
      commissionsDue: 0,
      commissionsPaid: 0,
      totalCommissionsAmount: 0,
      paidCommissionsAmount: 0,
      payoutModeDistribution: { MonthlyCommission_CapitalEnd: 0, CapitalPlusCommission_End: 0 },
      topBenefactors: [],
    }
    
    const commissionPct = statsData.totalCommissionsAmount > 0 
      ? Math.round((statsData.paidCommissionsAmount / statsData.totalCommissionsAmount) * 100)
      : 0

    return [
      {
        title: 'Total',
        value: stats.total,
        subtitle: 'Tous les placements',
        percentage: 100,
        color: '#234D65',
        icon: FileText,
      },
      {
        title: 'Capital',
        value: new Intl.NumberFormat('fr-FR', { 
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        }).format(stats.totalAmount),
        subtitle: 'Capital nominal sélectionné (FCFA)',
        percentage: 100,
        color: '#CBB171',
        icon: DollarSign,
      },
      {
        title: 'Actifs',
        value: stats.active,
        subtitle: 'En cours',
        percentage: pct(stats.active),
        color: '#10b981',
        icon: CheckCircle,
      },
      {
        title: 'Commissions dues',
        value: statsData.commissionsDue,
        subtitle: `${statsData.commissionsPaid} payées`,
        percentage: commissionPct,
        color: '#f59e0b',
        icon: Clock,
      },
      {
        title: 'Commissions payées',
        value: statsData.commissionsPaid,
        subtitle: `${new Intl.NumberFormat('fr-FR').format(statsData.paidCommissionsAmount)} FCFA`,
        percentage: commissionPct,
        color: '#10b981',
        icon: CheckCircle,
      },
      {
        title: 'Retrait anticipé',
        value: statsData.earlyExit,
        subtitle: 'Sorties anticipées',
        percentage: pct(statsData.earlyExit),
        color: '#ef4444',
        icon: AlertCircle,
      },
      {
        title: 'Mode mensuel',
        value: statsData.payoutModeDistribution.MonthlyCommission_CapitalEnd,
        subtitle: 'Commission mensuelle',
        percentage: pct(statsData.payoutModeDistribution.MonthlyCommission_CapitalEnd),
        color: '#3b82f6',
        icon: TrendingUp,
      },
      {
        title: 'Mode final',
        value: statsData.payoutModeDistribution.CapitalPlusCommission_End,
        subtitle: 'Commissions regroupées à la fin',
        percentage: pct(statsData.payoutModeDistribution.CapitalPlusCommission_End),
        color: '#8b5cf6',
        icon: CheckCircle,
      },
    ]
  }, [stats, placementStats])

  // Seules les parts non nulles sont tracées : un camembert vide n'apporte rien
  // et laissait une carte de 288 px de haut sans contenu.
  const payoutChartData = useMemo(() => {
    const data = placementStats?.payoutModeDistribution || { MonthlyCommission_CapitalEnd: 0, CapitalPlusCommission_End: 0 }
    return [
      { name: 'Mensuel', value: data.MonthlyCommission_CapitalEnd, fill: '#2563eb' },
      { name: 'Final', value: data.CapitalPlusCommission_End, fill: '#7c3aed' },
    ].filter((entry) => entry.value > 0)
  }, [placementStats])

  const topBenefactors = useMemo(() => placementStats?.topBenefactors || [], [placementStats])

  const hasActiveFilters = countActivePlacementFilters(filters) > 0

  const handleFiltersChange = (newFilters: PlacementFilters) => {
    setFilters(newFilters)
  }

  const handleResetFilters = () => {
    setFilters({ ...DEFAULT_PLACEMENT_FILTERS })
    setPage(1)
  }

  const submitPlacement = async (values: PlacementFormData) => {
    if (!user?.uid) return
    try {
      const {
        startDate,
        urgentName,
        urgentFirstName,
        urgentPhone,
        urgentPhone2,
        urgentRelationship,
        urgentIdNumber,
        urgentTypeId,
        urgentDocumentUrl,
        ...rest
      } = values

      const hasUrgent =
        urgentName || urgentFirstName || urgentPhone || urgentPhone2 || urgentRelationship || urgentIdNumber || urgentTypeId

      // Contact inconnu (compte placeholder) : aucune info exigée.
      const isUnknownUrgent = (urgentName || '').trim().toUpperCase() === 'INCONNU'

      if (hasUrgent && !isUnknownUrgent) {
        if (!urgentName || !urgentPhone || !urgentRelationship || !urgentIdNumber || !urgentTypeId) {
          toast.error('Complétez toutes les informations du contact urgent (nom, téléphone, lien, type et n° de pièce).')
          return
        }
        if (!urgentDocumentUrl) {
          toast.error('Ajoutez la photo/scanne de la pièce du contact urgent.')
          return
        }
      }

      const documentPhotoUrl = urgentDocumentUrl

      const urgentContact =
        hasUrgent && urgentName && (urgentPhone || isUnknownUrgent)
          ? {
              name: urgentName,
              firstName: urgentFirstName || undefined,
              phone: urgentPhone || '',
              phone2: urgentPhone2 || undefined,
              relationship: urgentRelationship || undefined,
              idNumber: urgentIdNumber || undefined,
              typeId: urgentTypeId || undefined,
              documentPhotoUrl: documentPhotoUrl || undefined,
            }
          : undefined

      const placementData = {
        ...rest,
        urgentContact,
        amount: Number(rest.amount),
        rate: Number(rest.rate),
        periodMonths: Number(rest.periodMonths),
        // Début du placement : base de l'échéancier (la remise des fonds
        // est un événement distinct, saisi à la conversion d'une demande).
        startDate: startDate ? new Date(startDate) : undefined,
        updatedBy: user.uid,
      }

      // Vérifier explicitement si on est en mode édition (utiliser la ref pour éviter les problèmes de timing)
      const currentEditingId = editingPlacementIdRef.current || editingPlacementId
      const isEditMode = !!currentEditingId
      
      if (isEditMode) {
        // Mode modification
        await update.mutateAsync({
          id: currentEditingId!,
          data: placementData,
          adminId: user.uid,
        })
        toast.success('Placement modifié avec succès')
      } else {
        // Mode création
        await create.mutateAsync({
          ...placementData,
          adminId: user.uid,
          createdBy: user.uid,
        })
        toast.success('Placement créé avec succès')
      }
      
      setIsCreateOpen(false)
      setEditingPlacementId(null)
      editingPlacementIdRef.current = null
      form.reset()
      setUrgentMemberId(undefined)
    } catch (e) {
      // handled by react-query if needed
    }
  }

  const submitEarlyExit = async (values: EarlyExitFormData) => {
    if (!user?.uid || !earlyExitPlacementId) return
    const placement = placements.find(p => p.id === earlyExitPlacementId)
    if (!placement) return
    try {
      await requestEarlyExit.mutateAsync({
        placementId: earlyExitPlacementId,
        commissionDue: values.commissionDue,
        payoutAmount: values.payoutAmount,
        benefactorId: placement.benefactorId,
        adminId: user.uid,
      })
      earlyExitForm.reset()
      setEarlyExitPlacementId(null)
    } catch (e) {
      // handled by react-query si besoin
    }
  }

  const submitPayCommission = async (commissionId: string, data: CommissionPaymentFormData) => {
    if (!user?.uid || !detailState.placementId) return
    
    const placement = placements.find(p => p.id === detailState.placementId)
    if (!placement) return
    
    try {
      const { ServiceFactory } = await import('@/factories/ServiceFactory')
      const service = ServiceFactory.getPlacementService()
      
      // Créer la date de paiement à partir de date et time
      const paidDate = new Date(`${data.date}T${data.time}`)
      
      // Upload de la preuve et paiement de la commission
      await service.payCommissionWithProof(
        detailState.placementId,
        commissionId,
        data.proofFile,
        placement.benefactorId,
        paidDate,
        user.uid,
        {
          paymentMode: data.mode,
          withFees: data.withFees,
          paymentMethodOther: data.paymentMethodOther,
          paidAmount: data.amount,
        }
      )
      
      // Invalider et refetch les queries pour rafraîchir les données immédiatement
      await queryClient.invalidateQueries({ queryKey: ['placement', detailState.placementId, 'commissions'] })
      await queryClient.invalidateQueries({ queryKey: ['placements'] })
      
      // Refetch immédiatement pour mettre à jour l'UI
      await refetchCommissions()
      await refetch()
      
      toast.success('Commission payée avec succès')
      setPayCommissionId(null)
    } catch (error: any) {
      console.error('Erreur lors du paiement:', error)
      toast.error(`Erreur lors du paiement: ${error.message}`)
      throw error
    }
  }

  return (
    <div className="space-y-6 md:space-y-8">
        {/* Barre d'actions - design aligné avec caisse imprévue */}
        <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
                  <PiggyBank className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-xl font-black text-transparent md:text-2xl">
                    Liste des placements
                  </h2>
                  <p className="font-medium text-gray-600">
                    {filteredByTab.length.toLocaleString()} résultat{filteredByTab.length !== 1 ? 's' : ''} / {placements.length.toLocaleString()} au total
                    <span className="mx-2 text-gray-300">•</span>
                    <Link href={routes.admin.placementDemandes} className="font-semibold text-[#234D65] hover:underline">
                      Voir les demandes
                    </Link>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="h-10 w-full cursor-pointer rounded-xl border-2 border-[#234D65]/40 bg-white px-4 text-[#234D65] transition-all duration-200 hover:bg-[#234D65] hover:text-white disabled:opacity-50 sm:w-auto"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
                </Button>

                {can('placements.export') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-full cursor-pointer rounded-xl border-2 border-emerald-300 bg-white px-4 text-emerald-700 transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50 sm:w-auto"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exporter
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[200px]">
                    <DropdownMenuLabel>Placements</DropdownMenuLabel>
                    <DropdownMenuItem onClick={exportPDF} className="cursor-pointer">
                      <FileDown className="mr-2 h-4 w-4 text-rose-700" /> Placements PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportCSV} className="cursor-pointer">
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-700" /> Placements Excel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Bienfaiteurs</DropdownMenuLabel>
                    <DropdownMenuItem onClick={exportBenefactorsPDF} className="cursor-pointer">
                      <FileDown className="mr-2 h-4 w-4 text-rose-700" /> Bienfaiteurs PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportBenefactorsCSV} className="cursor-pointer">
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-700" /> Bienfaiteurs Excel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Reçus</DropdownMenuLabel>
                    <DropdownMenuItem onClick={exportReceiptsPDF} className="cursor-pointer">
                      <FileDown className="mr-2 h-4 w-4 text-rose-700" /> Reçus PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportReceiptsCSV} className="cursor-pointer">
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-700" /> Reçus Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                )}

                {can('placements.create') && (
                <Button
                  size="sm"
                  asChild
                  className="h-10 w-full cursor-pointer rounded-xl border-0 bg-gradient-to-r from-[#234D65] to-[#2c5a73] px-4 text-white shadow-sm transition-all duration-200 hover:from-[#2c5a73] hover:to-[#234D65] hover:shadow-md sm:w-auto"
                >
                  <Link href={routes.admin.placementDemandAdd}>
                    <Plus className="mr-2 h-4 w-4" /> Nouvelle Demande
                  </Link>
                </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques compactes - alignées avec caisse imprévue */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Statistiques</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {statsItems.map((item, idx) => (
              <div
                key={idx}
                className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200"
              >
                <div
                  className="p-1.5 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: `${item.color}15`, color: item.color }}
                >
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 truncate">{item.title}</p>
                  <p className="text-sm font-black text-gray-900 tabular-nums truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition et top bienfaiteurs.
            La répartition par statut a été retirée : les tuiles ci-dessus
            donnent déjà les mêmes compteurs. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Rendu seulement s'il y a de quoi tracer, comme sur Caisse Imprévue. */}
          {payoutChartData.length > 0 && (
            <Card className="col-span-1 bg-white border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-700">Répartition par mode</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 12, bottom: 12 }}>
                    <Pie
                      data={payoutChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 55 : 70}
                      label={isMobile ? false : ({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {payoutChartData.map((entry, index) => (
                        <Cell key={`payout-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry: any) => (
                        <span style={{ color: entry.color, fontSize: '12px' }}>
                          {value}: {entry.payload.value}
                        </span>
                      )}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value}`, name]}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="col-span-1 bg-white border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-700">Principaux bienfaiteurs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topBenefactors.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun bienfaiteur en tête pour l’instant.</p>
              ) : (
                topBenefactors.slice(0, 5).map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{(b as any).name || (b as any).benefactorId || 'Bienfaiteur'}</p>
                        <p className="text-xs text-gray-500">
                          Capital nominal: {formatFcfa((b as any).totalAmount ?? (b as any).amount ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="mensuel">Mensuel</TabsTrigger>
            <TabsTrigger value="final">Final</TabsTrigger>
            <TabsTrigger value="month">Commissions du mois</TabsTrigger>
            <TabsTrigger value="late">En retard</TabsTrigger>
            <TabsTrigger value="actifs">Actifs</TabsTrigger>
            <TabsTrigger value="brouillons">Brouillons</TabsTrigger>
            <TabsTrigger value="clos">Clos</TabsTrigger>
            <TabsTrigger value="early">Sortie anticipée</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {/* Filtres */}
            <FiltersPlacement
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onReset={handleResetFilters}
              resultCount={filteredByTab.length}
            />

            {/* Liste des placements */}
            {error ? (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertDescription>Erreur lors du chargement des placements</AlertDescription>
              </Alert>
            ) : isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="group animate-pulse bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                          <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                          <Skeleton className="h-3 w-2/3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Skeleton className="h-3 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                        <Skeleton className="h-3 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredByTab.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
                <CardContent className="py-16 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">Aucun placement trouvé</p>
                  {hasActiveFilters ? (
                    <>
                      <p className="text-gray-400 text-sm mt-2">
                        Aucun placement ne correspond aux critères sélectionnés.
                      </p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={handleResetFilters}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Réinitialiser les filtres
                      </Button>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm mt-2">Commencez par créer votre premier placement</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginated.map((p) => (
                    <PlacementCard
                      key={p.id}
                      placement={p}
                      onDetailsClick={p.status === 'Active' && p.contractDocumentId ? () => setDetailState({ placementId: p.id }) : undefined}
                      onPayCommissionClick={can('placements.commission') ? (commissionId) => {
                        setPayCommissionPlacementId(p.id)
                        setPayCommissionId(commissionId)
                      } : () => {}}
                      onOpenClick={() => router.push(`/placements/${p.id}`)}
                      onEditClick={p.status === 'Draft' && can('placements.create') ? () => {
                        setEditingPlacementId(p.id)
                        setIsCreateOpen(true)
                      } : undefined}
                      onDeleteClick={p.status === 'Draft' && can('placements.delete') ? () => setDeletePlacementId(p.id) : undefined}
                      onUploadContractClick={!p.contractDocumentId ? () => setUploadContractPlacementId(p.id) : undefined}
                      onDownloadContractClick={() => openPlacementContractModal(p)}
                      onViewContractClick={p.contractDocumentId ? () => {
                        setViewDocumentId(p.contractDocumentId!)
                        setViewDocumentTitle('Contrat de placement')
                      } : undefined}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="px-1">
                    <ListPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPrev={() => setPage((p) => Math.max(1, p - 1))}
                      onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                      summary={<>{filteredByTab.length} résultat(s)</>}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

      {/* Modal suppression placement */}
      <Dialog open={!!deletePlacementId} onOpenChange={(open) => !open && setDeletePlacementId(null)}>
        <ModalContent size="sm">
          <ModalHeader
            icon={Trash2}
            tone="destructive"
            title="Supprimer le placement ?"
            description="Cette action est définitive. Le placement (brouillon) sera supprimé ainsi que ses commissions associées."
          />
          <ModalFooter className="flex-col-reverse gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
            <Button variant="outline" onClick={() => setDeletePlacementId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deletePlacementId) return
                try {
                  await remove.mutateAsync(deletePlacementId)
                  setDeletePlacementId(null)
                } catch (e) {
                  // toast géré côté mutation si besoin
                }
              }}
              disabled={remove.isPending}
            >
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Dialog>

      {/* Modal de création/modification */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        if (!open) {
          // Ne réinitialiser que si on ferme le dialog
          setEditingPlacementId(null)
          editingPlacementIdRef.current = null
          form.reset()
          setUrgentMemberId(undefined)
        }
        setIsCreateOpen(open)
      }}>
        <ModalContent size="lg" className="max-w-[95vw]">
          <ModalHeader
            icon={TrendingUp}
            title={editingPlacementId ? 'Modifier le placement' : 'Nouveau placement'}
            description={
              editingPlacementId
                ? 'Modifiez les informations du placement'
                : 'Recherchez et sélectionnez un membre bienfaiteur, puis saisissez les informations du placement'
            }
          />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitPlacement)} className="flex min-h-0 flex-1 flex-col">
              <ModalBody className="space-y-5">
              <FormField
                control={form.control}
                name="benefactorId"
                rules={{ required: 'Le bienfaiteur est requis' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Bienfaiteur *</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                          <Input
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Rechercher par nom, prénom ou matricule..."
                            className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65] pl-10"
                          />
                        </div>
                        {memberSearch.length >= 2 && memberResults.length === 0 && (
                          <p className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded">Aucun résultat trouvé</p>
                        )}
                        {memberResults.length > 0 && (
                          <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg divide-y shadow-sm bg-white">
                            {memberResults.map((m: User) => (
                              <button
                                type="button"
                                key={m.id}
                                className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-colors duration-150 group"
                                onClick={() => {
                                  field.onChange(m.id as string)
                                  setMemberSearch(`${m.lastName || ''} ${m.firstName || ''}`.trim() || (m.matricule ?? ''))
                                }}
                              >
                                <div className="text-sm font-semibold text-gray-800 group-hover:text-[#234D65]">
                                  {m.lastName} {m.firstName}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Matricule: <span className="font-mono">{m.matricule || m.id}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {field.value && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700 font-medium">✓ Bienfaiteur sélectionné</p>
                            <p className="text-xs text-gray-600 mt-1 font-mono">{field.value}</p>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  rules={{
                    required: 'Capital requis',
                    min: { value: 1000, message: 'Le capital minimum est de 1 000 FCFA' },
                    max: { value: 100000000, message: 'Le capital maximum est de 100 000 000 FCFA' },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Capital (FCFA) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1000}
                          max={100000000}
                          step={1}
                          {...field}
                          onChange={(e) => {
                            const v = e.target.value.replace(/^0+(?=\d)/, '')
                            field.onChange(v ? Number(v) : '')
                          }}
                          className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]"
                          placeholder="ex: 500000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rate"
                  rules={{
                    required: 'Taux requis',
                    min: { value: 0, message: 'Le taux doit être >= 0' },
                    max: { value: 10, message: 'Le taux doit être <= 10' },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">Taux (%) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          step="0.1"
                          {...field}
                          onChange={(e) => {
                            const v = e.target.value.replace(/^0+(?=\d)/, '')
                            field.onChange(v ? Number(v) : '')
                          }}
                          className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]"
                          placeholder="ex: 5.5"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="periodMonths"
                rules={{ 
                  required: 'Période requise',
                  min: { value: 1, message: 'Minimum 1 mois' },
                  max: { value: 7, message: 'Maximum 7 mois' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Période (mois) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        min={1} 
                        max={7} 
                        step={1}
                        onChange={(e) => {
                          const v = e.target.value.replace(/^0+(?=\d)/, '')
                          field.onChange(v ? Number(v) : '')
                        }}
                        className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]"
                        placeholder="Entre 1 et 7 mois"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-1">La période doit être comprise entre 1 et 7 mois</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payoutMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">Mode de règlement *</FormLabel>
                    <FormControl>
                      <select
                        className="w-full border border-gray-200 rounded-md px-4 py-2.5 focus:border-[#234D65] focus:ring-[#234D65] focus:outline-none transition-colors bg-white"
                        value={field.value}
                        onChange={e => field.onChange(e.target.value as PayoutMode)}
                      >
                        <option value="MonthlyCommission_CapitalEnd">{payoutLabels.MonthlyCommission_CapitalEnd}</option>
                        <option value="CapitalPlusCommission_End">{payoutLabels.CapitalPlusCommission_End}</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Début du placement (équivalent de la date souhaitée d'une demande) */}
              <FormField
                control={form.control}
                name="startDate"
                rules={{ required: 'Date de début du placement requise' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Date de début du placement *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="border-gray-200 focus:border-[#234D65] focus:ring-[#234D65]"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-1">
                      {isMonthlyPayout
                        ? 'La 1re commission tombe un mois après cette date. La remise des fonds se saisit séparément.'
                        : 'Capital et commissions sont versés à la fin (début + durée).'}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact d'urgence (optionnel) — même saisie que la Caisse Imprévue :
                  recherche de membre, auto-remplissage de la pièce, bouton « Contact inconnu ». */}
              <EmergencyContactMemberSelector
                memberId={urgentMemberId}
                lastName={form.watch('urgentName')}
                firstName={form.watch('urgentFirstName')}
                phone1={form.watch('urgentPhone')}
                phone2={form.watch('urgentPhone2')}
                relationship={form.watch('urgentRelationship')}
                typeId={form.watch('urgentTypeId')}
                idNumber={form.watch('urgentIdNumber')}
                documentPhotoUrl={form.watch('urgentDocumentUrl')}
                onUpdate={(field, value) => {
                  if (field === 'memberId') setUrgentMemberId(value || undefined)
                  else if (field === 'lastName') form.setValue('urgentName', value)
                  else if (field === 'firstName') form.setValue('urgentFirstName', value)
                  else if (field === 'phone1') form.setValue('urgentPhone', value)
                  else if (field === 'phone2') form.setValue('urgentPhone2', value)
                  else if (field === 'relationship') form.setValue('urgentRelationship', value)
                  else if (field === 'typeId') form.setValue('urgentTypeId', value)
                  else if (field === 'idNumber') form.setValue('urgentIdNumber', value)
                  else if (field === 'documentPhotoUrl') form.setValue('urgentDocumentUrl', value)
                }}
                excludeMemberIds={form.watch('benefactorId') ? [form.watch('benefactorId')] : []}
              />

              </ModalBody>
              <ModalFooter className="flex-col-reverse gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateOpen(false)}
                  className="hover:bg-gray-50"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={(editingPlacementId ? update.isPending : create.isPending) || !user?.uid}
                  className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#1a3a4d] hover:to-[#234D65] text-white shadow-md"
                >
                  {(editingPlacementId ? update.isPending : create.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPlacementId ? 'Modifier le placement' : 'Créer le placement'}
                </Button>
              </ModalFooter>
            </form>
          </Form>
        </ModalContent>
      </Dialog>

      {/* Modal Retrait anticipé */}
      <Dialog open={!!earlyExitPlacementId} onOpenChange={(open) => !open && setEarlyExitPlacementId(null)}>
        <ModalContent size="md" className="max-w-[95vw]">
          <ModalHeader
            icon={Banknote}
            tone="warning"
            title="Retrait anticipé"
            description="Les montants sont calculés automatiquement selon la règle : commission d'un mois si au moins 1 mois écoulé, sinon 0 commission."
          />
          <ModalBody>
            {earlyExitPlacementId && <EarlyExitForm placementId={earlyExitPlacementId} onClose={() => setEarlyExitPlacementId(null)} />}
          </ModalBody>
        </ModalContent>
      </Dialog>

      {/* Modal Détails placement (commissions + retrait anticipé) */}
      <Dialog open={!!detailState.placementId} onOpenChange={(open) => !open && setDetailState({ placementId: null })}>
        <ModalContent size="4xl" className="max-w-[95vw]">
          <ModalHeader
            icon={TrendingUp}
            title="Détails du placement"
            description="Informations complètes du placement, du bienfaiteur et des commissions."
          />

          <ModalBody>
          {detailState.placementId ? (() => {
            const currentPlacement = placements.find(p => p.id === detailState.placementId)
            if (!currentPlacement) return <p className="text-gray-500">Placement introuvable.</p>
            
            const derivedStart = currentPlacement.startDate || (commissions.length > 0 ? commissions[0].dueDate : null)
            const derivedEnd = currentPlacement.endDate || (commissions.length > 0 ? commissions[commissions.length - 1].dueDate : null)
            const derivedNext = currentPlacement.nextCommissionDate || (commissions.find(c => c.status === 'Due')?.dueDate || null)
            
            const statusLabelMap: Record<string, string> = {
              Draft: 'Brouillon',
              Active: 'Actif',
              Closed: 'Clos',
              EarlyExit: 'Sortie anticipée',
              Canceled: 'Annulé',
            }
            
            const genderLabel = (gender?: string) => {
              if (!gender) return '-'
              const map: Record<string, string> = {
                'Homme': 'Homme',
                'Femme': 'Femme',
                'M': 'Homme',
                'F': 'Femme',
                'Male': 'Homme',
                'Female': 'Femme'
              }
              return map[gender] || gender
            }
            
            return (
              <div className="space-y-6">
                {/* Informations du placement et du bienfaiteur */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Informations du bienfaiteur */}
                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-4 px-6 pt-6">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-[#234D65]" />
                        Bienfaiteur
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 px-6 pb-6">
                      {isLoadingMember ? (
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </div>
                      ) : benefactorMember ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Nom complet</span>
                            <span className="font-semibold text-gray-900">
                              {benefactorMember.lastName} {benefactorMember.firstName}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Matricule</span>
                            <code className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-mono">{benefactorMember.matricule || benefactorMember.id}</code>
                          </div>
                          {benefactorMember.gender && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Sexe</span>
                              <span className="font-medium text-gray-800">{genderLabel(benefactorMember.gender)}</span>
                            </div>
                          )}
                          {benefactorMember.birthDate && (() => {
                            const birthDate = new Date(benefactorMember.birthDate)
                            const today = new Date()
                            let age = today.getFullYear() - birthDate.getFullYear()
                            const monthDiff = today.getMonth() - birthDate.getMonth()
                            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                              age--
                            }
                            return (
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-600">Âge</span>
                                <span className="text-sm font-medium text-gray-800">{age} ans</span>
                              </div>
                            )
                          })()}
                          {benefactorMember.birthPlace && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Lieu de naissance</span>
                              <span className="text-sm text-gray-700">{benefactorMember.birthPlace}</span>
                            </div>
                          )}
                          {benefactorMember.nationality && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Nationalité</span>
                              <span className="text-sm text-gray-700">{benefactorMember.nationality}</span>
                            </div>
                          )}
                          {benefactorMember.contacts && benefactorMember.contacts.length > 0 && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                Téléphone(s)
                              </span>
                              <div className="flex flex-col items-end gap-1">
                                {benefactorMember.contacts.map((contact, idx) => (
                                  <span key={idx} className="text-sm font-medium text-gray-800">{contact}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {benefactorMember.email && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Email</span>
                              <span className="text-sm text-gray-700">{benefactorMember.email}</span>
                            </div>
                          )}
                          {benefactorMember.address && (
                            <div className="flex justify-between items-start py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Adresse</span>
                              <div className="text-right text-sm text-gray-700">
                                {benefactorMember.address.province && <div>{benefactorMember.address.province}</div>}
                                {benefactorMember.address.city && <div>{benefactorMember.address.city}</div>}
                                {benefactorMember.address.district && <div>{benefactorMember.address.district}</div>}
                                {benefactorMember.address.arrondissement && <div>{benefactorMember.address.arrondissement}</div>}
                                {benefactorMember.address.additionalInfo && <div className="text-xs text-gray-500 mt-1">{benefactorMember.address.additionalInfo}</div>}
                              </div>
                            </div>
                          )}
                          {benefactorMember.profession && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Profession</span>
                              <span className="text-sm text-gray-700">{benefactorMember.profession}</span>
                            </div>
                          )}
                          {benefactorMember.companyName && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm text-gray-600">Entreprise</span>
                              <span className="text-sm text-gray-700">{benefactorMember.companyName}</span>
                            </div>
                          )}
                          {/* Note: prayerPlace n'est pas dans le type User, mais on peut l'afficher si présent dans les données */}
                          {(benefactorMember as any).prayerPlace && (
                            <div className="flex justify-between items-center py-2 border-t border-gray-100 mt-2 pt-2">
                              <span className="text-sm text-gray-600">Lieu de prière</span>
                              <span className="text-sm text-gray-700">{(benefactorMember as any).prayerPlace}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Nom complet</span>
                            <span className="font-semibold text-gray-900">{currentPlacement.benefactorName || currentPlacement.benefactorId}</span>
                          </div>
                          {currentPlacement.benefactorPhone && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                Téléphone
                              </span>
                              <span className="font-medium text-gray-800">{currentPlacement.benefactorPhone}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600">Matricule</span>
                            <code className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-mono">{currentPlacement.benefactorId}</code>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Informations du placement */}
                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-4 px-6 pt-6">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-[#234D65]" />
                        Placement
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 px-6 pb-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Statut</span>
                          <Badge className={cn(
                            "text-xs font-semibold",
                            currentPlacement.status === 'Active' ? 'bg-green-100 text-green-700' :
                            currentPlacement.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
                            currentPlacement.status === 'Closed' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {statusLabelMap[currentPlacement.status] || currentPlacement.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Capital placé</span>
                          <span className="font-bold text-lg text-[#234D65]">{formatFcfa(currentPlacement.amount)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Taux</span>
                          <span className="font-bold text-green-600">{currentPlacement.rate}%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Période</span>
                          <span className="font-semibold text-gray-900">{currentPlacement.periodMonths} mois</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Mode</span>
                          <span className="font-semibold text-gray-900">
                            {currentPlacement.payoutMode === 'MonthlyCommission_CapitalEnd' ? 'Mensuel' : 'Final'}
                          </span>
                        </div>
                        {derivedStart && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Date de début
                            </span>
                            <span className="text-sm text-gray-700">{new Date(derivedStart).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {derivedEnd && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Date de fin
                            </span>
                            <span className="text-sm text-gray-700">{new Date(derivedEnd).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {derivedNext && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Prochaine commission
                            </span>
                            <span className="text-sm font-semibold text-blue-600">{new Date(derivedNext).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact urgent */}
                {currentPlacement.urgentContact && (
                  <Card className="border-0 shadow-md border-orange-200 bg-orange-50/30">
                    <CardHeader className="pb-4 px-6 pt-6">
                      <CardTitle className="text-lg font-bold flex items-center gap-2 text-orange-800">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        Contact urgent
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-6 pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between items-center py-2 border-b border-orange-200">
                          <span className="text-sm text-orange-700 font-medium">Nom</span>
                          <span className="font-semibold text-orange-900">{currentPlacement.urgentContact.name}</span>
                        </div>
                        {currentPlacement.urgentContact.firstName && (
                          <div className="flex justify-between items-center py-2 border-b border-orange-200">
                            <span className="text-sm text-orange-700 font-medium">Prénom</span>
                            <span className="font-semibold text-orange-900">{currentPlacement.urgentContact.firstName}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-2 border-b border-orange-200">
                          <span className="text-sm text-orange-700 font-medium flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Téléphone
                          </span>
                          <span className="font-medium text-orange-900">{currentPlacement.urgentContact.phone}</span>
                        </div>
                        {currentPlacement.urgentContact.phone2 && (
                          <div className="flex justify-between items-center py-2 border-b border-orange-200">
                            <span className="text-sm text-orange-700 font-medium">Téléphone 2</span>
                            <span className="font-medium text-orange-900">{currentPlacement.urgentContact.phone2}</span>
                          </div>
                        )}
                        {currentPlacement.urgentContact.relationship && (
                          <div className="flex justify-between items-center py-2 border-b border-orange-200">
                            <span className="text-sm text-orange-700 font-medium">Lien</span>
                            <span className="font-medium text-orange-900">{currentPlacement.urgentContact.relationship}</span>
                          </div>
                        )}
                        {(currentPlacement.urgentContact.typeId || currentPlacement.urgentContact.idNumber) && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-orange-700 font-medium">Pièce d'identité</span>
                            <span className="font-medium text-orange-900">
                              {currentPlacement.urgentContact.typeId || ''} {currentPlacement.urgentContact.idNumber || ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg font-bold">Commissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm px-6 pb-6">
                {(() => {
                  const currentPlacement = placements.find(p => p.id === detailState.placementId)
                  if (!currentPlacement) return <p className="text-gray-500 text-sm">Placement introuvable.</p>
                  
                  const allCommissionsPaid = currentPlacement.status === 'Active' && 
                    commissions.length > 0 && 
                    commissions.every(c => c.status === 'Paid')
                  
                  if (currentPlacement.status === 'Draft') {
                    return (
                      <div className="space-y-2">
                        <p className="text-gray-500 text-sm">Le contrat n'a pas encore été téléversé.</p>
                        <p className="text-xs text-gray-400">Les commissions seront générées automatiquement une fois le contrat téléversé.</p>
                      </div>
                    )
                  }
                  
                  const isFinalType = currentPlacement.payoutMode === 'CapitalPlusCommission_End'

                  // L'échéancier affiché est celui réellement enregistré, jamais
                  // recalculé côté écran : le reconstruire à partir de la date de
                  // début supposerait une convention (1re commission au jour du
                  // début, ou un mois après) et se décalerait dès qu'elle change.
                  const monthlyCommissions: Array<{
                    month: number | string
                    dueDate: Date
                    amount: number
                    status: CommissionStatus
                    commissionId?: string
                    proofDocumentId?: string
                    isFinal?: boolean
                  }> = [...commissions]
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map((commission, index) => ({
                      month: isFinalType ? 'Final' : index + 1,
                      dueDate: new Date(commission.dueDate),
                      amount: roundFcfa(commission.paidAmount ?? commission.amount),
                      status: commission.status,
                      commissionId: commission.id,
                      proofDocumentId: commission.proofDocumentId,
                      isFinal: isFinalType,
                    }))

                  if (allCommissionsPaid && currentPlacement) {
                    return (
                      <>
                        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-green-800">Toutes les commissions sont payées</span>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white border-0"
                            onClick={() => setFinalQuittancePlacementId(currentPlacement.id)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Générer quittance finale
                          </Button>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {monthlyCommissions.map((c, idx) => (
                            <div key={idx} className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span className="font-medium">
                                  {typeof c.month === 'string' ? c.month : `Mois ${c.month}`} - Échéance
                                </span>
                                <span className="font-semibold text-gray-800">{new Date(c.dueDate).toLocaleDateString('fr-FR')}</span>
                              </div>
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-900 font-bold text-base">{formatFcfa(c.amount)}</span>
                                <span className={cn(
                                  "text-xs px-3 py-1.5 rounded-full border font-medium",
                                  c.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                  c.status === 'Due' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-orange-50 text-orange-700 border-orange-200'
                                )}>
                                  {c.status === 'Paid' ? 'Payée' : c.status === 'Due' ? (isFinalType ? 'À payer à la fin' : 'À payer') : c.status}
                                </span>
                              </div>
                              {c.status === 'Paid' && c.commissionId && (() => {
                                const commission = commissions.find(comm => comm.id === c.commissionId)
                                if (!commission) return null
                                return (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs mt-2"
                                    onClick={() => {
                                      const currentPlacement = placements.find(p => p.id === detailState.placementId)
                                      if (currentPlacement) {
                                        setSelectedCommissionForReceipt({ placement: currentPlacement, commission })
                                        setShowCommissionReceipt(true)
                                      }
                                    }}
                                  >
                                    <Receipt className="h-3 w-3 mr-1" />
                                    Voir la facture
                                  </Button>
                                )
                              })()}
                              {isFinalType && (
                                <p className="text-xs text-gray-500 mt-2 italic">
                                  Capital et commissions cumulées versés en une fois à cette date.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  }
                  
                  return monthlyCommissions.length === 0 ? (
                    <p className="text-gray-500 text-sm">Aucune commission programmée.</p>
                  ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {monthlyCommissions.map((c, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span className="font-medium">
                            {typeof c.month === 'string' ? c.month : `Mois ${c.month}`} - Échéance
                          </span>
                          <span className="font-semibold text-gray-800">{new Date(c.dueDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-gray-900 font-bold text-base">{formatFcfa(c.amount)}</span>
                          <span className={cn(
                            "text-xs px-3 py-1.5 rounded-full border font-medium",
                            c.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                            c.status === 'Due' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-orange-50 text-orange-700 border-orange-200'
                          )}>
                            {c.status === 'Paid' ? 'Payée' : c.status === 'Due' ? (c.isFinal ? 'À payer' : (isFinalType ? 'À payer à la fin' : 'À payer')) : c.status}
                          </span>
                        </div>
                        <div className="flex gap-3 pt-2">
                          {c.status !== 'Paid' && c.commissionId && (
                            <Button
                              size="sm"
                              className="text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
                              onClick={() => {
                                setPayCommissionPlacementId(detailState.placementId!)
                                setPayCommissionId(c.commissionId!)
                              }}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Payer avec preuve
                            </Button>
                          )}
                          {c.status === 'Paid' && c.commissionId && (() => {
                            const commission = commissions.find(comm => comm.id === c.commissionId)
                            if (!commission) return null
                            return (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => {
                                  const currentPlacement = placements.find(p => p.id === detailState.placementId)
                                  if (currentPlacement) {
                                    setSelectedCommissionForReceipt({ placement: currentPlacement, commission })
                                    setShowCommissionReceipt(true)
                                  }
                                }}
                              >
                                <Receipt className="h-3 w-3 mr-1" />
                                Voir la facture
                              </Button>
                            )
                          })()}
                        </div>
                        {isFinalType && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            Capital et commissions cumulées sont versés en une fois à cette date.
                          </p>
                        )}
                        {isFinalType && c.isFinal && (
                          <p className="text-xs text-blue-600 mt-2 font-medium">
                            Commission finale (somme des commissions ; capital restitué séparément)
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  )
                })()}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-lg font-bold">Retrait anticipé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm px-6 pb-6">
                {earlyExitInfo ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 text-sm font-medium">Commission due</span>
                      <span className="font-bold text-gray-900 text-base">{formatFcfa(earlyExitInfo.commissionDue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 text-sm font-medium">Montant à verser</span>
                      <span className="font-bold text-gray-900 text-base">{formatFcfa(earlyExitInfo.payoutAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 text-sm font-medium">Demandé le</span>
                      <span className="text-gray-700 text-sm">{new Date(earlyExitInfo.requestedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {earlyExitInfo.validatedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Validé le</span>
                        <span className="text-gray-700 text-xs">{new Date(earlyExitInfo.validatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {earlyExitInfo.quittanceDocumentId && (
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Quittance (docId)</span>
                        <code className="px-2 py-1 rounded bg-gray-100 text-gray-700">{earlyExitInfo.quittanceDocumentId}</code>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-200">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-500 text-white border-0"
                        onClick={() => {
                          if (detailState.placementId) {
                            setEarlyExitQuittancePlacementId(detailState.placementId)
                          }
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Générer quittance de sortie
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Pas de retrait anticipé enregistré.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md mt-6 overflow-hidden">
            <CardHeader className="pb-4 px-6 pt-6">
              <CardTitle className="text-lg font-bold">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm px-6 pb-6">
              {detailState.placementId ? (() => {
                const currentPlacement = placements.find(p => p.id === detailState.placementId)
                if (!currentPlacement) return <p className="text-gray-500 text-sm">Placement introuvable.</p>
                
                return (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex-1">
                        <span className="text-gray-700 font-semibold text-base">Contrat</span>
                        {currentPlacement.contractDocumentId ? (
                          <code className="block mt-1 px-2 py-1 rounded bg-white text-gray-700 text-xs">
                            {currentPlacement.contractDocumentId}
                          </code>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">Aucun contrat téléversé</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-2">
                        {currentPlacement.contractDocumentId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setViewDocumentId(currentPlacement.contractDocumentId!)
                              setViewDocumentTitle('Contrat de placement')
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setUploadContractPlacementId(currentPlacement.id)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {currentPlacement.contractDocumentId ? 'Remplacer' : 'Téléverser'}
                        </Button>
                      </div>
                    </div>
                    {earlyExitInfo && (
                      <div className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                        <div className="flex-1">
                          <span className="text-gray-600 font-medium">Quittance retrait anticipé</span>
                          {earlyExitInfo.quittanceDocumentId ? (
                            <code className="block mt-1 px-2 py-1 rounded bg-white text-gray-700 text-xs">
                              {earlyExitInfo.quittanceDocumentId}
                            </code>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">Aucune quittance téléversée</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-2">
                          {earlyExitInfo.quittanceDocumentId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setViewDocumentId(earlyExitInfo.quittanceDocumentId!)
                                setViewDocumentTitle('Quittance de retrait anticipé')
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUploadQuittancePlacementId(currentPlacement.id)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {earlyExitInfo.quittanceDocumentId ? 'Remplacer' : 'Téléverser'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })() : (
                <p className="text-gray-500 text-sm">Aucun document à afficher.</p>
              )}
            </CardContent>
          </Card>
              </div>
            )
          })() : (
            <p className="text-gray-500">Placement introuvable.</p>
          )}
          </ModalBody>
        </ModalContent>
      </Dialog>

      {/* Modal upload contrat */}
      {uploadContractPlacementId && (() => {
        const placement = placements.find(p => p.id === uploadContractPlacementId)
        return placement ? (
          <PlacementDocumentUploadModal
            isOpen={!!uploadContractPlacementId}
            onClose={() => setUploadContractPlacementId(null)}
            onUploaded={() => {
              setUploadContractPlacementId(null)
              refetch()
            }}
            placementId={placement.id}
            benefactorId={placement.benefactorId}
            documentType="PLACEMENT_CONTRACT"
            title="Téléverser le contrat de placement"
            description="Téléversez le contrat PDF signé pour ce placement"
            existingDocumentId={placement.contractDocumentId}
          />
        ) : null
      })()}

      {/* Modal upload quittance retrait anticipé */}
      {uploadQuittancePlacementId && (() => {
        const placement = placements.find(p => p.id === uploadQuittancePlacementId)
        return placement ? (
          <PlacementDocumentUploadModal
            isOpen={!!uploadQuittancePlacementId}
            onClose={() => setUploadQuittancePlacementId(null)}
            onUploaded={() => {
              setUploadQuittancePlacementId(null)
              refetch()
            }}
            placementId={placement.id}
            benefactorId={placement.benefactorId}
            documentType="PLACEMENT_EARLY_EXIT_QUITTANCE"
            title="Téléverser la quittance de retrait anticipé"
            description="Téléversez la quittance PDF pour le retrait anticipé"
            existingDocumentId={earlyExitInfo?.quittanceDocumentId}
          />
        ) : null
      })()}

      {/* Modal de paiement de commission */}
      <PayCommissionModalWrapper
        payCommissionId={payCommissionId}
        payCommissionPlacementId={payCommissionPlacementId}
        onClose={() => {
          setPayCommissionId(null)
          setPayCommissionPlacementId(null)
        }}
        onSubmit={submitPayCommission}
        isPaying={payCommission.isPending}
      />

      {/* Modal de visualisation de document */}
      <ViewPlacementDocumentModal
        isOpen={!!viewDocumentId}
        onClose={() => {
          setViewDocumentId(null)
          setViewDocumentTitle('')
        }}
        documentId={viewDocumentId}
        title={viewDocumentTitle}
      />

      {/* Modal génération contrat (prérempli) */}
      <PlacementContractPDFModal
        isOpen={!!contractPdfPlacementId}
        onClose={() => setContractPdfPlacementId(null)}
        placement={contractPdfPlacementId ? placements.find(p => p.id === contractPdfPlacementId) ?? null : null}
      />

      {/* Modal de facture de commission */}
      {selectedCommissionForReceipt && (
        <CommissionReceiptModal
          isOpen={showCommissionReceipt}
          onClose={() => {
            setShowCommissionReceipt(false)
            setSelectedCommissionForReceipt(null)
          }}
          placement={selectedCommissionForReceipt.placement}
          commission={selectedCommissionForReceipt.commission}
        />
      )}

      {/* Modal Quittance finale */}
      {finalQuittancePlacementId && (() => {
        const placement = placements.find(p => p.id === finalQuittancePlacementId)
        if (!placement) return null
        return (
          <PlacementFinalQuittanceModal
            isOpen={!!finalQuittancePlacementId}
            onClose={() => setFinalQuittancePlacementId(null)}
            placement={placement}
          />
        )
      })()}

      {/* Modal Quittance de sortie anticipée */}
      {earlyExitQuittancePlacementId && (() => {
        const placement = placements.find(p => p.id === earlyExitQuittancePlacementId)
        if (!placement || !earlyExitInfo) return null
        return (
          <PlacementEarlyExitQuittanceModal
            isOpen={!!earlyExitQuittancePlacementId}
            onClose={() => setEarlyExitQuittancePlacementId(null)}
            placement={placement}
            earlyExit={earlyExitInfo}
          />
        )
      })()}
    </div>
  )
}
