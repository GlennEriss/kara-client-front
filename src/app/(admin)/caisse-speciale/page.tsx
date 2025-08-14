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

export default function AdminCaissePage() {
  const p = useAdminCaissePipeline()
  const all = useAllCaisseContracts(300)
  const qc = useQueryClient()
  const columns = [
    { key: 'actifs', title: 'Actifs' },
    { key: 'lateNP', title: 'Retard (J+0..3)' },
    { key: 'lateWP', title: 'Retard (J+4..12)' },
    { key: 'rescinded', title: 'Résiliés' },
    { key: 'finalRefund', title: 'À rembourser (final)' },
    { key: 'closed', title: 'Clos' },
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
    const cls =
      status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
      status === 'LATE_NO_PENALTY' ? 'bg-yellow-100 text-yellow-700' :
      status === 'LATE_WITH_PENALTY' ? 'bg-orange-100 text-orange-700' :
      status === 'RESCINDED' ? 'bg-red-100 text-red-700' :
      status === 'FINAL_REFUND_PENDING' ? 'bg-indigo-100 text-indigo-700' :
      status === 'CLOSED' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600'
    return <span className={`text-[10px] px-2 py-0.5 rounded ${cls}`}>{statusLabel(status)}</span>
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Caisse Spéciale</h1>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 border rounded disabled:opacity-50" onClick={exportCSV} disabled={isExporting}>{isExporting ? 'Export…' : 'Exporter CSV'}</button>
          <PipelinePDFButton sections={sections} fileName={`caisse_pipeline_${new Date().toISOString().slice(0,10)}.pdf`} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {columns.map((col) => {
          // @ts-ignore
          const q = p[col.key]
          const data = q.data || []
          return (
            <div key={col.key} className="border rounded p-3">
              <div className="font-semibold mb-2">{col.title} ({data.length})</div>
              {q.isLoading ? (
                <div className="text-xs text-gray-500">Chargement…</div>
              ) : (
                <ul className="space-y-2">
                  {data.map((c: any) => (
                    <li key={c.id} className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>#{c.id.slice(-6)}</span>
                        <StatusBadge status={c.status} />
                      </div>
                    </li>
                  ))}
                  {data.length === 0 && (
                    <li className="text-xs text-gray-500">—</li>
                  )}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {/* Liste compacte de tous les contrats (aperçu rapide) */}
      <div className="border rounded p-3">
        <div className="font-semibold mb-2">Tous les contrats (aperçu) {all.data ? `(${all.data.length})` : ''}</div>
        {all.isLoading ? (
          <div className="text-xs text-gray-500">Chargement…</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Membre</th>
                  <th className="py-1 pr-2">Mensuel</th>
                  <th className="py-1 pr-2">Mois</th>
                  <th className="py-1 pr-2">Statut</th>
                  <th className="py-1 pr-2">Prochaine</th>
                  <th className="py-1 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {(all.data || []).map((c: any) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-1 pr-2">{String(c.id).slice(-6)}</td>
                    <td className="py-1 pr-2">{c.memberId}</td>
                    <td className="py-1 pr-2">{(c.monthlyAmount||0).toLocaleString('fr-FR')}</td>
                    <td className="py-1 pr-2">{c.monthsPlanned}</td>
                    <td className="py-1 pr-2"><span className="px-2 py-0.5 rounded bg-gray-100">{statusLabel(c.status)}</span></td>
                    <td className="py-1 pr-2">{(() => { const d = toDateSafe(c.nextDueAt); return d ? d.toLocaleDateString('fr-FR') : '—' })()}</td>
                    <td className="py-1 pr-2"><Link href={routes.admin.caisseSpecialeContractDetails(c.id)} className="underline">Ouvrir</Link></td>
                  </tr>
                ))}
                {(all.data || []).length === 0 && (
                  <tr><td colSpan={7} className="text-xs text-gray-500">—</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(o)=> !isPaying && setModalOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payer une échéance</DialogTitle>
            <DialogDescription>Sélectionnez le mois dû et téléversez la preuve.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Mois dû</label>
              <select className="border rounded p-2 w-full" value={dueIdx as any} onChange={(e) => setDueIdx(Number(e.target.value))}>
                {dueOptions.map((p: any) => (
                  <option key={p.id} value={p.dueMonthIndex}>M{p.dueMonthIndex + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Preuve de paiement (image/PDF)</label>
              <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0])} />
            </div>
          </div>
          <DialogFooter>
            <button className="px-3 py-2 border rounded" onClick={() => setModalOpen(false)} disabled={isPaying}>Annuler</button>
            <button className="px-3 py-2 rounded bg-[#234D65] text-white" onClick={submitPay} disabled={isPaying || dueIdx === ''}>{isPaying ? 'Paiement…' : 'Confirmer'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

