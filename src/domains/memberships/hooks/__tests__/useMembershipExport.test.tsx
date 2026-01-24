/**
 * Tests unitaires pour useMembershipExport
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMembershipExport } from '../useMembershipExport'
import { MembershipExportService } from '../../services/MembershipExportService'

// Mock MembershipExportService
vi.mock('../../services/MembershipExportService', () => ({
  MembershipExportService: {
    getInstance: vi.fn(),
  },
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock URL.createObjectURL et document.createElement
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('useMembershipExport', () => {
  let mockService: any
  let mockLink: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    
    // Mock document.createElement pour retourner un élément valide
    const originalCreateElement = document.createElement.bind(document)
    global.document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.href = ''
        link.download = ''
        link.click = mockLink.click
        return link
      }
      return originalCreateElement(tagName)
    })

    mockService = {
      fetchMembersForExport: vi.fn(),
      exportMembersToCsv: vi.fn(),
      exportMembersToExcel: vi.fn(),
      exportMembersToPdf: vi.fn(),
    }

    vi.mocked(MembershipExportService.getInstance).mockReturnValue(mockService as any)
  })

  const defaultOptions = {
    filters: {},
    format: 'csv' as const,
    sortOrder: 'A-Z' as const,
    quantityMode: 'all' as const,
    dateStart: new Date('2024-01-01'),
    dateEnd: new Date('2024-12-31'),
    vehicleFilter: 'all' as const,
  }

  it('devrait initialiser avec isExporting à false et error à null', () => {
    const { result } = renderHook(() => useMembershipExport())

    expect(result.current.isExporting).toBe(false)
    expect(result.current.error).toBe(null)
    expect(typeof result.current.exportMembers).toBe('function')
  })

  it('devrait exporter en CSV avec succès', async () => {
    const members = [
      { id: '1', firstName: 'Jean', lastName: 'Dupont' },
      { id: '2', firstName: 'Marie', lastName: 'Martin' },
    ]
    const blob = new Blob(['csv content'], { type: 'text/csv' })

    mockService.fetchMembersForExport.mockResolvedValue(members)
    mockService.exportMembersToCsv.mockResolvedValue(blob)

    const { result } = renderHook(() => useMembershipExport())

    await act(async () => {
      await result.current.exportMembers(defaultOptions)
    })

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false)
    })

    expect(mockService.fetchMembersForExport).toHaveBeenCalledWith(defaultOptions)
    expect(mockService.exportMembersToCsv).toHaveBeenCalledWith(defaultOptions)
    expect(mockLink.click).toHaveBeenCalled()
    
    // Vérifier que createElement a été appelé avec 'a'
    expect(global.document.createElement).toHaveBeenCalledWith('a')
  })

  it('devrait exporter en Excel avec succès', async () => {
    const members = [{ id: '1', firstName: 'Jean', lastName: 'Dupont' }]

    mockService.fetchMembersForExport.mockResolvedValue(members)
    mockService.exportMembersToExcel.mockResolvedValue(undefined)

    const { result } = renderHook(() => useMembershipExport())

    await act(async () => {
      await result.current.exportMembers({ ...defaultOptions, format: 'excel' })
    })

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false)
    })

    expect(mockService.exportMembersToExcel).toHaveBeenCalledWith({
      ...defaultOptions,
      format: 'excel',
    })
  })

  it('devrait exporter en PDF avec succès', async () => {
    const members = [{ id: '1', firstName: 'Jean', lastName: 'Dupont' }]

    mockService.fetchMembersForExport.mockResolvedValue(members)
    mockService.exportMembersToPdf.mockResolvedValue(undefined)

    const { result } = renderHook(() => useMembershipExport())

    await act(async () => {
      await result.current.exportMembers({ ...defaultOptions, format: 'pdf' })
    })

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false)
    })

    expect(mockService.exportMembersToPdf).toHaveBeenCalledWith({
      ...defaultOptions,
      format: 'pdf',
    })
  })

  it('devrait afficher un message info si aucun membre à exporter', async () => {
    const { toast } = await import('sonner')
    
    mockService.fetchMembersForExport.mockResolvedValue([])

    const { result } = renderHook(() => useMembershipExport())

    await act(async () => {
      await result.current.exportMembers(defaultOptions)
    })

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false)
    })

    expect(toast.info).toHaveBeenCalledWith('Aucun membre à exporter selon les critères')
    expect(mockService.exportMembersToCsv).not.toHaveBeenCalled()
  })

  it('devrait gérer les erreurs et définir error', async () => {
    const { toast } = await import('sonner')
    const error = new Error('Erreur export')
    
    mockService.fetchMembersForExport.mockRejectedValue(error)

    const { result } = renderHook(() => useMembershipExport())

    await act(async () => {
      try {
        await result.current.exportMembers(defaultOptions)
      } catch (err) {
        // Erreur attendue
      }
    })

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false)
    })

    expect(result.current.error).toBe(error)
    expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'export")
  })

  it('devrait gérer les erreurs non-Error et créer une Error', async () => {
    const { toast } = await import('sonner')
    
    mockService.fetchMembersForExport.mockRejectedValue('String error')

    const { result } = renderHook(() => useMembershipExport())

    await act(async () => {
      try {
        await result.current.exportMembers(defaultOptions)
      } catch (err) {
        // Erreur attendue
      }
    })

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe("Erreur lors de l'export")
    expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'export")
  })

  it('devrait définir isExporting à true pendant l\'export', async () => {
    const members = [{ id: '1', firstName: 'Jean', lastName: 'Dupont' }]
    const blob = new Blob(['csv content'], { type: 'text/csv' })

    mockService.fetchMembersForExport.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(members), 100))
    )
    mockService.exportMembersToCsv.mockResolvedValue(blob)

    const { result } = renderHook(() => useMembershipExport())

    act(() => {
      result.current.exportMembers(defaultOptions)
    })

    // Vérifier que isExporting est true pendant l'export
    expect(result.current.isExporting).toBe(true)

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false)
    })
  })

  it('devrait réinitialiser error avant un nouvel export', async () => {
    const members = [{ id: '1', firstName: 'Jean', lastName: 'Dupont' }]
    const blob = new Blob(['csv content'], { type: 'text/csv' })

    // Premier export avec erreur
    mockService.fetchMembersForExport.mockRejectedValueOnce(new Error('Erreur 1'))
    
    const { result } = renderHook(() => useMembershipExport())

    await act(async () => {
      try {
        await result.current.exportMembers(defaultOptions)
      } catch (err) {
        // Erreur attendue
      }
    })

    await waitFor(() => {
      expect(result.current.error).not.toBe(null)
    })

    // Deuxième export réussi
    mockService.fetchMembersForExport.mockResolvedValue(members)
    mockService.exportMembersToCsv.mockResolvedValue(blob)

    await act(async () => {
      await result.current.exportMembers(defaultOptions)
    })

    await waitFor(() => {
      expect(result.current.error).toBe(null)
    })
  })
})
