/**
 * Tests unitaires pour GeographieService
 * 
 * @see https://vitest.dev/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeographieService } from '../../services/GeographieService';
import { ProvinceRepository } from '../../repositories/ProvinceRepository';
import { DepartmentRepository } from '../../repositories/DepartmentRepository';
import { CommuneRepository } from '../../repositories/CommuneRepository';
import { DistrictRepository } from '../../repositories/DistrictRepository';
import { QuarterRepository } from '../../repositories/QuarterRepository';
import type { Province } from '../../entities/geography.types';

// Mock des repositories
vi.mock('../../repositories/ProvinceRepository');
vi.mock('../../repositories/DepartmentRepository');
vi.mock('../../repositories/CommuneRepository');
vi.mock('../../repositories/DistrictRepository');
vi.mock('../../repositories/QuarterRepository');

describe('GeographieService - Provinces', () => {
  let service: GeographieService;
  let mockProvinceRepository: any;
  let mockDepartmentRepository: any;
  let mockCommuneRepository: any;
  let mockDistrictRepository: any;
  let mockQuarterRepository: any;

  beforeEach(() => {
    // Créer des mocks pour chaque repository
    mockProvinceRepository = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      searchByName: vi.fn(),
    };

    mockDepartmentRepository = {
      getAll: vi.fn(),
      getById: vi.fn(),
      getByProvinceId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockCommuneRepository = {
      getAll: vi.fn(),
      getById: vi.fn(),
      getByDepartmentId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockDistrictRepository = {
      getAll: vi.fn(),
      getById: vi.fn(),
      getByCommuneId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockQuarterRepository = {
      getAll: vi.fn(),
      getById: vi.fn(),
      getByDistrictId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    service = new GeographieService(
      mockProvinceRepository as any,
      mockDepartmentRepository as any,
      mockCommuneRepository as any,
      mockDistrictRepository as any,
      mockQuarterRepository as any
    );
  });

  describe('createProvince', () => {
    it('devrait créer une province avec un code unique', async () => {
      const existingProvinces: Province[] = [];
      const newProvince: Province = {
        id: 'new-id',
        name: 'Nouvelle Province',
        code: 'NP',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-id',
      };

      mockProvinceRepository.getAll.mockResolvedValue(existingProvinces);
      mockProvinceRepository.create.mockResolvedValue(newProvince);

      const result = await service.createProvince(
        { name: 'Nouvelle Province', code: 'np' },
        'user-id'
      );

      expect(result).toEqual(newProvince);
      expect(mockProvinceRepository.getAll).toHaveBeenCalled();
      expect(mockProvinceRepository.create).toHaveBeenCalledWith({
        name: 'Nouvelle Province',
        code: 'NP', // Vérifier que le code est en majuscules
        createdBy: 'user-id',
      });
    });

    it('devrait rejeter si le code existe déjà', async () => {
      const existingProvinces: Province[] = [
        {
          id: '1',
          name: 'Existante',
          code: 'NP',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-id',
        },
      ];

      mockProvinceRepository.getAll.mockResolvedValue(existingProvinces);

      await expect(
        service.createProvince({ name: 'Nouvelle', code: 'np' }, 'user-id')
      ).rejects.toThrow('Une province avec ce code existe déjà');

      expect(mockProvinceRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateProvince', () => {
    it('devrait mettre à jour une province existante', async () => {
      const existingProvince: Province = {
        id: '1',
        name: 'Ancienne',
        code: 'OLD',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-id',
      };

      const updatedProvince: Province = {
        ...existingProvince,
        name: 'Nouvelle',
        code: 'NEW',
        updatedBy: 'user-id',
      };

      mockProvinceRepository.getById.mockResolvedValue(existingProvince);
      mockProvinceRepository.getAll.mockResolvedValue([existingProvince]);
      mockProvinceRepository.update.mockResolvedValue(updatedProvince);

      const result = await service.updateProvince(
        '1',
        { name: 'Nouvelle', code: 'new' },
        'user-id'
      );

      expect(result).toEqual(updatedProvince);
      expect(mockProvinceRepository.update).toHaveBeenCalledWith('1', {
        name: 'Nouvelle',
        code: 'NEW',
        updatedBy: 'user-id',
      });
    });

    it('devrait rejeter si la province n\'existe pas', async () => {
      mockProvinceRepository.getById.mockResolvedValue(null);

      await expect(
        service.updateProvince('999', { name: 'Test' }, 'user-id')
      ).rejects.toThrow('Province introuvable');
    });
  });

  describe('deleteProvince', () => {
    it('devrait supprimer une province sans départements', async () => {
      mockDepartmentRepository.getByProvinceId.mockResolvedValue([]);
      mockProvinceRepository.delete.mockResolvedValue(undefined);

      await service.deleteProvince('1');

      expect(mockDepartmentRepository.getByProvinceId).toHaveBeenCalledWith('1');
      expect(mockProvinceRepository.delete).toHaveBeenCalledWith('1');
    });

    it('devrait rejeter si la province a des départements', async () => {
      mockDepartmentRepository.getByProvinceId.mockResolvedValue([
        { id: '1', name: 'Département 1', provinceId: '1' },
      ]);

      await expect(service.deleteProvince('1')).rejects.toThrow(
        'Impossible de supprimer cette province car elle contient des départements'
      );

      expect(mockProvinceRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getAllProvinces', () => {
    it('devrait retourner toutes les provinces', async () => {
      const provinces: Province[] = [
        {
          id: '1',
          name: 'Province 1',
          code: 'P1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-id',
        },
        {
          id: '2',
          name: 'Province 2',
          code: 'P2',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-id',
        },
      ];

      mockProvinceRepository.getAll.mockResolvedValue(provinces);

      const result = await service.getAllProvinces();

      expect(result).toEqual(provinces);
      expect(mockProvinceRepository.getAll).toHaveBeenCalled();
    });
  });

  describe('createDistrictsBulk', () => {
    it('devrait créer plusieurs arrondissements en masse', async () => {
      const communeId = 'commune-1';
      const count = 5;
      
      // Mock la commune pour qu'elle existe
      mockCommuneRepository.getById.mockResolvedValue({
        id: communeId,
        name: 'Libreville',
        departmentId: 'dept-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-id',
      });
      
      // Mock qu'il n'y a pas d'arrondissements existants
      mockDistrictRepository.getByCommuneId.mockResolvedValue([]);
      
      mockDistrictRepository.create = vi.fn()
        .mockResolvedValueOnce({ id: '1', name: 'Arrondissement 1', communeId, createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-id' })
        .mockResolvedValueOnce({ id: '2', name: 'Arrondissement 2', communeId, createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-id' })
        .mockResolvedValueOnce({ id: '3', name: 'Arrondissement 3', communeId, createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-id' })
        .mockResolvedValueOnce({ id: '4', name: 'Arrondissement 4', communeId, createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-id' })
        .mockResolvedValueOnce({ id: '5', name: 'Arrondissement 5', communeId, createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-id' });

      const result = await service.createDistrictsBulk(communeId, count, 'user-id');

      expect(result).toHaveLength(5);
      expect(mockCommuneRepository.getById).toHaveBeenCalledWith(communeId);
      expect(mockDistrictRepository.create).toHaveBeenCalledTimes(5);
      expect(result[0].name).toBe('Arrondissement 1');
      expect(result[4].name).toBe('Arrondissement 5');
    });

    it('devrait rejeter si le count est invalide', async () => {
      await expect(
        service.createDistrictsBulk('commune-1', 0, 'user-id')
      ).rejects.toThrow();
    });
  });

  describe('getProvinceById', () => {
    it('devrait retourner une province par ID', async () => {
      const province: Province = {
        id: '1',
        name: 'Province 1',
        code: 'P1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-id',
      };

      mockProvinceRepository.getById.mockResolvedValue(province);

      const result = await service.getProvinceById('1');

      expect(result).toEqual(province);
      expect(mockProvinceRepository.getById).toHaveBeenCalledWith('1');
    });

    it('devrait retourner null si la province n\'existe pas', async () => {
      mockProvinceRepository.getById.mockResolvedValue(null);

      const result = await service.getProvinceById('999');

      expect(result).toBeNull();
    });
  });

  describe('searchProvinces', () => {
    it('devrait rechercher des provinces par nom', async () => {
      const provinces: Province[] = [
        {
          id: '1',
          name: 'Estuaire',
          code: 'EST',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-id',
        },
      ];

      mockProvinceRepository.searchByName.mockResolvedValue(provinces);

      const result = await service.searchProvinces('Estuaire');

      expect(result).toEqual(provinces);
      expect(mockProvinceRepository.searchByName).toHaveBeenCalledWith('Estuaire');
    });
  });
});
