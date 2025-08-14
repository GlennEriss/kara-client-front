"use client"

import Link from 'next/link'
import routes from '@/constantes/routes'
import { useAdminCaissePipeline, useAllCaisseContracts } from '@/hooks/useCaisseContracts'
import React from 'react'
import { listPayments } from '@/db/caisse/payments.db'
import { pay } from '@/services/caisse/mutations'
import { useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
const PipelinePDFButton = dynamic(() => import('@/components/caisse/PipelinePDFButton'), { ssr: false })
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getUserById } from '@/db/user.db'
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  CheckCircle,
  Download,
  FileDown,
  Eye,
  CreditCard,
  Calendar,
  Upload,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react'

export default function AdminCaissePage() {
  const p = useAdminCaissePipeline()
  const all = useAllCaisseContracts(300)
  const qc = useQueryClient()
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  
  const columns = [
    { key: 'actifs', title: 'Actifs', icon: Users, color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
    { key: 'lateNP', title: 'Retard (J+0..3)', icon: Clock, color: 'bg-yellow-500', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
    { key: 'lateWP', title: 'Retard (J+4..12)', icon: AlertTriangle, color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
    { key: 'rescinded', title: 'Résiliés', icon: XCircle, color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
    { key: 'finalRefund', title: 'À rembourser (final)', icon: RefreshCw, color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { key: 'closed', title: 'Clos', icon: CheckCircle, color: 'bg-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-700' },
  ] as const

  const [modalOpen, setModalOpen] = React.useState(false)
  const [selectedContract, setSelectedContract] = React.useState<any | null>(null)
  const [dueOptions, setDueOptions] = React.useState<any[]>([])
  const [dueIdx, setDueIdx] = React.useState<number | ''>('')
  const [file, setFile] = React.useState<File | undefined>()
  const [isPaying, setIsPaying] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)

  function statusLabel(s: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Brouillon',
      ACTIVE: 'Actif',
      LATE_NO_PENALTY: 'Retard (J+0..3)',
      LATE_WITH_PENALTY: 'Retard (J+4..12)',
      DEFAULTED_AFTER_J12: 'Résilié (>J+12)',
      EARLY_WITHDRAW_REQUESTED: 'Retrait anticipé demandé',
      FINAL_REFUND_PENDING: 'Remboursement final en attente',
      EARLY_REFUND_PENDING: 'Remboursement anticipé en attente',
      RESCINDED: 'Résilié',
      CLOSED: 'Clos',
    }
    return map[s] || s
  }

  function StatusBadge({ status }: { status: string }) {
    const configs = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: Users },
      LATE_NO_PENALTY: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock },
      LATE_WITH_PENALTY: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
      RESCINDED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
      FINAL_REFUND_PENDING: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: RefreshCw },
      CLOSED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: CheckCircle },
    }
    
    const config = configs[status as keyof typeof configs] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: MoreVertical }
    const IconComponent = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${config.bg} ${config.text} ${config.border}`}>
        <IconComponent className="h-3 w-3" />
        {statusLabel(status)}
      </span>
    )
  }

  function toDateSafe(v: any): Date | null {
    try {
      if (!v) return null
      if (v instanceof Date) return v
      if (typeof v?.toDate === 'function') return v.toDate()
      const d = new Date(v)
      return isNaN(d.getTime()) ? null : d
    } catch { return null }
  }

  const openPayModal = async (contract: any) => {
    setSelectedContract(contract)
    setFile(undefined)
    setDueIdx('')
    setDueOptions([])
    setModalOpen(true)
    try {
      const payments = await listPayments(contract.id)
      const dues = payments.filter((p: any) => p.status === 'DUE')
      setDueOptions(dues)
      if (dues.length > 0) setDueIdx(dues[0].dueMonthIndex)
    } catch (e) {
      // ignore
    }
  }

  const submitPay = async () => {
    if (!selectedContract || dueIdx === '' ) return
    try {
      setIsPaying(true)
      await pay({ contractId: selectedContract.id, dueMonthIndex: Number(dueIdx), memberId: selectedContract.memberId, file })
      setModalOpen(false)
      await qc.invalidateQueries({ queryKey: ['caisse-admin'] })
      toast.success('Paiement enregistré')
    } finally {
      setIsPaying(false)
    }
  }

  // Export CSV
  const exportCSV = async () => {
    setIsExporting(true)
    const all: any[] = []
    const take = (q: any) => { if (q.data) all.push(...q.data) }
    take(p.actifs); take(p.lateNP); take(p.lateWP); take(p.rescinded); take(p.finalRefund); take(p.closed)
    const uniqueMemberIds = Array.from(new Set(all.map((c: any) => c.memberId).filter(Boolean))) as string[]
    const userEntries = await Promise.all(uniqueMemberIds.map(async (id) => {
      try { const u = await getUserById(id); return [id, u] as const } catch { return [id, null] as const }
    }))
    const userMap = Object.fromEntries(userEntries)
    const headers = [
      'id','memberId','matricule','firstName','lastName','monthlyAmount','monthsPlanned','status','nextDueAt','nominalPaid','bonusAccrued','penaltiesTotal','createdAt','contractStartAt','contractEndAt'
    ]
    const rows = all.map((c: any) => {
      const u: any = c.memberId ? userMap[c.memberId] : null
      return [
        c.id,
        c.memberId || '',
        u?.matricule || '',
        u?.firstName || '',
        u?.lastName || '',
        c.monthlyAmount || 0,
        c.monthsPlanned || 0,
        c.status || '',
        c.nextDueAt ? new Date(c.nextDueAt).toISOString() : '',
        c.nominalPaid || 0,
        c.bonusAccrued || 0,
        c.penaltiesTotal || 0,
        c.createdAt ? new Date(c.createdAt).toISOString() : '',
        c.contractStartAt ? new Date(c.contractStartAt).toISOString() : '',
        c.contractEndAt ? new Date(c.contractEndAt).toISOString() : '',
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(val => {
      const s = String(val)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
    }).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `caisse_pipeline_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setIsExporting(false)
  }

  const sections = [
    { label: 'Actifs', items: p.actifs.data || [] },
    { label: 'J+0..3', items: p.lateNP.data || [] },
    { label: 'J+4..12', items: p.lateWP.data || [] },
    { label: 'Résiliés', items: p.rescinded.data || [] },
    { label: 'À rembourser', items: p.finalRefund.data || [] },
    { label: 'Clos', items: p.closed.data || [] },
  ]

  // Filtrage des contrats
  const filteredContracts = React.useMemo(() => {
    let contracts = all.data || []
    
    if (searchTerm) {
      contracts = contracts.filter((c: any) => 
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.memberId?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (statusFilter !== 'all') {
      contracts = contracts.filter((c: any) => c.status === statusFilter)
    }
    
    return contracts
  }, [all.data, searchTerm, statusFilter])

  const totalContracts = (all.data || []).length
  const totalActive = (p.actifs.data || []).length
  const totalLate = ((p.lateNP.data || []).length + (p.lateWP.data || []).length)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Caisse Spéciale
            </h1>
            <p className="text-gray-600 text-base md:text-lg">Suivi des contrats, retards et remboursements</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button 
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-white hover:shadow-md transition-all duration-200 font-medium disabled:opacity-50" 
              onClick={exportCSV} 
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Exporter CSV
                </>
              )}
            </button>
            <PipelinePDFButton 
              sections={sections} 
              fileName={`caisse_pipeline_${new Date().toISOString().slice(0,10)}.pdf`} 
            />
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-blue-100/50 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Contrats</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{totalContracts}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-green-100/50 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contrats Actifs</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">{totalActive}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-orange-100/50 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Retard</p>
                <p className="text-2xl md:text-3xl font-bold text-orange-600">{totalLate}</p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline par statut */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {columns.map((col) => {
            // @ts-ignore
            const q = p[col.key]
            const data = q.data || []
            const IconComponent = col.icon
            
            return (
              <div key={col.key} className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 overflow-hidden">
                <div className={`${col.bgColor} border-b border-gray-100 p-4 md:p-6`}>
                  <div className="flex items-center gap-3">
                    <div className={`${col.color} rounded-full p-2 text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg ${col.textColor}`}>{col.title}</h3>
                      <p className="text-sm text-gray-600">{data.length} contrat{data.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 md:p-6">
                  {q.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-3 text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Chargement...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <IconComponent className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aucun contrat</p>
                        </div>
                      ) : (
                        data.slice(0, 5).map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-medium text-gray-900">#{c.id.slice(-6)}</span>
                              <StatusBadge status={c.status} />
                            </div>
                          </div>
                        ))
                      )}
                      {data.length > 5 && (
                        <div className="text-center pt-2">
                          <span className="text-xs text-gray-500">+{data.length - 5} autres</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Liste complète des contrats */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Tous les contrats</h2>
                  <p className="text-gray-300 text-sm">{filteredContracts.length} contrat{filteredContracts.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              
              {/* Filtres */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="ACTIVE">Actifs</option>
                  <option value="LATE_NO_PENALTY">Retard (J+0..3)</option>
                  <option value="LATE_WITH_PENALTY">Retard (J+4..12)</option>
                  <option value="RESCINDED">Résiliés</option>
                  <option value="FINAL_REFUND_PENDING">À rembourser</option>
                  <option value="CLOSED">Clos</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {all.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Chargement des contrats...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Version mobile : cartes */}
                <div className="block md:hidden space-y-4">
                  {filteredContracts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun contrat trouvé</p>
                    </div>
                  ) : (
                    filteredContracts.map((c: any) => (
                      <div key={c.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-mono text-sm font-bold text-gray-900">#{c.id.slice(-6)}</h3>
                            <p className="text-xs text-gray-600">ID: {c.memberId}</p>
                          </div>
                          <StatusBadge status={c.status} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                          <div>
                            <span className="text-gray-500">Mensuel:</span>
                            <p className="font-semibold">{(c.monthlyAmount||0).toLocaleString('fr-FR')} FCFA</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Durée:</span>
                            <p className="font-semibold">{c.monthsPlanned} mois</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-600">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {(() => { 
                              const d = toDateSafe(c.nextDueAt); 
                              return d ? d.toLocaleDateString('fr-FR') : '—' 
                            })()}
                          </div>
                          <Link 
                            href={routes.admin.caisseSpecialeContractDetails(c.id)} 
                            className="flex items-center gap-1 text-[#234D65] hover:text-[#2c5a73] text-xs font-medium"
                          >
                            <Eye className="h-3 w-3" />
                            Ouvrir
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Version desktop : tableau */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 pr-4 text-sm font-semibold text-gray-700"># Contrat</th>
                        <th className="text-left py-3 pr-4 text-sm font-semibold text-gray-700">Membre</th>
                        <th className="text-left py-3 pr-4 text-sm font-semibold text-gray-700">Mensuel</th>
                        <th className="text-left py-3 pr-4 text-sm font-semibold text-gray-700">Durée</th>
                        <th className="text-left py-3 pr-4 text-sm font-semibold text-gray-700">Statut</th>
                        <th className="text-left py-3 pr-4 text-sm font-semibold text-gray-700">Prochaine échéance</th>
                        <th className="text-left py-3 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContracts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Aucun contrat trouvé</p>
                          </td>
                        </tr>
                      ) : (
                        filteredContracts.map((c: any) => (
                          <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
                            <td className="py-4 pr-4">
                              <span className="font-mono text-sm font-medium text-gray-900">#{c.id.slice(-6)}</span>
                            </td>
                            <td className="py-4 pr-4">
                              <span className="text-sm text-gray-700">{c.memberId}</span>
                            </td>
                            <td className="py-4 pr-4">
                              <span className="text-sm font-semibold text-gray-900">
                                {(c.monthlyAmount||0).toLocaleString('fr-FR')} FCFA
                              </span>
                            </td>
                            <td className="py-4 pr-4">
                              <span className="text-sm text-gray-700">{c.monthsPlanned} mois</span>
                            </td>
                            <td className="py-4 pr-4">
                              <StatusBadge status={c.status} />
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {(() => { 
                                  const d = toDateSafe(c.nextDueAt); 
                                  return d ? d.toLocaleDateString('fr-FR') : '—' 
                                })()}
                              </div>
                            </td>
                            <td className="py-4">
                              <Link 
                                href={routes.admin.caisseSpecialeContractDetails(c.id)} 
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#234D65] hover:text-white hover:bg-[#234D65] border border-[#234D65] rounded-lg transition-all duration-200"
                              >
                                <Eye className="h-4 w-4" />
                                Ouvrir
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de paiement */}
        <Dialog open={modalOpen} onOpenChange={(o) => !isPaying && setModalOpen(o)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payer une échéance
              </DialogTitle>
              <DialogDescription>
                Sélectionnez le mois dû et téléversez la preuve de paiement.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mois dû</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select 
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200" 
                    value={dueIdx as any} 
                    onChange={(e) => setDueIdx(Number(e.target.value))}
                  >
                    <option value="">Sélectionner un mois</option>
                    {dueOptions.map((p: any) => (
                      <option key={p.id} value={p.dueMonthIndex}>M{p.dueMonthIndex + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preuve de paiement</label>
                <div className="relative">
                  <Upload className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={(e) => setFile(e.target.files?.[0])}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Formats acceptés: images, PDF</p>
              </div>
            </div>
            
            <DialogFooter className="gap-3">
              <button 
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium" 
                onClick={() => setModalOpen(false)} 
                disabled={isPaying}
              >
                Annuler
              </button>
              <button 
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white rounded-lg hover:shadow-lg hover:shadow-[#234D65]/25 transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={submitPay} 
                disabled={isPaying || dueIdx === ''}
              >
                {isPaying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Confirmer
                  </>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}