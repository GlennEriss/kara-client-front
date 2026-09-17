"use client"

/** Historique des contacts d'un retardataire, du plus récent au plus ancien. */

import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCallLogsForPerson } from '@/hooks/useCallLogs'
import {
  CALL_OUTCOME_COLORS,
  CALL_OUTCOME_LABELS,
  CONTACT_CHANNEL_LABELS,
} from '@/services/call-logs/callLog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarClock, MessageCircle, Phone, Users } from 'lucide-react'

interface CallHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personKey?: string
  name?: string
}

export function CallHistorySheet({ open, onOpenChange, personKey, name }: CallHistorySheetProps) {
  const { history, isLoading } = useCallLogsForPerson(open ? personKey : undefined)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Historique des relances</SheetTitle>
          <SheetDescription>
            {name} — {history.length} contact{history.length !== 1 ? 's' : ''} enregistré
            {history.length !== 1 ? 's' : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-6">
          {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}

          {!isLoading && history.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-500">
              Aucun contact enregistré pour l&apos;instant.
            </p>
          )}

          {!isLoading &&
            history.map((log) => (
              <div key={log.id} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    {log.channel === 'whatsapp' ? (
                      <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                    ) : (
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                    )}
                    {CONTACT_CHANNEL_LABELS[log.channel]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(log.createdAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${CALL_OUTCOME_COLORS[log.outcome]}`}
                >
                  {CALL_OUTCOME_LABELS[log.outcome]}
                </span>

                {log.summary && <p className="text-sm text-gray-800">{log.summary}</p>}

                {log.promiseToPayAt && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-700">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    Promesse pour le {format(log.promiseToPayAt, 'dd/MM/yyyy', { locale: fr })}
                    {log.promiseAmount ? ` — ${log.promiseAmount.toLocaleString('fr-FR')} FCFA` : ''}
                  </p>
                )}

                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {log.adminName}
                  {' • '}
                  {log.totalOverdue.toLocaleString('fr-FR')} FCFA dus à ce moment-là
                </p>
              </div>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
