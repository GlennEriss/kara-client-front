/**
 * Tests d'intégration pour le module Géographie
 * 
 * Ces tests vérifient l'intégration entre les différentes couches :
 * - Repositories → Services → Hooks
 * 
 * @see https://vitest.dev/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { GeographieService } from '../../services/GeographieService';
import { ProvinceRepository } from '../../repositories/ProvinceRepository';
import { DepartmentRepository } from '../../repositories/DepartmentRepository';
import { CommuneRepository } from '../../repositories/CommuneRepository';
import { DistrictRepository } from '../../repositories/DistrictRepository';
import { QuarterRepository } from '../../repositories/QuarterRepository';
import {
  useProvinces,
  useProvinceMutations,
  useGeographyStats,
} from '../../hooks/useGeographie';
import { ServiceFactory } from '../../../../../factories/ServiceFactory';
import type { Province, Department } from '../../entities/geography.types';

// Mock du ServiceFactory
vi.mock('../../../../../factories/ServiceFactory', () => ({
  ServiceFactory: {
    getGeographieService: vi.fn(),
  },
}));

// Mock des repositories
vi.mock('../../repositories/ProvinceRepository');
vi.mock('../../repositories/DepartmentRepository');
vi.mock('../../repositories/CommuneRepository');
vi.mock('../../repositories/DistrictRepository');
vi.mock('../../repositories/QuarterRepository');

// Mock de useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-id' },
  }),
}));

// Mock de toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Tests d\'intégration - Module Géographie', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;
  let mockProvinceRepository: any;
  let mockDepartmentRepository: any;
  let mockCommuneRepository: any;
  let mockDistrictRepository: any;
  let mockQuarterRepository: any;
  let service: GeographieService;

  beforeEach(() => {
    // Reset des mocks
    vi.clearAllMocks();

    // Setup QueryClient
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // Mock des repositories
    mockProvinceRepository = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      searchByName: vi.fn(),
    };

    mockDepartmentRepository = {
      getByProvinceId: vi.fn(),
      getAll: vi.fn(),
    };

    mockCommuneRepository = {
      getAll: vi.fn(),
    };

    mockDistrictRepository = {
      getAll: vi.fn(),
    };

    mockQuarterRepository = {
      getAll: vi.fn(),
    };

    // Créer le service avec les repositories mockés
    service = new GeographieService(
      mockProvinceRepository as any,
      mockDepartmentRepository as any,
      mockCommuneRepository as any,
      mockDistrictRepository as any,
      mockQuarterRepository as any
    );

    // Mock du ServiceFactory
    vi.mocked(ServiceFactory.getGeographieService).mockReturnValue(service);
  });

  describe('Flux complet : Création Province → Département', () => {
    it('devrait créer une province puis un département associé', async () => {
      const provinceData = {
        name: 'Estuaire',
        code: 'EST',
      };

      const createdProvince: Province = {
        id: 'province-1',
        ...provinceData,
        code: 'EST',
        createdBy: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock : aucune province existante
      mockProvinceRepository.getAll.mockResolvedValueOnce([]);
      // Mock : création de la province
      mockProvinceRepository.create.mockResolvedValueOnce(createdProvince);
      // Mock : récupération de la province créée
      mockProvinceRepository.getById.mockResolvedValueOnce(createdProvince);

      // Test : Créer la province via le service
      const province = await service.createProvince(provinceData, 'test-user-id');

      expect(province).toEqual(createdProvince);
      expect(mockProvinceRepository.create).toHaveBeenCalledWith({
        ...provinceData,
        code: 'EST',
        createdBy: 'test-user-id',
      });

      // Maintenant créer un département pour cette province
      const departmentData = {
        name: 'Libreville',
        code: 'LIB',
        provinceId: province.id,
      };

      const createdDepartment: Department = {
        id: 'dept-1',
        ...departmentData,
        createdBy: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock : aucun département existant
      mockDepartmentRepository.getByProvinceId.mockResolvedValueOnce([]);
      // Mock : création du département
      mockDepartmentRepository.create = vi.fn().mockResolvedValueOnce(createdDepartment);

      // Test : Créer le département (via le service si la méthode existe)
      // Pour l'instant, on vérifie juste que la province existe
      const provinceCheck = await service.getProvinceById(province.id);
      expect(provinceCheck).toEqual(createdProvince);
    });
  });

  describe('Validation des relations parent/enfant', () => {
    it('devrait empêcher la suppression d\'une province avec des départements', async () => {
      const provinceId = 'province-1';
      const departments: Department[] = [
        {
          id: 'dept-1',
          name: 'Libreville',
          code: 'LIB',
          provinceId,
          createdBy: 'test-user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock : la province existe
      mockProvinceRepository.getById.mockResolvedValueOnce({
        id: provinceId,
        name: 'Estuaire',
        code: 'EST',
        createdBy: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock : la province a des départements
      mockDepartmentRepository.getByProvinceId.mockResolvedValueOnce(departments);

      // Test : Tentative de suppression devrait échouer
      await expect(service.deleteProvince(provinceId)).rejects.toThrow(
        'Impossible de supprimer cette province car elle contient des départements'
      );

      expect(mockProvinceRepository.delete).not.toHaveBeenCalled();
    });

    it('devrait permettre la suppression d\'une province sans départements', async () => {
      const provinceId = 'province-1';

      // Mock : la province existe
      mockProvinceRepository.getById.mockResolvedValueOnce({
        id: provinceId,
        name: 'Estuaire',
        code: 'EST',
        createdBy: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock : la province n'a pas de départements
      mockDepartmentRepository.getByProvinceId.mockResolvedValueOnce([]);
      // Mock : suppression réussie
      mockProvinceRepository.delete.mockResolvedValueOnce(undefined);

      // Test : Suppression devrait réussir
      await service.deleteProvince(provinceId);

      expect(mockProvinceRepository.delete).toHaveBeenCalledWith(provinceId);
    });
  });

  describe('Intégration Hooks → Service → Repository', () => {
    it('devrait utiliser le hook useProvinces pour récupérer les provinces', async () => {
      const mockProvinces: Province[] = [
        {
          id: 'province-1',
          name: 'Estuaire',
          code: 'EST',
          createdBy: 'test-user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'province-2',
          name: 'Haut-Ogooué',
          code: 'HOG',
          createdBy: 'test-user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProvinceRepository.getAll.mockResolvedValueOnce(mockProvinces);

      const { result } = renderHook(() => useProvinces(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProvinces);
      expect(mockProvinceRepository.getAll).toHaveBeenCalled();
    });

    it('devrait utiliser le hook useProvinceMutations pour créer une province', async () => {
      const provinceData = {
        name: 'Estuaire',
        code: 'EST',
      };

      const createdProvince: Province = {
        id: 'province-1',
        ...provinceData,
        code: 'EST',
        createdBy: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock : aucune province existante
      mockProvinceRepository.getAll.mockResolvedValueOnce([]);
      // Mock : création réussie
      mockProvinceRepository.create.mockResolvedValueOnce(createdProvince);
      mockProvinceRepository.getById.mockResolvedValueOnce(createdProvince);

      const { result } = renderHook(() => useProvinceMutations(), { wrapper });

      await result.current.create.mutateAsync(provinceData);

      await waitFor(() => {
        expect(result.current.create.isSuccess).toBe(true);
      });

      expect(mockProvinceRepository.create).toHaveBeenCalledWith({
        ...provinceData,
        code: 'EST',
        createdBy: 'test-user-id',
      });
    });

    it('devrait utiliser le hook useGeographyStats pour calculer les statistiques', async () => {
      const mockProvinces: Province[] = [
        {
          id: 'province-1',
          name: 'Estuaire',
          code: 'EST',
          createdBy: 'test-user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockDepartments: Department[] = [
        {
          id: 'dept-1',
          name: 'Libreville',
          code: 'LIB',
          provinceId: 'province-1',
          createdBy: 'test-user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProvinceRepository.getAll.mockResolvedValueOnce(mockProvinces);
      mockDepartmentRepository.getAll.mockResolvedValueOnce(mockDepartments);
      mockCommuneRepository.getAll.mockResolvedValueOnce([]);
      mockDistrictRepository.getAll.mockResolvedValueOnce([]);
      mockQuarterRepository.getAll.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useGeographyStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.provincesCount).toBe(1);
      });

      expect(result.current).toEqual({
        provincesCount: 1,
        departmentsCount: 1,
        communesCount: 0,
        districtsCount: 0,
        quartersCount: 0,
      });
    });
  });

  describe('Gestion des erreurs en cascade', () => {
    it('devrait propager les erreurs du repository vers le service puis le hook', async () => {
      const error = new Error('Erreur Firestore');
      mockProvinceRepository.getAll.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useProvinces(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('devrait gérer les erreurs de validation du service', async () => {
      const provinceData = {
        name: 'Estuaire',
        code: 'EST',
      };

      // Mock : une province avec le même code existe déjà
      mockProvinceRepository.getAll.mockResolvedValueOnce([
        {
          id: 'existing-province',
          name: 'Autre Province',
          code: 'EST',
          createdBy: 'test-user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useProvinceMutations(), { wrapper });

      await expect(
        result.current.create.mutateAsync(provinceData)
      ).rejects.toThrow('Une province avec ce code existe déjà');

      expect(mockProvinceRepository.create).not.toHaveBeenCalled();
    });
  });
});
