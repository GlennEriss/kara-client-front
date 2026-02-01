/**
 * Hook pour la persistance du formulaire de création de demande Caisse Spéciale
 * Sauvegarde automatique avec debounce 500ms, restauration au chargement, expiration 24h
 */

import { useEffect, useCallback } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import type { CaisseSpecialeDemandFormInput } from '@/schemas/caisse-speciale.schema'

const FORM_STORAGE_KEY = 'caisse-speciale-demand-form-v2'
const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 heures
const CURRENT_VERSION = 'v2.0'

interface StoredFormData {
  data: Partial<CaisseSpecialeDemandFormInput>
  timestamp: number
  version: string
}

export function useCaisseSpecialeDemandFormPersistence(
  form: UseFormReturn<CaisseSpecialeDemandFormInput>,
  enabled: boolean = true
) {
  const saveFormData = useCallback(
    (data: Partial<CaisseSpecialeDemandFormInput>) => {
      if (!enabled) return

      try {
        const stored: StoredFormData = {
          data,
          timestamp: Date.now(),
          version: CURRENT_VERSION,
        }
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(stored))
      } catch (error) {
        console.warn('Impossible de sauvegarder le formulaire:', error)
      }
    },
    [enabled]
  )

  const loadFormData = useCallback((): Partial<CaisseSpecialeDemandFormInput> | null => {
    if (!enabled) return null

    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY)
      if (!stored) return null

      const parsed: StoredFormData = JSON.parse(stored)

      if (parsed.version !== CURRENT_VERSION) {
        localStorage.removeItem(FORM_STORAGE_KEY)
        return null
      }

      if (Date.now() - parsed.timestamp > STORAGE_EXPIRY_MS) {
        localStorage.removeItem(FORM_STORAGE_KEY)
        return null
      }

      return parsed.data
    } catch (error) {
      console.error('Erreur chargement formulaire:', error)
      localStorage.removeItem(FORM_STORAGE_KEY)
      return null
    }
  }, [enabled])

  const clearFormData = useCallback(() => {
    localStorage.removeItem(FORM_STORAGE_KEY)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const subscription = form.watch((data) => {
      const timeoutId = setTimeout(() => {
        saveFormData(data as Partial<CaisseSpecialeDemandFormInput>)
      }, 500)

      return () => clearTimeout(timeoutId)
    })

    return () => subscription.unsubscribe()
  }, [form, saveFormData, enabled])

  useEffect(() => {
    if (!enabled) return

    const saved = loadFormData()
    if (saved) {
      form.reset(saved)
      toast.info('Données du formulaire restaurées', {
        description: 'Vos données précédentes ont été restaurées.',
        duration: 3000,
      })
    }
  }, [])

  return { saveFormData, loadFormData, clearFormData }
}
