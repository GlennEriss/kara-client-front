/**
 * Tableau pour la vue liste des membres
 * Affiche les membres dans un tableau avec colonnes
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MemberWithSubscription } from '@/db/member.db'
import { MEMBERSHIP_TYPE_LABELS } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getNationalityName } from '@/constantes/nationality'
import { User, Phone, Mail, MapPin, Car, Calendar, FileText, CheckCircle, XCircle, Cake } from 'lucide-react'
import Link from 'next/link'
import routes from '@/constantes/routes'

interface MembershipsTableViewProps {
  members: MemberWithSubscription[]
  isLoading?: boolean
  onViewSubscriptions: (memberId: string) => void
  onViewDetails: (memberId: string) => void
  onPreviewAdhesion: (url: string | null) => void
  className?: string
}

const TABLE_HEADERS = [
  { label: 'Photo', className: 'w-16' },
  { label: 'Nom complet', className: 'w-48' },
  { label: 'Matricule', className: 'w-32' },
  { label: 'Type', className: 'w-32' },
  { label: 'Abonnement', className: 'w-40' },
  { label: 'Contact', className: 'w-48' },
  { label: 'Actions', className: 'w-48' },
] as const

// Fonction utilitaire pour vérifier si c'est l'anniversaire d'un membre
const isBirthdayToday = (birthDate: string): boolean => {
  if (!birthDate) return false
  try {
    const today = new Date()
    const birth = new Date(birthDate)
    return today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth()
  } catch {
    return false
  }
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

function formatDate(date: Date) {
  try {
    return format(date, 'dd/MM/yyyy', { locale: fr })
  } catch {
    return 'Date invalide'
  }
}

function getMembershipTypeColor(type: string) {
  const colors = {
    adherant: 'bg-[#224D62] text-white',
    bienfaiteur: 'bg-[#CBB171] text-white',
    sympathisant: 'bg-green-600 text-white'
  }
  return colors[type as keyof typeof colors] || 'bg-gray-500 text-white'
}

function getSubscriptionStatus(member: MemberWithSubscription) {
  if (!member.lastSubscription) {
    return {
      label: 'Aucun abonnement',
      color: 'bg-gray-100 text-gray-700',
      icon: XCircle
    }
  }
  if (member.isSubscriptionValid) {
    return {
      label: 'Valide',
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle
    }
  }
  return {
    label: 'Expiré',
    color: 'bg-red-100 text-red-700',
    icon: XCircle
  }
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="w-10 h-10 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
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

export function MembershipsTableView({
  members,
  isLoading = false,
  onViewSubscriptions,
  onViewDetails,
  onPreviewAdhesion,
  className,
}: MembershipsTableViewProps) {
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

  if (members.length === 0) {
    return (
      <div className={cn('rounded-lg border border-gray-200 p-12 text-center', className)}>
        <p className="text-gray-500">Aucun membre trouvé</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 overflow-hidden bg-white', className)}>
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
          {members.map((member) => {
            const fullName = `${member.firstName} ${member.lastName}`.trim() || 'Sans nom'
            const initials = getInitials(member.firstName, member.lastName)
            const subscriptionStatus = getSubscriptionStatus(member)
            const hasBirthday = isBirthdayToday(member.birthDate)

            return (
              <TableRow
                key={member.id}
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Photo */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10 border-2 border-kara-primary-dark/10">
                      <AvatarImage src={member.photoURL || undefined} alt={fullName} />
                      <AvatarFallback className="bg-kara-primary-dark/10 text-kara-primary-dark font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {hasBirthday && (
                      <div title="Anniversaire aujourd'hui">
                        <Cake className="h-4 w-4 text-pink-600" />
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Nom complet */}
                <TableCell>
                  <div className="font-medium text-sm text-gray-900">{fullName}</div>
                </TableCell>

                {/* Matricule */}
                <TableCell>
                  <div className="text-sm text-gray-600 font-mono">{member.matricule}</div>
                </TableCell>

                {/* Type */}
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', getMembershipTypeColor(member.membershipType))}
                  >
                    {MEMBERSHIP_TYPE_LABELS[member.membershipType]}
                  </Badge>
                </TableCell>

                {/* Abonnement */}
                <TableCell>
                  <Badge className={cn('text-xs', subscriptionStatus.color)}>
                    <subscriptionStatus.icon className="h-3 w-3 mr-1" />
                    {subscriptionStatus.label}
                  </Badge>
                  {member.lastSubscription && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(member.lastSubscription.dateEnd)}
                    </div>
                  )}
                </TableCell>

                {/* Contact */}
                <TableCell>
                  <div className="space-y-1">
                    {member.contacts && member.contacts.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span className="truncate">{member.contacts[0]}</span>
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {getNationalityName(member.nationality)}
                    </div>
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(member.id!)}
                      className="h-8 text-xs text-kara-primary-dark border-kara-primary-dark hover:bg-kara-primary-dark hover:text-white"
                    >
                      <User className="h-3 w-3 mr-1" />
                      Détails
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewSubscriptions(member.id)}
                      className="h-8 text-xs text-kara-primary-light border-kara-primary-light hover:bg-kara-primary-light hover:text-white"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Abonnements
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 text-xs"
                    >
                      <Link href={routes.admin.membershipDocuments(member.id!)}>
                        <FileText className="h-3 w-3 mr-1" />
                        Documents
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
