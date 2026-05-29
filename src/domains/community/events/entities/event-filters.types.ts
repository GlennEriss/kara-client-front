/**
 * Filtres et pagination pour la liste des événements (admin)
 */

import type { Event, EventStatus, EventType } from './event.types'

export interface EventFilters {
  status?: EventStatus | EventStatus[]
  type?: EventType
  /** Période : startDate >= */
  fromDate?: Date
  /** Période : startDate <= */
  toDate?: Date
  /** Recherche libre sur titre/description */
  search?: string
  /** Indique si on veut uniquement les événements avec sondage */
  pollEnabled?: boolean
}

export interface EventsPaginationParams {
  pageSize: number
  /** Curseur Firestore (DocumentSnapshot) */
  cursor?: unknown
}

export interface EventsSortParams {
  field: 'startDate' | 'createdAt' | 'title'
  direction: 'asc' | 'desc'
}

export interface PaginatedEvents {
  events: Event[]
  /** Curseur pour la page suivante (undefined = dernière page) */
  nextCursor?: unknown
  total?: number
}

export interface EventStats {
  total: number
  draft: number
  upcoming: number     // published OR poll_open OR location_confirmed, dans le futur
  pollOpen: number
  past: number         // completed OR (startDate < now)
  cancelled: number
}
