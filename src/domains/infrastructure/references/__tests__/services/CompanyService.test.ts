/**
 * Tests unitaires pour CompanyService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CompanyService } from '../../services/CompanyService'
import type { ICompanyRepository } from '../../repositories/ICompanyRepository'
import type { Company } from '../../entities/company.types'

describe('CompanyService', () => {
  let service: CompanyService
  let mockRepository: ICompanyRepository

  beforeEach(() => {
    mockRepository = {
      name: 'CompanyRepository',
      findByName: vi.fn(),
      create: vi.fn(),
      getById: vi.fn(),
      getAll: vi.fn(),
      getPaginated: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findOrCreate: vi.fn(),
    } as any

    service = new CompanyService(mockRepository)
  })

  describe('findByName', () => {
    it('devrait appeler le repository findByName', async () => {
      const mockResult = { found: true, company: { id: 'comp-1', name: 'Test' } as Company }
      vi.mocked(mockRepository.findByName).mockResolvedValue(mockResult)

      const result = await service.findByName('Test')

      expect(mockRepository.findByName).toHaveBeenCalledWith('Test')
      expect(result).toEqual(mockResult)
    })
  })

  describe('create', () => {
    it('devrait créer une entreprise via le repository', async () => {
      const newCompany = {
        name: 'New Company',
        normalizedName: 'new company',
        createdBy: 'admin-1',
      }
      const createdCompany = { id: 'comp-1', ...newCompany, createdAt: new Date(), updatedAt: new Date() } as Company

      vi.mocked(mockRepository.create).mockResolvedValue(createdCompany)

      const result = await service.create(newCompany, 'admin-1')

      expect(mockRepository.create).toHaveBeenCalledWith(newCompany, 'admin-1')
      expect(result).toEqual(createdCompany)
    })
  })

  describe('getPaginated', () => {
    it('devrait récupérer les entreprises paginées', async () => {
      const mockResult = {
        data: [{ id: 'comp-1', name: 'Company 1' } as Company],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }

      vi.mocked(mockRepository.getPaginated).mockResolvedValue(mockResult)

      const result = await service.getPaginated({ search: 'Company' }, 1, 10)

      expect(mockRepository.getPaginated).toHaveBeenCalledWith({ search: 'Company' }, 1, 10)
      expect(result).toEqual(mockResult)
    })
  })

  describe('update', () => {
    it('devrait mettre à jour une entreprise', async () => {
      const updatedCompany = { id: 'comp-1', name: 'Updated Company' } as Company
      vi.mocked(mockRepository.update).mockResolvedValue(updatedCompany)

      const result = await service.update('comp-1', { name: 'Updated Company' })

      expect(mockRepository.update).toHaveBeenCalledWith('comp-1', { name: 'Updated Company' })
      expect(result).toEqual(updatedCompany)
    })
  })

  describe('delete', () => {
    it('devrait supprimer une entreprise', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue(undefined)

      await service.delete('comp-1')

      expect(mockRepository.delete).toHaveBeenCalledWith('comp-1')
    })
  })

  describe('findOrCreate', () => {
    it('devrait trouver ou créer une entreprise', async () => {
      const mockResult = { id: 'comp-1', isNew: false }
      vi.mocked(mockRepository.findOrCreate).mockResolvedValue(mockResult)

      const result = await service.findOrCreate('Test Company', 'admin-1')

      expect(mockRepository.findOrCreate).toHaveBeenCalledWith('Test Company', 'admin-1', undefined)
      expect(result).toEqual(mockResult)
    })
  })
})
