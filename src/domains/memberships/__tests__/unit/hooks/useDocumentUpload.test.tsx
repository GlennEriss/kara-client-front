/**
 * Tests unitaires pour useDocumentUpload
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { useDocumentUpload } from '../../../hooks/useDocumentUpload'
import type { RegisterFormData } from '@/schemas/schemas'

// Mock compressImage et getImageInfo
const mockCompressImage = vi.fn()
const mockGetImageInfo = vi.fn()

vi.mock('@/lib/utils', () => ({
  compressImage: (...args: unknown[]) => mockCompressImage(...args),
  getImageInfo: (...args: unknown[]) => mockGetImageInfo(...args),
  IMAGE_COMPRESSION_PRESETS: {
    document: { quality: 0.8, maxWidth: 1920, maxHeight: 1080 },
  },
}))

describe('useDocumentUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCompressImage.mockResolvedValue('data:image/webp;base64,test')
    mockGetImageInfo.mockReturnValue({
      format: 'WebP',
      sizeText: '150 KB',
    })
  })

  it('devrait initialiser avec des valeurs par défaut', () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            documentPhotoFront: null,
            documentPhotoBack: null,
          },
        },
      })
    )
    const form = formResult.current

    const { result } = renderHook(() =>
      useDocumentUpload({ form, documentType: 'front' })
    )

    expect(result.current.preview).toBeNull()
    expect(result.current.isCompressing).toBe(false)
    expect(result.current.compressionInfo).toBeNull()
    expect(result.current.isDragOver).toBe(false)
    expect(result.current.fileInputRef.current).toBeNull()
  })

  it('devrait gérer le changement de fichier', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            documentPhotoFront: null,
            documentPhotoBack: null,
          },
        },
      })
    )
    const form = formResult.current

    const { result } = renderHook(() =>
      useDocumentUpload({ form, documentType: 'front' })
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const event = {
      target: { files: [file] },
    } as any

    await act(async () => {
      result.current.handleFileChange(event)
    })

    await waitFor(() => {
      expect(result.current.isCompressing).toBe(false)
    })

    expect(mockCompressImage).toHaveBeenCalledWith(file, expect.any(Object))
    expect(result.current.preview).toBe('data:image/webp;base64,test')
  })

  it('devrait gérer le drop d\'un fichier', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            documentPhotoFront: null,
            documentPhotoBack: null,
          },
        },
      })
    )
    const form = formResult.current

    const { result } = renderHook(() =>
      useDocumentUpload({ form, documentType: 'front' })
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const event = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [file] },
    } as any

    await act(async () => {
      result.current.handleDrop(event)
    })

    await waitFor(() => {
      expect(result.current.isCompressing).toBe(false)
    })

    expect(event.preventDefault).toHaveBeenCalled()
    expect(mockCompressImage).toHaveBeenCalled()
    expect(result.current.isDragOver).toBe(false)
  })

  it('devrait gérer le drag over', () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            documentPhotoFront: null,
            documentPhotoBack: null,
          },
        },
      })
    )
    const form = formResult.current

    const { result } = renderHook(() =>
      useDocumentUpload({ form, documentType: 'front' })
    )

    const event = {
      preventDefault: vi.fn(),
    } as any

    act(() => {
      result.current.handleDragOver(event)
    })

    expect(event.preventDefault).toHaveBeenCalled()
    expect(result.current.isDragOver).toBe(true)
  })

  it('devrait gérer le drag leave', () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            documentPhotoFront: null,
            documentPhotoBack: null,
          },
        },
      })
    )
    const form = formResult.current

    const { result } = renderHook(() =>
      useDocumentUpload({ form, documentType: 'front' })
    )

    // D'abord activer drag over
    act(() => {
      result.current.handleDragOver({ preventDefault: vi.fn() } as any)
    })
    expect(result.current.isDragOver).toBe(true)

    // Puis drag leave
    act(() => {
      result.current.handleDragLeave()
    })
    expect(result.current.isDragOver).toBe(false)
  })

  it('devrait réinitialiser le document', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            documentPhotoFront: null,
            documentPhotoBack: null,
          },
        },
      })
    )
    const form = formResult.current

    const { result } = renderHook(() =>
      useDocumentUpload({ form, documentType: 'front' })
    )

    // D'abord uploader un fichier
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    await act(async () => {
      result.current.handleFileChange({
        target: { files: [file] },
      } as any)
    })

    await waitFor(() => {
      expect(result.current.preview).not.toBeNull()
    })

    // Puis réinitialiser
    act(() => {
      result.current.reset()
    })

    expect(result.current.preview).toBeNull()
    expect(result.current.compressionInfo).toBeNull()
    expect(result.current.isCompressing).toBe(false)
    expect(result.current.isDragOver).toBe(false)
  })

  it('devrait gérer les erreurs lors de la compression', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCompressImage.mockRejectedValue(new Error('Compression failed'))

    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            documentPhotoFront: null,
            documentPhotoBack: null,
          },
        },
      })
    )
    const form = formResult.current

    const { result } = renderHook(() =>
      useDocumentUpload({ form, documentType: 'front' })
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const event = {
      target: { files: [file] },
    } as any

    await act(async () => {
      result.current.handleFileChange(event)
    })

    await waitFor(() => {
      expect(result.current.isCompressing).toBe(false)
    }, { timeout: 2000 })

    // Vérifier que la compression a été tentée
    expect(mockCompressImage).toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('devrait rejeter les fichiers non-image', async () => {
    const { result: formResult } = renderHook(() =>
      useForm<RegisterFormData>({
        defaultValues: {
          documents: {
            documentPhotoFront: null,
            documentPhotoBack: null,
          },
        },
      })
    )
    const form = formResult.current

    const { result } = renderHook(() =>
      useDocumentUpload({ form, documentType: 'front' })
    )

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const event = {
      target: { files: [file] },
    } as any

    await act(async () => {
      result.current.handleFileChange(event)
    })

    // Vérifier que la compression n'a pas été appelée pour un fichier non-image
    expect(mockCompressImage).not.toHaveBeenCalled()
  })
})
