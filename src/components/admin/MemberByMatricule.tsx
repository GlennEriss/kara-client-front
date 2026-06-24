'use client'

import { useMemberByMatricule } from '@/hooks/useMemberByMatricule'
import { cn } from '@/lib/utils'
import routes from '@/constantes/routes'
import { ExternalLink, UserX } from 'lucide-react'
import Link from 'next/link'

interface MemberByMatriculeProps {
  matricule?: string | null
  className?: string
  /** Étiquette du rôle (ex. « Garant »), affichée dans le message d'absence. */
  roleLabel?: string
}

/**
 * Affiche le membre correspondant à un matricule (parrain / garant / contact
 * d'urgence…) sous forme de lien cliquable vers sa fiche, côté ADMIN.
 * Si le matricule ne correspond à aucun membre, affiche un message explicite.
 */
export function MemberByMatricule({ matricule, className, roleLabel }: MemberByMatriculeProps) {
  const key = (matricule ?? '').trim()
  const { data: member, isLoading } = useMemberByMatricule(key)

  if (!key) return <span className={cn('text-gray-400', className)}>—</span>

  if (isLoading) {
    return <span className={cn('text-gray-400', className)}>Recherche du membre…</span>
  }

  if (!member) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-amber-600', className)}>
        <UserX className="h-3.5 w-3.5 shrink-0" />
        Aucun membre avec ce matricule ({key})
      </span>
    )
  }

  const name = `${member.firstName || ''} ${member.lastName || ''}`.trim() || key

  return (
    <Link
      href={routes.admin.membershipDetails(member.id)}
      className={cn(
        'inline-flex items-center gap-1 font-medium text-[#234D65] hover:underline',
        className,
      )}
      title={`${roleLabel ? `${roleLabel} — ` : ''}${name} (${key})`}
    >
      {name}
      <span className="text-xs font-normal text-gray-400">({key})</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </Link>
  )
}
