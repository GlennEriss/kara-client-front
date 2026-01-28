/**
 * Hook pour la persistance du formulaire dans localStorage
 * 
 * Sauvegarde automatique avec debounce 500ms
 * Restauration automatique au chargement
 * Expiration 24h
 */

import { useEffect, useCallback } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import type { CaisseImprevueDemandFormInput } from './useDemandForm'

const FORM_STORAGE_KEY = 'caisse-imprevue-demand-form-v2'
const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 heures
const CURRENT_VERSION = 'v2.0'

interface StoredFormData {
  data: Partial<CaisseImprevueDemandFormInput>
  timestamp: number
  version: string
}

export function useDemandFormPersistence(
  form: UseFormReturn<CaisseImprevueDemandFormInput>,
  enabled: boolean = true
) {
  const saveFormData = useCallback(
    (data: Partial<CaisseImprevueDemandFormInput>) => {
      if (!enabled) return

      try {
        const stored: StoredFormData = {
          data,
          timestamp: Date.now(),
          version: CURRENT_VERSION,
        }
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(stored))
      } catch (error) {
        // localStorage peut être plein ou désactivé
        console.warn('Impossible de sauvegarder le formulaire:', error)
      }
    },
    [enabled]
  )

  const loadFormData = useCallback((): Partial<CaisseImprevueDemandFormInput> | null => {
    if (!enabled) return null

    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY)
      if (!stored) return null

      const parsed: StoredFormData = JSON.parse(stored)

      // Vérifier la version (gestion des migrations)
      if (parsed.version !== CURRENT_VERSION) {
        localStorage.removeItem(FORM_STORAGE_KEY)
        return null
      }

      // Vérifier l'expiration
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

  // Sauvegarder à chaque changement (debounced)
  useEffect(() => {
    if (!enabled) return

    const subscription = form.watch((data) => {
      // Debounce pour éviter trop d'écritures
      const timeoutId = setTimeout(() => {
        saveFormData(data)
      }, 500)

      return () => clearTimeout(timeoutId)
    })

    return () => subscription.unsubscribe()
  }, [form, saveFormData, enabled])

  // Charger au montage
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
  }, []) // Une seule fois au montage

  return { saveFormData, loadFormData, clearFormData }
}
