/**
 * Card individuelle affichant un membre et son anniversaire
 * 
 * Affiche : Photo, Nom, Prénom, Date anniv, Matricule, Age, J-X
 * Layout : Simple et compact pour afficher 5 cards par ligne
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { BirthdayMember } from '../../types/birthdays'

export interface BirthdayCardProps {
  member: BirthdayMember
  isHighlighted?: boolean
}

export function BirthdayCard({ member, isHighlighted }: BirthdayCardProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        isHighlighted && 'ring-2 ring-pink-500',
      )}
      data-testid={`birthday-card-${member.matricule}`}
    >
      <CardContent className="p-4 text-center">
        {/* Photo */}
        <Avatar className="w-16 h-16 mx-auto mb-2">
          <AvatarImage src={member.photoURL} alt={`${member.firstName} ${member.lastName}`} />
          <AvatarFallback className="bg-pink-100 text-pink-600">
            {getInitials(member.firstName, member.lastName)}
          </AvatarFallback>
        </Avatar>

        {/* Nom */}
        <p className="font-semibold text-gray-900 truncate text-sm">
          {member.lastName.toUpperCase()}
        </p>

        {/* Prénom */}
        <p className="text-gray-600 truncate text-sm">{member.firstName}</p>

        {/* Date anniversaire */}
        <p className="text-sm text-pink-600 mt-1">
          {format(member.nextBirthday, 'dd MMMM', { locale: fr })}
        </p>

        {/* Matricule */}
        <p className="text-xs text-gray-400 mt-1 truncate">{member.matricule}</p>

        {/* Age et J-X */}
        <div className="flex justify-center items-center gap-2 mt-2">
          <span className="text-xs text-gray-500">{member.age} ans</span>
          <Badge
            variant={member.isToday ? 'default' : member.isTomorrow ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {member.isToday ? "Aujourd'hui" : member.isTomorrow ? 'Demain' : `J-${member.daysUntil}`}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
