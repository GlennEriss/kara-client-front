/**
 * Repository pour les anniversaires des membres
 * 
 * Gère l'accès Firestore pour les données d'anniversaires :
 * - Liste paginée triée par anniversaire le plus proche
 * - Anniversaires d'un mois spécifique (calendrier)
 * - Filtrage par plusieurs mois
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { User } from '@/types/types'
import { BirthdaysService } from '../services/BirthdaysService'
import type {
  BirthdayMember,
  BirthdaysPaginationOptions,
  PaginatedBirthdays,
} from '../types/birthdays'

export class BirthdaysRepository {
  private static instance: BirthdaysRepository | null = null

  private constructor() {}

  static getInstance(): BirthdaysRepository {
    if (!this.instance) {
      this.instance = new BirthdaysRepository()
    }
    return this.instance
  }

  /**
   * Récupère la liste paginée des anniversaires triée par date la plus proche
   * 
   * Stratégie de pagination circulaire :
   * - Query 1 : Anniversaires à venir (du jour courant à fin d'année)
   * - Query 2 : Anniversaires passés (début d'année au jour courant)
   * - Merge : Query1 + Query2 pour ordre chronologique correct
   */
  async getPaginated(
    options: BirthdaysPaginationOptions,
  ): Promise<PaginatedBirthdays> {
    const { page, limit, months } = options

    // Avec filtres de mois
    if (months && months.length > 0) {
      return this.getPaginatedByMonths(months, page, limit)
    }

    // Sans filtres : tri par anniversaire le plus proche
    const usersRef = collection(db, firebaseCollectionNames.users)
    const todayDayOfYear = BirthdaysService.calculateDayOfYear(new Date())

    // Query 1 : Anniversaires à venir (du jour courant à fin d'année)
    const q1 = query(
      usersRef,
      where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
      where('birthDayOfYear', '>=', todayDayOfYear),
      orderBy('birthDayOfYear', 'asc'),
    )

    // Query 2 : Anniversaires passés (début d'année au jour courant)
    const q2 = query(
      usersRef,
      where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
      where('birthDayOfYear', '<', todayDayOfYear),
      orderBy('birthDayOfYear', 'asc'),
    )

    // Exécuter les requêtes en parallèle
    const [snapshot1, snapshot2, countSnapshot] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
      this.getTotalCount(),
    ])

    // Merger : à venir d'abord, puis passés
    const allDocs = [...snapshot1.docs, ...snapshot2.docs]

    // Pagination côté client (car on a déjà tous les résultats)
    const startIndex = (page - 1) * limit
    const pageDocs = allDocs.slice(startIndex, startIndex + limit)

    const currentYear = new Date().getFullYear()
    const data: BirthdayMember[] = []

    for (const docSnap of pageDocs) {
      try {
        const userData = docSnap.data() as User & {
          birthMonth?: number
          birthDay?: number
          birthDayOfYear?: number
        }
        const birthdayMember = BirthdaysService.transformToBirthdayMember(
          { ...userData, id: docSnap.id },
          currentYear,
        )
        data.push(birthdayMember)
      } catch (error) {
        console.warn(
          `[BirthdaysRepository] Erreur transformation membre ${docSnap.id}:`,
          error,
        )
        // Ignorer les membres sans birthDate valide
        continue
      }
    }

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(countSnapshot / limit),
        totalItems: countSnapshot,
        hasNextPage: startIndex + limit < allDocs.length,
        hasPrevPage: page > 1,
      },
    }
  }

  /**
   * Récupère les anniversaires d'un mois spécifique (pour calendrier)
   * 
   * @param month - Mois (1-12)
   * @param year - Année (ex: 2026)
   * @returns Liste des membres avec anniversaire ce mois
   */
  async getByMonth(month: number, year: number): Promise<BirthdayMember[]> {
    const usersRef = collection(db, firebaseCollectionNames.users)

    const q = query(
      usersRef,
      where('birthMonth', '==', month),
      where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
      orderBy('birthDay', 'asc'),
    )

    const snapshot = await getDocs(q)

    const data: BirthdayMember[] = []

    for (const docSnap of snapshot.docs) {
      try {
        const userData = docSnap.data() as User & {
          birthMonth?: number
          birthDay?: number
          birthDayOfYear?: number
        }
        const birthdayMember = BirthdaysService.transformToBirthdayMember(
          { ...userData, id: docSnap.id },
          year,
        )
        data.push(birthdayMember)
      } catch (error) {
        console.warn(
          `[BirthdaysRepository] Erreur transformation membre ${docSnap.id}:`,
          error,
        )
        // Ignorer les membres sans birthDate valide
        continue
      }
    }

    return data
  }

  /**
   * Récupère les anniversaires filtrés par plusieurs mois
   * 
   * Gère la limite Firestore de 10 valeurs max pour 'in'
   */
  private async getPaginatedByMonths(
    months: number[],
    page: number,
    limit: number,
  ): Promise<PaginatedBirthdays> {
    const usersRef = collection(db, firebaseCollectionNames.users)

    // Limite Firestore : max 10 valeurs pour 'in'
    if (months.length > 10) {
      // Diviser en plusieurs requêtes
      const chunks = this.chunkArray(months, 10)
      const results = await Promise.all(
        chunks.map((chunk) => this.getPaginatedByMonths(chunk, 1, 10000)),
      )
      const allData = results.flatMap((r) => r.data)

      // Trier par jour de naissance
      allData.sort((a, b) => a.birthDay - b.birthDay)

      // Paginer
      const startIndex = (page - 1) * limit
      return {
        data: allData.slice(startIndex, startIndex + limit),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(allData.length / limit),
          totalItems: allData.length,
          hasNextPage: startIndex + limit < allData.length,
          hasPrevPage: page > 1,
        },
      }
    }

    // Requête unique (≤ 10 mois)
    const q = query(
      usersRef,
      where('birthMonth', 'in', months),
      where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
      orderBy('birthDay', 'asc'),
    )

    const [snapshot, countSnapshot] = await Promise.all([
      getDocs(q),
      getCountFromServer(q),
    ])

    const currentYear = new Date().getFullYear()
    const allData: BirthdayMember[] = []

    for (const docSnap of snapshot.docs) {
      try {
        const userData = docSnap.data() as User & {
          birthMonth?: number
          birthDay?: number
          birthDayOfYear?: number
        }
        const birthdayMember = BirthdaysService.transformToBirthdayMember(
          { ...userData, id: docSnap.id },
          currentYear,
        )
        allData.push(birthdayMember)
      } catch (error) {
        console.warn(
          `[BirthdaysRepository] Erreur transformation membre ${docSnap.id}:`,
          error,
        )
        continue
      }
    }

    // Paginer
    const startIndex = (page - 1) * limit

    return {
      data: allData.slice(startIndex, startIndex + limit),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(countSnapshot.data().count / limit),
        totalItems: countSnapshot.data().count,
        hasNextPage: startIndex + limit < allData.length,
        hasPrevPage: page > 1,
      },
    }
  }

  /**
   * Compte total des membres avec date de naissance
   * 
   * Utilise getCountFromServer pour un comptage efficace
   */
  private async getTotalCount(): Promise<number> {
    const usersRef = collection(db, firebaseCollectionNames.users)
    const q = query(
      usersRef,
      where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
    )
    const countSnapshot = await getCountFromServer(q)
    return countSnapshot.data().count
  }

  /**
   * Divise un tableau en chunks de taille maximale
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}
