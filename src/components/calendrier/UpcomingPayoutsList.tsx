"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUpcomingPayouts, type UpcomingPayout } from '@/hooks/useUpcomingPayouts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Building2, Calendar, Download, HandCoins, Phone, RefreshCw, User } from 'lucide-react'
import { toast } from 'sonner'

function fmtAmount(n: number): string {
  return n.toLocaleString('fr-FR').replace(/\s/g, ' ')
}

/** Badge d'urgence de la remise (négatif = en retard). */
function DueBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil < 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 tabular-nums">
        En retard de {Math.abs(daysUntil)} j
      </span>
    )
  }
  if (daysUntil === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        Aujourd&apos;hui
      </span>
    )
  }
  if (daysUntil === 1) {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
        Demain
      </span>
    )
  }
  if (daysUntil <= 7) {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 tabular-nums">
        Dans {daysUntil} j
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 tabular-nums">
      Dans {daysUntil} j
    </span>
  )
}

function kindLabel(payout: UpcomingPayout): string {
  if (payout.kind === 'EARLY') return 'Retrait anticipé'
  return payout.product === 'Placement' ? 'Placement à terme' : 'Contrat terminé'
}

function KindBadge({ payout }: { payout: UpcomingPayout }) {
  return payout.kind === 'EARLY' ? (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
      Retrait anticipé
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
      {kindLabel(payout)}
    </span>
  )
}

function referenceLabel(payout: UpcomingPayout): string {
  if (payout.kind === 'EARLY') return 'Date de la demande de retrait'
  return payout.product === 'Placement' ? 'Date de fin du placement' : 'Date de fin du contrat'
}

/**
 * Remises d'argent à venir (Caisse Spéciale + Caisse Imprévue + Placement) :
 * l'argent est dû 30 jours après le dernier versement (contrat entièrement
 * cotisé), la fin du placement, ou la demande de retrait anticipé.
 */
export function UpcomingPayoutsList() {
  const { data: payouts = [], isLoading, isError, refetch, isFetching } = useUpcomingPayouts()

  const overdue = payouts.filter((p) => p.daysUntil < 0)
  const thisWeek = payouts.filter((p) => p.daysUntil >= 0 && p.daysUntil <= 7)
  const totalAmount = payouts.reduce((sum, p) => sum + (p.amount || 0), 0)

  const handleExportExcel = async () => {
    if (payouts.length === 0) {
      toast.info('Aucune remise à exporter')
      return
    }
    try {
      const XLSX = await import('xlsx')
      const title = "Remises d'argent à venir — Caisse Spéciale, Caisse Imprévue & Placement"
      const meta = `Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}  •  ${payouts.length} remise(s)  •  Total : ${fmtAmount(totalAmount)} FCFA`
      const header = [
        'Matricule',
        'Membre / Groupe',
        'Téléphone',
        'Caisse',
        'Type',
        'Motif',
        'Montant (FCFA)',
        'Fait générateur',
        'Remise prévue le',
        'Jours restants',
      ]
      const rows = payouts.map((p) => [
        p.matricule || '—',
        p.name,
        p.phone || '',
        p.product,
        p.typeLabel,
        kindLabel(p),
        p.amount,
        format(p.referenceAt, 'dd/MM/yyyy', { locale: fr }),
        format(p.dueAt, 'dd/MM/yyyy', { locale: fr }),
        p.daysUntil,
      ])
      const aoa: (string | number)[][] = [[title], [meta], [], header, ...rows]
      const sheet = XLSX.utils.aoa_to_sheet(aoa)
      sheet['!cols'] = [
        { wch: 14 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
      ]
      sheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
      ]
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, 'Remises à venir')
      XLSX.writeFile(workbook, 'remises_a_venir.xlsx')
      toast.success('Export Excel généré')
    } catch (error) {
      console.error('Erreur export Excel:', error)
      toast.error("Erreur lors de l'export Excel")
    }
  }

  return (
    <div className="space-y-3">
      {/* En-tête */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-[#234D65]" />
          <h3 className="text-base font-bold text-gray-900">Remises d&apos;argent à venir</h3>
          {!isLoading && payouts.length > 0 && (
            <span className="rounded-full bg-[#234D65]/10 px-2 py-0.5 text-xs font-semibold text-[#234D65]">
              {payouts.length} remise{payouts.length !== 1 ? 's' : ''}
            </span>
          )}
          {!isLoading && overdue.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {overdue.length} en retard
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={payouts.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Synthèse */}
      {!isLoading && payouts.length > 0 && (
        <div className="rounded-xl border border-[#234D65]/15 bg-[#234D65]/5 p-3 text-sm">
          <span className="text-gray-600">Total à remettre : </span>
          <span className="font-bold text-[#234D65] tabular-nums">{fmtAmount(totalAmount)} FCFA</span>
          <span className="text-gray-500">
            {' '}
            • {thisWeek.length} sous 7 jours
            {overdue.length > 0 && ` • ${overdue.length} déjà en retard`}
          </span>
        </div>
      )}

      {/* Tableau */}
      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Membre / Groupe</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Caisse</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Fait générateur</TableHead>
                  <TableHead>Remise prévue</TableHead>
                  <TableHead className="text-right">Échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  [...Array(4)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}

                {!isLoading && isError && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-red-600">
                      Erreur lors du chargement des remises à venir.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && payouts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-gray-500">
                      Aucune remise d&apos;argent en attente.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  !isError &&
                  payouts.map((p) => (
                    <TableRow key={p.key} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs text-gray-500">{p.matricule || '—'}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 font-medium text-gray-900">
                          {p.isGroup ? (
                            <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          )}
                          {p.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.phone ? (
                          <span className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            {p.phone}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">
                          {p.product}
                          <span className="text-gray-400"> · {p.typeLabel}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <KindBadge payout={p} />
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-900 tabular-nums">
                        {fmtAmount(p.amount)} FCFA
                      </TableCell>
                      <TableCell>
                        <span
                          className="flex items-center gap-1.5 text-sm text-gray-700"
                          title={referenceLabel(p)}
                        >
                          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {format(p.referenceAt, 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {format(p.dueAt, 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DueBadge daysUntil={p.daysUntil} />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
