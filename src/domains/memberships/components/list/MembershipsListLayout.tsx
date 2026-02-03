'use client'

import type { MemberWithSubscription } from '@/db/member.db'
import MemberCard from '@/components/memberships/MemberCard'
import { MembershipsTableView } from '../table/MembershipsTableView'

type ViewMode = 'grid' | 'list'

interface MembershipsListLayoutProps {
  members: MemberWithSubscription[]
  viewMode: ViewMode
  onViewSubscriptions: (memberId: string) => void
  onViewDetails: (memberId: string) => void
  onPreviewAdhesion: (url: string | null) => void
  onGenererIdentifiant?: (memberId: string, matricule: string) => void
  isLoading?: boolean
}

export function MembershipsListLayout({
  members,
  viewMode,
  onViewSubscriptions,
  onViewDetails,
  onPreviewAdhesion,
  onGenererIdentifiant,
  isLoading = false,
}: MembershipsListLayoutProps) {
  // Vue liste : tableau
  if (viewMode === 'list') {
    return (
      <MembershipsTableView
        members={members}
        isLoading={isLoading}
        onViewSubscriptions={onViewSubscriptions}
        onViewDetails={onViewDetails}
        onPreviewAdhesion={onPreviewAdhesion}
        onGenererIdentifiant={onGenererIdentifiant}
      />
    )
  }

  // Vue grid : cartes
  return (
    <div
      data-testid="memberships-list-layout"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch"
    >
      {members.map((member, index) => (
        <div
          key={member.id}
          data-testid={`member-card-${member.id}`}
          className="animate-in fade-in-0 slide-in-from-bottom-4"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <MemberCard
            member={member}
            onViewSubscriptions={onViewSubscriptions}
            onViewDetails={onViewDetails}
            onPreviewAdhesion={onPreviewAdhesion}
            onGenererIdentifiant={onGenererIdentifiant}
          />
        </div>
      ))}
    </div>
  )
}
