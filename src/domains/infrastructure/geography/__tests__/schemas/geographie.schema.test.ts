/**
 * Tests unitaires pour les schemas de géographie
 * 
 * @see https://vitest.dev/
 */

import { describe, it, expect } from 'vitest'
import {
  provinceSchema,
  departmentSchema,
  communeSchema,
  districtSchema,
  districtBulkCreateSchema,
  quarterSchema,
} from '../../schemas/geographie.schema'

describe('geographie.schema', () => {
  describe('provinceSchema', () => {
    it('devrait valider un code et un nom valides', () => {
      const result = provinceSchema.safeParse({
        code: 'EST',
        name: 'Estuaire',
      })
      expect(result.success).toBe(true)
    })

    it('devrait rejeter un code vide', () => {
      const result = provinceSchema.safeParse({
        code: '',
        name: 'Estuaire',
      })
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un code avec des caractères invalides', () => {
      const result = provinceSchema.safeParse({
        code: 'est-1',
        name: 'Estuaire',
      })
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un nom vide', () => {
      const result = provinceSchema.safeParse({
        code: 'EST',
        name: '',
      })
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un nom trop long', () => {
      const result = provinceSchema.safeParse({
        code: 'EST',
        name: 'A'.repeat(101),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('departmentSchema', () => {
    it('devrait valider un département valide', () => {
      const result = departmentSchema.safeParse({
        provinceId: 'province-1',
        name: 'Libreville',
        code: 'LBV',
      })
      expect(result.success).toBe(true)
    })

    it('devrait valider un département sans code', () => {
      const result = departmentSchema.safeParse({
        provinceId: 'province-1',
        name: 'Libreville',
      })
      expect(result.success).toBe(true)
    })

    it('devrait rejeter un département sans provinceId', () => {
      const result = departmentSchema.safeParse({
        name: 'Libreville',
      })
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un code invalide', () => {
      const result = departmentSchema.safeParse({
        provinceId: 'province-1',
        name: 'Libreville',
        code: 'lbv-1',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('communeSchema', () => {
    it('devrait valider une commune valide', () => {
      const result = communeSchema.safeParse({
        departmentId: 'dept-1',
        name: 'Libreville',
        postalCode: '24100',
        alias: 'LBV',
      })
      expect(result.success).toBe(true)
    })

    it('devrait valider une commune sans code postal ni alias', () => {
      const result = communeSchema.safeParse({
        departmentId: 'dept-1',
        name: 'Libreville',
      })
      expect(result.success).toBe(true)
    })

    it('devrait rejeter une commune sans departmentId', () => {
      const result = communeSchema.safeParse({
        name: 'Libreville',
      })
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un code postal invalide', () => {
      const result = communeSchema.safeParse({
        departmentId: 'dept-1',
        name: 'Libreville',
        postalCode: '24100@',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('districtSchema', () => {
    it('devrait valider un arrondissement valide', () => {
      const result = districtSchema.safeParse({
        communeId: 'commune-1',
        name: 'Centre-Ville',
      })
      expect(result.success).toBe(true)
    })

    it('devrait rejeter un arrondissement sans communeId', () => {
      const result = districtSchema.safeParse({
        name: 'Centre-Ville',
      })
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un nom vide', () => {
      const result = districtSchema.safeParse({
        communeId: 'commune-1',
        name: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('districtBulkCreateSchema', () => {
    it('devrait valider une création en masse valide', () => {
      const result = districtBulkCreateSchema.safeParse({
        communeId: 'commune-1',
        count: 10,
      })
      expect(result.success).toBe(true)
    })

    it('devrait rejeter un count inférieur à 1', () => {
      const result = districtBulkCreateSchema.safeParse({
        communeId: 'commune-1',
        count: 0,
      })
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un count supérieur à 50', () => {
      const result = districtBulkCreateSchema.safeParse({
        communeId: 'commune-1',
        count: 51,
      })
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un count non entier', () => {
      const result = districtBulkCreateSchema.safeParse({
        communeId: 'commune-1',
        count: 10.5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('quarterSchema', () => {
    it('devrait valider un quartier valide', () => {
      const result = quarterSchema.safeParse({
        districtId: 'district-1',
        name: 'Quartier A',
      })
      expect(result.success).toBe(true)
    })

    it('devrait rejeter un quartier sans districtId', () => {
      const result = quarterSchema.safeParse({
        name: 'Quartier A',
      })
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un nom vide', () => {
      const result = quarterSchema.safeParse({
        districtId: 'district-1',
        name: '',
      })
      expect(result.success).toBe(false)
    })
  })
})
