'use client'

import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MembershipRequest } from '../../entities'
import { MembershipRequestCardV2, type MembershipRequestCardV2Props } from '../cards/MembershipRequestCardV2'

interface MembershipRequestsGridViewProps extends Omit<MembershipRequestCardV2Props,
  'request' | 'onApprove' | 'onReject' | 'onRequestCorrections' | 'onPay' | 'onReopen' | 'onDelete' | 'onSendWhatsAppRejection' | 'onReplaceAdhesionPdf' | 'onViewIdDocument'> {
  requests: MembershipRequest[]
  isLoading?: boolean
  onApprove?: (request: MembershipRequest) => void
  onReject?: (request: MembershipRequest) => void
  onRequestCorrections?: (request: MembershipRequest) => void
  onPay?: (request: MembershipRequest) => void
  onReopen?: (request: MembershipRequest) => void
  onDelete?: (request: MembershipRequest) => void
  onSendWhatsAppRejection?: (request: MembershipRequest) => void
  onReplaceAdhesionPdf?: (request: MembershipRequest) => void
  onViewIdentityDocument?: (id: string) => void
}

export function MembershipRequestsGridView({ requests, isLoading = false, className,
  onApprove, onReject, onRequestCorrections, onPay, onReopen, onDelete, onSendWhatsAppRejection, onReplaceAdhesionPdf,
  onViewIdentityDocument, ...cardProps }: MembershipRequestsGridViewProps) {
  const layout = cn('grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3', className)
  if (isLoading) return <div className={layout} role="status" aria-label="Chargement des demandes">
    {Array.from({ length: 6 }, (_, index) => <Card key={index} className="h-full animate-pulse rounded-2xl border-gray-100 shadow-sm">
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-3"><div className="size-9 rounded-xl bg-gray-100" /><div className="flex-1 space-y-2"><div className="h-4 w-3/4 rounded bg-gray-100" /><div className="h-3 w-1/2 rounded bg-gray-100" /></div></div>
        <div className="h-16 rounded-xl bg-gray-50" /><div className="h-9 rounded bg-gray-100" />
      </CardContent>
    </Card>)}
  </div>
  if (!requests.length) return <div className={cn('py-12 text-center', className)}>
    <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-[#234D65]/5"><Users className="size-10 text-[#234D65]/30" /></div>
    <h3 className="mb-2 font-bold text-[#234D65]">Aucune demande trouvée</h3>
    <p className="text-sm text-gray-500">Ajustez vos filtres ou attendez de nouvelles demandes.</p>
  </div>
  return <div className={layout}>
    {requests.map(request => <MembershipRequestCardV2 key={request.id} request={request} {...cardProps}
      onApprove={onApprove ? () => onApprove(request) : undefined}
      onReject={onReject ? () => onReject(request) : undefined}
      onRequestCorrections={onRequestCorrections ? () => onRequestCorrections(request) : undefined}
      onPay={onPay ? () => onPay(request) : undefined}
      onReopen={onReopen ? () => onReopen(request) : undefined}
      onDelete={onDelete ? () => onDelete(request) : undefined}
      onSendWhatsAppRejection={onSendWhatsAppRejection ? () => onSendWhatsAppRejection(request) : undefined}
      onReplaceAdhesionPdf={onReplaceAdhesionPdf ? () => onReplaceAdhesionPdf(request) : undefined}
      onViewIdDocument={onViewIdentityDocument} />)}
  </div>
}
