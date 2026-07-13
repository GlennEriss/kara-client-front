'use client'

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
import { useAuditLogs } from '@/hooks/useAuditLog'
import { AUDIT_ACTION_LABELS, type AuditAction, type AuditLog } from '@/services/audit/auditLog'
import { PERMISSION_MODULES } from '@/constantes/permissions'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Activity, CalendarClock, RefreshCw, ScrollText, Search, Trash2, Users } from 'lucide-react'

const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_MODULES.map((m) => [m.key, m.label]),
)

const ACTION_BADGE: Record<AuditAction, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  validate: 'bg-teal-100 text-teal-700',
  reject: 'bg-orange-100 text-orange-700',
  payment: 'bg-amber-100 text-amber-700',
  export: 'bg-indigo-100 text-indigo-700',
  login: 'bg-slate-100 text-slate-700',
  other: 'bg-gray-100 text-gray-600',
}

const PAGE_SIZE = 15

export default function AuditLogPage() {
  const { data: logs = [], isLoading, isFetching, refetch } = useAuditLogs(500)

  // État initialisé depuis l'URL : le retour navigateur retrouve la liste au même endroit.
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [actionFilter, setActionFilter] = useState<'all' | AuditAction>(
    (searchParams.get('action') as AuditAction) || 'all',
  )
  const [moduleFilter, setModuleFilter] = useState<'all' | string>(searchParams.get('module') || 'all')
  const [from, setFrom] = useState(searchParams.get('du') || '')
  const [to, setTo] = useState(searchParams.get('au') || '')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  // Miroir URL (les valeurs par défaut restent absentes de l'URL).
  useListUrlSync({
    q: search || null,
    action: actionFilter !== 'all' ? actionFilter : null,
    module: moduleFilter !== 'all' ? moduleFilter : null,
    du: from || null,
    au: to || null,
    page: page > 1 ? page : null,
  })

  // Modules réellement présents dans les logs (pour le select).
  const modulesPresent = useMemo(() => {
    const set = new Set(logs.map((l) => l.module).filter(Boolean))
    return Array.from(set).sort()
  }, [logs])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null
    return logs.filter((l) => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false
      if (moduleFilter !== 'all' && l.module !== moduleFilter) return false
      const ts = l.createdAt.getTime()
      if (fromTs !== null && ts < fromTs) return false
      if (toTs !== null && ts > toTs) return false
      if (s) {
        const hay = `${l.adminName} ${l.description} ${l.targetId ?? ''} ${l.targetType ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [logs, search, actionFilter, moduleFilter, from, to])

  // Réinitialiser la page quand les filtres changent.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const stats = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todayCount = logs.filter((l) => l.createdAt >= startOfToday).length
    const admins = new Set(logs.map((l) => l.adminId)).size
    const deletions = logs.filter((l) => l.action === 'delete').length
    return { total: logs.length, todayCount, admins, deletions }
  }, [logs])

  const moduleLabel = (key: string) => MODULE_LABELS[key] || key || '—'

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      <PageHero
        icon={ScrollText}
        title="Journalisation"
        subtitle="Historique des actions effectuées par les administrateurs"
        rightSlot={(
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
        )}
      />

      {/* Statistiques compactes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatsCard title="Entrées" value={stats.total} variant="kara-blue" icon={Activity} />
        <StatsCard title="Aujourd'hui" value={stats.todayCount} variant="success" icon={CalendarClock} />
        <StatsCard title="Administrateurs" value={stats.admins} variant="kara-gold" icon={Users} />
        <StatsCard title="Suppressions" value={stats.deletions} variant="error" icon={Trash2} />
      </div>

      {/* Filtres */}
      <Card className="border border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher (admin, description, cible)..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="h-10 rounded-xl border-slate-200 bg-white pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={actionFilter} onValueChange={(v: any) => { setActionFilter(v); setPage(1) }}>
                <SelectTrigger className="h-10 w-[150px] rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
                    <SelectItem key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={moduleFilter} onValueChange={(v: any) => { setModuleFilter(v); setPage(1) }}>
                <SelectTrigger className="h-10 w-[160px] rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les modules</SelectItem>
                  {modulesPresent.map((m) => (
                    <SelectItem key={m} value={m}>{moduleLabel(m)}</SelectItem>
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

      {/* Tableau */}
      <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Date & heure</TableHead>
                  <TableHead>Administrateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  [...Array(6)].map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))}

                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                      Aucune action journalisée pour ces critères.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && paginated.map((log: AuditLog) => (
                  <TableRow key={log.id} className="hover:bg-gray-50 align-top">
                    <TableCell className="whitespace-nowrap text-sm text-gray-600">
                      {format(log.createdAt, 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">{log.adminName}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_BADGE[log.action] || ACTION_BADGE.other}`}>
                        {AUDIT_ACTION_LABELS[log.action] || log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{moduleLabel(log.module)}</TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {log.description}
                      {log.targetId && (
                        <span className="ml-1 font-mono text-[11px] text-gray-400">#{log.targetId}</span>
                      )}
                    </TableCell>
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
                summary={<>{filtered.length} entrée{filtered.length !== 1 ? 's' : ''}</>}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
