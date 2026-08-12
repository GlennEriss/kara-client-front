/**
 * Étoiles de charité d'un membre.
 *
 * Une œuvre de charité à laquelle le membre a fait au moins une donation
 * confirmée vaut une étoile, acquise à la date du premier don. Chaque étoile
 * **expire six ans après son obtention** : le solde est donc une fenêtre
 * glissante, pas un cumul.
 *
 * Conséquence de conception : le solde change sans qu'aucune écriture ait lieu
 * — une étoile tombe le jour de son sixième anniversaire. Un compteur figé en
 * base deviendrait faux tout seul, et la Cloud Function ne se déclenche qu'à
 * l'écriture d'une contribution. On stocke donc les étoiles **datées** et on
 * calcule le solde à la lecture.
 *
 * Un admin peut retrancher une étoile. Ces retraits sont datés et suivent la
 * même fenêtre : un retrait cesse de peser quand l'étoile qu'il visait aurait
 * expiré de toute façon.
 */

/** Plafond d'étoiles simultanées d'un membre. */
export const MAX_CHARITY_STARS = 12

/** Durée de vie d'une étoile. */
export const CHARITY_STAR_LIFETIME_YEARS = 6

/** Œuvre soutenue : une étoile, acquise au premier don confirmé. */
export interface StarredCharityEvent {
  eventId: string
  earnedAt: Date
}

export interface MemberCharityStars {
  memberId: string
  /** Œuvres soutenues encore dans la fenêtre de six ans. */
  activeStars: StarredCharityEvent[]
  /** Retraits admin encore dans la fenêtre. */
  deductedStars: number
  /** Solde affiché : étoiles actives − retraits actifs, borné à [0, MAX]. */
  stars: number
  /** `true` si le plafond est atteint. */
  isCapped: boolean
  /** Date d'expiration de la prochaine étoile, pour prévenir le membre. */
  nextExpiryAt: Date | null
}

/** Retrait d'étoile décidé par un admin. Registre en ajout seulement. */
export interface CharityStarAdjustment {
  id: string
  memberId: string
  /** Toujours négatif : un retrait. */
  delta: number
  reason: string
  createdAt: Date
  createdBy: string
  createdByName?: string
}

/** Début de la fenêtre glissante : tout ce qui est antérieur a expiré. */
export function charityStarWindowStart(now: Date = new Date()): Date {
  const start = new Date(now)
  start.setFullYear(start.getFullYear() - CHARITY_STAR_LIFETIME_YEARS)
  return start
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    const converted = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(converted.getTime()) ? null : converted
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

/**
 * Solde à partir des données brutes du document de résumé.
 *
 * `starredEvents` et `deductions` viennent de Firestore et peuvent contenir des
 * entrées expirées : c'est ici qu'elles sont écartées, à chaque lecture.
 */
export function computeCharityStars(params: {
  memberId: string
  starredEvents?: Array<{ eventId?: unknown; earnedAt?: unknown }> | null
  deductions?: unknown[] | null
  now?: Date
}): MemberCharityStars {
  const now = params.now ?? new Date()
  const windowStart = charityStarWindowStart(now)

  const seenEventIds = new Set<string>()
  const activeStars: StarredCharityEvent[] = []

  for (const entry of params.starredEvents ?? []) {
    const eventId = typeof entry?.eventId === 'string' ? entry.eventId : null
    const earnedAt = toDate(entry?.earnedAt)
    if (!eventId || !earnedAt) continue
    // Une œuvre ne vaut qu'une étoile, même si la liste comportait un doublon.
    if (seenEventIds.has(eventId)) continue
    if (earnedAt.getTime() < windowStart.getTime()) continue

    seenEventIds.add(eventId)
    activeStars.push({ eventId, earnedAt })
  }

  activeStars.sort((a, b) => a.earnedAt.getTime() - b.earnedAt.getTime())

  const deductedStars = (params.deductions ?? []).reduce<number>((total, raw) => {
    const at = toDate(raw)
    if (!at || at.getTime() < windowStart.getTime()) return total
    return total + 1
  }, 0)

  const stars = Math.min(MAX_CHARITY_STARS, Math.max(0, activeStars.length - deductedStars))

  // La plus ancienne étoile encore active est la prochaine à tomber.
  const oldest = activeStars[0]
  const nextExpiryAt = oldest
    ? new Date(
        new Date(oldest.earnedAt).setFullYear(
          oldest.earnedAt.getFullYear() + CHARITY_STAR_LIFETIME_YEARS
        )
      )
    : null

  return {
    memberId: params.memberId,
    activeStars,
    deductedStars,
    stars,
    isCapped: stars >= MAX_CHARITY_STARS,
    nextExpiryAt,
  }
}
