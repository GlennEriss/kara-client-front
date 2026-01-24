/**
 * Tests unitaires pour MembershipExportService
 * 
 * Teste les méthodes d'export CSV, Excel, PDF et la construction des lignes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MembershipExportService } from '../../../services/MembershipExportService'
import { MembersRepositoryV2 } from '../../../repositories/MembersRepositoryV2'
import type { MemberWithSubscription } from '@/db/member.db'
import type { UserFilters } from '@/types/types'
import { getMembershipRequestById } from '@/db/membership.db'

// Mock des dépendances
vi.mock('../../../repositories/MembersRepositoryV2')
vi.mock('@/db/membership.db')
vi.mock('@/constantes/nationality', () => ({
  getNationalityName: (code: string) => code || '',
}))

// Mock xlsx (import dynamique - await import('xlsx') retourne le module directement)
vi.mock('xlsx', async () => {
  return {
    default: {
      utils: {
        json_to_sheet: vi.fn(() => ({})),
        book_new: vi.fn(() => ({})),
        book_append_sheet: vi.fn(),
      },
      writeFile: vi.fn(),
    },
  }
})

// Mock jsPDF (import dynamique)
const mockJsPDF = vi.fn(() => ({
  setFontSize: vi.fn(),
  text: vi.fn(),
  save: vi.fn(),
}))

vi.mock('jspdf', () => ({
  jsPDF: mockJsPDF,
}))

// Mock jspdf-autotable (import dynamique)
const mockAutoTable = vi.fn()

vi.mock('jspdf-autotable', () => ({
  default: mockAutoTable,
}))

describe('MembershipExportService', () => {
  let service: MembershipExportService
  let mockRepository: any

  // Fixture de membre de test
  const createMemberFixture = (overrides: any = {}): MemberWithSubscription => ({
    id: 'user-1',
    firstName: 'Jean',
    lastName: 'Dupont',
    matricule: '1234.MK.567890',
    email: 'jean.dupont@example.com',
    gender: 'Homme',
    membershipType: 'adherant',
    isSubscriptionValid: true,
    lastSubscription: {
      dateStart: new Date('2024-01-01'),
      dateEnd: new Date('2025-01-01'),
    },
    createdAt: new Date('2024-01-01'),
    contacts: ['+33612345678'],
    hasCar: false,
    ...overrides,
  })

  // Fixture de dossier de test
  const createDossierFixture = (overrides: any = {}) => ({
    identity: {
      civility: 'Monsieur',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      birthDate: '1990-01-01',
      birthPlace: 'Paris',
      contacts: ['+33612345678'],
      gender: 'male',
      nationality: 'French',
      hasCar: false,
    },
    address: {
      province: 'Province1',
      city: 'City1',
      arrondissement: 'Arrondissement1',
      district: 'District1',
    },
    company: {
      companyName: 'Company1',
      profession: 'Engineer',
    },
    documents: {
      identityDocument: 'CNI',
      identityDocumentNumber: '123456789',
    },
    payments: [],
    ...overrides,
  })

  // Options d'export de test
  const createExportOptions = (overrides: any = {}) => ({
    filters: {} as UserFilters,
    format: 'csv' as const,
    sortOrder: 'A-Z' as const,
    quantityMode: 'custom' as const,
    quantity: 10,
    dateStart: new Date('2024-01-01'),
    dateEnd: new Date('2024-12-31'),
    vehicleFilter: 'all' as const,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock MembersRepositoryV2
    mockRepository = {
      getAll: vi.fn(),
    }
    vi.mocked(MembersRepositoryV2.getInstance).mockReturnValue(mockRepository as any)

    // Réinitialiser l'instance singleton
    ;(MembershipExportService as any).instance = undefined
    service = MembershipExportService.getInstance()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getInstance', () => {
    it('devrait retourner une instance singleton', () => {
      const instance1 = MembershipExportService.getInstance()
      const instance2 = MembershipExportService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('fetchMembersForExport', () => {
    it('devrait récupérer les membres avec pagination', async () => {
      const member1 = createMemberFixture({ id: 'user-1', createdAt: new Date('2024-06-01') })
      const member2 = createMemberFixture({ id: 'user-2', createdAt: new Date('2024-07-01') })

      mockRepository.getAll
        .mockResolvedValueOnce({
          data: [member1, member2],
          pagination: {
            hasNextPage: false,
            totalItems: 2,
          },
        })

      const options = createExportOptions()
      const result = await service.fetchMembersForExport(options)

      expect(result).toHaveLength(2)
      expect(mockRepository.getAll).toHaveBeenCalledWith(
        expect.objectContaining({}),
        1,
        100,
      )
    })

    it('devrait filtrer par plage de dates', async () => {
      const memberInRange = createMemberFixture({ 
        id: 'user-1', 
        createdAt: new Date('2024-06-01') 
      })
      const memberOutOfRange = createMemberFixture({ 
        id: 'user-2', 
        createdAt: new Date('2023-12-01') 
      })

      mockRepository.getAll.mockResolvedValueOnce({
        data: [memberInRange, memberOutOfRange],
        pagination: {
          hasNextPage: false,
          totalItems: 2,
        },
      })

      const options = createExportOptions({
        dateStart: new Date('2024-01-01'),
        dateEnd: new Date('2024-12-31'),
      })

      const result = await service.fetchMembersForExport(options)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('user-1')
    })

    it('devrait appliquer le filtre véhicule', async () => {
      const memberWithCar = createMemberFixture({ 
        id: 'user-1', 
        hasCar: true,
        createdAt: new Date('2024-06-01'),
      })
      const memberWithoutCar = createMemberFixture({ 
        id: 'user-2', 
        hasCar: false,
        createdAt: new Date('2024-06-01'),
      })

      mockRepository.getAll.mockResolvedValueOnce({
        data: [memberWithCar, memberWithoutCar],
        pagination: {
          hasNextPage: false,
          totalItems: 2,
        },
      })

      const options = createExportOptions({
        vehicleFilter: 'with',
      })

      await service.fetchMembersForExport(options)

      expect(mockRepository.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ hasCar: true }),
        1,
        100,
      )
    })

    it('devrait trier par ordre alphabétique A-Z', async () => {
      const memberA = createMemberFixture({ 
        id: 'user-1', 
        firstName: 'Alice',
        lastName: 'Dupont',
        createdAt: new Date('2024-06-01'),
      })
      const memberB = createMemberFixture({ 
        id: 'user-2', 
        firstName: 'Bob',
        lastName: 'Martin',
        createdAt: new Date('2024-06-01'),
      })

      mockRepository.getAll.mockResolvedValueOnce({
        data: [memberB, memberA],
        pagination: {
          hasNextPage: false,
          totalItems: 2,
        },
      })

      const options = createExportOptions({
        sortOrder: 'A-Z',
      })

      const result = await service.fetchMembersForExport(options)

      expect(result[0].firstName).toBe('Alice')
      expect(result[1].firstName).toBe('Bob')
    })

    it('devrait trier par ordre alphabétique Z-A', async () => {
      const memberA = createMemberFixture({ 
        id: 'user-1', 
        firstName: 'Alice',
        lastName: 'Dupont',
        createdAt: new Date('2024-06-01'),
      })
      const memberB = createMemberFixture({ 
        id: 'user-2', 
        firstName: 'Bob',
        lastName: 'Martin',
        createdAt: new Date('2024-06-01'),
      })

      mockRepository.getAll.mockResolvedValueOnce({
        data: [memberA, memberB],
        pagination: {
          hasNextPage: false,
          totalItems: 2,
        },
      })

      const options = createExportOptions({
        sortOrder: 'Z-A',
      })

      const result = await service.fetchMembersForExport(options)

      expect(result[0].firstName).toBe('Bob')
      expect(result[1].firstName).toBe('Alice')
    })

    it('devrait limiter la quantité en mode custom', async () => {
      const members = Array.from({ length: 20 }, (_, i) =>
        createMemberFixture({
          id: `user-${i + 1}`,
          createdAt: new Date('2024-06-01'),
        })
      )

      mockRepository.getAll.mockResolvedValueOnce({
        data: members,
        pagination: {
          hasNextPage: false,
          totalItems: 20,
        },
      })

      const options = createExportOptions({
        quantityMode: 'custom',
        quantity: 5,
      })

      const result = await service.fetchMembersForExport(options)

      expect(result).toHaveLength(5)
    })

    it('devrait récupérer tous les membres en mode all', async () => {
      const members = Array.from({ length: 20 }, (_, i) =>
        createMemberFixture({
          id: `user-${i + 1}`,
          createdAt: new Date('2024-06-01'),
        })
      )

      mockRepository.getAll.mockResolvedValueOnce({
        data: members,
        pagination: {
          hasNextPage: false,
          totalItems: 20,
        },
      })

      const options = createExportOptions({
        quantityMode: 'all',
      })

      const result = await service.fetchMembersForExport(options)

      expect(result).toHaveLength(20)
    })

    it('devrait paginer correctement', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) =>
        createMemberFixture({
          id: `user-${i + 1}`,
          createdAt: new Date('2024-06-01'),
        })
      )
      const page2 = Array.from({ length: 50 }, (_, i) =>
        createMemberFixture({
          id: `user-${i + 101}`,
          createdAt: new Date('2024-06-01'),
        })
      )

      mockRepository.getAll
        .mockResolvedValueOnce({
          data: page1,
          pagination: {
            hasNextPage: true,
            totalItems: 150,
          },
        })
        .mockResolvedValueOnce({
          data: page2,
          pagination: {
            hasNextPage: false,
            totalItems: 150,
          },
        })

      const options = createExportOptions({
        quantityMode: 'all',
      })

      const result = await service.fetchMembersForExport(options)

      expect(result).toHaveLength(150)
      expect(mockRepository.getAll).toHaveBeenCalledTimes(2)
      expect(mockRepository.getAll).toHaveBeenNthCalledWith(1, expect.any(Object), 1, 100)
      expect(mockRepository.getAll).toHaveBeenNthCalledWith(2, expect.any(Object), 2, 100)
    })
  })

  describe('buildRow', () => {
    it('devrait construire une ligne d\'export avec membre et dossier', () => {
      const member = createMemberFixture()
      const dossier = createDossierFixture()

      const row = service.buildRow(member, dossier)

      expect(row).toHaveProperty('Matricule', member.matricule)
      expect(row).toHaveProperty('Prénom', dossier.identity.firstName)
      expect(row).toHaveProperty('Nom', dossier.identity.lastName)
      expect(row).toHaveProperty('Email', dossier.identity.email)
      expect(row).toHaveProperty('Province', dossier.address.province)
      expect(row).toHaveProperty('Entreprise', dossier.company.companyName)
    })

    it('devrait construire une ligne avec seulement le membre si dossier est null', () => {
      const member = createMemberFixture()

      const row = service.buildRow(member, null)

      expect(row).toHaveProperty('Matricule', member.matricule)
      expect(row).toHaveProperty('Prénom', member.firstName)
      expect(row).toHaveProperty('Nom', member.lastName)
      expect(row).toHaveProperty('Email', member.email)
    })

    it('devrait formater les contacts correctement', () => {
      const member = createMemberFixture()
      const dossier = createDossierFixture({
        identity: {
          contacts: ['+33612345678', '+33612345679'],
        },
      })

      const row = service.buildRow(member, dossier)

      expect(row).toHaveProperty('Téléphones', '+33612345678 | +33612345679')
    })

    it('devrait calculer le total des paiements', () => {
      const member = createMemberFixture()
      const dossier = createDossierFixture({
        payments: [
          { amount: 100 },
          { amount: 200 },
          { amount: 50 },
        ],
      })

      const row = service.buildRow(member, dossier)

      expect(row).toHaveProperty('Nombre de paiements', 3)
      expect(row).toHaveProperty('Total des paiements', 350)
    })

    it('devrait formater les dates en ISO', () => {
      const member = createMemberFixture({
        createdAt: new Date('2024-01-01T10:00:00Z'),
      })
      const dossier = createDossierFixture({
        createdAt: new Date('2024-01-01T10:00:00Z'),
      })

      const row = service.buildRow(member, dossier)

      expect(row['Adhéré le']).toContain('2024-01-01')
      expect(row['Demande soumise le']).toContain('2024-01-01')
    })

    it('devrait gérer les dates invalides', () => {
      const member = createMemberFixture()
      const dossier = createDossierFixture({
        createdAt: 'invalid-date',
      })

      const row = service.buildRow(member, dossier)

      expect(row['Demande soumise le']).toBe('')
    })
  })

  describe('buildExportRows', () => {
    it('devrait construire les lignes d\'export pour tous les membres', async () => {
      const member1 = createMemberFixture({ 
        id: 'user-1', 
        firstName: 'Jean',
        lastName: 'Dupont',
        createdAt: new Date('2024-06-01') 
      })
      const member2 = createMemberFixture({ 
        id: 'user-2', 
        firstName: 'Marie',
        lastName: 'Martin',
        createdAt: new Date('2024-06-01') 
      })
      const dossier1 = createDossierFixture()
      const dossier2 = createDossierFixture({ 
        identity: { 
          firstName: 'Marie',
          lastName: 'Martin',
        } 
      })

      mockRepository.getAll.mockResolvedValueOnce({
        data: [member1, member2],
        pagination: {
          hasNextPage: false,
          totalItems: 2,
        },
      })

      vi.mocked(getMembershipRequestById)
        .mockResolvedValueOnce(dossier1 as any)
        .mockResolvedValueOnce(dossier2 as any)

      const options = createExportOptions()
      const rows = await service.buildExportRows(options)

      expect(rows).toHaveLength(2)
      expect(rows[0]).toHaveProperty('Prénom', 'Jean')
      expect(rows[1]).toHaveProperty('Prénom', 'Marie')
    })

    it('devrait gérer les erreurs lors de la récupération des dossiers', async () => {
      const member = createMemberFixture({ id: 'user-1', createdAt: new Date('2024-06-01') })

      mockRepository.getAll.mockResolvedValueOnce({
        data: [member],
        pagination: {
          hasNextPage: false,
          totalItems: 1,
        },
      })

      vi.mocked(getMembershipRequestById).mockRejectedValueOnce(new Error('Dossier not found'))

      const options = createExportOptions()
      const rows = await service.buildExportRows(options)

      expect(rows).toHaveLength(1)
      expect(rows[0]).toHaveProperty('Matricule', member.matricule)
      // Devrait utiliser les données du membre si dossier échoue
      expect(rows[0]).toHaveProperty('Prénom', member.firstName)
    })

    it('devrait gérer les membres sans dossier', async () => {
      const member = createMemberFixture({ 
        id: 'user-1', 
        dossier: undefined,
        createdAt: new Date('2024-06-01'),
      })

      mockRepository.getAll.mockResolvedValueOnce({
        data: [member],
        pagination: {
          hasNextPage: false,
          totalItems: 1,
        },
      })

      const options = createExportOptions()
      const rows = await service.buildExportRows(options)

      expect(rows).toHaveLength(1)
      expect(rows[0]).toHaveProperty('Matricule', member.matricule)
      expect(getMembershipRequestById).not.toHaveBeenCalled()
    })
  })

  describe('toCSV', () => {
    it('devrait convertir des lignes en CSV', () => {
      const rows = [
        { Matricule: '123', Prénom: 'Jean', Nom: 'Dupont' },
        { Matricule: '456', Prénom: 'Marie', Nom: 'Martin' },
      ]

      const csv = service.toCSV(rows)

      expect(csv).toContain('Matricule;Prénom;Nom')
      expect(csv).toContain('123;Jean;Dupont')
      expect(csv).toContain('456;Marie;Martin')
      // BOM UTF-8 pour Excel
      expect(csv.charCodeAt(0)).toBe(0xfeff)
    })

    it('devrait échapper les valeurs avec des caractères spéciaux', () => {
      const rows = [
        { Matricule: '123', Prénom: 'Jean;Dupont', Nom: 'Test"Quote' },
      ]

      const csv = service.toCSV(rows)

      expect(csv).toContain('"Jean;Dupont"')
      expect(csv).toContain('"Test""Quote"')
    })

    it('devrait retourner une chaîne vide si aucune ligne', () => {
      const csv = service.toCSV([])
      expect(csv).toBe('')
    })
  })

  describe('exportMembersToCsv', () => {
    it('devrait exporter les membres en CSV', async () => {
      const member = createMemberFixture({ id: 'user-1', createdAt: new Date('2024-06-01') })
      const dossier = createDossierFixture()

      mockRepository.getAll.mockResolvedValueOnce({
        data: [member],
        pagination: {
          hasNextPage: false,
          totalItems: 1,
        },
      })

      vi.mocked(getMembershipRequestById).mockResolvedValueOnce(dossier as any)

      const options = createExportOptions({ format: 'csv' })
      const blob = await service.exportMembersToCsv(options)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('text/csv;charset=utf-8;')
    })
  })

  describe('exportMembersToExcel', () => {
    it('devrait exporter les membres en Excel', async () => {
      const member = createMemberFixture({ id: 'user-1', createdAt: new Date('2024-06-01') })
      const dossier = createDossierFixture()

      mockRepository.getAll.mockResolvedValueOnce({
        data: [member],
        pagination: {
          hasNextPage: false,
          totalItems: 1,
        },
      })

      vi.mocked(getMembershipRequestById).mockResolvedValueOnce(dossier as any)

      const options = createExportOptions({ format: 'excel' })
      
      await expect(service.exportMembersToExcel(options)).resolves.not.toThrow()
    })
  })

  describe('exportMembersToPdf', () => {
    it('devrait exporter les membres en PDF', async () => {
      const member = createMemberFixture({ id: 'user-1', createdAt: new Date('2024-06-01') })
      const dossier = createDossierFixture()

      mockRepository.getAll.mockResolvedValueOnce({
        data: [member],
        pagination: {
          hasNextPage: false,
          totalItems: 1,
        },
      })

      vi.mocked(getMembershipRequestById).mockResolvedValueOnce(dossier as any)

      const options = createExportOptions({ format: 'pdf' })
      
      await expect(service.exportMembersToPdf(options)).resolves.not.toThrow()
    })

    it('devrait gérer le cas où il n\'y a aucun membre', async () => {
      mockRepository.getAll.mockResolvedValueOnce({
        data: [],
        pagination: {
          hasNextPage: false,
          totalItems: 0,
        },
      })

      const options = createExportOptions({ format: 'pdf' })
      
      await expect(service.exportMembersToPdf(options)).resolves.not.toThrow()
    })
  })

  describe('exportMembers', () => {
    it('devrait router vers exportMembersToCsv pour format csv', async () => {
      const member = createMemberFixture({ id: 'user-1', createdAt: new Date('2024-06-01') })
      const dossier = createDossierFixture()

      mockRepository.getAll.mockResolvedValueOnce({
        data: [member],
        pagination: {
          hasNextPage: false,
          totalItems: 1,
        },
      })

      vi.mocked(getMembershipRequestById).mockResolvedValueOnce(dossier as any)

      const options = createExportOptions({ format: 'csv' })
      const result = await service.exportMembers(options)

      expect(result).toBeInstanceOf(Blob)
    })

    it('devrait router vers exportMembersToExcel pour format excel', async () => {
      const member = createMemberFixture({ id: 'user-1', createdAt: new Date('2024-06-01') })
      const dossier = createDossierFixture()

      mockRepository.getAll.mockResolvedValueOnce({
        data: [member],
        pagination: {
          hasNextPage: false,
          totalItems: 1,
        },
      })

      vi.mocked(getMembershipRequestById).mockResolvedValueOnce(dossier as any)

      const options = createExportOptions({ format: 'excel' })
      
      await expect(service.exportMembers(options)).resolves.not.toThrow()
    })

    it('devrait router vers exportMembersToPdf pour format pdf', async () => {
      const member = createMemberFixture({ id: 'user-1', createdAt: new Date('2024-06-01') })
      const dossier = createDossierFixture()

      mockRepository.getAll.mockResolvedValueOnce({
        data: [member],
        pagination: {
          hasNextPage: false,
          totalItems: 1,
        },
      })

      vi.mocked(getMembershipRequestById).mockResolvedValueOnce(dossier as any)

      const options = createExportOptions({ format: 'pdf' })
      
      await expect(service.exportMembers(options)).resolves.not.toThrow()
    })

    it('devrait lancer une erreur pour un format non supporté', async () => {
      const options = createExportOptions({ format: 'unknown' as any })
      
      await expect(service.exportMembers(options)).rejects.toThrow(
        "Format d'export non supporté"
      )
    })
  })
})
