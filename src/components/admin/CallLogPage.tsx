'use client'

/**
 * Journal des relances : tous les contacts avec les retardataires, filtrables,
 * avec le résumé d'activité (qui a appelé, combien, avec quel résultat).
 */

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useListUrlSync } from '@/hooks/useListUrlSync'
import { PageHero } from '@/components/ui/page-hero'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ListPagination } from '@/components/ui/list-pagination'
import { StatsCard } from '@/components/ui/stats-card'
import { useCallLogs } from '@/hooks/useCallLogs'
import {
  CALL_OUTCOME_COLORS,
  CALL_OUTCOME_LABELS,
  CONTACT_CHANNEL_LABELS,
  REACHED_OUTCOMES,
  type CallOutcome,
  type ContactChannel,
} from '@/services/call-logs/callLog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, CalendarClock, Download, PhoneCall, RefreshCw, Search, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { exportRowsToExcel } from '@/utils/excel-export'

const PAGE_SIZE = 15

export default function CallLogPage() {
  const { data: logs = [], isLoading, isFetching, refetch } = useCallLogs(1000)

  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | CallOutcome>(
    (searchParams.get('issue') as CallOutcome) || 'all',
  )
  const [channelFilter, setChannelFilter] = useState<'all' | ContactChannel>(
    (searchParams.get('canal') as ContactChannel) || 'all',
  )
  const [productFilter, setProductFilter] = useState<'all' | string>(searchParams.get('produit') || 'all')
  const [from, setFrom] = useState(searchParams.get('du') || '')
  const [to, setTo] = useState(searchParams.get('au') || '')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  useListUrlSync({
    q: search || null,
    issue: outcomeFilter !== 'all' ? outcomeFilter : null,
    canal: channelFilter !== 'all' ? channelFilter : null,
    produit: productFilter !== 'all' ? productFilter : null,
    du: from || null,
    au: to || null,
    page: page > 1 ? page : null,
  })

  const productsPresent = useMemo(() => {
    const set = new Set(logs.map((l) => l.product).filter(Boolean))
    return Array.from(set).sort()
  }, [logs])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null
    return logs.filter((l) => {
      if (outcomeFilter !== 'all' && l.outcome !== outcomeFilter) return false
      if (channelFilter !== 'all' && l.channel !== channelFilter) return false
      if (productFilter !== 'all' && l.product !== productFilter) return false
      const ts = l.createdAt.getTime()
      if (fromTs !== null && ts < fromTs) return false
      if (toTs !== null && ts > toTs) return false
      if (s) {
        const hay = `${l.name} ${l.matricule ?? ''} ${l.summary} ${l.adminName}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [logs, search, outcomeFilter, channelFilter, productFilter, from, to])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  /**
   * Résumé d'activité, calculé sur la sélection courante.
   *
   * Le taux de joignabilité ne compte que les appels : un message WhatsApp
   * parti n'établit pas le contact et fausserait le ratio.
   */
  const stats = useMemo(() => {
    const calls = filtered.filter((l) => l.channel === 'call')
    const reached = calls.filter((l) => REACHED_OUTCOMES.includes(l.outcome)).length
    const reachRate = calls.length > 0 ? Math.round((reached / calls.length) * 100) : 0

    // Promesses non tenues : échéance dépassée, sans « a déjà payé » enregistré
    // après coup pour la même personne.
    const now = Date.now()
    const paidAfter = new Map<string, number>()
    for (const l of logs) {
      if (l.outcome !== 'paiement_effectue') continue
      const prev = paidAfter.get(l.personKey) ?? 0
      paidAfter.set(l.personKey, Math.max(prev, l.createdAt.getTime()))
    }
    const brokenPromises = filtered.filter((l) => {
      if (l.outcome !== 'promesse_paiement' || !l.promiseToPayAt) return false
      if (l.promiseToPayAt.getTime() > now) return false
      const paidAt = paidAfter.get(l.personKey)
      return !paidAt || paidAt < l.createdAt.getTime()
    })

    return {
      total: filtered.length,
      calls: calls.length,
      reachRate,
      brokenPromises: brokenPromises.length,
      brokenAmount: brokenPromises.reduce((sum, l) => sum + (l.promiseAmount || l.totalOverdue || 0), 0),
    }
  }, [filtered, logs])

  /** Activité par administrateur — c'est le tableau que la direction regarde. */
  const byCaller = useMemo(() => {
    const map = new Map<string, { name: string; total: number; reached: number; promises: number }>()
    for (const l of filtered) {
      const name = l.adminName
      const row = map.get(name) ?? { name, total: 0, reached: 0, promises: 0 }
      row.total += 1
      if (REACHED_OUTCOMES.includes(l.outcome)) row.reached += 1
      if (l.outcome === 'promesse_paiement') row.promises += 1
      map.set(name, row)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filtered])

  const handleExportExcel = async () => {
    if (filtered.length === 0) {
      toast.info('Aucune relance à exporter')
      return
    }
    try {
      await exportRowsToExcel({
        fileName: 'journal_relances',
        sheetName: 'Relances',
        title: 'Journal des relances',
        period: { from, to },
        extraMeta: [`${stats.calls} appel(s)`, `joignabilité ${stats.reachRate} %`],
        header: ['Date', 'Heure', 'Membre / Groupe', 'Matricule', 'Produit', 'Canal', 'Issue', 'Promesse', 'Montant dû (FCFA)', 'Par', 'Commentaire'],
        colWidths: [12, 8, 26, 14, 18, 12, 20, 12, 18, 22, 60],
        rows: filtered.map((l) => [
          format(l.createdAt, 'dd/MM/yyyy', { locale: fr }),
          format(l.createdAt, 'HH:mm', { locale: fr }),
          l.name,
          l.matricule ?? '',
          l.product,
          CONTACT_CHANNEL_LABELS[l.channel],
          CALL_OUTCOME_LABELS[l.outcome],
          l.promiseToPayAt ? format(l.promiseToPayAt, 'dd/MM/yyyy', { locale: fr }) : '',
          // Nombre et non texte : Excel doit pouvoir totaliser la colonne.
          l.totalOverdue,
          l.adminName,
          l.summary,
        ]),
      })
      toast.success('Export Excel généré')
    } catch (error) {
      console.error('Erreur export Excel:', error)
      toast.error("Erreur lors de l'export Excel")
    }
  }

  const handleExportPdf = async () => {
    if (filtered.length === 0) {
      toast.info('Aucune relance à exporter')
      return
    }
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape')

      doc.setFontSize(16)
      doc.text('Journal des relances', 14, 14)
      doc.setFontSize(10)
      doc.text(
        `Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })} • ${filtered.length} contact(s) • ${stats.calls} appel(s) • joignabilité ${stats.reachRate}%`,
        14,
        20,
      )

      autoTable(doc, {
        head: [['Date', 'Membre', 'Produit', 'Canal', 'Issue', 'Par', 'Commentaire']],
        body: filtered.map((l) => [
          format(l.createdAt, 'dd/MM/yy HH:mm', { locale: fr }),
          l.name,
          l.product,
          CONTACT_CHANNEL_LABELS[l.channel],
          CALL_OUTCOME_LABELS[l.outcome],
          l.adminName,
          l.summary,
        ]),
        startY: 26,
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 6: { cellWidth: 80 } },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      doc.save('journal_relances.pdf')
      toast.success('Export PDF généré')
    } catch (error) {
      console.error('Erreur export PDF:', error)
      toast.error("Erreur lors de l'export PDF")
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      <PageHero
        icon={PhoneCall}
        title="Journal des relances"
        subtitle="Tous les appels et messages adressés aux retardataires"
        rightSlot={(
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-9 border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="h-9 border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        )}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatsCard title="Contacts" value={stats.total} variant="kara-blue" icon={CalendarClock} />
        <StatsCard title="Appels" value={stats.calls} variant="kara-gold" icon={PhoneCall} />
        <StatsCard title="Joignabilité" value={`${stats.reachRate} %`} variant="success" icon={TrendingUp} />
        <StatsCard
          title="Promesses non tenues"
          value={stats.brokenPromises}
          variant="error"
          icon={AlertTriangle}
        />
      </div>

      {stats.brokenPromises > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm">
          <span className="text-gray-700">
            {stats.brokenPromises} promesse{stats.brokenPromises > 1 ? 's' : ''} de paiement dépassée
            {stats.brokenPromises > 1 ? 's' : ''} sans règlement enregistré —{' '}
          </span>
          <span className="font-bold text-red-700 tabular-nums">
            {stats.brokenAmount.toLocaleString('fr-FR')} FCFA
          </span>
          <span className="text-gray-600"> à relancer en priorité.</span>
        </div>
      )}

      {/* Filtres */}
      <Card className="border border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher (membre, matricule, commentaire, administrateur)..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="h-10 rounded-xl border-slate-200 bg-white pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={outcomeFilter} onValueChange={(v: any) => { setOutcomeFilter(v); setPage(1) }}>
                <SelectTrigger className="h-10 w-[170px] rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Issue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les issues</SelectItem>
                  {(Object.keys(CALL_OUTCOME_LABELS) as CallOutcome[]).map((o) => (
                    <SelectItem key={o} value={o}>{CALL_OUTCOME_LABELS[o]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={channelFilter} onValueChange={(v: any) => { setChannelFilter(v); setPage(1) }}>
                <SelectTrigger className="h-10 w-[140px] rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les canaux</SelectItem>
                  {(Object.keys(CONTACT_CHANNEL_LABELS) as ContactChannel[]).map((c) => (
                    <SelectItem key={c} value={c}>{CONTACT_CHANNEL_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={productFilter} onValueChange={(v: any) => { setProductFilter(v); setPage(1) }}>
                <SelectTrigger className="h-10 w-[170px] rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Produit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les produits</SelectItem>
                  {productsPresent.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1) }}
                className="h-10 w-[150px] rounded-xl border-slate-200 bg-white"
                aria-label="Du"
              />
              <Input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1) }}
                className="h-10 w-[150px] rounded-xl border-slate-200 bg-white"
                aria-label="Au"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résumé par intervenant */}
      {byCaller.length > 0 && (
        <Card className="border border-slate-200/80 bg-white shadow-sm">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Activité par administrateur
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {byCaller.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-gray-900">{c.name}</span>
                  <span className="text-xs text-gray-600 tabular-nums">
                    {c.total} contact{c.total > 1 ? 's' : ''} • {c.reached} joint{c.reached > 1 ? 's' : ''} •{' '}
                    {c.promises} promesse{c.promises > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableau */}
      <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Date &amp; heure</TableHead>
                  <TableHead>Membre / Groupe</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead>Commentaire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  [...Array(6)].map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))}

                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                      Aucune relance enregistrée pour ces critères.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && paginated.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50 align-top">
                    <TableCell className="whitespace-nowrap text-sm text-gray-600">
                      {format(log.createdAt, 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {log.name}
                      {log.matricule && (
                        <span className="ml-1 font-mono text-[11px] text-gray-400">{log.matricule}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{log.product}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {CONTACT_CHANNEL_LABELS[log.channel]}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${CALL_OUTCOME_COLORS[log.outcome]}`}>
                        {CALL_OUTCOME_LABELS[log.outcome]}
                      </span>
                      {log.promiseToPayAt && (
                        <span className="mt-1 block text-[11px] text-amber-700">
                          pour le {format(log.promiseToPayAt, 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">{log.adminName}</TableCell>
                    <TableCell className="max-w-md text-sm text-gray-700">{log.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!isLoading && filtered.length > PAGE_SIZE && (
            <div className="border-t border-gray-100 p-3">
              <ListPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                summary={<>{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</>}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
