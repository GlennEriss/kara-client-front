/**
 * Tests unitaires pour BirthdaysService
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BirthdaysService } from '../BirthdaysService'
import type { User } from '@/types/types'

describe('BirthdaysService', () => {
  describe('calculateBirthdayInfo', () => {
    it('UNIT-BS-01: devrait calculer J-23 pour anniversaire à venir', () => {
      const today = new Date('2026-01-23')
      const birthDate = '1997-02-15'

      const result = BirthdaysService.calculateBirthdayInfo(birthDate, today)

      expect(result.daysUntil).toBe(23)
      expect(result.age).toBe(29)
      expect(result.isToday).toBe(false)
      expect(result.isTomorrow).toBe(false)
      expect(result.nextBirthday.getFullYear()).toBe(2026)
      expect(result.nextBirthday.getMonth()).toBe(1) // Février (0-indexed)
      expect(result.nextBirthday.getDate()).toBe(15)
    })

    it('UNIT-BS-02: devrait calculer J-352 pour anniversaire passé cette année', () => {
      const today = new Date('2026-01-23')
      const birthDate = '1990-01-10'

      const result = BirthdaysService.calculateBirthdayInfo(birthDate, today)

      expect(result.daysUntil).toBe(352) // 10 janvier 2027
      expect(result.nextBirthday.getFullYear()).toBe(2027)
      expect(result.nextBirthday.getMonth()).toBe(0) // Janvier
      expect(result.nextBirthday.getDate()).toBe(10)
    })

    it('UNIT-BS-03: devrait détecter anniversaire aujourd\'hui', () => {
      const today = new Date('2026-01-23')
      const birthDate = '1995-01-23'

      const result = BirthdaysService.calculateBirthdayInfo(birthDate, today)

      expect(result.daysUntil).toBe(0)
      expect(result.isToday).toBe(true)
      expect(result.age).toBe(31)
      expect(result.nextBirthday.getFullYear()).toBe(2026)
    })

    it('UNIT-BS-04: devrait détecter anniversaire demain', () => {
      const today = new Date('2026-01-23')
      const birthDate = '1995-01-24'

      const result = BirthdaysService.calculateBirthdayInfo(birthDate, today)

      expect(result.daysUntil).toBe(1)
      expect(result.isTomorrow).toBe(true)
      expect(result.isToday).toBe(false)
    })

    it('devrait gérer les dates invalides', () => {
      const today = new Date('2026-01-23')
      const birthDate = 'invalid-date'

      expect(() => {
        BirthdaysService.calculateBirthdayInfo(birthDate, today)
      }).toThrow('Date de naissance invalide')
    })
  })

  describe('calculateDayOfYear', () => {
    it('UNIT-BS-05: devrait retourner 1 pour le 1er janvier', () => {
      const date = new Date('2026-01-01')
      expect(BirthdaysService.calculateDayOfYear(date)).toBe(1)
    })

    it('UNIT-BS-06: devrait retourner 365 pour le 31 décembre (année non bissextile)', () => {
      const date = new Date('2026-12-31')
      expect(BirthdaysService.calculateDayOfYear(date)).toBe(365)
    })

    it('UNIT-BS-07: devrait retourner 60 pour le 29 février (année bissextile)', () => {
      const date = new Date('2024-02-29')
      expect(BirthdaysService.calculateDayOfYear(date)).toBe(60)
    })

    it('devrait retourner 366 pour le 31 décembre (année bissextile)', () => {
      const date = new Date('2024-12-31')
      expect(BirthdaysService.calculateDayOfYear(date)).toBe(366)
    })

    it('devrait retourner des valeurs entre 1 et 366', () => {
      for (let month = 0; month < 12; month++) {
        for (let day = 1; day <= 28; day++) {
          const date = new Date(2026, month, day)
          const dayOfYear = BirthdaysService.calculateDayOfYear(date)
          expect(dayOfYear).toBeGreaterThanOrEqual(1)
          expect(dayOfYear).toBeLessThanOrEqual(366)
        }
      }
    })
  })

  describe('transformToBirthdayMember', () => {
    it('UNIT-BS-08: devrait transformer User en BirthdayMember avec tous les champs', () => {
      const user: User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number } = {
        id: '1234.MK.567890',
        matricule: '1234.MK.567890',
        firstName: 'Jean',
        lastName: 'Dupont',
        birthDate: '1990-01-15',
        birthMonth: 1,
        birthDay: 15,
        birthDayOfYear: 15,
        photoURL: 'https://example.com/photo.jpg',
        email: 'jean@example.com',
        contacts: ['+24101234567'],
        gender: 'Homme',
        nationality: 'Gabonaise',
        hasCar: true,
        address: {
          province: 'Estuaire',
          city: 'Libreville',
          district: 'Centre-ville',
          arrondissement: '1er Arrondissement',
        },
        companyName: 'Test Corp',
        profession: 'Ingénieur',
        photoPath: null,
        identityDocument: 'CNI',
        identityDocumentNumber: '123456',
        subscriptions: [],
        dossier: 'dossier-123',
        membershipType: 'adherant',
        roles: ['Adherant'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      }

      const year = 2026
      const result = BirthdaysService.transformToBirthdayMember(user, year)

      expect(result.id).toBe(user.id)
      expect(result.matricule).toBe(user.matricule)
      expect(result.firstName).toBe(user.firstName)
      expect(result.lastName).toBe(user.lastName)
      expect(result.photoURL).toBe(user.photoURL)
      expect(result.birthDate).toBe(user.birthDate)
      expect(result.birthMonth).toBe(1)
      expect(result.birthDay).toBe(15)
      expect(result.daysUntil).toBeGreaterThanOrEqual(0)
      expect(result.age).toBeGreaterThanOrEqual(0)
      expect(result.nextBirthday).toBeInstanceOf(Date)
    })

    it('devrait gérer photoURL null', () => {
      const user: User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number } = {
        id: '1234.MK.567890',
        matricule: '1234.MK.567890',
        firstName: 'Jean',
        lastName: 'Dupont',
        birthDate: '1990-01-15',
        birthMonth: 1,
        birthDay: 15,
        birthDayOfYear: 15,
        photoURL: null,
        email: 'jean@example.com',
        contacts: [],
        gender: 'Homme',
        nationality: 'Gabonaise',
        hasCar: false,
        address: {
          province: '',
          city: '',
          district: '',
          arrondissement: '',
        },
        subscriptions: [],
        dossier: '',
        membershipType: 'adherant',
        roles: ['Adherant'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      }

      const result = BirthdaysService.transformToBirthdayMember(user, 2026)

      expect(result.photoURL).toBeUndefined()
    })

    it('devrait calculer birthMonth et birthDay depuis birthDate si absents', () => {
      const user: User & { birthMonth?: number; birthDay?: number; birthDayOfYear?: number } = {
        id: '1234.MK.567890',
        matricule: '1234.MK.567890',
        firstName: 'Jean',
        lastName: 'Dupont',
        birthDate: '1990-03-20',
        // birthMonth et birthDay absents
        email: 'jean@example.com',
        contacts: [],
        gender: 'Homme',
        nationality: 'Gabonaise',
        hasCar: false,
        address: {
          province: '',
          city: '',
          district: '',
          arrondissement: '',
        },
        subscriptions: [],
        dossier: '',
        membershipType: 'adherant',
        roles: ['Adherant'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      }

      const result = BirthdaysService.transformToBirthdayMember(user, 2026)

      expect(result.birthMonth).toBe(3)
      expect(result.birthDay).toBe(20)
    })
  })
})
