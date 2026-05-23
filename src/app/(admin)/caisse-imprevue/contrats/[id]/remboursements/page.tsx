'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import routes from '@/constantes/routes'
import ValidateRefundCIModal from '@/components/caisse-imprevue/ValidateRefundCIModal'
import MarkAsPaidRefundCIModal from '@/components/caisse-imprevue/MarkAsPaidRefundCIModal'
import { useContractCI, useRefundsCI } from '@/hooks/caisse-imprevue'
import { useAuth } from '@/hooks/useAuth'
import { CONTRACT_CI_STATUS_LABELS } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle,
  Clock,
  FileText,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

function formatAmount(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA'
}

function toDateSafe(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof (value as any)?.toDate === 'function') return (value as any).toDate()
  const parsed = new Date(value as any)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value: unknown): string {
  const d = toDateSafe(value)
  if (!d) return '-'
  return format(d, 'd MMM yyyy', { locale: fr })
}

const REFUND_TYPE_LABELS: Record<string, string> = {
  EARLY: 'Retrait anticipé',
  FINAL: 'Remboursement final',
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  APPROVED: { label: 'Approuvé', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  PAID: { label: 'Payé', className: 'bg-green-100 text-green-700 border-green-200' },
  REJECTED: { label: 'Refusé', className: 'bg-red-100 text-red-700 border-red-200' },
  ARCHIVED: { label: 'Archivé', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export default function ContractCIRefundsPage() {
  const params = useParams() as { id: string }
  const contractId = params.id
  const router = useRouter()
  const { user } = useAuth()

  const { data: contract, isLoading: isLoadingContract, isError: isErrorContract, error: errorContract } = useContractCI(contractId)
  const { data: refunds = [], isLoading: isLoadingRefunds, isError: isErrorRefunds, error: errorRefunds } = useRefundsCI(contractId)

  const [validateRefund, setValidateRefund] = useState<any | null>(null)
  const [markPaidRefund, setMarkPaidRefund] = useState<any | null>(null)

  const stats = useMemo(() => {
    const total = refunds.reduce((sum, r) => sum + (Number(r.withdrawalAmount) || 0), 0)
    const pending = refunds.filter((r) => r.status === 'PENDING').length
    const approved = refunds.filter((r) => r.status === 'APPROVED').length
    const paid = refunds.filter((r) => r.status === 'PAID').length
    const rejected = refunds.filter((r) => r.status === 'REJECTED').length
    return { total, pending, approved, paid, rejected, count: refunds.length }
  }, [refunds])

  if (isLoadingContract || isLoadingRefunds) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (isErrorContract || isErrorRefunds) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-700 font-medium">
              {errorContract?.message || errorRefunds?.message || 'Erreur lors du chargement'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <Alert className="border-0 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-700 font-medium">Contrat introuvable</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back + status */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(routes.admin.caisseImprevueContractDetails(contractId))}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au contrat
          </Button>
          <Badge className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white text-lg px-4 py-2">
            {CONTRACT_CI_STATUS_LABELS[contract.status]}
          </Badge>
        </div>

        {/* Header card */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73]">
          <CardHeader>
            <CardTitle className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <RotateCcw className="h-7 w-7 lg:h-8 lg:w-8" />
              Demandes de Remboursement
            </CardTitle>
            <div className="space-y-1 text-blue-100">
              <p className="text-base lg:text-lg">
                {contract.memberFirstName} {contract.memberLastName} — Contrat #{contract.id.slice(-8).toUpperCase()}
              </p>
              <p className="text-sm">
                Forfait {contract.subscriptionCICode} — {contract.paymentFrequency === 'MONTHLY' ? 'Paiement Mensuel' : 'Paiement Quotidien'}
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Banknote className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total demandé</p>
                  <p className="font-bold text-sm text-blue-600">{formatAmount(stats.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">En attente</p>
                  <p className="font-bold text-lg text-orange-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payés</p>
                  <p className="font-bold text-lg text-green-600">{stats.paid}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Refusés</p>
                  <p className="font-bold text-lg text-red-600">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Liste des demandes ({stats.count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {refunds.length > 0 ? (
              <div className="space-y-4">
                {refunds.map((refund, index) => {
                  const statusCfg = STATUS_CONFIG[refund.status] ?? STATUS_CONFIG.ARCHIVED
                  const isPending = refund.status === 'PENDING'
                  const isApproved = refund.status === 'APPROVED'

                  return (
                    <Card key={refund.id} className="border-2 hover:border-[#224D62] transition-colors">
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className="bg-[#224D62] text-white text-sm px-3 py-1">
                              Demande {index + 1}
                            </Badge>
                            <Badge variant="outline" className={statusCfg.className}>
                              {statusCfg.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {REFUND_TYPE_LABELS[refund.type] ?? refund.type}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => setValidateRefund(refund)}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Valider
                              </Button>
                            )}
                            {isApproved && user?.uid && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => setMarkPaidRefund(refund)}
                              >
                                <Banknote className="h-3.5 w-3.5" />
                                Marquer comme payé
                              </Button>
                            )}
                            {refund.documentUrl && (
                              <a
                                href={refund.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" variant="outline" className="gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-50">
                                  <FileText className="h-3.5 w-3.5" />
                                  Document membre
                                </Button>
                              </a>
                            )}
                            {refund.adminDocumentUrl && (
                              <a
                                href={refund.adminDocumentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" variant="outline" className="gap-1.5 border-[#234D65]/30 text-[#234D65] hover:bg-[#234D65]/5">
                                  <FileText className="h-3.5 w-3.5" />
                                  Doc. doublement signé
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Montant</p>
                            <p className="font-bold text-gray-900">{refund.withdrawalAmount ? formatAmount(refund.withdrawalAmount) : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Demandé le</p>
                            <p className="font-medium text-gray-700">{formatDate(refund.createdAt)}</p>
                          </div>
                          {refund.approvedAt && (
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Approuvé le</p>
                              <p className="font-medium text-gray-700">{formatDate(refund.approvedAt)}</p>
                            </div>
                          )}
                          {refund.paidAt && (
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Payé le</p>
                              <p className="font-medium text-green-700">{formatDate(refund.paidAt)}</p>
                            </div>
                          )}
                        </div>

                        {refund.reason && (
                          <div className="mt-3 px-4 py-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Motif</p>
                            <p className="text-sm text-gray-600 italic">« {refund.reason} »</p>
                          </div>
                        )}

                        {refund.rejectionReason && (
                          <div className="mt-3 px-4 py-2 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-xs text-red-500 uppercase tracking-wider mb-0.5">Motif du refus</p>
                            <p className="text-sm text-red-700">« {refund.rejectionReason} »</p>
                          </div>
                        )}

                        {(refund.approvedByName || refund.paidByName) && (
                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                            {refund.approvedByName && (
                              <span>Approuvé par <strong>{refund.approvedByName}</strong></span>
                            )}
                            {refund.paidByName && (
                              <span>Payé par <strong>{refund.paidByName}</strong></span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Alert className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
                <Clock className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-700 font-medium">
                  Aucune demande de remboursement pour ce contrat.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {validateRefund && (
        <ValidateRefundCIModal
          open={!!validateRefund}
          onClose={() => setValidateRefund(null)}
          contractId={contractId}
          refund={validateRefund}
          onSuccess={() => setValidateRefund(null)}
        />
      )}

      {markPaidRefund && user?.uid && (
        <MarkAsPaidRefundCIModal
          isOpen={!!markPaidRefund}
          onClose={() => setMarkPaidRefund(null)}
          contractId={contractId}
          refundId={markPaidRefund.id}
          refundLabel={`${REFUND_TYPE_LABELS[markPaidRefund.type] ?? markPaidRefund.type} — ${markPaidRefund.withdrawalAmount ? formatAmount(markPaidRefund.withdrawalAmount) : ''}`}
          userId={user.uid}
          onSuccess={() => setMarkPaidRefund(null)}
        />
      )}
    </div>
  )
}
