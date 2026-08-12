'use client'

import type { MemberWithSubscription } from '@/db/member.db'
import MemberCard from '@/components/memberships/MemberCard'
import { useCharityStarsMany } from '@/domains/community/charity-stars'
import { useMemo } from 'react'
import { MembershipsTableView } from '../table/MembershipsTableView'

type ViewMode = 'grid' | 'list'

interface MembershipsListLayoutProps {
  members: MemberWithSubscription[]
  viewMode: ViewMode
  onViewSubscriptions: (memberId: string) => void
  onViewDetails: (memberId: string) => void
  onPreviewAdhesion: (url: string | null) => void
  onUploadAdhesion?: (member: MemberWithSubscription) => void
  onGenererIdentifiant?: (memberId: string, matricule: string) => void
  isLoading?: boolean
}

export function MembershipsListLayout({
  members,
  viewMode,
  onViewSubscriptions,
  onViewDetails,
  onPreviewAdhesion,
  onUploadAdhesion,
  onGenererIdentifiant,
  isLoading = false,
}: MembershipsListLayoutProps) {
  // Une seule requête par lot de 30 pour toute la page, plutôt qu'une lecture
  // par ligne affichée.
  const memberIds = useMemo(() => members.map((member) => member.id), [members])
  const { data: starsByMember } = useCharityStarsMany(memberIds)

  // Vue liste : tableau
  if (viewMode === 'list') {
    return (
      <MembershipsTableView
        members={members}
        starsByMember={starsByMember}
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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
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
            charityStars={starsByMember?.get(member.id)?.stars}
            onViewSubscriptions={onViewSubscriptions}
            onViewDetails={onViewDetails}
            onPreviewAdhesion={onPreviewAdhesion}
            onUploadAdhesion={onUploadAdhesion}
            onGenererIdentifiant={onGenererIdentifiant}
          />
        </div>
      ))}
    </div>
  )
}
