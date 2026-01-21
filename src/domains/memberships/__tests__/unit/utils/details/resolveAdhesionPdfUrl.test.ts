import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveAdhesionPdfUrl, type ResolveAdhesionPdfUrlRequest } from '../../../../utils/details/resolveAdhesionPdfUrl'

// Mock DocumentRepository
const mockGetDocuments = vi.fn()
vi.mock('@/domains/infrastructure/documents/repositories/DocumentRepository', () => ({
  DocumentRepository: vi.fn().mockImplementation(() => ({
    getDocuments: mockGetDocuments
  }))
}))

describe('resolveAdhesionPdfUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return adhesionPdfURL if present', async () => {
    const request: ResolveAdhesionPdfUrlRequest = {
      id: 'test-id',
      matricule: 'MAT001',
      adhesionPdfURL: 'https://storage.example.com/pdf/direct.pdf'
    }

    const result = await resolveAdhesionPdfUrl(request)
    expect(result).toBe('https://storage.example.com/pdf/direct.pdf')
    expect(mockGetDocuments).not.toHaveBeenCalled()
  })

  it('should fallback to Firestore documents if adhesionPdfURL missing', async () => {
    const request: ResolveAdhesionPdfUrlRequest = {
      id: 'test-id',
      matricule: 'MAT001',
      adhesionPdfURL: null
    }

    mockGetDocuments.mockResolvedValue({
      documents: [
        { id: 'doc1', url: 'https://storage.example.com/pdf/from-firestore.pdf', type: 'ADHESION' }
      ],
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
      availableTypes: ['ADHESION']
    })

    const result = await resolveAdhesionPdfUrl(request)
    expect(result).toBe('https://storage.example.com/pdf/from-firestore.pdf')
    expect(mockGetDocuments).toHaveBeenCalledWith({
      memberId: 'MAT001',
      type: 'ADHESION',
      page: 1,
      pageSize: 1,
      sort: [{ field: 'createdAt', direction: 'desc' }]
    })
  })

  it('should use id as memberId if matricule missing', async () => {
    const request: ResolveAdhesionPdfUrlRequest = {
      id: 'test-id',
      adhesionPdfURL: null
    }

    mockGetDocuments.mockResolvedValue({
      documents: [],
      page: 1,
      pageSize: 1,
      totalItems: 0,
      totalPages: 0,
      availableTypes: []
    })

    await resolveAdhesionPdfUrl(request)
    expect(mockGetDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'test-id'
      })
    )
  })

  it('should return null if no document found in Firestore', async () => {
    const request: ResolveAdhesionPdfUrlRequest = {
      id: 'test-id',
      matricule: 'MAT001',
      adhesionPdfURL: null
    }

    mockGetDocuments.mockResolvedValue({
      documents: [],
      page: 1,
      pageSize: 1,
      totalItems: 0,
      totalPages: 0,
      availableTypes: []
    })

    const result = await resolveAdhesionPdfUrl(request)
    expect(result).toBeNull()
  })

  it('should return null on Firestore error', async () => {
    const request: ResolveAdhesionPdfUrlRequest = {
      id: 'test-id',
      matricule: 'MAT001',
      adhesionPdfURL: null
    }

    mockGetDocuments.mockRejectedValue(new Error('Firestore error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await resolveAdhesionPdfUrl(request)
    
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(
      'Erreur lors de la récupération du PDF validé depuis Firestore:',
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })
})
