'use client'

import { useState, useCallback } from 'react'
import { GenererIdentifiantService, type IdentifiantsPdfData } from '@/domains/memberships/services/GenererIdentifiantService'

export interface UseGenererIdentifiantOptions {
  memberId: string
  matricule: string
  onSuccess?: (pdfData: IdentifiantsPdfData) => void
  onError?: (error: Error) => void
}

export interface UseGenererIdentifiantResult {
  submitGenererIdentifiant: (matriculeSaisi: string) => Promise<IdentifiantsPdfData | null>
  isLoading: boolean
  error: string | null
  resetError: () => void
}

export function useGenererIdentifiant({
  memberId,
  matricule,
  onSuccess,
  onError,
}: UseGenererIdentifiantOptions): UseGenererIdentifiantResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetError = useCallback(() => setError(null), [])

  const submitGenererIdentifiant = useCallback(
    async (matriculeSaisi: string): Promise<IdentifiantsPdfData | null> => {
      if (matriculeSaisi.trim() !== matricule) {
        setError('Le matricule saisi ne correspond pas au matricule du membre.')
        onError?.(new Error('Validation matricule'))
        return null
      }

      setError(null)
      setIsLoading(true)
      try {
        const service = GenererIdentifiantService.getInstance()
        const pdfData = await service.resetPasswordAndGetPdfData(memberId, matricule)
        onSuccess?.(pdfData)
        return pdfData
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Erreur lors de la réinitialisation'
        setError(message)
        onError?.(e instanceof Error ? e : new Error(message))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [memberId, matricule, onSuccess, onError]
  )

  return {
    submitGenererIdentifiant,
    isLoading,
    error,
    resetError,
  }
}
