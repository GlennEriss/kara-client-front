/**
 * Card individuelle affichant un membre et son anniversaire
 *
 * Layout aligné sur le design membre : en-tête horizontal (avatar + nom à gauche,
 * pastille J-X à droite) + bloc stats (date / âge).
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Cake, Calendar, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { generateWhatsAppUrl } from '../../utils/whatsappUrl'
import type { BirthdayMember } from '../../types/birthdays'

export interface BirthdayCardProps {
  member: BirthdayMember
  isHighlighted?: boolean
}

/**
 * Message d'anniversaire personnalisé et chaleureux envoyé via WhatsApp.
 */
function buildBirthdayMessage(firstName: string): string {
  const name = firstName?.trim() || 'cher membre'
  return `Joyeux anniversaire ${name} ! 🎉🎂

En ce jour si spécial, toute la famille KARA pense à toi et te souhaite une merveilleuse journée entourée de tes proches.

Que cette nouvelle année t'apporte santé, bonheur et réussite. Tu comptes énormément pour nous ❤️

Avec toute notre affection,
— L'équipe KARA`
}

export function BirthdayCard({ member, isHighlighted }: BirthdayCardProps) {
  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()

  const countdown = member.isToday
    ? { label: "Aujourd'hui", dot: 'bg-pink-500', text: 'text-pink-700' }
    : member.isTomorrow
      ? { label: 'Demain', dot: 'bg-amber-400', text: 'text-amber-700' }
      : { label: `J-${member.daysUntil}`, dot: 'bg-gray-400', text: 'text-gray-500' }

  const handleSendWhatsApp = () => {
    if (!member.phone) {
      toast.error('Aucun numéro de téléphone enregistré pour ce membre.')
      return
    }
    try {
      const url = generateWhatsAppUrl(member.phone, buildBirthdayMessage(member.firstName))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Numéro de téléphone invalide pour ce membre.')
    }
  }

  return (
    <Card
      className={cn(
        'group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md',
        isHighlighted && 'ring-2 ring-pink-500',
      )}
      data-testid={`birthday-card-${member.matricule}`}
    >
      <CardContent className="flex flex-col gap-4 p-4 md:p-5">
        {/* Header : avatar + nom à gauche, J-X dot à droite */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 shrink-0 rounded-xl">
              <AvatarImage src={member.photoURL} alt={`${member.firstName} ${member.lastName}`} />
              <AvatarFallback className="rounded-xl bg-pink-100 text-[11px] font-semibold text-pink-600">
                {initials || '--'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {member.lastName.toUpperCase()} {member.firstName}
              </p>
              <p className="truncate text-xs text-gray-400">{member.matricule}</p>
            </div>
          </div>
          <span className={cn('flex shrink-0 items-center gap-1.5 text-xs font-semibold', countdown.text)}>
            <span className={cn('h-2 w-2 rounded-full shrink-0', countdown.dot)} />
            {countdown.label}
          </span>
        </div>

        {/* Stats : date + âge */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
          <div>
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
              <Calendar className="h-3 w-3" /> Anniversaire
            </p>
            <p className="text-sm font-medium text-gray-700">
              {format(member.nextBirthday, 'dd MMM', { locale: fr })}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
              <Cake className="h-3 w-3" /> Âge
            </p>
            <p className="font-bold text-[#234D65] tabular-nums text-sm">
              {member.age} <span className="text-[10px] font-normal text-gray-400">ans</span>
            </p>
          </div>
        </div>

        {/* Action : message d'anniversaire WhatsApp */}
        <Button
          onClick={handleSendWhatsApp}
          disabled={!member.phone}
          title={member.phone ? 'Envoyer un message d’anniversaire sur WhatsApp' : 'Aucun numéro de téléphone'}
          className="mt-auto w-full h-9 bg-[#25D366] hover:bg-[#1ebe5b] text-white text-sm font-semibold disabled:opacity-50"
        >
          <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
          Souhaiter sur WhatsApp
        </Button>
      </CardContent>
    </Card>
  )
}
