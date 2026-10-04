import { describe, expect, it } from 'vitest'
import { generateTemporaryPassword, isValidNewPassword } from '../passwords'

describe('generateTemporaryPassword', () => {
  it('produit un mot de passe de 12 caractères avec minuscule, majuscule et chiffre', () => {
    for (let i = 0; i < 50; i++) {
      const pwd = generateTemporaryPassword()
      expect(pwd).toHaveLength(12)
      expect(pwd).toMatch(/[a-z]/)
      expect(pwd).toMatch(/[A-Z]/)
      expect(pwd).toMatch(/[0-9]/)
    }
  })

  it('ne répète pas le même mot de passe', () => {
    expect(generateTemporaryPassword()).not.toBe(generateTemporaryPassword())
  })
})

describe('isValidNewPassword', () => {
  it('exige 8 caractères, une lettre et un chiffre', () => {
    expect(isValidNewPassword('abcdefg1')).toBe(true)
    expect(isValidNewPassword('abc1')).toBe(false)
    expect(isValidNewPassword('abcdefgh')).toBe(false)
    expect(isValidNewPassword('12345678')).toBe(false)
    expect(isValidNewPassword(undefined)).toBe(false)
  })
})
