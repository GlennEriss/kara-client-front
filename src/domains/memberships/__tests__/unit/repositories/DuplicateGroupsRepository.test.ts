/**
 * Tests unitaires pour DuplicateGroupsRepository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCollection = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockGetDocs = vi.fn()
const mockDoc = vi.fn()
const mockUpdateDoc = vi.fn()

vi.mock('@/firebase/firestore', () => ({
  db: {},
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  getDocs: (q: unknown) => mockGetDocs(q),
  doc: (...args: unknown[]) => mockDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: () => ({ _serverTimestamp: true }),
}))

import { DuplicateGroupsRepository } from '../../../repositories/DuplicateGroupsRepository'

describe('DuplicateGroupsRepository', () => {
  let repository: DuplicateGroupsRepository

  beforeEach(() => {
    vi.clearAllMocks()
    ;(DuplicateGroupsRepository as any).instance = undefined
    repository = DuplicateGroupsRepository.getInstance()
    mockWhere.mockReturnValue({ _where: true })
    mockLimit.mockReturnValue({ _limit: true })
    mockQuery.mockReturnValue({ _query: true })
    mockCollection.mockReturnValue('duplicate-groups-ref')
  })

  describe('getInstance', () => {
    it('devrait retourner la même instance', () => {
      const a = DuplicateGroupsRepository.getInstance()
      const b = DuplicateGroupsRepository.getInstance()
      expect(a).toBe(b)
    })
  })

  describe('hasUnresolvedGroups', () => {
    it('devrait retourner true si au moins un groupe non résolu existe', async () => {
      mockGetDocs.mockResolvedValue({ empty: false })
      const result = await repository.hasUnresolvedGroups()
      expect(result).toBe(true)
      expect(mockWhere).toHaveBeenCalledWith('resolvedAt', '==', null)
      expect(mockLimit).toHaveBeenCalledWith(1)
    })

    it('devrait retourner false si aucun groupe non résolu', async () => {
      mockGetDocs.mockResolvedValue({ empty: true })
      const result = await repository.hasUnresolvedGroups()
      expect(result).toBe(false)
    })
  })

  describe('getUnresolvedGroups', () => {
    it('devrait retourner les groupes non résolus triés par type puis detectedAt', async () => {
      const detectedAt = new Date('2024-06-01')
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'g1',
            data: () => ({
              type: 'email',
              value: 'a@b.com',
              requestIds: ['r1', 'r2'],
              requestCount: 2,
              detectedAt,
              updatedAt: detectedAt,
              resolvedAt: null,
              resolvedBy: null,
            }),
          },
          {
            id: 'g2',
            data: () => ({
              type: 'phone',
              value: '+33612345678',
              requestIds: ['r3'],
              requestCount: 1,
              detectedAt: new Date('2024-06-02'),
              updatedAt: new Date('2024-06-02'),
              resolvedAt: null,
              resolvedBy: null,
            }),
          },
        ],
      })
      const result = await repository.getUnresolvedGroups()
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('phone')
      expect(result[1].type).toBe('email')
      expect(result[0].id).toBe('g2')
      expect(result[1].id).toBe('g1')
      expect(mockWhere).toHaveBeenCalledWith('resolvedAt', '==', null)
    })

    it('devrait retourner un tableau vide si aucun groupe', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] })
      const result = await repository.getUnresolvedGroups()
      expect(result).toEqual([])
    })

    it('devrait normaliser les champs manquants avec des valeurs par défaut', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'g1',
            data: () => ({}),
          },
        ],
      })
      const result = await repository.getUnresolvedGroups()
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'g1',
        type: 'phone',
        value: '',
        requestIds: [],
        requestCount: 0,
      })
    })
  })

  describe('resolveGroup', () => {
    it('devrait appeler updateDoc avec resolvedAt et resolvedBy', async () => {
      mockUpdateDoc.mockResolvedValue(undefined)
      mockDoc.mockReturnValue('doc-ref')
      await repository.resolveGroup('group-1', 'admin-1')
      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'duplicate-groups', 'group-1')
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          resolvedBy: 'admin-1',
        })
      )
    })
  })
})
