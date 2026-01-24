/**
 * Service métier pour les anniversaires des membres
 * 
 * Fournit des méthodes statiques pour calculer les informations d'anniversaire
 * et transformer les données utilisateur en BirthdayMember.
 */

import type { User } from '@/types/types'
import type {
  BirthdayMember,
  BirthdayInfo,
} from '../types/birthdays'

export class BirthdaysService {
  /**
   * Calcule les informations d'anniversaire pour un membre
   * 
   * @param birthDate - Date de naissance (string ISO ou Date)
   * @param referenceDate - Date de référence pour le calcul (par défaut: aujourd'hui)
   * @returns Informations d'anniversaire calculées
   */
  static calculateBirthdayInfo(
    birthDate: string | Date | undefined | null,
    referenceDate: Date = new Date(),
  ): BirthdayInfo {
    if (!birthDate) {
      throw new Error('birthDate est requis')
    }

    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
    const today = new Date(referenceDate)
    today.setHours(0, 0, 0, 0)

    if (isNaN(birth.getTime())) {
      throw new Error('Date de naissance invalide')
    }

    const currentYear = today.getFullYear()
    const birthMonth = birth.getMonth()
    const birthDay = birth.getDate()

    // Prochain anniversaire
    let nextBirthday = new Date(currentYear, birthMonth, birthDay)
    if (nextBirthday < today) {
      nextBirthday = new Date(currentYear + 1, birthMonth, birthDay)
    }

    // Jours restants
    const daysUntil = Math.ceil(
      (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    )

    // Âge au prochain anniversaire
    const age = nextBirthday.getFullYear() - birth.getFullYear()

    return {
      birthDate: birth,
      nextBirthday,
      daysUntil,
      age,
      isToday: daysUntil === 0,
      isTomorrow: daysUntil === 1,
      isThisWeek: daysUntil <= 7,
    }
  }

  /**
   * Calcule le jour de l'année (1-366) pour une date donnée
   * Gère correctement les années bissextiles
   * 
   * @param date - Date pour laquelle calculer le jour de l'année
   * @returns Jour de l'année (1-366)
   */
  static calculateDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0)
    const diff = date.getTime() - start.getTime()
    const oneDay = 1000 * 60 * 60 * 24
    return Math.floor(diff / oneDay)
  }

  /**
   * Transforme un User en BirthdayMember
   * 
   * Utilise birthMonth, birthDay, birthDayOfYear s'ils sont présents,
   * sinon les calcule depuis birthDate.
   * 
   * @param user - Utilisateur à transformer
   * @param year - Année de référence pour le calcul (par défaut: année courante)
   * @returns BirthdayMember avec toutes les informations d'anniversaire
   */
  static transformToBirthdayMember(
    user: User & {
      birthMonth?: number
      birthDay?: number
      birthDayOfYear?: number
    },
    year: number = new Date().getFullYear(),
  ): BirthdayMember {
    if (!user.birthDate) {
      throw new Error(`User ${user.id} n'a pas de birthDate`)
    }

    // Calculer les informations d'anniversaire
    const info = this.calculateBirthdayInfo(user.birthDate)

    // Utiliser birthMonth/birthDay/birthDayOfYear s'ils existent, sinon les calculer
    let birthMonth: number
    let birthDay: number
    let birthDayOfYear: number

    if (
      user.birthMonth !== undefined &&
      user.birthDay !== undefined &&
      user.birthDayOfYear !== undefined
    ) {
      // Utiliser les champs déjà calculés
      birthMonth = user.birthMonth
      birthDay = user.birthDay
      birthDayOfYear = user.birthDayOfYear
    } else {
      // Calculer depuis birthDate
      const birth = new Date(user.birthDate)
      birthMonth = birth.getMonth() + 1 // 1-12
      birthDay = birth.getDate() // 1-31
      birthDayOfYear = this.calculateDayOfYear(birth) // 1-366
    }

    return {
      id: user.id,
      matricule: user.matricule,
      firstName: user.firstName,
      lastName: user.lastName,
      photoURL: user.photoURL || undefined, // Convertir null en undefined
      birthDate: user.birthDate,
      birthMonth,
      birthDay,
      nextBirthday: info.nextBirthday,
      daysUntil: info.daysUntil,
      age: info.age,
      isToday: info.isToday,
      isTomorrow: info.isTomorrow,
      isThisWeek: info.isThisWeek,
    }
  }
}
