'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Banknote,
  CheckCircle,
  Clock,
  FileText,
  Hourglass,
  RotateCcw,
  XCircle,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import routes from '@/constantes/routes'
import { useAuth } from '@/hooks/useAuth'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import { useRefundsCS } from '@/hooks/caisse-speciale/useRefundsCS'
import { useDeclaredVersementsCS } from '@/hooks/caisse-speciale/useDeclaredVersementsCS'

import ValidateRefundCSModal from '@/components/caisse-speciale/ValidateRefundCSModal'
import MarkAsPaidRefundCSModal from '@/components/caisse-speciale/MarkAsPaidRefundCSModal'
import ValidateDeclaredVersementCSModal from '@/components/caisse-speciale/ValidateDeclaredVersementCSModal'

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
  if (!d) return '—'
  return format(d, 'd MMM yyyy', { locale: fr })
}

const REFUND_TYPE_LABELS: Record<string, string> = {
  EARLY: 'Retrait anticipé',
  FINAL: 'Remboursement final',
}

const REFUND_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:  { label: 'En attente', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  APPROVED: { label: 'Approuvé',   className: 'bg-blue-100 text-blue-700 border-blue-200'     },
  PAID:     { label: 'Payé',       className: 'bg-green-100 text-green-700 border-green-200'   },
  ARCHIVED: { label: 'Archivé',    className: 'bg-gray-100 text-gray-600 border-gray-200'      },
}

const DECLARED_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING_MEMBER: { label: 'En attente', className: 'bg-amber-100 text-amber-700 border-amber-200'    },
  VALIDATED:      { label: 'Validé',     className: 'bg-green-100 text-green-700 border-green-200'    },
  REJECTED:       { label: 'Refusé',     className: 'bg-red-100 text-red-700 border-red-200'          },
}

const MODE_LABELS: Record<string, string> = {
  airtel_money:  'Airtel Money',
  mobicash:      'MobiCash',
  cash:          'Espèces',
  bank_transfer: 'Virement',
}

export default function ContractCSRefundsPage() {
  const params = useParams() as { id: string }
  const contractId = params.id
  const router = useRouter()
  const { user } = useAuth()

  const { data: contract, isLoading: loadingContract, isError: errorContract } = useCaisseContract(contractId)
  const { data: refunds = [],    isLoading: loadingRefunds,    isError: errorRefunds    } = useRefundsCS(contractId)
  const { data: declared = [],   isLoading: loadingDeclared,   isError: errorDeclared   } = useDeclaredVersementsCS(contractId)

  const [validateRefund,   setValidateRefund]   = useState<any | null>(null)
  const [markPaidRefund,   setMarkPaidRefund]   = useState<any | null>(null)
  const [validateVersement, setValidateVersement] = useState<any | null>(null)

  const refundStats = useMemo(() => ({
    total:   refunds.reduce((sum, r) => sum + (Number(r.withdrawalAmount) || 0), 0),
    pending: refunds.filter((r) => r.status === 'PENDING').length,
    paid:    refunds.filter((r) => r.status === 'PAID').length,
    archived: refunds.filter((r) => r.status === 'ARCHIVED').length,
    count:   refunds.length,
  }), [refunds])

  const declaredStats = useMemo(() => ({
    pending:   declared.filter((v) => v.status === 'PENDING_MEMBER').length,
    validated: declared.filter((v) => v.status === 'VALIDATED').length,
    rejected:  declared.filter((v) => v.status === 'REJECTED').length,
    count:     declared.length,
  }), [declared])

  const isLoading = loadingContract || loadingRefunds || loadingDeclared
  const hasError  = errorContract   || errorRefunds   || errorDeclared

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (hasError || !contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-700 font-medium">
              {!contract ? 'Contrat introuvable' : 'Erreur lors du chargement'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back + header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(routes.admin.caisseSpecialeContractDetails(contractId))}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au contrat
          </Button>
        </div>

        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73]">
          <CardHeader>
            <CardTitle className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3">
              <RotateCcw className="h-7 w-7 lg:h-8 lg:w-8" />
              Remboursements & Déclarations
            </CardTitle>
            <p className="text-blue-100">
              Contrat #{contract.id?.slice(-8).toUpperCase()} — {contract.caisseType}
            </p>
          </CardHeader>
        </Card>

        {/* ── SECTION REMBOURSEMENTS ─────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-[#234D65]" />
            Demandes de remboursement ({refundStats.count})
          </h2>

          {/* Stats remboursements */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total demandé', value: formatAmount(refundStats.total), icon: Banknote,   bg: 'bg-blue-100',   color: 'text-blue-600'   },
              { label: 'En attente',    value: String(refundStats.pending),     icon: Clock,      bg: 'bg-orange-100', color: 'text-orange-600' },
              { label: 'Payés',         value: String(refundStats.paid),        icon: CheckCircle,bg: 'bg-green-100',  color: 'text-green-600'  },
              { label: 'Archivés',      value: String(refundStats.archived),    icon: Archive,    bg: 'bg-gray-100',   color: 'text-gray-600'   },
            ].map((s) => {
              const Icon = s.icon
              return (
                <Card key={s.label} className="border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${s.bg} rounded-lg shrink-0`}>
                        <Icon className={`h-5 w-5 ${s.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={`font-bold text-sm ${s.color} truncate`}>{s.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Liste remboursements */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Liste des demandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {refunds.length > 0 ? (
                <div className="space-y-4">
                  {refunds.map((refund, index) => {
                    const statusCfg = REFUND_STATUS_CONFIG[refund.status] ?? REFUND_STATUS_CONFIG.ARCHIVED
                    const isPending  = refund.status === 'PENDING'
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

                            <div className="flex items-center gap-2 flex-wrap">
                              {isPending && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                                  onClick={() => setValidateRefund(refund)}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Valider / Archiver
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
                                  Marquer payé
                                </Button>
                              )}
                              {(refund.documentUrl || refund.proofUrl) && (
                                <a
                                  href={refund.documentUrl ?? refund.proofUrl}
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
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Montant total</p>
                              <p className="font-bold text-gray-900">{refund.withdrawalAmount ? formatAmount(refund.withdrawalAmount) : '—'}</p>
                              {(refund.amountNominal > 0 || refund.amountBonus > 0) && (
                                <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">
                                  {refund.amountNominal > 0 && `${formatAmount(refund.amountNominal)} nominal`}
                                  {refund.amountBonus > 0 && ` + ${formatAmount(refund.amountBonus)} bonus`}
                                </p>
                              )}
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

                          {refund.archiveReason && (
                            <div className="mt-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Motif d'archivage</p>
                              <p className="text-sm text-gray-600">« {refund.archiveReason} »</p>
                            </div>
                          )}

                          {(refund.approvedByName || refund.paidByName || refund.archivedByName) && (
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                              {refund.approvedByName && (
                                <span>Approuvé par <strong>{refund.approvedByName}</strong></span>
                              )}
                              {refund.paidByName && (
                                <span>Payé par <strong>{refund.paidByName}</strong></span>
                              )}
                              {refund.archivedByName && (
                                <span>Archivé par <strong>{refund.archivedByName}</strong></span>
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

        {/* ── SECTION VERSEMENTS DÉCLARÉS ─────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Hourglass className="h-5 w-5 text-[#234D65]" />
            Versements déclarés par le membre ({declaredStats.count})
          </h2>

          {/* Stats déclarations */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'En attente', value: String(declaredStats.pending),   icon: Hourglass,    bg: 'bg-amber-100',  color: 'text-amber-600'  },
              { label: 'Validés',    value: String(declaredStats.validated),  icon: CheckCircle,  bg: 'bg-green-100',  color: 'text-green-600'  },
              { label: 'Refusés',    value: String(declaredStats.rejected),   icon: XCircle,      bg: 'bg-red-100',    color: 'text-red-600'    },
            ].map((s) => {
              const Icon = s.icon
              return (
                <Card key={s.label} className="border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${s.bg} rounded-lg shrink-0`}>
                        <Icon className={`h-5 w-5 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Liste déclarations */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Déclarations de versement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {declared.length > 0 ? (
                <div className="space-y-4">
                  {declared.map((v) => {
                    const statusCfg = DECLARED_STATUS_CONFIG[v.status] ?? DECLARED_STATUS_CONFIG.PENDING_MEMBER
                    const isPendingMember = v.status === 'PENDING_MEMBER'

                    return (
                      <Card key={v.id} className="border-2 hover:border-[#224D62] transition-colors">
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant="outline" className={statusCfg.className}>
                                {statusCfg.label}
                              </Badge>
                              <span className="text-sm font-mono text-gray-500">M{v.monthIndex != null ? v.monthIndex + 1 : '?'}</span>
                              <span className="text-xs text-gray-400 italic">Déclaration</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isPendingMember && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                                  onClick={() => setValidateVersement(v)}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Traiter
                                </Button>
                              )}
                              {v.proofUrl && (
                                <a href={v.proofUrl} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline" className="gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-50">
                                    <FileText className="h-3.5 w-3.5" />
                                    Preuve
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Montant</p>
                              <p className="font-bold text-gray-900">{v.amount ? formatAmount(v.amount) : '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Mode</p>
                              <p className="font-medium text-gray-700">{MODE_LABELS[v.mode] ?? v.mode ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Date</p>
                              <p className="font-medium text-gray-700">{v.date ?? '—'}{v.time ? ` à ${v.time}` : ''}</p>
                            </div>
                            {v.declaredAt && (
                              <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Déclaré le</p>
                                <p className="font-medium text-gray-700">{formatDate(v.declaredAt)}</p>
                              </div>
                            )}
                          </div>

                          {v.comment && (
                            <div className="mt-3 px-4 py-2 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Commentaire</p>
                              <p className="text-sm text-gray-600 italic">« {v.comment} »</p>
                            </div>
                          )}

                          {v.status === 'REJECTED' && v.rejectionReason && (
                            <div className="mt-3 px-4 py-2 bg-red-50 rounded-lg border border-red-100">
                              <p className="text-xs text-red-500 uppercase tracking-wider mb-0.5">Motif du refus</p>
                              <p className="text-sm text-red-700">« {v.rejectionReason} »</p>
                            </div>
                          )}

                          {(v.validatedByName || v.rejectedByName) && (
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                              {v.validatedByName && (
                                <span>Validé par <strong>{v.validatedByName}</strong></span>
                              )}
                              {v.rejectedByName && (
                                <span>Refusé par <strong>{v.rejectedByName}</strong></span>
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
                  <Hourglass className="h-5 w-5 text-blue-600" />
                  <AlertDescription className="text-blue-700 font-medium">
                    Aucun versement déclaré par le membre pour ce contrat.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {validateRefund && (
        <ValidateRefundCSModal
          open={!!validateRefund}
          onClose={() => setValidateRefund(null)}
          contractId={contractId}
          refund={validateRefund}
          onSuccess={() => setValidateRefund(null)}
        />
      )}

      {markPaidRefund && user?.uid && (
        <MarkAsPaidRefundCSModal
          isOpen={!!markPaidRefund}
          onClose={() => setMarkPaidRefund(null)}
          contractId={contractId}
          refundId={markPaidRefund.id}
          refundLabel={`${REFUND_TYPE_LABELS[markPaidRefund.type] ?? markPaidRefund.type} — ${markPaidRefund.withdrawalAmount ? formatAmount(markPaidRefund.withdrawalAmount) : ''}`}
          userId={user.uid}
          onSuccess={() => setMarkPaidRefund(null)}
        />
      )}

      {validateVersement && (
        <ValidateDeclaredVersementCSModal
          open={!!validateVersement}
          onClose={() => setValidateVersement(null)}
          contractId={contractId}
          versement={validateVersement}
          onSuccess={() => setValidateVersement(null)}
        />
      )}
    </div>
  )
}
