import { describe, it, expect } from 'vitest'
import {
  generateEmail,
  generateSecurePassword,
  membershipTypeToRole,
} from '../approvalUtils'

describe('approvalUtils', () => {
  describe('generateEmail', () => {
    it('UNIT-APPROV-01: should generate email from firstName, lastName and matricule', () => {
      const email = generateEmail('Jean', 'Dupont', '1234.MK.567890')
      expect(email).toBe('jeandupont1234@kara.ga')
    })

    it('UNIT-APPROV-02: should handle special characters in names', () => {
      const email = generateEmail('Jean-Pierre', "D'Angelo", '1234.MK.567890')
      expect(email).toBe('jeanpierredangelo1234@kara.ga')
    })

    it('UNIT-APPROV-03: should handle names with accents', () => {
      const email = generateEmail('José', 'González', '1234.MK.567890')
      expect(email).toBe('josegonzalez1234@kara.ga')
    })

    it('UNIT-APPROV-04: should use first 4 digits of matricule', () => {
      const email = generateEmail('Jean', 'Dupont', '1234567890.MK.567890')
      expect(email).toBe('jeandupont1234@kara.ga')
    })

    it('UNIT-APPROV-05: should handle empty names', () => {
      const email = generateEmail('', '', '1234.MK.567890')
      expect(email).toBe('member1234@kara.ga')
    })

    it('should handle names with numbers', () => {
      const email = generateEmail('Jean2', 'Dupont3', '5678.MK.901234')
      expect(email).toBe('jean2dupont35678@kara.ga')
    })

    it('should handle single name', () => {
      const email = generateEmail('Jean', '', '1234.MK.567890')
      expect(email).toBe('jean1234@kara.ga')
    })
  })

  describe('generateSecurePassword', () => {
    it('UNIT-APPROV-06: should generate password with default length (12)', () => {
      const password = generateSecurePassword()
      expect(password.length).toBe(12)
    })

    it('UNIT-APPROV-07: should generate password with custom length', () => {
      const password = generateSecurePassword(16)
      expect(password.length).toBe(16)
    })

    it('UNIT-APPROV-08: should generate different passwords on each call', () => {
      const passwords = Array.from({ length: 100 }, () => generateSecurePassword())
      const uniquePasswords = new Set(passwords)
      expect(uniquePasswords.size).toBeGreaterThan(90)
    })

    it('UNIT-APPROV-09: should include uppercase, lowercase, numbers and special chars', () => {
      const password = generateSecurePassword(20)
      expect(password).toMatch(/[A-Z]/) // Au moins une majuscule
      expect(password).toMatch(/[a-z]/) // Au moins une minuscule
      expect(password).toMatch(/[0-9]/) // Au moins un chiffre
      expect(password).toMatch(/[!@#$%^&*]/) // Au moins un caractère spécial
    })

    it('should handle minimum length of 4', () => {
      const password = generateSecurePassword(4)
      expect(password.length).toBe(4)
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[0-9]/)
      expect(password).toMatch(/[!@#$%^&*]/)
    })
  })

  describe('membershipTypeToRole', () => {
    it('UNIT-APPROV-10: should convert adherant to Adherant', () => {
      expect(membershipTypeToRole('adherant')).toBe('Adherant')
    })

    it('UNIT-APPROV-11: should convert bienfaiteur to Bienfaiteur', () => {
      expect(membershipTypeToRole('bienfaiteur')).toBe('Bienfaiteur')
    })

    it('UNIT-APPROV-12: should convert sympathisant to Sympathisant', () => {
      expect(membershipTypeToRole('sympathisant')).toBe('Sympathisant')
    })

    it('UNIT-APPROV-13: should default to Adherant for unknown type', () => {
      expect(membershipTypeToRole('unknown')).toBe('Adherant')
    })

    it('should handle empty string', () => {
      expect(membershipTypeToRole('')).toBe('Adherant')
    })
  })
})
