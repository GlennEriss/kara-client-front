'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useCallPlans, useCompleteCallPlan, useDeleteCallPlan } from '@/hooks/useCallPlans'
import { useMyAccess } from '@/hooks/useMyAccess'
import type { CallPlanItem } from '@/services/call-logs/callPlan'
import { addDays, addWeeks, format, isAfter, startOfDay, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Eye, ListChecks, Loader2, PhoneCall, Trash2, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { LogCallModal, type CallTarget } from './LogCallModal'
import { useShownAmount } from './useShownAmount'

const dateKey = (date: Date) => format(date, 'yyyy-MM-dd')

const callTargetOf = (item: CallPlanItem): CallTarget => ({
  personKey: item.personKey,
  memberId: item.memberId,
  groupId: item.groupId,
  matricule: item.matricule,
  name: item.name,
  isGroup: item.isGroup,
  product: item.product,
  totalOverdue: item.totalOverdue,
  overdueCount: item.overdueCount,
  maxDaysOverdue: item.maxDaysOverdue,
})

export function WeeklyCallPlan() {
  const shownAmount = useShownAmount()
  const { user } = useAuth()
  const { isSuperAdmin } = useMyAccess()
  const currentWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = useMemo(() => addWeeks(currentWeekStart, weekOffset), [currentWeekStart, weekOffset])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const todayKey = dateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [viewMode, setViewMode] = useState<'schedule' | 'batches'>('schedule')
  const [activeCall, setActiveCall] = useState<CallPlanItem | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const { data: plans = [], isLoading } = useCallPlans(dateKey(weekDays[0]), dateKey(weekDays[6]))
  const completePlan = useCompleteCallPlan()
  const deletePlan = useDeleteCallPlan()

  const currentEmail = user?.email?.trim().toLowerCase()
  const visiblePlans = useMemo(
    () => plans.filter((plan) => {
      if (isSuperAdmin) return true
      if (!plan.assignee) return true
      return !!currentEmail && plan.assignee.email.trim().toLowerCase() === currentEmail
    }),
    [plans, isSuperAdmin, currentEmail],
  )

  useEffect(() => {
    setSelectedDate(weekOffset === 0 ? todayKey : dateKey(weekDays[0]))
  }, [weekOffset, todayKey, weekDays])

  const batches = useMemo(() => {
    const grouped = new Map<string, CallPlanItem[]>()
    for (const plan of visiblePlans) {
      const existing = grouped.get(plan.batchId) ?? []
      existing.push(plan)
      grouped.set(plan.batchId, existing)
    }
    return Array.from(grouped, ([id, items]) => ({
      id,
      items: items.sort((left, right) => left.name.localeCompare(right.name, 'fr')),
      scheduledDate: items[0]?.scheduledDate ?? '',
      assignee: items[0]?.assignee,
      createdByName: items[0]?.createdByName ?? '—',
      createdAt: items[0]?.createdAt,
      products: Array.from(new Set(items.map((item) => item.product))),
      completed: items.filter((item) => item.status === 'completed').length,
    })).sort((left, right) => right.scheduledDate.localeCompare(left.scheduledDate))
  }, [visiblePlans])
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId)

  const selectedPlans = visiblePlans.filter((plan) => plan.scheduledDate === selectedDate)
  const plannedCount = selectedPlans.filter((plan) => plan.status === 'planned').length
  const completedCount = selectedPlans.length - plannedCount
  const selectedDay = weekDays.find((day) => dateKey(day) === selectedDate) ?? new Date()
  const selectedIsFuture = isAfter(startOfDay(selectedDay), startOfDay(new Date()))

  const handleCall = (plan: CallPlanItem) => {
    if (!plan.phone) {
      toast.error('Aucun numéro de téléphone enregistré.')
      return
    }
    setActiveCall(plan)
    window.location.href = `tel:${plan.phone.replace(/[^+\d]/g, '')}`
  }

  return (
    <Card className="rounded-2xl border border-blue-100 bg-white shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-[#234D65]" />
            <div>
              <h2 className="font-semibold text-gray-900">Appels planifiés cette semaine</h2>
              <p className="text-xs text-gray-500">
                {isSuperAdmin ? 'Tous les lots planifiés' : 'Vos lots et les appels non attribués'}
              </p>
            </div>
          </div>
          {!isLoading && viewMode === 'schedule' && (
            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-700">{plannedCount} à faire</span>
              <span className="rounded-full bg-green-100 px-2.5 py-1 font-semibold text-green-700">{completedCount} terminé{completedCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-y border-gray-100 py-3 sm:flex-row sm:items-center sm:justify-between">
          {isSuperAdmin ? (
            <div className="flex rounded-lg bg-gray-100 p-1">
              <Button
                size="sm"
                variant={viewMode === 'schedule' ? 'default' : 'ghost'}
                onClick={() => setViewMode('schedule')}
              >
                <CalendarClock className="h-4 w-4" /> Planning
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'batches' ? 'default' : 'ghost'}
                onClick={() => setViewMode('batches')}
              >
                <ListChecks className="h-4 w-4" /> Suivi des lots
              </Button>
            </div>
          ) : <span />}
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button size="icon-sm" variant="outline" onClick={() => setWeekOffset((value) => value - 1)} title="Semaine précédente">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-48 text-center text-sm font-medium text-gray-700">
              {format(weekDays[0], 'dd MMM', { locale: fr })} – {format(weekDays[6], 'dd MMM yyyy', { locale: fr })}
            </span>
            <Button size="icon-sm" variant="outline" onClick={() => setWeekOffset((value) => value + 1)} title="Semaine suivante">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {viewMode === 'schedule' && (
          <>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {weekDays.map((day) => {
            const key = dateKey(day)
            const count = visiblePlans.filter((plan) => plan.scheduledDate === key && plan.status === 'planned').length
            const active = key === selectedDate
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(key)}
                className={`rounded-lg border px-2 py-2 text-center transition-colors ${
                  active
                    ? 'border-[#234D65] bg-[#234D65] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="block text-[11px] font-medium capitalize">{format(day, 'EEE', { locale: fr })}</span>
                <span className="block text-sm font-bold">{format(day, 'dd/MM')}</span>
                {count > 0 && (
                  <span className={`mt-1 inline-flex min-w-5 justify-center rounded-full px-1.5 text-[10px] font-bold ${active ? 'bg-white text-[#234D65]' : 'bg-blue-100 text-blue-700'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Membre / Groupe</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Attribué à</TableHead>
                <TableHead>Situation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && selectedPlans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-gray-500">
                    Aucun appel planifié pour ce jour.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && selectedPlans.map((plan) => (
                <TableRow key={plan.id} className={plan.status === 'completed' ? 'bg-green-50/40' : undefined}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{plan.name}</div>
                    <div className="text-xs text-gray-500">{plan.matricule || plan.phone || '—'}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">{plan.product}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm text-gray-700">
                      <UserRound className="h-3.5 w-3.5 text-gray-400" />
                      {plan.assignee?.name || 'Non attribué'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900">{shownAmount(plan.totalOverdue)} FCFA</div>
                    <div className="text-xs text-gray-500">{plan.overdueCount} retard{plan.overdueCount > 1 ? 's' : ''} • {plan.maxDaysOverdue} j max</div>
                  </TableCell>
                  <TableCell>
                    {plan.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Terminé
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">À appeler</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {plan.status === 'planned' && (
                        <Button
                          size="sm"
                          onClick={() => handleCall(plan)}
                          disabled={!plan.phone || selectedIsFuture}
                          title={selectedIsFuture ? 'Cet appel est prévu pour un prochain jour' : plan.phone ? 'Appeler' : 'Aucun numéro'}
                        >
                          <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
                          Appeler
                        </Button>
                      )}
                      {isSuperAdmin && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={deletePlan.isPending}
                          onClick={() => {
                            if (window.confirm(`Retirer ${plan.name} du planning ?`)) deletePlan.mutate(plan.id)
                          }}
                          title="Retirer du planning"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          </>
        )}

        {viewMode === 'batches' && isSuperAdmin && (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Date prévue</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Attribué à</TableHead>
                  <TableHead>Créé par</TableHead>
                  <TableHead>Avancement</TableHead>
                  <TableHead className="text-right">Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                )}
                {!isLoading && batches.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-gray-500">Aucun lot planifié pour cette semaine.</TableCell></TableRow>
                )}
                {!isLoading && batches.map((batch) => {
                  const percent = batch.items.length > 0 ? Math.round((batch.completed / batch.items.length) * 100) : 0
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{format(new Date(`${batch.scheduledDate}T12:00:00`), 'EEEE dd/MM', { locale: fr })}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{batch.items.length} personne{batch.items.length > 1 ? 's' : ''}</div>
                        <div className="text-xs text-gray-500">{batch.products.join(', ')}</div>
                      </TableCell>
                      <TableCell>{batch.assignee?.name || 'Non attribué'}</TableCell>
                      <TableCell className="text-sm text-gray-600">{batch.createdByName}</TableCell>
                      <TableCell className="min-w-48">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700">{batch.completed}/{batch.items.length} terminé{batch.completed > 1 ? 's' : ''}</span>
                          <span className="text-gray-500">{percent}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${percent}%` }} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedBatchId(batch.id)}>
                          <Eye className="h-3.5 w-3.5" /> Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <LogCallModal
          open={!!activeCall}
          target={activeCall ? callTargetOf(activeCall) : null}
          channel="call"
          onRecorded={(callLogId) => {
            if (activeCall) completePlan.mutate({ id: activeCall.id, callLogId })
            setActiveCall(null)
          }}
          onCancel={() => setActiveCall(null)}
        />

        <Dialog open={!!selectedBatch} onOpenChange={(open) => !open && setSelectedBatchId(null)}>
          <DialogContent className="!max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détail du lot d&apos;appels</DialogTitle>
              <DialogDescription>
                {selectedBatch
                  ? `${format(new Date(`${selectedBatch.scheduledDate}T12:00:00`), 'EEEE dd MMMM yyyy', { locale: fr })} • ${selectedBatch.assignee?.name || 'Non attribué'} • ${selectedBatch.completed}/${selectedBatch.items.length} terminé${selectedBatch.completed > 1 ? 's' : ''}`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Membre / Groupe</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Traité par</TableHead>
                    <TableHead>Date de réalisation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBatch?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.matricule || item.phone || '—'}</div>
                      </TableCell>
                      <TableCell>{item.product}</TableCell>
                      <TableCell>
                        {item.status === 'completed'
                          ? <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Terminé</span>
                          : <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">À faire</span>}
                      </TableCell>
                      <TableCell>{item.completedByName || '—'}</TableCell>
                      <TableCell>{item.completedAt ? format(item.completedAt, 'dd/MM/yyyy à HH:mm', { locale: fr }) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
