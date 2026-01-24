/**
 * Fixtures pour les tests d'anniversaires
 */

import type {
  BirthdayMember,
  PaginatedBirthdays,
} from '../../types/birthdays'

/**
 * Crée un fixture de membre avec anniversaire
 */
export function createBirthdayFixture(
  overrides: Partial<BirthdayMember> = {},
): BirthdayMember {
  const today = new Date()
  const birthDate = overrides.birthDate
    ? new Date(overrides.birthDate)
    : new Date(1990, 0, 15) // 15 janvier 1990 par défaut

  const currentYear = today.getFullYear()
  let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate())
  if (nextBirthday < today) {
    nextBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate())
  }

  const daysUntil = Math.ceil(
    (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )
  const age = currentYear - birthDate.getFullYear() - (nextBirthday < today ? 0 : 1)

  return {
    id: overrides.id || `user-${Math.random().toString(36).substr(2, 9)}`,
    matricule:
      overrides.matricule ||
      `${Math.floor(1000 + Math.random() * 9000)}.MK.${Math.floor(100000 + Math.random() * 900000)}`,
    firstName: overrides.firstName || 'Jean',
    lastName: overrides.lastName || 'Dupont',
    photoURL: overrides.photoURL || 'https://example.com/photo.jpg',
    birthDate: overrides.birthDate || birthDate.toISOString().split('T')[0],
    birthMonth: overrides.birthMonth ?? birthDate.getMonth() + 1,
    birthDay: overrides.birthDay ?? birthDate.getDate(),
    nextBirthday: overrides.nextBirthday || nextBirthday,
    daysUntil: overrides.daysUntil ?? daysUntil,
    age: overrides.age ?? age,
    isToday: overrides.isToday ?? false,
    isTomorrow: overrides.isTomorrow ?? false,
    isThisWeek: overrides.isThisWeek ?? false,
    ...overrides,
  }
}

/**
 * Crée un fixture de pagination d'anniversaires
 */
export function createPaginatedBirthdaysFixture(
  count: number = 20,
  page: number = 1,
  totalItems: number = 100,
): PaginatedBirthdays {
  const data = Array.from({ length: count }, (_, i) =>
    createBirthdayFixture({
      firstName: `Membre${i + 1}`,
      lastName: `Test${i + 1}`,
      daysUntil: i + 1,
      birthMonth: ((i % 12) + 1) as number,
      birthDay: ((i % 28) + 1) as number,
    }),
  )

  const totalPages = Math.ceil(totalItems / count)

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  }
}
