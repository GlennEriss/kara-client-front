'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Filter, ExternalLink, Receipt, Zap, Sparkles, PieChart, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useMembershipRequest } from '@/hooks/useMembershipRequests'
import type { Payment, TypePayment } from '@/types/types'
import routes from '@/constantes/routes'

function toDate(value: any): Date | null {
  try {
    if (!value) return null
    if (value instanceof Date) return value
    if (value.toDate) return value.toDate()
    return new Date(value)
  } catch {
    return null
  }
}

function formatAmount(amount: number) {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(amount)
  } catch {
    return `${amount}`
  }
}

function formatDate(d: any) {
  const date = toDate(d)
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const PAYMENT_COLORS = {
  Membership: '#10b981',    // Emerald
  Subscription: '#3b82f6',  // Blue  
  Tontine: '#f59e0b',      // Amber
  Charity: '#ec4899'       // Pink
}

const PAYMENT_ICONS = {
  Membership: Target,
  Subscription: Zap,
  Tontine: PieChart,
  Charity: Sparkles
}

const PAYMENT_LABELS = {
  Membership: 'Adhésion',
  Subscription: 'Abonnement', 
  Tontine: 'Tontine',
  Charity: 'Charité'
}

type Props = { requestId: string }

// Composant pour les statistiques colorées
const StatCard = ({ 
  type, 
  count, 
  amount, 
  isHighlighted = false 
}: { 
  type: TypePayment
  count: number
  amount: number
  isHighlighted?: boolean
}) => {
  const Icon = PAYMENT_ICONS[type]
  const color = PAYMENT_COLORS[type]
  
  return (
    <Card className={`group relative overflow-hidden transition-all duration-500 hover:-translate-y-1 sm:hover:-translate-y-2 hover:shadow-xl sm:hover:shadow-2xl border-0 ${
      isHighlighted ? 'scale-105' : ''
    }`} style={isHighlighted ? { boxShadow: `0 0 0 2px ${color}` } : undefined}>
      {/* Effet de fond animé */}
      <div 
        className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500"
        style={{ backgroundColor: color }}
      />
      <div 
        className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full opacity-10 group-hover:opacity-20 transition-all duration-700 transform translate-x-12 sm:translate-x-16 -translate-y-12 sm:-translate-y-16 group-hover:scale-150"
        style={{ backgroundColor: color }}
      />
      
      <CardContent className="p-4 sm:p-6 relative z-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color }} />
          </div>
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-300">
              {count}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {PAYMENT_LABELS[type]}
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-lg sm:text-xl font-bold truncate" style={{ color }}>
            {formatAmount(amount)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ 
                backgroundColor: color,
                width: count > 0 ? '100%' : '0%'
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant pour une ligne de paiement moderne
const PaymentRow = ({ payment, index }: { payment: Payment, index: number }) => {
  const color = PAYMENT_COLORS[payment.paymentType]
  const Icon = PAYMENT_ICONS[payment.paymentType]
  
  return (
    <div 
      className="group p-4 sm:p-6 hover:bg-gradient-to-r hover:from-white hover:to-gray-50 transition-all duration-300 relative overflow-hidden"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Ligne colorée à gauche */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 opacity-60 group-hover:opacity-100 group-hover:w-2 transition-all duration-300"
        style={{ backgroundColor: color }}
      />
      
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
          </div>
          
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Badge 
                variant="outline" 
                className="font-medium border-0 px-2 py-1 text-xs sm:text-sm self-start"
                style={{ backgroundColor: `${color}15`, color }}
              >
                {PAYMENT_LABELS[payment.paymentType]}
              </Badge>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatAmount(payment.amount)}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                {formatDate(payment.date)}
              </span>
              <Separator orientation="vertical" className="h-4 hidden sm:block" />
              <span className="font-medium text-gray-700 uppercase tracking-wide">
                {payment.mode.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 pl-0 sm:pl-16">
          <span>Enregistré par:</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {payment.acceptedBy}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export default function PaymentHistory({ requestId }: Props) {
  const router = useRouter()
  const { data: request, isLoading, isError } = useMembershipRequest(requestId)

  const [typeFilter, setTypeFilter] = React.useState<TypePayment | 'all'>('all')
  const [dateFrom, setDateFrom] = React.useState<string>('')
  const [dateTo, setDateTo] = React.useState<string>('')
  const [page, setPage] = React.useState(1)
  const pageSize = 10

  const payments: Payment[] = React.useMemo(() => {
    const list = request?.payments || []
    return [...list].sort((a, b) => {
      const da = toDate(a.date)?.getTime() || 0
      const db = toDate(b.date)?.getTime() || 0
      return db - da
    })
  }, [request])

  const filtered = React.useMemo(() => {
    return payments.filter(p => {
      if (typeFilter !== 'all' && p.paymentType !== typeFilter) return false
      const d = toDate(p.date)
      if (dateFrom) {
        const from = new Date(dateFrom)
        if (!d || d < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23,59,59,999)
        if (!d || d > to) return false
      }
      return true
    })
  }, [payments, typeFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const statsByType = React.useMemo(() => {
    const map: Record<TypePayment, { count: number; amount: number }> = {
      Membership: { count: 0, amount: 0 },
      Subscription: { count: 0, amount: 0 },
      Tontine: { count: 0, amount: 0 },
      Charity: { count: 0, amount: 0 },
    }
    for (const p of filtered) {
      map[p.paymentType].count += 1
      map[p.paymentType].amount += p.amount || 0
    }
    return map
  }, [filtered])

  // Données pour les graphiques
  const pieData = Object.entries(statsByType)
    .filter(([_, stats]) => stats.count > 0)
    .map(([type, stats]) => ({
      name: PAYMENT_LABELS[type as TypePayment],
      value: stats.amount,
      fill: PAYMENT_COLORS[type as TypePayment],
      count: stats.count
    }))

  const totalAmount = Object.values(statsByType).reduce((sum, stats) => sum + stats.amount, 0)

  React.useEffect(() => {
    setPage(1)
  }, [typeFilter, dateFrom, dateTo])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto">
          <Card className="shadow-2xl border-0 overflow-hidden">
            <CardContent className="p-8 sm:p-12 lg:p-16 text-center">
              <div className="animate-pulse space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#234D65] to-blue-600 rounded-xl sm:rounded-2xl mx-auto opacity-80" />
                <div className="h-6 sm:h-8 bg-gray-200 rounded-lg w-48 sm:w-64 mx-auto" />
                <div className="h-3 sm:h-4 bg-gray-100 rounded w-32 sm:w-48 mx-auto" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isError || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-100 p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto">
          <Card className="shadow-2xl border-0 overflow-hidden">
            <CardContent className="p-8 sm:p-12 lg:p-16 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <Receipt className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Données indisponibles</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">Impossible de charger l'historique des paiements.</p>
              <Button 
                onClick={() => router.back()} 
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 sm:h-12 px-4 sm:px-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Éléments de fond décoratifs */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-[#234D65]/10 to-blue-600/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-emerald-400/10 to-green-600/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
        {/* En-tête spectaculaire */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#234D65]/20 to-blue-600/20 rounded-2xl lg:rounded-3xl blur-xl opacity-60" />
          <Card className="relative bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#234D65] via-blue-600 to-purple-600" />
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col gap-4 lg:gap-6">
                {/* Header mobile/desktop */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Button
                      variant="ghost"
                      onClick={() => router.back()}
                      className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-xl lg:rounded-2xl bg-white/80 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-0 flex-shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-[#234D65] to-blue-600 rounded-xl lg:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Receipt className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                        </div>
                        <h1 className="text-lg sm:text-2xl lg:text-4xl font-black bg-gradient-to-r from-[#234D65] to-blue-600 bg-clip-text text-transparent leading-tight">
                          Historique des Paiements
                        </h1>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <Badge variant="outline" className="bg-white/60 border-[#234D65]/30 text-xs sm:text-sm self-start">
                          Dossier: {request.id}
                        </Badge>
                        <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 text-xs sm:text-sm self-start">
                          {filtered.length} paiement{filtered.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => router.push(routes.admin.membershipRequestDetails(request.id))}
                    className="bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 sm:h-11 lg:h-12 px-4 sm:px-6 lg:px-8 text-sm sm:text-base flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 flex-shrink-0" /> 
                    <span className="hidden sm:inline">Voir le dossier complet</span>
                    <span className="sm:hidden">Dossier</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres modernes */}
        <Card className="bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-xl border border-white/50">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Type de paiement
                </label>
                <select
                  className="h-10 sm:h-12 w-full rounded-lg lg:rounded-xl border-2 border-gray-200 bg-white/80 px-3 sm:px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#234D65] focus:border-transparent transition-all duration-300"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                >
                  <option value="all">🎯 Tous les types</option>
                  <option value="Membership">🎯 Adhésion</option>
                  <option value="Subscription">⚡ Abonnement</option>
                  <option value="Tontine">🥧 Caisse Spéciale</option>
                  <option value="Charity">✨ Charité</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date début
                </label>
                <input 
                  type="date" 
                  className="h-10 sm:h-12 w-full rounded-lg lg:rounded-xl border-2 border-gray-200 bg-white/80 px-3 sm:px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#234D65] focus:border-transparent transition-all duration-300" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)} 
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date fin
                </label>
                <input 
                  type="date" 
                  className="h-10 sm:h-12 w-full rounded-lg lg:rounded-xl border-2 border-gray-200 bg-white/80 px-3 sm:px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#234D65] focus:border-transparent transition-all duration-300" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)} 
                />
              </div>
              
              <div className="flex items-end col-span-1 sm:col-span-2 lg:col-span-1">
                <Button 
                  variant="outline" 
                  className="h-10 sm:h-12 w-full rounded-lg lg:rounded-xl border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 font-medium text-sm sm:text-base" 
                  onClick={() => { setTypeFilter('all'); setDateFrom(''); setDateTo('') }}
                >
                  <Sparkles className="w-4 h-4 mr-2" /> 
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vue d'ensemble avec graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Statistiques par type */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              {Object.entries(statsByType).map(([type, stats]) => (
                <StatCard
                  key={type}
                  type={type as TypePayment}
                  count={stats.count}
                  amount={stats.amount}
                  isHighlighted={typeFilter === type}
                />
              ))}
            </div>
          </div>

          {/* Graphique circulaire */}
          <Card className="bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-xl border border-white/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base lg:text-lg font-bold text-gray-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 lg:w-5 lg:h-5 text-[#234D65]" />
                Répartition des montants
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6 pt-0">
              {pieData.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-40 sm:h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [formatAmount(value), 'Montant']}
                          labelFormatter={(label) => `${label}`}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-2">
                    {pieData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: item.fill }} 
                          />
                          <span className="font-medium truncate">{item.name}</span>
                        </div>
                        <span className="font-bold ml-2 flex-shrink-0" style={{ color: item.fill }}>
                          {formatAmount(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between font-bold text-sm sm:text-lg">
                      <span>Total</span>
                      <span className="text-[#234D65]">{formatAmount(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Aucune donnée à afficher</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Liste des paiements */}
        <Card className="bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#234D65] to-blue-600 text-white p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Détail des Paiements</span>
              <span className="sm:hidden">Paiements</span>
              <Badge className="bg-white/20 text-white border-0 text-xs sm:text-sm">
                {filtered.length} {filtered.length === 1 ? 'paiement' : 'paiements'}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {paged.length === 0 ? (
              <div className="text-center py-12 sm:py-16 px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                  <Receipt className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Aucun paiement trouvé</h3>
                <p className="text-sm sm:text-base text-gray-600">Essayez de modifier vos filtres pour voir plus de résultats.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paged.map((payment, index) => (
                  <PaymentRow key={index} payment={payment} index={index} />
                ))}
              </div>
            )}

            {/* Pagination moderne */}
            {filtered.length > pageSize && (
              <div className="bg-gray-50/50 p-4 sm:p-6 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs sm:text-sm font-medium text-gray-700">
                    Page {page} sur {totalPages} • {filtered.length} résultats
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      disabled={page === 1} 
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg lg:rounded-xl border-2 hover:border-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 h-9 sm:h-10 px-3 sm:px-4 text-sm"
                    >
                      ← Précédent
                    </Button>
                    <Button 
                      variant="outline" 
                      disabled={page === totalPages} 
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg lg:rounded-xl border-2 hover:border-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 h-9 sm:h-10 px-3 sm:px-4 text-sm"
                    >
                      Suivant →
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}