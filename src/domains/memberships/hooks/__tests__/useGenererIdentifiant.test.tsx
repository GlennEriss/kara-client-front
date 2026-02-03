/**
 * Tests unitaires pour useGenererIdentifiant
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGenererIdentifiant } from '../useGenererIdentifiant'
import { GenererIdentifiantService } from '../../services/GenererIdentifiantService'

vi.mock('../../services/GenererIdentifiantService', () => ({
  GenererIdentifiantService: {
    getInstance: vi.fn(),
  },
}))

describe('useGenererIdentifiant', () => {
  const mockResetPasswordAndGetPdfData = vi.fn()
  const defaultOptions = {
    memberId: 'user-123',
    matricule: 'MAT-001',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(GenererIdentifiantService.getInstance).mockReturnValue({
      resetPasswordAndGetPdfData: mockResetPasswordAndGetPdfData,
    } as unknown as GenererIdentifiantService)
  })

  it('retourne error si le matricule saisi ne correspond pas', async () => {
    const { result } = renderHook(() => useGenererIdentifiant(defaultOptions))

    await act(async () => {
      await result.current.submitGenererIdentifiant('WRONG')
    })

    expect(result.current.error).toBe(
      'Le matricule saisi ne correspond pas au matricule du membre.'
    )
    expect(mockResetPasswordAndGetPdfData).not.toHaveBeenCalled()
  })

  it('appelle le service et retourne les données PDF si le matricule est valide', async () => {
    const pdfData = {
      matricule: 'MAT-001',
      identifiant: 'jean@test.com',
      motDePasse: 'MAT-001',
    }
    mockResetPasswordAndGetPdfData.mockResolvedValue(pdfData)

    const { result } = renderHook(() => useGenererIdentifiant(defaultOptions))

    let returned: unknown = null
    await act(async () => {
      returned = await result.current.submitGenererIdentifiant('MAT-001')
    })

    expect(mockResetPasswordAndGetPdfData).toHaveBeenCalledWith('user-123', 'MAT-001')
    expect(returned).toEqual(pdfData)
    expect(result.current.error).toBeNull()
  })

  it('retourne error et null si le service lance une erreur', async () => {
    mockResetPasswordAndGetPdfData.mockRejectedValue(new Error('Membre introuvable'))

    const { result } = renderHook(() => useGenererIdentifiant(defaultOptions))

    let returned: unknown = null
    await act(async () => {
      returned = await result.current.submitGenererIdentifiant('MAT-001')
    })

    expect(returned).toBeNull()
    expect(result.current.error).toBe('Membre introuvable')
  })

  it('resetError remet error à null', async () => {
    const { result } = renderHook(() => useGenererIdentifiant(defaultOptions))

    await act(async () => {
      await result.current.submitGenererIdentifiant('WRONG')
    })
    expect(result.current.error).not.toBeNull()

    act(() => {
      result.current.resetError()
    })
    expect(result.current.error).toBeNull()
  })
})
