import type { CharityEvent, User } from '@/types/types'
import type { Event } from '../entities/event.types'
import { normalizePhoneNumber, resolveWhatsappNumber } from '@/domains/memberships/utils/whatsappUrl'

export const DEFAULT_MEMBERS_APP_URL = 'https://association-le-kara.com'

export interface EventInvitation {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  dateOnly?: boolean
  location: string
  memberPath: string
  blockedReason?: string
  contribution?: { title: string; memberPath: string; minimum?: number; currency: string }
}

export interface InvitationRecipient {
  id: string
  name: string
  matricule: string
  phone?: string
  unavailableReason?: string
}

export function charityEventInvitation(event: CharityEvent): EventInvitation {
  const publicEvent = event.isPublic && ['upcoming', 'ongoing'].includes(event.status)
  return {
    id: `charity-${event.id}`,
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    dateOnly: true,
    location: event.location,
    memberPath: `/bienfaiteur/${encodeURIComponent(event.id)}`,
    blockedReason: !publicEvent
      ? 'Pour inviter les membres, rendez la collecte publique avec le statut « À venir » ou « En cours ».'
      : undefined,
    contribution: publicEvent ? {
      title: event.title,
      memberPath: `/bienfaiteur/${encodeURIComponent(event.id)}`,
      minimum: event.minContributionAmount,
      currency: event.currency || 'FCFA',
    } : undefined,
  }
}

export function communityEventInvitation(event: Event, charity?: CharityEvent | null): EventInvitation {
  const published = ['published', 'poll_open', 'location_confirmed'].includes(event.status)
  return {
    id: `event-${event.id}`,
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.finalLocation
      ? [event.finalLocation.name, event.finalLocation.address].filter(Boolean).join(' — ')
      : event.pollEnabled ? 'Lieu en cours de choix : participez au sondage dans votre espace membre.' : 'Lieu à confirmer',
    memberPath: `/evenements/${encodeURIComponent(event.id)}`,
    blockedReason: !published
      ? 'Publiez cet événement avant de prévenir les membres. Les brouillons, événements annulés ou terminés ne sont pas proposés à l’envoi.'
      : undefined,
    contribution: charity ? charityEventInvitation(charity).contribution : undefined,
  }
}

export function invitationRecipient(member: Pick<User, 'id' | 'matricule' | 'firstName' | 'lastName' | 'whatsappNumber' | 'contacts'>): InvitationRecipient {
  const recipient: InvitationRecipient = {
    id: member.id,
    matricule: member.matricule || member.id,
    name: [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.matricule || member.id,
  }
  const phone = resolveWhatsappNumber(member.whatsappNumber, member.contacts)
  if (!phone) return { ...recipient, unavailableReason: 'Aucun numéro renseigné' }
  try {
    return { ...recipient, phone: normalizePhoneNumber(phone) }
  } catch {
    return { ...recipient, unavailableReason: 'Numéro à vérifier dans la fiche membre' }
  }
}

/** The member frontend has its own origin; never build its links from the admin URL. */
export function memberInvitationLink(baseUrl: string, path: string): string {
  if (!baseUrl.trim()) return ''
  try {
    const base = new URL(baseUrl.trim())
    if (base.username || base.password) return ''
    if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))) return ''
    return new URL(path, base.origin).toString()
  } catch {
    return ''
  }
}

export function buildEventInvitationMessage({ event, recipient, introduction, includeContribution, memberAppUrl }: {
  event: EventInvitation
  recipient: InvitationRecipient
  introduction: string
  includeContribution: boolean
  memberAppUrl: string
}): string {
  const date = (value: Date) => new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full', timeStyle: event.dateOnly ? undefined : 'short', timeZone: 'Africa/Libreville',
  }).format(value)
  const lines = [
    `Bonjour ${recipient.name},`, '', introduction.trim(), '',
    `*${event.title}*`,
    ...(event.description?.trim() ? [event.description.trim(), ''] : []),
    `Début : ${date(event.startDate)}`,
    ...(event.endDate ? [`Fin : ${date(event.endDate)}`] : []),
    `Lieu : ${event.location}`,
  ]
  const eventLink = memberInvitationLink(memberAppUrl, event.memberPath)
  if (eventLink) lines.push('', `Voir l’événement : ${eventLink}`)
  if (includeContribution && event.contribution) {
    const contribution = event.contribution
    const link = memberInvitationLink(memberAppUrl, contribution.memberPath)
    lines.push('', `Vous pouvez contribuer à la collecte « ${contribution.title} », en argent ou en nature.`)
    if (contribution.minimum && contribution.minimum > 0) {
      lines.push(`Contribution minimale indiquée : ${contribution.minimum.toLocaleString('fr-FR')} ${contribution.currency}.`)
    }
    if (link) {
      lines.push(`Pour contribuer : ${link}`,
        'Choisissez « Je veux contribuer ». Votre déclaration sera vérifiée par l’association ; elle ne vaut pas confirmation de réception.')
    } else {
      lines.push('Pour contribuer, répondez à ce message en indiquant le montant que vous souhaitez remettre ou la nature du don proposé.',
        'L’association vous indiquera les modalités de remise. Une intention de don ne confirme pas la réception du versement ou du don en nature.')
    }
  }
  lines.push('', 'Pour toute information, vous pouvez répondre à ce message.')
  lines.push('', 'LE KARA')
  return lines.join('\n')
}
