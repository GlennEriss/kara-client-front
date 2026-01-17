/**
 * Tableau complet pour les demandes d'adhésion V2 (Desktop)
 * 
 * Suit WIREFRAME_UI.md section 5 : Tableau Desktop
 * Affiche les informations critiques pour le traitement efficace
 */

'use client'

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { MembershipRequest } from '../../entities'
import { MembershipRequestRowV2 } from './MembershipRequestRowV2'
import { CorrectionBannerV2 } from '../shared'
import { Inbox } from 'lucide-react'

interface MembershipRequestsTableV2Props {
  // Peut recevoir soit `requests` directement, soit `data` avec pagination
  requests?: MembershipRequest[]
  data?: {
    items: MembershipRequest[]
    pagination?: {
      page: number
      limit: number
      totalItems: number
      totalPages: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }
  }
  isLoading?: boolean
  
  // Actions
  onViewDetails?: (id: string) => void
  onApprove?: (request: MembershipRequest) => void
  onReject?: (request: MembershipRequest) => void
  onRequestCorrections?: (request: MembershipRequest) => void
  onPay?: (request: MembershipRequest) => void
  onViewMembershipForm?: (id: string) => void
  onViewIdentityDocument?: (id: string) => void
  onSendWhatsApp?: (id: string) => void
  
  // États de chargement
  loadingActions?: Record<string, boolean>
  
  // États vides améliorés
  hasActiveFilters?: boolean
  searchQuery?: string
  totalCount?: number
  
  className?: string
}

const TABLE_HEADERS = [
  { label: 'Photo', className: 'w-16' },
  { label: 'Nom complet', className: 'w-48' },
  { label: 'Statut', className: 'w-32' },
  { label: 'Paiement', className: 'w-32' },
  { label: 'Date de soumission', className: 'w-40' },
  { label: 'Actions', className: 'w-48' }, // Largeur fixe optimisée (design backoffice pro)
] as const

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="w-10 h-10 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

interface EmptyStateProps {
  hasActiveFilters?: boolean
  searchQuery?: string
  totalCount?: number
}

function EmptyState({ hasActiveFilters = false, searchQuery = '', totalCount = 0 }: EmptyStateProps) {
  const hasSearch = searchQuery.trim().length > 0
  
  let title = 'Aucune demande trouvée'
  let description = 'Il n\'y a actuellement aucune demande d\'adhésion à afficher'
  
  if (hasActiveFilters || hasSearch) {
    title = 'Aucune demande ne correspond à vos critères'
    if (hasSearch) {
      description = `Aucun résultat pour "${searchQuery}". Essayez de modifier votre recherche.`
    } else if (totalCount > 0) {
      description = `${totalCount} demande${totalCount > 1 ? 's' : ''} ne correspond${totalCount > 1 ? 'ent' : ''} pas à vos filtres. Essayez de changer vos filtres.`
    } else {
      description = 'Essayez de modifier vos filtres ou votre recherche pour trouver des demandes.'
    }
  } else {
    description = 'Il n\'y a actuellement aucune demande d\'adhésion à traiter.'
  }
  
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-64 text-center">
        <div className="flex flex-col items-center justify-center gap-3 px-4">
          <div className="rounded-full bg-gray-100 p-4">
            <Inbox className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              {description}
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function MembershipRequestsTableV2({
  requests: requestsProp,
  data,
  isLoading = false,
  onViewDetails,
  onApprove,
  onReject,
  onRequestCorrections,
  onPay,
  onViewMembershipForm,
  onViewIdentityDocument,
  onSendWhatsApp,
  loadingActions = {},
  hasActiveFilters = false,
  searchQuery = '',
  totalCount = 0,
  className,
}: MembershipRequestsTableV2Props) {
  // Support des deux formats : requests direct ou data.items
  const requests = requestsProp || data?.items || []
  
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-gray-200 overflow-hidden', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {TABLE_HEADERS.map((header) => (
                <TableHead key={header.label} className={header.className}>
                  {header.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableSkeleton />
          </TableBody>
        </Table>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className={cn('rounded-lg border border-gray-200 overflow-hidden', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {TABLE_HEADERS.map((header) => (
                <TableHead key={header.label} className={header.className}>
                  {header.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <EmptyState 
              hasActiveFilters={hasActiveFilters}
              searchQuery={searchQuery}
              totalCount={totalCount || data?.pagination?.totalItems || 0}
            />
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 overflow-hidden', className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            {TABLE_HEADERS.map((header) => (
              <TableHead 
                key={header.label} 
                className={cn(
                  'font-semibold text-xs text-kara-primary-dark uppercase tracking-wider',
                  header.className
                )}
              >
                {header.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <React.Fragment key={request.id}>
              <MembershipRequestRowV2
                request={request}
                onViewDetails={onViewDetails}
                onApprove={onApprove ? (id) => onApprove(request) : undefined}
                onReject={onReject ? (id) => onReject(request) : undefined}
                onRequestCorrections={onRequestCorrections ? (id) => onRequestCorrections(request) : undefined}
                onPay={onPay ? (id) => onPay(request) : undefined}
                onViewMembershipForm={onViewMembershipForm}
                onViewIdDocument={onViewIdentityDocument}
                onSendWhatsApp={onSendWhatsApp}
                loadingActions={loadingActions}
              />
              {/* Afficher le bandeau de corrections si présent */}
              {request.reviewNote && (
                <TableRow>
                  <TableCell colSpan={6} className="px-4 py-2 bg-amber-50/30">
                    <CorrectionBannerV2 reviewNote={request.reviewNote} />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
