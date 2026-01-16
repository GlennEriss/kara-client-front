/**
 * Tests unitaires pour ProfessionService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfessionService } from '../../services/ProfessionService'
import type { IProfessionRepository } from '../../repositories/IProfessionRepository'
import type { Profession } from '../../entities/profession.types'

describe('ProfessionService', () => {
  let service: ProfessionService
  let mockRepository: IProfessionRepository

  beforeEach(() => {
    mockRepository = {
      name: 'ProfessionRepository',
      findByName: vi.fn(),
      create: vi.fn(),
      getById: vi.fn(),
      getAll: vi.fn(),
      getPaginated: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findOrCreate: vi.fn(),
    } as any

    service = new ProfessionService(mockRepository)
  })

  describe('findByName', () => {
    it('devrait appeler le repository findByName', async () => {
      const mockResult = { found: true, profession: { id: 'prof-1', name: 'Ingénieur' } as Profession }
      vi.mocked(mockRepository.findByName).mockResolvedValue(mockResult)

      const result = await service.findByName('Ingénieur')

      expect(mockRepository.findByName).toHaveBeenCalledWith('Ingénieur')
      expect(result).toEqual(mockResult)
    })
  })

  describe('create', () => {
    it('devrait créer une profession via le repository', async () => {
      const newProfession = {
        name: 'New Profession',
        normalizedName: 'new profession',
        createdBy: 'admin-1',
      }
      const createdProfession = { id: 'prof-1', ...newProfession, createdAt: new Date(), updatedAt: new Date() } as Profession

      vi.mocked(mockRepository.create).mockResolvedValue(createdProfession)

      const result = await service.create(newProfession, 'admin-1')

      expect(mockRepository.create).toHaveBeenCalledWith(newProfession, 'admin-1')
      expect(result).toEqual(createdProfession)
    })
  })

  describe('getPaginated', () => {
    it('devrait récupérer les professions paginées', async () => {
      const mockResult = {
        data: [{ id: 'prof-1', name: 'Profession 1' } as Profession],
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

      const result = await service.getPaginated({ search: 'Profession' }, 1, 10)

      expect(mockRepository.getPaginated).toHaveBeenCalledWith({ search: 'Profession' }, 1, 10)
      expect(result).toEqual(mockResult)
    })
  })

  describe('update', () => {
    it('devrait mettre à jour une profession', async () => {
      const updatedProfession = { id: 'prof-1', name: 'Updated Profession' } as Profession
      vi.mocked(mockRepository.update).mockResolvedValue(updatedProfession)

      const result = await service.update('prof-1', { name: 'Updated Profession' })

      expect(mockRepository.update).toHaveBeenCalledWith('prof-1', { name: 'Updated Profession' })
      expect(result).toEqual(updatedProfession)
    })
  })

  describe('delete', () => {
    it('devrait supprimer une profession', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue(undefined)

      await service.delete('prof-1')

      expect(mockRepository.delete).toHaveBeenCalledWith('prof-1')
    })
  })

  describe('findOrCreate', () => {
    it('devrait trouver ou créer une profession', async () => {
      const mockResult = { id: 'prof-1', isNew: false }
      vi.mocked(mockRepository.findOrCreate).mockResolvedValue(mockResult)

      const result = await service.findOrCreate('Test Profession', 'admin-1')

      expect(mockRepository.findOrCreate).toHaveBeenCalledWith('Test Profession', 'admin-1', undefined)
      expect(result).toEqual(mockResult)
    })
  })
})
