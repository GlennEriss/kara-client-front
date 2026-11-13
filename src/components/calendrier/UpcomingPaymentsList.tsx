'use client'

import Link from 'next/link'
import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BellRing, Building2, Calendar, Download, ExternalLink, MessageCircle, Phone, RefreshCw, User } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { generateWhatsAppUrl, resolveWhatsappNumber } from '@/domains/memberships/utils/whatsappUrl'
import { useRenderMessageTemplate } from '@/domains/messaging/hooks/useMessageTemplates'
import { useRecordCall } from '@/hooks/useCallLogs'
import {
  DEFAULT_UPCOMING_PAYMENT_HORIZON,
  UPCOMING_PAYMENT_HORIZONS,
  useUpcomingPayments,
  type UpcomingPayment,
} from '@/hooks/useUpcomingPayments'
import type { OverdueProduct } from '@/hooks/useOverduePayments'
import { useShownAmount } from './useShownAmount'
import { CalendarContractLink } from './CalendarContractLink'
import { CalendarTablePagination, useCalendarPagination } from './CalendarTablePagination'

interface UpcomingPaymentsListProps {
  product: OverdueProduct
}

const fmtAmount = (amount: number) => amount.toLocaleString('fr-FR').replace(/\s/g, ' ')

function personKeyOf(item: UpcomingPayment): string {
  if (item.groupId) return `gid:${item.groupId}`
  if (item.memberId) return `uid:${item.memberId}`
  if (item.matricule?.trim()) return `mat:${item.matricule.trim()}`
  return `${item.isGroup ? 'g' : 'm'}:${item.name.trim().toLowerCase()}`
}

function dueLabel(daysUntil: number): string {
  if (daysUntil === 0) return "aujourd'hui"
  if (daysUntil === 1) return 'demain'
  return `dans ${daysUntil} jours`
}

function DueBadge({ daysUntil }: { daysUntil: number }) {
  const urgent = daysUntil <= 2
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
      urgent ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
    }`}>
      {daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? 'Demain' : `Dans ${daysUntil} j`}
    </span>
  )
}

function messageFor(item: UpcomingPayment): { key: string; variables: Record<string, string | number> } {
  const variables = {
    nom: item.name || 'cher membre',
    produit: item.product,
    typeVersement: item.typeLabel,
    montant: fmtAmount(item.amount),
    dateEcheance: format(item.dueAt, 'dd/MM/yyyy', { locale: fr }),
    delai: dueLabel(item.daysUntil),
  }
  return {
    key: item.product === 'Placement' ? 'placementUpcomingNotice' : 'paymentUpcomingReminder',
    variables,
  }
}

export function UpcomingPaymentsList({ product }: UpcomingPaymentsListProps) {
  const shownAmount = useShownAmount()
  const [horizonDays, setHorizonDays] = useState(DEFAULT_UPCOMING_PAYMENT_HORIZON)
  const { data: items = [], isLoading, isError, isFetching, refetch } = useUpcomingPayments(product, horizonDays)
  const pagination = useCalendarPagination(items, `${product}:${horizonDays}`)
  const renderMessage = useRenderMessageTemplate()
  const { record } = useRecordCall()
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const imminentCount = items.filter((item) => item.daysUntil <= 7).length

  const handleSendWhatsApp = (item: UpcomingPayment) => {
    const whatsapp = resolveWhatsappNumber(item.whatsappNumber, [item.phone])
    if (!whatsapp) {
      toast.error('Aucun numéro de téléphone enregistré.')
      return
    }
    try {
      const { key, variables } = messageFor(item)
      window.open(generateWhatsAppUrl(whatsapp, renderMessage(key, variables)), '_blank', 'noopener,noreferrer')
      void record({
        personKey: personKeyOf(item),
        memberId: item.memberId,
        groupId: item.groupId,
        matricule: item.matricule,
        name: item.name,
        isGroup: item.isGroup,
        product: item.product,
        channel: 'whatsapp',
        outcome: 'message_envoye',
        summary: `Préavis envoyé pour l'échéance du ${format(item.dueAt, 'dd/MM/yyyy')}.`,
        totalOverdue: 0,
        overdueCount: 0,
        maxDaysOverdue: 0,
      }).catch((error) => console.error('[callLog] trace du préavis WhatsApp impossible:', error))
    } catch {
      toast.error('Numéro de téléphone invalide.')
    }
  }

  const handleExportExcel = async () => {
    if (items.length === 0) return
    try {
      const XLSX = await import('xlsx')
      const rows = items.map((item) => ({
        Matricule: item.matricule || '—',
        'Membre / Groupe': item.name,
        Téléphone: item.phone || '',
        Produit: item.product,
        Type: item.typeLabel,
        'Montant (FCFA)': item.amount,
        Échéance: format(item.dueAt, 'dd/MM/yyyy', { locale: fr }),
        'Jours restants': item.daysUntil,
      }))
      const sheet = XLSX.utils.json_to_sheet(rows)
      sheet['!cols'] = [
        { wch: 14 }, { wch: 26 }, { wch: 17 }, { wch: 18 },
        { wch: 18 }, { wch: 17 }, { wch: 13 }, { wch: 14 },
      ]
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, 'Versements à venir')
      XLSX.writeFile(workbook, `versements_a_venir_${product.toLowerCase().replace(/\s+/g, '_')}.xlsx`)
      toast.success('Export Excel généré')
    } catch (error) {
      console.error('[upcoming] export impossible:', error)
      toast.error("L'export Excel a échoué.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <BellRing className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-semibold text-gray-900">Versements à venir</h3>
          {!isLoading && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {items.length} échéance{items.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(horizonDays)} onValueChange={(value) => setHorizonDays(Number(value))}>
            <SelectTrigger size="sm" className="w-[155px]" aria-label="Horizon des versements à venir">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UPCOMING_PAYMENT_HORIZONS.map((days) => (
                <SelectItem key={days} value={String(days)}>Prochains {days} jours</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <PermissionGate permission="calendar.export">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={items.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </PermissionGate>
        </div>
      </div>

      {!isLoading && items.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm">
          <span className="text-gray-600">Prévision : </span>
          <span className="font-bold text-amber-800 tabular-nums">{shownAmount(totalAmount)} FCFA</span>
          <span className="text-gray-500"> • {imminentCount} échéance{imminentCount !== 1 ? 's' : ''} sous 7 jours</span>
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="min-w-0">
            <Table topScroll floatingScroll>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Membre / Groupe</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant prévu</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Délai</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(4)].map((_, index) => (
                  <TableRow key={index}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && isError && (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-red-600">Erreur lors du chargement des versements à venir.</TableCell></TableRow>
                )}
                {!isLoading && !isError && items.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-gray-500">Aucun versement prévu dans les {horizonDays} prochains jours.</TableCell></TableRow>
                )}
                {!isLoading && !isError && pagination.items.map((item) => {
                  const canMessage = !!resolveWhatsappNumber(item.whatsappNumber, [item.phone])
                  return (
                    <TableRow key={item.key} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs text-gray-500">{item.matricule || '—'}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 font-medium text-gray-900">
                          {item.isGroup ? <Building2 className="h-3.5 w-3.5 text-gray-400" /> : <User className="h-3.5 w-3.5 text-gray-400" />}
                          {item.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.phone ? <span className="flex items-center gap-1.5 text-sm"><Phone className="h-3.5 w-3.5 text-gray-400" />{item.phone}</span> : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">{item.typeLabel}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{shownAmount(item.amount)} FCFA</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-sm"><Calendar className="h-3.5 w-3.5 text-gray-400" />{format(item.dueAt, 'dd/MM/yyyy', { locale: fr })}</span>
                      </TableCell>
                      <TableCell><DueBadge daysUntil={item.daysUntil} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <CalendarContractLink product={item.product} contractId={item.contractId} className="h-8 whitespace-nowrap" />
                          <Button
                            size="sm"
                            onClick={() => handleSendWhatsApp(item)}
                            disabled={!canMessage}
                            title={canMessage ? 'Prévenir sur WhatsApp' : 'Aucun numéro de téléphone'}
                            className="h-8 bg-[#25D366] text-white hover:bg-[#1ebe5b]"
                          >
                            <MessageCircle className="h-3.5 w-3.5 sm:mr-1.5" />
                            <span className="hidden sm:inline">Prévenir</span>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-8">
                            <Link href={item.paymentHref} scroll={false}>
                              <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
                              <span className="hidden sm:inline">Échéance</span>
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {!isLoading && !isError && <CalendarTablePagination pagination={pagination} />}
        </CardContent>
      </Card>
    </div>
  )
}
