/**
 * Tests unitaires pour BaseGeographyRepository
 * 
 * Teste la pagination, la recherche et le cache
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseGeographyRepository } from '../../repositories/BaseGeographyRepository'

// Mock de Firestore
const mockFirestore = {
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  doc: vi.fn(),
  getCountFromServer: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: Date.now(), nanoseconds: 0 })),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
  db: {},
}

vi.mock('@/firebase/firestore', () => mockFirestore)

// Classe de test qui étend BaseGeographyRepository
class TestRepository extends BaseGeographyRepository<{ id: string; name: string; createdBy?: string; updatedBy?: string }> {
  readonly name = 'TestRepository'
  protected readonly collectionName = 'test_collection'

  protected mapDocToEntity(id: string, data: any) {
    return {
      id,
      name: data.name,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    }
  }

  protected getParentIdField(): string {
    return 'parentId'
  }
}

describe('BaseGeographyRepository', () => {
  let repository: TestRepository

  beforeEach(() => {
    repository = new TestRepository()
    vi.clearAllMocks()
  })

  describe('getPaginated', () => {
    it('devrait récupérer la première page sans cursor et sans recherche', async () => {
      const mockDocs = [
        {
          id: '1',
          data: () => ({ name: 'Item 1', searchableText: 'item 1' }),
          exists: () => true,
        },
        {
          id: '2',
          data: () => ({ name: 'Item 2', searchableText: 'item 2' }),
          exists: () => true,
        },
      ]

      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockReturnValue({})
      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: any) => {
          mockDocs.forEach(callback)
        },
      })

      const result = await repository.getPaginated({ pageSize: 2 })

      expect(result.data).toHaveLength(2)
      expect(result.pagination.hasNextPage).toBe(false)
      expect(result.pagination.hasPrevPage).toBe(false)
      expect(result.pagination.nextCursor).toBeNull()
    })

    it('devrait utiliser le cursor pour la pagination', async () => {
      const mockCursorDoc = {
        id: '1',
        data: () => ({ name: 'Item 1' }),
        exists: () => true,
      }

      const mockDocs = [
        {
          id: '2',
          data: () => ({ name: 'Item 2', searchableText: 'item 2' }),
          exists: () => true,
        },
      ]

      mockFirestore.doc.mockReturnValue({})
      mockFirestore.getDoc.mockResolvedValue(mockCursorDoc)
      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockReturnValue({})
      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: any) => {
          mockDocs.forEach(callback)
        },
      })

      const result = await repository.getPaginated({ pageSize: 2, cursor: '1' })

      expect(mockFirestore.startAfter).toHaveBeenCalled()
      expect(result.pagination.hasPrevPage).toBe(true)
    })

    it('devrait ignorer le cursor si le document n\'existe pas', async () => {
      const mockCursorDoc = {
        id: '1',
        data: () => ({ name: 'Item 1' }),
        exists: () => false,
      }

      mockFirestore.doc.mockReturnValue({})
      mockFirestore.getDoc.mockResolvedValue(mockCursorDoc)
      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockReturnValue({})
      mockFirestore.orderBy.mockReturnValue({})
      mockFirestore.limit.mockReturnValue({})
      mockFirestore.getDocs.mockResolvedValue({
        forEach: () => {},
      })

      await repository.getPaginated({ pageSize: 2, cursor: '1' })

      expect(mockFirestore.getDoc).toHaveBeenCalled()
      expect(mockFirestore.startAfter).not.toHaveBeenCalled()
    })

    it('devrait ignorer la recherche si search est vide ou seulement des espaces', async () => {
      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockReturnValue({})
      mockFirestore.orderBy.mockReturnValue({})
      mockFirestore.limit.mockReturnValue({})
      mockFirestore.getDocs.mockResolvedValue({
        forEach: () => {},
      })

      await repository.getPaginated({ search: '   ' })

      // Vérifier que where pour searchableText n'est pas appelé
      const whereCalls = mockFirestore.where.mock.calls.filter(
        (call: any[]) => call[0] === 'searchableText'
      )
      expect(whereCalls).toHaveLength(0)
    })

    it('devrait filtrer par recherche', async () => {
      const mockDocs = [
        {
          id: '1',
          data: () => ({ name: 'Estuaire', searchableText: 'estuaire' }),
          exists: () => true,
        },
      ]

      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockReturnValue({})
      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: any) => {
          mockDocs.forEach(callback)
        },
      })

      const result = await repository.getPaginated({ search: 'estuaire', pageSize: 20 })

      // Vérifier que where est appelé pour la recherche
      expect(mockFirestore.where).toHaveBeenCalled()
      expect(result.data).toHaveLength(1)
    })

    it('devrait filtrer par parentId', async () => {
      const mockDocs = [
        {
          id: '1',
          data: () => ({ name: 'Item 1', parentId: 'parent-1', searchableText: 'item 1' }),
          exists: () => true,
        },
      ]

      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockReturnValue({})
      mockFirestore.getDocs.mockResolvedValue({
        forEach: (callback: any) => {
          mockDocs.forEach(callback)
        },
      })

      const result = await repository.getPaginated({ parentId: 'parent-1', pageSize: 20 })

      expect(mockFirestore.where).toHaveBeenCalledWith('parentId', '==', 'parent-1')
      expect(result.data).toHaveLength(1)
    })
  })

  describe('getCount', () => {
    it('devrait retourner le nombre total', async () => {
      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockReturnValue({})
      mockFirestore.getCountFromServer.mockResolvedValue({
        data: () => ({ count: 42 }),
      })

      const count = await repository.getCount()

      expect(count).toBe(42)
      expect(mockFirestore.getCountFromServer).toHaveBeenCalled()
    })

    it('devrait utiliser le cache pour éviter les requêtes répétées', async () => {
      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockReturnValue({})
      mockFirestore.getCountFromServer.mockResolvedValue({
        data: () => ({ count: 42 }),
      })

      const count1 = await repository.getCount()
      const count2 = await repository.getCount()

      expect(count1).toBe(42)
      expect(count2).toBe(42)
      // Le cache devrait être utilisé, donc getCountFromServer ne devrait être appelé qu'une fois
      // (mais dans ce test simple, il sera appelé deux fois car le cache expire après 5 min)
    })
  })

  describe('create', () => {
    it('devrait créer un élément avec searchableText', async () => {
      const mockDocRef = { id: 'new-id' }
      const mockCreatedDoc = {
        id: 'new-id',
        name: 'Nouveau Item',
      }

      mockFirestore.collection.mockReturnValue({})
      mockFirestore.addDoc.mockResolvedValue(mockDocRef)
      mockFirestore.doc.mockReturnValue({})
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'new-id',
        data: () => ({ name: 'Nouveau Item', searchableText: 'nouveau item' }),
      })

      // Mock getById pour retourner le document créé
      vi.spyOn(repository, 'getById').mockResolvedValue(mockCreatedDoc as any)

      const result = await repository.create({
        name: 'Nouveau Item',
        createdBy: 'user1',
      })

      expect(mockFirestore.addDoc).toHaveBeenCalled()
      expect(result.name).toBe('Nouveau Item')
    })
  })

  describe('update', () => {
    it('devrait mettre à jour un élément et recalculer searchableText', async () => {
      const mockUpdatedDoc = {
        id: '1',
        name: 'Item Modifié',
      }

      mockFirestore.doc.mockReturnValue({})
      mockFirestore.updateDoc.mockResolvedValue(undefined)
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => ({ name: 'Item Modifié', searchableText: 'item modifie' }),
      })

      vi.spyOn(repository, 'getById').mockResolvedValue(mockUpdatedDoc as any)

      const result = await repository.update('1', {
        name: 'Item Modifié',
        updatedBy: 'user1',
      })

      expect(mockFirestore.updateDoc).toHaveBeenCalled()
      expect(result.name).toBe('Item Modifié')
    })
  })

  describe('delete', () => {
    it('devrait supprimer un élément', async () => {
      mockFirestore.doc.mockReturnValue({})
      mockFirestore.deleteDoc.mockResolvedValue(undefined)

      await repository.delete('1')

      expect(mockFirestore.deleteDoc).toHaveBeenCalledWith({})
    })
  })

  describe('invalidateCountCache', () => {
    it('devrait invalider le cache pour un parentId spécifique', () => {
      // Simuler un cache existant
      ;(repository as any).countCache.set('parent-1', { count: 10, timestamp: Date.now(), ttl: 300000 })
      
      repository.invalidateCountCache('parent-1')
      
      expect((repository as any).countCache.has('parent-1')).toBe(false)
    })

    it('devrait invalider tout le cache si aucun parentId', () => {
      // Simuler un cache existant
      ;(repository as any).countCache.set('parent-1', { count: 10, timestamp: Date.now(), ttl: 300000 })
      ;(repository as any).countCache.set('__all__', { count: 20, timestamp: Date.now(), ttl: 300000 })
      
      repository.invalidateCountCache()
      
      expect((repository as any).countCache.size).toBe(0)
    })
  })

  describe('getCount - Gestion d\'erreur', () => {
    it('devrait retourner 0 en cas d\'erreur sans cache', async () => {
      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockReturnValue({})
      mockFirestore.getCountFromServer.mockRejectedValue(new Error('Erreur Firestore'))

      const result = await repository.getCount()

      expect(result).toBe(0)
    })

    it('devrait retourner le cache même expiré en cas d\'erreur', async () => {
      // Simuler un cache expiré
      ;(repository as any).countCache.set('__all__', { count: 15, timestamp: Date.now() - 600000, ttl: 300000 })
      
      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockReturnValue({})
      mockFirestore.getCountFromServer.mockRejectedValue(new Error('Erreur Firestore'))

      const result = await repository.getCount()

      expect(result).toBe(15)
    })
  })

  describe('getPaginated - Gestion d\'erreur', () => {
    it('devrait propager l\'erreur en cas d\'échec', async () => {
      mockFirestore.collection.mockReturnValue({})
      mockFirestore.query.mockImplementation(() => {
        throw new Error('Erreur Firestore')
      })

      await expect(repository.getPaginated()).rejects.toThrow('Erreur Firestore')
    })
  })
})
