/**
 * Hook pour la persistance du formulaire de création de demande Caisse Spéciale
 * Sauvegarde automatique avec debounce 500ms, restauration au chargement, expiration 24h
 *
 * @param form - Instance react-hook-form
 * @param enabled - Si false, le hook est entièrement no-op (pas de load/save/watch). Utile pour la page d'édition.
 */

import { useEffect, useCallback, useRef } from 'react'
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
  // Ref pour avoir toujours la valeur courante de enabled dans les effets (évite les closures stale)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const saveFormData = useCallback(
    (data: Partial<CaisseSpecialeDemandFormInput>) => {
      if (!enabledRef.current) return

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
    []
  )

  const loadFormData = useCallback((): Partial<CaisseSpecialeDemandFormInput> | null => {
    if (!enabledRef.current) return null

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
  }, [])

  const clearFormData = useCallback(() => {
    localStorage.removeItem(FORM_STORAGE_KEY)
  }, [])

  // Auto-save avec watch (uniquement si enabled)
  useEffect(() => {
    if (!enabledRef.current) return

    const subscription = form.watch((data) => {
      const timeoutId = setTimeout(() => {
        saveFormData(data as Partial<CaisseSpecialeDemandFormInput>)
      }, 500)

      return () => clearTimeout(timeoutId)
    })

    return () => subscription.unsubscribe()
  }, [form, saveFormData, enabled])

  // Restauration au montage (uniquement si enabled)
  useEffect(() => {
    if (!enabledRef.current) return

    const saved = loadFormData()
    if (saved) {
      form.reset(saved)
      toast.info('Données du formulaire restaurées', {
        description: 'Vos données précédentes ont été restaurées.',
        duration: 3000,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { saveFormData, loadFormData, clearFormData }
}
