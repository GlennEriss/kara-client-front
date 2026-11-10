'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Calendar, CheckCircle2, CreditCard, Download, Edit, Eye, FileEdit, FileSpreadsheet, FileText, IdCard, Loader2, Mail, MessageSquare, MoreVertical, Phone, RotateCcw, Trash2, Upload, XCircle, type LucideIcon } from 'lucide-react'
import type { MembershipRequest } from '../../entities'
import { CorrectionsBlockV2, PaymentBadgeV2, RelativeDateV2, StatusBadgeV2 } from '../shared'

export interface MembershipRequestCardV2Props {
  request: MembershipRequest
  onViewDetails?: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onRequestCorrections?: (id: string) => void
  onPay?: (id: string) => void
  onReopen?: (id: string) => void
  onDelete?: (id: string) => void
  onSendWhatsAppRejection?: (id: string) => void
  onViewMembershipForm?: (id: string) => void
  onViewApprovedMembershipPdf?: (id: string) => void
  onReplaceAdhesionPdf?: () => void
  onViewIdDocument?: (id: string) => void
  onViewPaymentDetails?: (id: string) => void
  onExportPDF?: (id: string) => void
  onExportExcel?: (id: string) => void
  onSendWhatsApp?: (id: string) => void
  onEdit?: (id: string) => void
  onCopyCorrectionLink?: (id: string) => void
  onSendWhatsAppCorrection?: (id: string) => void
  onRenewSecurityCode?: (id: string) => void
  getProcessedByInfo?: (id: string) => { name?: string; matricule?: string } | null
  getApprovedByInfo?: (id: string) => { name?: string; matricule?: string } | null
  loadingActions?: Record<string, boolean>
  className?: string
}

function dateOf(value: unknown): Date | null {
  const raw = value && typeof (value as { toDate?: unknown }).toDate === 'function'
    ? (value as { toDate: () => Date }).toDate() : value
  const date = raw instanceof Date ? raw : typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : null
  return date && Number.isFinite(date.getTime()) ? date : null
}

/** One card for the grid and mobile list, following the MemberCard layout. */
export function MembershipRequestCardV2(props: MembershipRequestCardV2Props) {
  const { request, loadingActions = {}, className } = props
  const [imageError, setImageError] = useState(false)
  const id = request.id || ''
  const fullName = [request.identity?.firstName, request.identity?.lastName].filter(Boolean).join(' ').trim() || 'Sans nom'
  const initials = `${request.identity?.firstName?.[0] || ''}${request.identity?.lastName?.[0] || ''}`.toUpperCase() || '?'
  const phone = request.identity?.contacts?.[0]
  const email = request.identity?.email
  const approved = request.status === 'approved'
  const rejected = request.status === 'rejected'
  const underReview = request.status === 'under_review'
  const busy = ['pay', 'approve', 'reject', 'corrections', 'reopen', 'delete', 'renew-code'].some(action => loadingActions[`${action}-${id}`])
  const createdAt = dateOf(request.createdAt)
  const approvedAt = dateOf(request.approvedAt)
  const approvedBy = request.approvedBy ? props.getApprovedByInfo?.(id)?.name || request.approvedBy : ''
  const action = (callback?: (id: string) => void) => callback ? () => callback(id) : undefined
  const canPay = request.status === 'pending' && !request.isPaid && !!props.onPay
  const canApprove = request.status === 'pending' && !!request.isPaid && !!props.onApprove

  type MenuAction = { label: string; Icon: LucideIcon; run: () => void; write?: boolean; danger?: boolean; testId?: string }
  const menu: MenuAction[] = []
  const add = (label: string, Icon: LucideIcon, run: (() => void) | undefined, enabled = true, extra: Partial<MenuAction> = {}) => {
    if (enabled && run) menu.push({ label, Icon, run, ...extra })
  }
  add('Demander corrections', FileEdit, action(props.onRequestCorrections), request.status === 'pending', { write: true, testId: 'action-corrections-menu' })
  add('Rejeter', XCircle, action(props.onReject), request.status === 'pending' || underReview, { write: true, danger: true, testId: 'action-reject-menu' })
  add('Modifier', Edit, action(props.onEdit), !approved && !underReview)
  add("Fiche d’adhésion", FileText, action(props.onViewMembershipForm))
  add('PDF d’adhésion validé', FileText, action(props.onViewApprovedMembershipPdf), approved)
  add('Remplacer le PDF d’adhésion', Upload, props.onReplaceAdhesionPdf, approved && !!request.isPaid, { write: true })
  add('Pièce d’identité', IdCard, action(props.onViewIdDocument))
  add('Détails paiement', CreditCard, action(props.onViewPaymentDetails), !!request.isPaid)
  add('Réouvrir', RotateCcw, action(props.onReopen), rejected, { write: true, testId: 'reopen-button' })
  add('Envoyer WhatsApp (rejet)', MessageSquare, action(props.onSendWhatsAppRejection), rejected)
  add('Supprimer', Trash2, action(props.onDelete), rejected, { write: true, danger: true, testId: 'delete-button' })
  add('Exporter PDF', Download, action(props.onExportPDF))
  add('Exporter Excel', FileSpreadsheet, action(props.onExportExcel))
  add('Envoyer via WhatsApp', MessageSquare, action(props.onSendWhatsApp), !rejected && !underReview)

  return (
    <Card className={cn('group flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md', className)}
      data-testid="membership-request-mobile-card" data-request-id={id}>
      <CardContent className="flex flex-1 flex-col gap-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 shrink-0 rounded-xl">
              {!imageError && request.identity?.photoURL && <AvatarImage src={request.identity.photoURL} alt={fullName} onError={() => setImageError(true)} />}
              <AvatarFallback className="rounded-xl bg-[#234D65] text-[11px] font-semibold text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-gray-900" title={fullName}>{fullName}</h3>
              {request.matricule && <p className="truncate text-xs text-gray-400">{request.matricule}</p>}
            </div>
          </div>
          {!!menu.length && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-80 transition-opacity group-hover:opacity-100"
                aria-label={`Actions de ${fullName}`} data-testid="action-menu">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {menu.map(item => <DropdownMenuItem key={item.label} onClick={item.run} disabled={item.write && busy}
                className={item.danger ? 'text-red-600 focus:text-red-700' : undefined} data-testid={item.testId}>
                <item.Icon className="mr-2 h-4 w-4" />{item.label}
              </DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadgeV2 status={request.status} className="gap-1.5 bg-gray-50 px-2 py-0.5 text-[11px] hover:scale-100" />
          <PaymentBadgeV2 isPaid={!!request.isPaid} className="gap-1.5 bg-gray-50 px-2 py-0.5 text-[11px] hover:scale-100" />
        </div>

        {approved && (approvedBy || approvedAt) && <div className="space-y-1 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
          {approvedBy && <p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" /><span>Approuvé par : {approvedBy}</span></p>}
          {approvedAt && <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />{approvedAt.toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' })}</p>}
        </div>}

        <div className="space-y-1.5 text-xs text-gray-500">
          {phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="truncate">{phone}</span></p>}
          {email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="truncate" title={email}>{email}</span></p>}
          {createdAt && <RelativeDateV2 date={createdAt} className="text-xs" showIcon />}
        </div>

        {underReview && request.reviewNote && <CorrectionsBlockV2 reviewNote={request.reviewNote} securityCode={request.securityCode}
          securityCodeExpiry={request.securityCodeExpiry} requestId={id}
          processedByName={props.getProcessedByInfo?.(id)?.name} processedByMatricule={props.getProcessedByInfo?.(id)?.matricule}
          onCopyLink={action(props.onCopyCorrectionLink)}
          onSendWhatsApp={request.identity?.contacts?.length ? action(props.onSendWhatsAppCorrection) : undefined}
          onRenewCode={action(props.onRenewSecurityCode)} />}

        <div className="mt-auto space-y-2 border-t border-gray-100 pt-3" data-testid="membership-request-actions">
          {props.onViewDetails && <Button onClick={action(props.onViewDetails)} className="h-9 w-full bg-[#234D65] text-sm font-semibold text-white hover:bg-[#2c5a73]" data-testid="action-view-details-visible">
            <Eye className="mr-1.5 h-3.5 w-3.5" />Voir détails
          </Button>}
          <div className="flex flex-wrap gap-1.5">
            {canPay && <Button onClick={action(props.onPay)} variant="outline" disabled={busy} className="h-9 flex-1 border-gray-200 text-xs text-gray-600 hover:border-[#234D65] hover:text-[#234D65]" data-testid="action-pay-primary">
              {loadingActions[`pay-${id}`] ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CreditCard className="mr-1 h-3.5 w-3.5" />}
              {loadingActions[`pay-${id}`] ? 'Paiement…' : 'Payer'}
            </Button>}
            {canApprove && <Button onClick={action(props.onApprove)} variant="outline" disabled={busy} className="h-9 flex-1 border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-50" data-testid="action-approve-primary">
              {loadingActions[`approve-${id}`] ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
              {loadingActions[`approve-${id}`] ? 'Approbation…' : 'Approuver'}
            </Button>}
            {approved && props.onViewApprovedMembershipPdf && <Button variant="outline" onClick={action(props.onViewApprovedMembershipPdf)} className="h-9 flex-1 border-gray-200 text-xs text-gray-600 hover:border-[#234D65] hover:text-[#234D65]">
              <FileText className="mr-1 h-3.5 w-3.5" />PDF d’adhésion
            </Button>}
            {rejected && props.onReopen && <Button variant="outline" onClick={action(props.onReopen)} disabled={busy} className="h-9 flex-1 border-gray-200 text-xs text-gray-600 hover:border-[#234D65] hover:text-[#234D65]">
              <RotateCcw className="mr-1 h-3.5 w-3.5" />{loadingActions[`reopen-${id}`] ? 'Réouverture…' : 'Réouvrir'}
            </Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
