'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { db } from '@/firebase/firestore'
import { getAdminById } from '@/db/admin.db'
import type { Payment, TypePayment } from '@/types/types'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Filter,
  Grid3X3,
  List,
  RefreshCw,
  SearchX,
  TrendingUp,
  User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  type DocumentData,
  type QueryDocumentSnapshot,
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore'

type Props = { requestId: string }
type ViewMode = 'cards' | 'table'

type CentralizedPayment = Payment & {
  id: string
  beneficiaryId?: string
  beneficiaryName?: string
  sourceType?: string
  sourceId?: string
  createdAt?: unknown
  updatedAt?: unknown
}

const PAYMENT_COLORS: Record<TypePayment, string> = {
  Membership: '#234D65',
  Subscription: '#2c5a73',
  SpecialFund: '#CBB171',
  UnexpectedFund: '#e28743',
  SpecialCredit: '#b45309',
  FixedCredit: '#3b82f6',
  AidCredit: '#10b981',
  Charity: '#f43f5e',
  Benefactor: '#8b5cf6',
}

const PAYMENT_LABELS: Record<TypePayment, string> = {
  Membership: 'Adhesion',
  Subscription: 'Abonnement',
  SpecialFund: 'Caisse speciale',
  UnexpectedFund: 'Caisse imprevue',
  SpecialCredit: 'Credit speciale',
  FixedCredit: 'Credit fixe',
  AidCredit: 'Credit aide',
  Charity: 'Charite',
  Benefactor: 'Bienfaiteur',
}

const PAYMENT_TYPES: TypePayment[] = [
  'Membership',
  'Subscription',
  'SpecialFund',
  'UnexpectedFund',
  'SpecialCredit',
  'FixedCredit',
  'AidCredit',
  'Charity',
  'Benefactor',
]

const PAYMENT_MODE_OPTIONS: Array<{ value: Payment['mode']; label: string }> = [
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mobicash', label: 'Mobicash' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'other', label: 'Autre' },
]

const PAYMENT_TYPE_ICONS: Record<TypePayment, React.ComponentType<any>> = {
  Membership: User,
  Subscription: RefreshCw,
  SpecialFund: CreditCard,
  UnexpectedFund: AlertCircle,
  SpecialCredit: CreditCard,
  FixedCredit: CreditCard,
  AidCredit: CreditCard,
  Charity: User,
  Benefactor: User,
}

const PAGE_SIZE = 12
const STATS_SCAN_LIMIT = 500

function toDate(value: unknown): Date | null {
  try {
    if (!value) return null
    if (value instanceof Date) return value
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
      return (value as any).toDate()
    }
    const date = new Date(value as string | number)
    return Number.isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

function formatAmount(amount: number): string {
  try {
    return new Intl.NumberFormat('fr-FR').format(amount || 0)
  } catch {
    return `${amount || 0}`
  }
}

function formatDate(value: unknown): string {
  const d = toDate(value)
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR')
}

function formatMode(mode: Payment['mode']): string {
  const labels: Record<Payment['mode'], string> = {
    airtel_money: 'Airtel Money',
    mobicash: 'Mobicash',
    cash: 'Cash',
    bank_transfer: 'Virement',
    other: 'Autre',
  }
  return labels[mode] || mode
}

function useCarousel(itemCount: number, itemsPerView: number = 1) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxIndex = Math.max(0, itemCount - itemsPerView)

  const goTo = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, maxIndex))
    setCurrentIndex(clampedIndex)
    setTranslateX(-clampedIndex * (100 / itemsPerView))
  }, [maxIndex, itemsPerView])

  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex])
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex])

  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true)
    setStartPos(clientX)
  }, [])

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !containerRef.current) return
    const diff = clientX - startPos
    const containerWidth = containerRef.current.offsetWidth
    const percentage = (diff / containerWidth) * 100
    const maxDrag = 30
    const clampedPercentage = Math.max(-maxDrag, Math.min(maxDrag, percentage))
    setTranslateX(-currentIndex * (100 / itemsPerView) + clampedPercentage)
  }, [isDragging, startPos, currentIndex, itemsPerView])

  const handleEnd = useCallback(() => {
    if (!isDragging || !containerRef.current) return
    const dragDistance = translateX + currentIndex * (100 / itemsPerView)
    const threshold = 15
    if (dragDistance > threshold && currentIndex > 0) {
      goPrev()
    } else if (dragDistance < -threshold && currentIndex < maxIndex) {
      goNext()
    } else {
      setTranslateX(-currentIndex * (100 / itemsPerView))
    }
    setIsDragging(false)
  }, [isDragging, translateX, currentIndex, itemsPerView, maxIndex, goPrev, goNext])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX)
  }, [handleStart])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX)
  }, [handleStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }, [handleMove])

  const handleTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  useEffect(() => {
    if (!isDragging) return
    const handleGlobalMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleGlobalMouseUp = () => handleEnd()
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, handleEnd, handleMove])

  return {
    currentIndex,
    goTo,
    goNext,
    goPrev,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < maxIndex,
    translateX,
    containerRef,
    isDragging,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}

function ModernPaymentStatsCard({
  title,
  value,
  subtitle,
  percentage,
  color,
  icon: Icon,
  trend = 'up',
}: {
  title: string
  value: number
  subtitle?: string
  percentage?: number
  color: string
  icon: React.ComponentType<any>
  trend?: 'up' | 'down' | 'neutral'
}) {
  const chartData = [
    { name: 'value', value: percentage || 0, fill: color },
    { name: 'remaining', value: Math.max(0, 100 - (percentage || 0)), fill: '#f3f4f6' },
  ]

  return (
    <Card className="group border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-600">{title}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('fr-FR')}</p>
                {trend !== 'neutral' && (
                  <div
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                      trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    )}
                  >
                    <TrendingUp className={cn('h-3 w-3', trend === 'down' && 'rotate-180')} />
                    {(percentage || 0).toFixed(0)}%
                  </div>
                )}
              </div>
              {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-600">{subtitle}</p>}
            </div>
          </div>

          <div className="h-12 w-12">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={16}
                  outerRadius={22}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`${title}-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PaymentHistory({ requestId }: Props) {
  const router = useRouter()

  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [typeFilter, setTypeFilter] = useState<TypePayment | 'all'>('all')
  const [modeFilter, setModeFilter] = useState<Payment['mode'] | 'all'>('all')
  const [adminFilter, setAdminFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [createdAtFrom, setCreatedAtFrom] = useState('')
  const [createdAtTo, setCreatedAtTo] = useState('')
  const [updatedAtFrom, setUpdatedAtFrom] = useState('')
  const [updatedAtTo, setUpdatedAtTo] = useState('')
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true)

  const [payments, setPayments] = useState<CentralizedPayment[]>([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [totalCount, setTotalCount] = useState(0)
  const [isLoadingCount, setIsLoadingCount] = useState(true)

  const [statsSample, setStatsSample] = useState<CentralizedPayment[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [nextCursor, setNextCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [pageStartCursors, setPageStartCursors] = useState<Record<number, QueryDocumentSnapshot<DocumentData> | null>>({ 1: null })
  const [refreshToken, setRefreshToken] = useState(0)

  const [adminInfos, setAdminInfos] = useState<Record<string, { firstName: string; lastName: string }>>({})

  const buildConstraints = useCallback(() => {
    const constraints: any[] = [where('beneficiaryId', '==', requestId)]

    if (typeFilter !== 'all') {
      constraints.push(where('paymentType', '==', typeFilter))
    }

    if (modeFilter !== 'all') {
      constraints.push(where('mode', '==', modeFilter))
    }

    if (adminFilter !== 'all') {
      constraints.push(where('acceptedBy', '==', adminFilter))
    }

    if (dateFrom) {
      constraints.push(where('date', '>=', new Date(dateFrom)))
    }

    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      constraints.push(where('date', '<=', end))
    }

    if (amountMin !== '' && !Number.isNaN(Number(amountMin))) {
      constraints.push(where('amount', '>=', Number(amountMin)))
    }

    if (amountMax !== '' && !Number.isNaN(Number(amountMax))) {
      constraints.push(where('amount', '<=', Number(amountMax)))
    }

    if (createdAtFrom) {
      constraints.push(where('createdAt', '>=', new Date(createdAtFrom)))
    }

    if (createdAtTo) {
      const end = new Date(createdAtTo)
      end.setHours(23, 59, 59, 999)
      constraints.push(where('createdAt', '<=', end))
    }

    if (updatedAtFrom) {
      constraints.push(where('updatedAt', '>=', new Date(updatedAtFrom)))
    }

    if (updatedAtTo) {
      const end = new Date(updatedAtTo)
      end.setHours(23, 59, 59, 999)
      constraints.push(where('updatedAt', '<=', end))
    }

    return constraints
  }, [
    requestId,
    typeFilter,
    modeFilter,
    adminFilter,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
  ])

  const fetchTotalCount = useCallback(async () => {
    setIsLoadingCount(true)
    try {
      const constraints = buildConstraints()
      const q = query(collection(db, firebaseCollectionNames.payments), ...constraints)
      const countSnap = await getCountFromServer(q)
      setTotalCount(countSnap.data().count)
    } catch (error) {
      console.error('Erreur count paiements:', error)
      setTotalCount(0)
    } finally {
      setIsLoadingCount(false)
    }
  }, [buildConstraints])

  const fetchStatsSample = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const constraints = [...buildConstraints(), orderBy('date', 'desc'), limit(STATS_SCAN_LIMIT)]
      const q = query(collection(db, firebaseCollectionNames.payments), ...constraints)
      const snap = await getDocs(q)
      const parsed = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Payment) }))
      setStatsSample(parsed)
    } catch (error) {
      console.error('Erreur stats paiements:', error)
      setStatsSample([])
    } finally {
      setIsLoadingStats(false)
    }
  }, [buildConstraints])

  const fetchPage = useCallback(async () => {
    setIsLoadingPayments(true)
    setFetchError(null)

    try {
      const pageStartCursor = pageStartCursors[currentPage] ?? null
      const constraints = [...buildConstraints(), orderBy('date', 'desc')]
      const pageQuery = pageStartCursor
        ? query(collection(db, firebaseCollectionNames.payments), ...constraints, startAfter(pageStartCursor), limit(PAGE_SIZE))
        : query(collection(db, firebaseCollectionNames.payments), ...constraints, limit(PAGE_SIZE))

      const pageSnap = await getDocs(pageQuery)
      const pageItems = pageSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Payment) }))
      setPayments(pageItems)

      const lastDoc = pageSnap.docs.length > 0 ? pageSnap.docs[pageSnap.docs.length - 1] : null
      setNextCursor(lastDoc)

      if (lastDoc) {
        const probeQuery = query(
          collection(db, firebaseCollectionNames.payments),
          ...constraints,
          startAfter(lastDoc),
          limit(1)
        )
        const probeSnap = await getDocs(probeQuery)
        setHasNextPage(!probeSnap.empty)
      } else {
        setHasNextPage(false)
      }
    } catch (error) {
      console.error('Erreur chargement paiements:', error)
      setFetchError('Impossible de charger les paiements avec les filtres actuels.')
      setPayments([])
      setHasNextPage(false)
      setNextCursor(null)
    } finally {
      setIsLoadingPayments(false)
    }
  }, [buildConstraints, currentPage, pageStartCursors])

  useEffect(() => {
    setCurrentPage(1)
    setPageStartCursors({ 1: null })
  }, [
    requestId,
    typeFilter,
    modeFilter,
    adminFilter,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
  ])

  useEffect(() => {
    fetchTotalCount()
    fetchStatsSample()
  }, [fetchTotalCount, fetchStatsSample, refreshToken])

  useEffect(() => {
    fetchPage()
  }, [fetchPage, refreshToken])

  useEffect(() => {
    const uniqueAdminIds = [
      ...new Set([...payments, ...statsSample].map((p) => p.acceptedBy).filter(Boolean)),
    ]
    if (uniqueAdminIds.length === 0) return

    uniqueAdminIds.forEach(async (adminId) => {
      if (!adminId || adminInfos[adminId]) return
      try {
        const adminData = await getAdminById(adminId)
        if (!adminData) return
        setAdminInfos((prev) => ({
          ...prev,
          [adminId]: { firstName: adminData.firstName, lastName: adminData.lastName },
        }))
      } catch (error) {
        console.error('Erreur admin info:', error)
      }
    })
  }, [payments, statsSample, adminInfos])

  const statsByType = useMemo(() => {
    const initial: Record<TypePayment, { count: number; amount: number }> = {
      Membership: { count: 0, amount: 0 },
      Subscription: { count: 0, amount: 0 },
      SpecialFund: { count: 0, amount: 0 },
      UnexpectedFund: { count: 0, amount: 0 },
      SpecialCredit: { count: 0, amount: 0 },
      FixedCredit: { count: 0, amount: 0 },
      AidCredit: { count: 0, amount: 0 },
      Charity: { count: 0, amount: 0 },
      Benefactor: { count: 0, amount: 0 },
    }

    for (const p of statsSample) {
      if (!p.paymentType || !initial[p.paymentType]) continue
      initial[p.paymentType].count += 1
      initial[p.paymentType].amount += Number(p.amount || 0)
    }

    return initial
  }, [statsSample])

  const totalAmount = useMemo(() => {
    return Object.values(statsByType).reduce((acc, item) => acc + item.amount, 0)
  }, [statsByType])

  const pieData = useMemo(() => {
    return PAYMENT_TYPES
      .map((type) => ({
        type,
        name: PAYMENT_LABELS[type],
        value: statsByType[type].amount,
        count: statsByType[type].count,
        fill: PAYMENT_COLORS[type],
      }))
      .filter((item) => item.count > 0)
  }, [statsByType])

  const statsCardsData = useMemo(() => {
    const totalPaymentsInStats = PAYMENT_TYPES.reduce((sum, type) => sum + statsByType[type].count, 0)

    return PAYMENT_TYPES.map((type) => ({
      type,
      title: PAYMENT_LABELS[type],
      color: PAYMENT_COLORS[type],
      value: statsByType[type].count,
      subtitle: `${formatAmount(statsByType[type].amount)} FCFA`,
      percentage: totalPaymentsInStats > 0 ? (statsByType[type].count / totalPaymentsInStats) * 100 : 0,
      icon: PAYMENT_TYPE_ICONS[type],
      trend: statsByType[type].count > 0 ? ('up' as const) : ('neutral' as const),
    }))
  }, [statsByType])

  const [itemsPerView, setItemsPerView] = useState(1)
  const carousel = useCarousel(statsCardsData.length, itemsPerView)

  useEffect(() => {
    const updateItemsPerView = () => {
      if (window.innerWidth >= 1280) setItemsPerView(5)
      else if (window.innerWidth >= 1024) setItemsPerView(4)
      else if (window.innerWidth >= 768) setItemsPerView(3)
      else setItemsPerView(1)
    }

    updateItemsPerView()
    window.addEventListener('resize', updateItemsPerView)
    return () => window.removeEventListener('resize', updateItemsPerView)
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handleNextPage = () => {
    if (!hasNextPage || !nextCursor) return
    const nextPage = currentPage + 1
    setPageStartCursors((prev) => ({ ...prev, [nextPage]: nextCursor }))
    setCurrentPage(nextPage)
  }

  const handlePrevPage = () => {
    if (currentPage <= 1) return
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleResetFilters = () => {
    setTypeFilter('all')
    setModeFilter('all')
    setAdminFilter('all')
    setDateFrom('')
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
    setCreatedAtFrom('')
    setCreatedAtTo('')
    setUpdatedAtFrom('')
    setUpdatedAtTo('')
  }

  const getAdminDisplay = (adminId: string) => {
    const info = adminInfos[adminId]
    if (!info) return 'Administrateur'
    return `${info.firstName} ${info.lastName}`
  }

  const adminFilterOptions = useMemo(() => {
    const adminIds = new Set<string>()
    for (const payment of statsSample) {
      if (payment.acceptedBy) adminIds.add(payment.acceptedBy)
    }
    for (const payment of payments) {
      if (payment.acceptedBy) adminIds.add(payment.acceptedBy)
    }
    if (adminFilter !== 'all') adminIds.add(adminFilter)

    return Array.from(adminIds)
      .map((id) => {
        const info = adminInfos[id]
        return {
          id,
          label: info ? `${info.firstName} ${info.lastName}` : 'Administrateur',
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }))
  }, [statsSample, payments, adminFilter, adminInfos])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (typeFilter !== 'all') count += 1
    if (modeFilter !== 'all') count += 1
    if (adminFilter !== 'all') count += 1
    if (dateFrom) count += 1
    if (dateTo) count += 1
    if (amountMin !== '') count += 1
    if (amountMax !== '') count += 1
    if (createdAtFrom) count += 1
    if (createdAtTo) count += 1
    if (updatedAtFrom) count += 1
    if (updatedAtTo) count += 1
    return count
  }, [
    typeFilter,
    modeFilter,
    adminFilter,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
  ])

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0
    if (amountMin !== '') count += 1
    if (amountMax !== '') count += 1
    if (createdAtFrom) count += 1
    if (createdAtTo) count += 1
    if (updatedAtFrom) count += 1
    if (updatedAtTo) count += 1
    return count
  }, [amountMin, amountMax, createdAtFrom, createdAtTo, updatedAtFrom, updatedAtTo])

  return (
    <div className="space-y-8 p-4 md:p-6">
      <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-2xl font-black text-transparent md:text-3xl">
                  Historique des paiements
                </h1>
                <p className="text-sm font-medium text-slate-600 md:text-base">
                  Beneficiaire: <span className="font-mono text-[#234D65]">{requestId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="border border-[#234D65]/20 bg-[#234D65]/10 text-[#234D65]">
                {isLoadingCount ? '...' : `${totalCount} paiement${totalCount > 1 ? 's' : ''}`}
              </Badge>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="h-10 rounded-xl border-[#234D65]/35 text-[#234D65] hover:bg-[#234D65] hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#234D65]/20 bg-gradient-to-r from-white to-slate-50/60 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 md:text-lg">Statistiques des paiements</h3>
            <Badge className="border border-[#234D65]/20 bg-[#234D65]/10 text-[#234D65]">
              {isLoadingStats ? 'Analyse...' : `${statsSample.length} paiement${statsSample.length > 1 ? 's' : ''} analysé${statsSample.length > 1 ? 's' : ''}`}
            </Badge>
          </div>

          <div className="relative">
            <div className="absolute left-0 top-1/2 z-10 -translate-y-1/2">
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  'h-10 w-10 rounded-full border-0 bg-white/90 text-gray-700 shadow-lg backdrop-blur-sm transition-all duration-300',
                  carousel.canGoPrev ? 'hover:scale-110 hover:bg-white' : 'cursor-not-allowed opacity-50'
                )}
                onClick={carousel.goPrev}
                disabled={!carousel.canGoPrev}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
            <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  'h-10 w-10 rounded-full border-0 bg-white/90 text-gray-700 shadow-lg backdrop-blur-sm transition-all duration-300',
                  carousel.canGoNext ? 'hover:scale-110 hover:bg-white' : 'cursor-not-allowed opacity-50'
                )}
                onClick={carousel.goNext}
                disabled={!carousel.canGoNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div
              ref={carousel.containerRef}
              className="overflow-hidden px-12 py-2"
              onMouseDown={carousel.handleMouseDown}
              onTouchStart={carousel.handleTouchStart}
              onTouchMove={carousel.handleTouchMove}
              onTouchEnd={carousel.handleTouchEnd}
            >
              <div
                className={cn(
                  'flex gap-4 transition-transform duration-300 ease-out',
                  carousel.isDragging && 'transition-none'
                )}
                style={{
                  transform: `translateX(${carousel.translateX}%)`,
                  cursor: carousel.isDragging ? 'grabbing' : 'grab',
                }}
              >
                {statsCardsData.map((stat, index) => (
                  <div
                    key={`${stat.type}-${index}`}
                    className="shrink-0"
                    style={{ width: `calc(${100 / itemsPerView}% - ${(1 * (itemsPerView - 1)) / itemsPerView}rem)` }}
                  >
                    <ModernPaymentStatsCard {...stat} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-900 md:text-lg">Repartition des montants</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[340px_1fr]">
          <div className="h-[260px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={90}>
                    {pieData.map((entry) => (
                      <Cell key={entry.type} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${formatAmount(value)} FCFA`} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Aucune donnee</div>
            )}
          </div>

          <div className="space-y-2">
            {pieData.map((item) => (
              <div key={item.type} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-sm font-medium text-slate-800">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatAmount(item.value)} FCFA</span>
              </div>
            ))}
            <div className="mt-3 rounded-xl border border-[#234D65]/20 bg-[#234D65]/5 px-3 py-2 text-sm font-semibold text-[#234D65]">
              Total: {formatAmount(totalAmount)} FCFA
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">Filtres et recherche</h3>
                  {activeFiltersCount > 0 && (
                    <Badge className="rounded-full border border-[#234D65]/20 bg-[#234D65]/10 px-2.5 py-0.5 text-xs font-semibold text-[#234D65]">
                      {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  Filtrez par type, mode, admin, montant et dates techniques.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="h-10 rounded-xl border-2 border-slate-200 text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-sm"
              >
                Reinitialiser
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsFiltersExpanded((prev) => !prev)}
                className={cn(
                  'h-10 rounded-xl border-2 transition-all duration-300 hover:-translate-y-0.5',
                  isFiltersExpanded
                    ? 'border-[#234D65] bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white shadow-sm hover:from-[#2c5a73] hover:to-[#234D65]'
                    : 'border-slate-200 bg-white text-[#234D65] hover:border-[#234D65]/40 hover:bg-[#234D65]/5 hover:text-[#234D65]'
                )}
              >
                Filtres avances
                {activeAdvancedFiltersCount > 0 ? ` (${activeAdvancedFiltersCount})` : ''}
                <ChevronDown className={cn('ml-2 h-4 w-4 transition-transform', isFiltersExpanded ? 'rotate-180' : '')} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_minmax(200px,1fr)_minmax(240px,1.2fr)_minmax(160px,1fr)_minmax(160px,1fr)]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type de paiement</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypePayment | 'all')}>
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 bg-white focus:border-[#234D65] focus:ring-0">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl">
                  <SelectItem value="all">Tous les types</SelectItem>
                  {PAYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {PAYMENT_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode de paiement</Label>
              <Select value={modeFilter} onValueChange={(v) => setModeFilter(v as Payment['mode'] | 'all')}>
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 bg-white focus:border-[#234D65] focus:ring-0">
                  <SelectValue placeholder="Tous les modes" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl">
                  <SelectItem value="all">Tous les modes</SelectItem>
                  {PAYMENT_MODE_OPTIONS.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin enregistrement</Label>
              <Select value={adminFilter} onValueChange={setAdminFilter}>
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 bg-white focus:border-[#234D65] focus:ring-0">
                  <SelectValue placeholder="Tous les admins" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl">
                  <SelectItem value="all">Tous les admins</SelectItem>
                  {adminFilterOptions.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date versement debut</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-11 rounded-xl border-2 border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date versement fin</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-11 rounded-xl border-2 border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
              />
            </div>
          </div>

          {isFiltersExpanded && (
            <div className="rounded-2xl border border-[#234D65]/15 bg-gradient-to-br from-[#234D65]/[0.04] via-white to-slate-50 p-4 md:p-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Montants</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Montant du paiement (FCFA)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={amountMin}
                        onChange={(e) => setAmountMin(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={amountMax}
                        onChange={(e) => setAmountMax(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Dates techniques</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Date de creation</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={createdAtFrom}
                        onChange={(e) => setCreatedAtFrom(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                      />
                      <Input
                        type="date"
                        value={createdAtTo}
                        onChange={(e) => setCreatedAtTo(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Date de modification</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={updatedAtFrom}
                        onChange={(e) => setUpdatedAtFrom(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                      />
                      <Input
                        type="date"
                        value={updatedAtTo}
                        onChange={(e) => setUpdatedAtTo(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-xl font-black text-transparent md:text-2xl">
                Liste des paiements
              </h2>
              <p className="text-sm font-medium text-slate-600">
                {isLoadingCount ? '...' : `${totalCount} paiements`} • Page {currentPage}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
                  <TabsList className="h-auto bg-transparent p-0">
                    <TabsTrigger
                      value="cards"
                      className="h-10 rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:text-[#234D65]"
                    >
                      <Grid3X3 className="mr-2 h-4 w-4" /> Cards
                    </TabsTrigger>
                    <TabsTrigger
                      value="table"
                      className="h-10 rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:text-[#234D65]"
                    >
                      <List className="mr-2 h-4 w-4" /> Table
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Button
                variant="outline"
                onClick={() => setRefreshToken((prev) => prev + 1)}
                className="h-10 rounded-xl border-2 border-[#234D65]/40 bg-white px-4 text-[#234D65] hover:bg-[#234D65] hover:text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {fetchError && (
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 p-4 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" />
            {fetchError}
          </CardContent>
        </Card>
      )}

      {isLoadingPayments ? (
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-10 text-center text-sm text-slate-500">Chargement des paiements...</CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-3 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <SearchX className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Aucun paiement trouve</h3>
            <p className="text-sm text-slate-600">Modifiez les filtres ou verifiez l'identifiant beneficiaire.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {payments.map((payment) => {
                const color = PAYMENT_COLORS[payment.paymentType]
                const label = PAYMENT_LABELS[payment.paymentType]
                const adminName = getAdminDisplay(payment.acceptedBy)
                const initials = label.slice(0, 2).toUpperCase()

                return (
                  <Card key={payment.id} className="group overflow-hidden border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <div className="h-1" style={{ backgroundColor: color }} />
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge className="border-0" style={{ backgroundColor: `${color}20`, color }}>
                            {label}
                          </Badge>
                          <p className="mt-2 text-xl font-bold text-slate-900">{formatAmount(payment.amount)} FCFA</p>
                        </div>
                        <Avatar className="h-10 w-10 rounded-lg ring-1 ring-slate-200">
                          <AvatarFallback className="rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">{initials}</AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Date</p>
                          <p className="font-medium text-slate-900">{formatDate(payment.date)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Mode</p>
                          <p className="font-medium text-slate-900">{formatMode(payment.mode)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Enregistre par
                        </span>
                        <span className="font-medium text-slate-700">{adminName}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-gradient-to-r from-[#234D65]/10 via-[#234D65]/5 to-transparent text-[#234D65]">
                  <tr>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Mode</th>
                    <th className="px-4 py-3 text-left">Enregistre par</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-[#234D65]/[0.03]">
                      <td className="px-4 py-3">
                        <Badge className="border-0" style={{ backgroundColor: `${PAYMENT_COLORS[payment.paymentType]}20`, color: PAYMENT_COLORS[payment.paymentType] }}>
                          {PAYMENT_LABELS[payment.paymentType]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatAmount(payment.amount)} FCFA</td>
                      <td className="px-4 py-3">{formatDate(payment.date)}</td>
                      <td className="px-4 py-3">{formatMode(payment.mode)}</td>
                      <td className="px-4 py-3">{getAdminDisplay(payment.acceptedBy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Card className="border border-[#234D65]/20 bg-gradient-to-r from-white to-slate-50/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  Page {currentPage} sur {totalPages} • {isLoadingCount ? '...' : `${totalCount} resultats`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="h-10 rounded-xl border-[#234D65]/35 px-4 text-[#234D65] hover:bg-[#234D65] hover:text-white"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Precedent
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    className="h-10 rounded-xl border-[#234D65]/35 px-4 text-[#234D65] hover:bg-[#234D65] hover:text-white"
                  >
                    Suivant <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!isLoadingStats && statsSample.length >= STATS_SCAN_LIMIT && (
        <p className="text-xs text-slate-500">
          Les statistiques affichent un echantillon recent (max {STATS_SCAN_LIMIT} paiements) pour garder la page fluide.
        </p>
      )}
    </div>
  )
}
