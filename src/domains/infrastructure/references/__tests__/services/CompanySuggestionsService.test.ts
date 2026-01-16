/**
 * Tests unitaires pour CompanySuggestionsService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CompanySuggestionsService } from '../../services/CompanySuggestionsService'
import type { ICompanyRepository } from '../../repositories/ICompanyRepository'
import type { Company } from '../../entities/company.types'

describe('CompanySuggestionsService', () => {
  let service: CompanySuggestionsService
  let mockRepository: ICompanyRepository

  beforeEach(() => {
    mockRepository = {
      name: 'CompanyRepository',
      findByName: vi.fn(),
    } as any

    service = new CompanySuggestionsService(mockRepository)
  })

  describe('searchCompanies', () => {
    it('devrait retourner une liste vide si la query est trop courte', async () => {
      const result = await service.searchCompanies('a')

      expect(result).toEqual([])
      expect(mockRepository.findByName).not.toHaveBeenCalled()
    })

    it('devrait retourner l\'entreprise trouvée avec l\'option "Créer"', async () => {
      const mockCompany: Company = {
        id: 'comp-1',
        name: 'Total Gabon',
        normalizedName: 'total gabon',
        address: { province: 'Estuaire', city: 'Libreville' },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1',
      }

      vi.mocked(mockRepository.findByName).mockResolvedValue({
        found: true,
        company: mockCompany,
      })

      const result = await service.searchCompanies('Total')

      expect(result).toHaveLength(2) // L'entreprise trouvée + l'option "Créer"
      expect(result[0].name).toBe('Total Gabon')
      expect(result[0].isNew).toBe(false)
      expect(result[0].hasAddress).toBe(true)
      expect(result[1].isNew).toBe(true)
    })

    it('devrait retourner les suggestions si l\'entreprise n\'existe pas', async () => {
      vi.mocked(mockRepository.findByName).mockResolvedValue({
        found: false,
        suggestions: ['Total Gabon', 'Total Energie'],
      })

      const result = await service.searchCompanies('Total')

      expect(result).toHaveLength(3) // 2 suggestions + l'option "Créer"
      expect(result[0].name).toBe('Total Gabon')
      expect(result[0].isNew).toBe(false)
      expect(result[2].isNew).toBe(true)
    })
  })

  describe('loadCompanyAddress', () => {
    it('devrait charger l\'adresse d\'une entreprise existante', async () => {
      const mockCompany: Company = {
        id: 'comp-1',
        name: 'Total Gabon',
        normalizedName: 'total gabon',
        address: {
          province: 'Estuaire',
          city: 'Libreville',
          district: 'Akanda',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1',
      }

      vi.mocked(mockRepository.findByName).mockResolvedValue({
        found: true,
        company: mockCompany,
      })

      const result = await service.loadCompanyAddress('Total Gabon')

      expect(result).toEqual({
        province: 'Estuaire',
        city: 'Libreville',
        district: 'Akanda',
      })
    })

    it('devrait retourner null si l\'entreprise n\'existe pas', async () => {
      vi.mocked(mockRepository.findByName).mockResolvedValue({
        found: false,
        suggestions: [],
      })

      const result = await service.loadCompanyAddress('Unknown Company')

      expect(result).toBeNull()
    })

    it('devrait retourner null si l\'entreprise n\'a pas d\'adresse', async () => {
      const mockCompany: Company = {
        id: 'comp-1',
        name: 'Total Gabon',
        normalizedName: 'total gabon',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1',
      }

      vi.mocked(mockRepository.findByName).mockResolvedValue({
        found: true,
        company: mockCompany,
      })

      const result = await service.loadCompanyAddress('Total Gabon')

      expect(result).toBeNull()
    })
  })
})
