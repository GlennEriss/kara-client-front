'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdmin, useSupportHistory } from '@/hooks/caisse-imprevue'
import { SupportCI } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  HandHeart,
  History,
  Hourglass,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import ValidateSupportDocumentModal from './ValidateSupportDocumentModal'

function formatAmount(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA'
}

function safeFormat(date: Date | undefined | null, fmt: string): string {
  if (!date) return '—'
  try { return format(date, fmt, { locale: fr }) } catch { return '—' }
}

const STATUS_CONFIG = {
  PENDING_ADMIN: {
    label: 'En attente de validation',
    icon: Hourglass,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    badgeVariant: 'warning' as const,
    borderClass: 'border-amber-200',
  },
  ACTIVE: {
    label: 'En cours de remboursement',
    icon: Clock,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    badgeVariant: 'info' as const,
    borderClass: 'border-blue-200',
  },
  REPAID: {
    label: 'Soldée',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    badgeVariant: 'success' as const,
    borderClass: 'border-emerald-200',
  },
  REJECTED: {
    label: 'Refusée',
    icon: XCircle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    badgeVariant: 'destructive' as const,
    borderClass: 'border-red-200',
  },
}

interface Props {
  isOpen: boolean
  onClose: () => void
  contractId: string
}

export default function SupportHistoryCIModal({ isOpen, onClose, contractId }: Props) {
  const { data: supports = [], isLoading, isError } = useSupportHistory(contractId)
  const [validateSupport, setValidateSupport] = useState<SupportCI | null>(null)

  const handleExportExcel = () => {
    if (supports.length === 0) { toast.error('Aucun support à exporter'); return }
    try {
      const exportData = supports.flatMap((support) => {
        const statusLabel = STATUS_CONFIG[support.status]?.label ?? support.status
        const mainRow = {
          'Type': 'Support',
          'Statut': statusLabel,
          'Date demande': safeFormat(support.requestedAt, 'dd/MM/yyyy'),
          'Date validation': safeFormat(support.approvedAt, 'dd/MM/yyyy'),
          'Montant': support.amount,
          'Montant remboursé': support.amountRepaid,
          'Montant restant': support.amountRemaining,
          'Motif refus': support.rejectionReason ?? '',
        }
        const repaymentRows = support.repayments.map((r) => ({
          'Type': 'Remboursement',
          'Statut': '',
          'Date demande': safeFormat(new Date(r.date), 'dd/MM/yyyy'),
          'Date validation': '',
          'Montant': r.amount,
          'Montant remboursé': '',
          'Montant restant': '',
          'Motif refus': '',
        }))
        return [mainRow, ...repaymentRows]
      })
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Historique Aides')
      ws['!cols'] = [{ wch: 14 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 30 }]
      XLSX.writeFile(wb, `Historique_Aides_${contractId}_${format(new Date(), 'ddMMyyyy')}.xlsx`)
      toast.success('Export Excel réussi')
    } catch {
      toast.error('Erreur lors de l\'export Excel')
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
          {/* Header */}
          <DialogHeader className="shrink-0 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-[#234D65] p-2 shrink-0">
                  <History className="h-4 w-4 text-white" />
                </div>
                <DialogTitle className="text-base">Historique des aides financières</DialogTitle>
              </div>
              {supports.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="shrink-0 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Erreur lors du chargement de l'historique</AlertDescription>
              </Alert>
            ) : supports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="rounded-xl bg-gray-100 p-4">
                  <HandHeart className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Aucune aide enregistrée pour ce contrat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {supports.map((support) => (
                  <SupportCard
                    key={support.id}
                    support={support}
                    onValidate={() => setValidateSupport(support)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-100 px-6 py-4 flex justify-end">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {validateSupport && (
        <ValidateSupportDocumentModal
          open={!!validateSupport}
          onClose={() => setValidateSupport(null)}
          support={validateSupport}
          contractId={contractId}
        />
      )}
    </>
  )
}

function SupportCard({
  support,
  onValidate,
}: {
  support: SupportCI
  onValidate: () => void
}) {
  const { data: admin, isLoading: loadingAdmin } = useAdmin(support.approvedBy)
  const config = STATUS_CONFIG[support.status] ?? STATUS_CONFIG.ACTIVE
  const Icon = config.icon

  const percent =
    support.amount > 0
      ? Math.min(100, Math.round((support.amountRepaid / support.amount) * 100))
      : 0

  const isPending = support.status === 'PENDING_ADMIN'
  const isRejected = support.status === 'REJECTED'
  const isActive = support.status === 'ACTIVE'
  const isRepaid = support.status === 'REPAID'

  return (
    <div className={`rounded-xl border overflow-hidden ${config.borderClass}`}>
      {/* En-tête de la carte */}
      <div className="px-4 py-3 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`rounded-lg p-1.5 shrink-0 ${config.iconBg}`}>
            <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
          </div>
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {formatAmount(support.amount)}
          </span>
          <Badge variant={config.badgeVariant as any} className="text-[10px]">
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {support.documentUrl && (
            <a
              href={support.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#234D65]/20 bg-white px-2.5 py-1 text-xs font-medium text-[#234D65] hover:bg-[#234D65]/5 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Document
            </a>
          )}
          {isPending && (
            <Button
              size="sm"
              onClick={onValidate}
              className="h-7 px-2.5 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Traiter
            </Button>
          )}
        </div>
      </div>

      {/* Corps */}
      <div className="px-4 py-3 bg-white space-y-3">
        {/* Dates & meta */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Demandée le
            </span>
            <span className="text-xs text-gray-700">
              {safeFormat(support.requestedAt, 'd MMM yyyy')}
            </span>
          </div>
          {(isActive || isRepaid) && support.approvedAt && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Validée le
              </span>
              <span className="text-xs text-gray-700">
                {safeFormat(support.approvedAt, 'd MMM yyyy')}
              </span>
            </div>
          )}
          {isRejected && support.rejectedAt && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Refusée le
              </span>
              <span className="text-xs text-gray-700">
                {safeFormat(support.rejectedAt, 'd MMM yyyy')}
              </span>
            </div>
          )}
        </div>

        {support.motif && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Motif
            </span>
            <span className="text-xs text-gray-600 italic">« {support.motif} »</span>
          </div>
        )}

        {/* Refus */}
        {isRejected && support.rejectionReason && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-800">Motif du refus</p>
              <p className="text-xs text-red-700">{support.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* En attente */}
        {isPending && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 flex items-center gap-2">
            <Hourglass className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">
              Document soumis par le membre — en attente de votre validation.
            </p>
          </div>
        )}

        {/* Approuvé par */}
        {(isActive || isRepaid) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>
              Validé par :{' '}
              {loadingAdmin ? (
                <Skeleton className="inline-block h-3 w-20 align-middle" />
              ) : admin ? (
                <strong className="text-gray-700">{admin.firstName} {admin.lastName}</strong>
              ) : (
                <span>{support.approvedBy ?? '—'}</span>
              )}
            </span>
          </div>
        )}

        {/* Barre de remboursement */}
        {(isActive || isRepaid) && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              <span>Remboursement</span>
              <span className="text-[#234D65]">{percent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${isRepaid ? 'bg-emerald-500' : 'bg-[#234D65]'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>Remboursé : {formatAmount(support.amountRepaid)}</span>
              <span>Restant : {formatAmount(support.amountRemaining)}</span>
            </div>
          </div>
        )}

        {/* Déductions */}
        {support.deductions.length > 0 && (isActive || isRepaid) && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800">
            <p className="font-semibold mb-1">Déductions appliquées :</p>
            <ul className="space-y-0.5">
              {support.deductions.map((d) => (
                <li key={d.monthIndex}>Mois {d.monthIndex + 1} : {formatAmount(d.amount)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Remboursements */}
        {support.repayments.length > 0 && (
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-3 py-2 bg-gray-50/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Remboursements ({support.repayments.length})
              </p>
            </div>
            <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto">
              {support.repayments.map((r) => (
                <div key={r.id} className="px-3 py-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">
                    {safeFormat(new Date(r.date), 'd MMM yyyy')}
                    {r.time && ` · ${r.time}`}
                    {' · '}M{r.monthIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                    +{formatAmount(r.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isRepaid && support.repaidAt && (
          <p className="text-xs text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Soldée le {safeFormat(support.repaidAt, 'd MMMM yyyy')}
          </p>
        )}
      </div>
    </div>
  )
}
