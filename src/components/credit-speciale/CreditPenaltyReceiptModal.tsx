'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAgentRecouvrement } from '@/hooks/agent-recouvrement'
import { useAdmin } from '@/hooks/useAdmins'
import { CreditContract, CreditPenalty } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AlertCircle,
  Calendar,
  ExternalLink,
  FileText,
  Shield,
  User,
} from 'lucide-react'

interface CreditPenaltyReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
  penalty: CreditPenalty | null
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèce',
  bank_transfer: 'Virement bancaire',
}

export default function CreditPenaltyReceiptModal({
  isOpen,
  onClose,
  contract,
  penalty,
}: CreditPenaltyReceiptModalProps) {
  const { data: createdByAdmin } = useAdmin(penalty?.createdBy ?? '')
  const { data: paymentRecordedByAdmin } = useAdmin(
    penalty?.paymentRecordedBy ?? penalty?.updatedBy ?? ''
  )
  const { data: paymentUpdatedByAdmin } = useAdmin(penalty?.paymentUpdatedBy ?? '')
  const { data: agentRecouvrement } = useAgentRecouvrement(penalty?.agentRecouvrementId ?? undefined)

  const formatDate = (value?: Date) => {
    if (!value) return '-'
    const dateObj = new Date(value)
    if (Number.isNaN(dateObj.getTime())) return '-'
    return format(dateObj, 'dd MMMM yyyy', { locale: fr })
  }

  const formatDateTime = (value?: Date) => {
    if (!value) return '-'
    const dateObj = new Date(value)
    if (Number.isNaN(dateObj.getTime())) return '-'
    return format(dateObj, "dd MMMM yyyy 'à' HH:mm", { locale: fr })
  }

  const getAdminName = (
    adminId: string | undefined,
    admin?: { firstName?: string; lastName?: string } | null
  ) => {
    if (!adminId) return '-'
    const fullName = `${admin?.firstName ?? ''} ${admin?.lastName ?? ''}`.trim()
    return fullName || adminId
  }

  if (!penalty) return null

  const paymentRecordedAt = penalty.paymentRecordedAt ?? penalty.updatedAt
  const paymentRecordedBy = penalty.paymentRecordedBy ?? penalty.updatedBy
  const paymentUpdatedAt = penalty.paymentUpdatedAt
  const paymentUpdatedBy = penalty.paymentUpdatedBy
  const hasRealPaymentUpdate =
    !!paymentUpdatedAt &&
    !!paymentUpdatedBy &&
    (paymentUpdatedAt.getTime() !== paymentRecordedAt.getTime() || paymentUpdatedBy !== paymentRecordedBy)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Facture de la pénalité</DialogTitle>
          <DialogDescription>
            Consultez l’historique complet de cette pénalité, son paiement et les données administratives associées.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[72vh] overflow-y-auto pr-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  Récapitulatif
                </span>
                <Badge className={penalty.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                  {penalty.paid ? 'Payée' : 'Impayée'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-500">Contrat</p>
                <p className="font-medium text-slate-900">{contract.id}</p>
              </div>
              <div>
                <p className="text-slate-500">Client</p>
                <p className="font-medium text-slate-900">
                  {contract.clientFirstName} {contract.clientLastName}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Montant</p>
                <p className="font-medium text-slate-900">{penalty.amount.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-slate-500">Retard</p>
                <p className="font-medium text-slate-900">{penalty.daysLate} jours</p>
              </div>
              <div>
                <p className="text-slate-500">Échéance concernée</p>
                <p className="font-medium text-slate-900">{formatDate(penalty.dueDate)}</p>
              </div>
              <div>
                <p className="text-slate-500">Créée le</p>
                <p className="font-medium text-slate-900">{formatDateTime(penalty.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-[#234D65]" />
                Enregistrement de la pénalité
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-500">Admin ayant enregistré la pénalité</p>
                <p className="font-medium text-slate-900">{getAdminName(penalty.createdBy, createdByAdmin)}</p>
              </div>
              <div>
                <p className="text-slate-500">Date de création</p>
                <p className="font-medium text-slate-900">{formatDateTime(penalty.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-[#234D65]" />
                Paiement de la pénalité
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-slate-500">Payée le</p>
                <p className="font-medium text-slate-900">
                  {penalty.paidAt
                    ? penalty.paymentTime
                      ? `${formatDate(penalty.paidAt)} à ${penalty.paymentTime}`
                      : formatDateTime(penalty.paidAt)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Mode de paiement</p>
                <p className="font-medium text-slate-900">
                  {penalty.paymentMode
                    ? `${PAYMENT_MODE_LABELS[penalty.paymentMode] ?? penalty.paymentMode}${
                        (penalty.paymentMode === 'airtel_money' || penalty.paymentMode === 'mobicash') &&
                        penalty.withFees !== undefined
                          ? ` (${penalty.withFees ? 'Avec frais' : 'Sans frais'})`
                          : ''
                      }`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Paiement saisi par</p>
                <p className="font-medium text-slate-900">
                  {getAdminName(paymentRecordedBy, paymentRecordedByAdmin)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Enregistrement du paiement créé le</p>
                <p className="font-medium text-slate-900">{formatDateTime(paymentRecordedAt)}</p>
              </div>
              <div>
                <p className="text-slate-500">Agent de recouvrement</p>
                <p className="font-medium text-slate-900">
                  {agentRecouvrement
                    ? `${agentRecouvrement.prenom} ${agentRecouvrement.nom}`.trim()
                    : penalty.agentRecouvrementId || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Preuve</p>
                {penalty.proofUrl ? (
                  <a
                    href={penalty.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[#234D65] hover:underline"
                  >
                    Ouvrir la preuve
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="font-medium text-slate-900">Aucune preuve</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-500">Commentaire</p>
                <p className="font-medium text-slate-900 whitespace-pre-wrap">
                  {penalty.paymentComment?.trim() || 'Aucun commentaire'}
                </p>
              </div>
            </CardContent>
          </Card>

          {hasRealPaymentUpdate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-[#234D65]" />
                  Dernière modification
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-slate-500">Modifiée par</p>
                  <p className="font-medium text-slate-900">
                    {getAdminName(paymentUpdatedBy, paymentUpdatedByAdmin)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Modifiée le</p>
                  <p className="font-medium text-slate-900">{formatDateTime(paymentUpdatedAt)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 text-slate-500" />
              Cette facture reprend à la fois l’enregistrement initial de la pénalité et, si elle est payée, les informations exactes du paiement saisi.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
