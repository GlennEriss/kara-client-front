/**
 * Types pour la fonctionnalité Anniversaires des membres
 */

export interface BirthdayMember {
  id: string
  matricule: string
  firstName: string
  lastName: string
  photoURL?: string
  birthDate: string
  birthMonth: number // 1-12
  birthDay: number // 1-31
  nextBirthday: Date
  daysUntil: number
  age: number
  isToday: boolean
  isTomorrow: boolean
  isThisWeek: boolean
}

export interface BirthdayInfo {
  birthDate: Date
  nextBirthday: Date
  daysUntil: number
  age: number
  isToday: boolean
  isTomorrow: boolean
  isThisWeek: boolean
}

export interface BirthdayFilters {
  months: number[] // ex: [1, 2] pour Jan/Fév
}

export interface BirthdaysPaginationOptions {
  page: number
  limit: number
  months?: number[]
}

export interface PaginatedBirthdays {
  data: BirthdayMember[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface BirthdaySearchResult {
  hits: BirthdaySearchHit[]
  targetMonth: number | null
}

export interface BirthdaySearchHit {
  objectID: string // matricule
  firstName: string
  lastName: string
  birthMonth: number // 1-12
  birthDay: number // 1-31
  photoURL?: string
}
