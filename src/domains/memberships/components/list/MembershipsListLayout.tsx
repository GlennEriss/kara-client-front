'use client'

import type { MemberWithSubscription } from '@/db/member.db'
import MemberCard from '@/components/memberships/MemberCard'

type ViewMode = 'grid' | 'list'

interface MembershipsListLayoutProps {
  members: MemberWithSubscription[]
  viewMode: ViewMode
  onViewSubscriptions: (memberId: string) => void
  onViewDetails: (memberId: string) => void
  onPreviewAdhesion: (url: string | null) => void
}

export function MembershipsListLayout({
  members,
  viewMode,
  onViewSubscriptions,
  onViewDetails,
  onPreviewAdhesion,
}: MembershipsListLayoutProps) {
  return (
    <div
      data-testid="memberships-list-layout"
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch'
          : 'space-y-6'
      }
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
          />
        </div>
      ))}
    </div>
  )
}
