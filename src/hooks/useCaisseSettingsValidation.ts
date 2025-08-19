import { useState, useEffect } from 'react'
import { getActiveSettings } from '@/db/caisse/settings.db'
import type { CaisseType } from '@/services/caisse/types'

export function useCaisseSettingsValidation(caisseType: CaisseType | null) {
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    async function validateSettings() {
      if (!caisseType) {
        setIsValid(false)
        setError('Aucun type de contrat sélectionné')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        // Vérifier si des paramètres actifs existent pour ce type
        const activeSettings = await getActiveSettings(caisseType)
        
        if (!activeSettings) {
          setIsValid(false)
          setError(`Aucun paramètre configuré pour le type "${caisseType}". Veuillez configurer les paramètres de la Caisse Spéciale avant de créer un contrat.`)
        } else {
          setIsValid(true)
          setSettings(activeSettings)
        }
      } catch (err: any) {
        setIsValid(false)
        setError(`Erreur lors de la vérification des paramètres: ${err?.message || 'Erreur inconnue'}`)
      } finally {
        setIsLoading(false)
      }
    }

    validateSettings()
  }, [caisseType])

  return {
    isValid,
    isLoading,
    error,
    settings,
    refetch: () => {
      setIsLoading(true)
      setIsValid(null)
      setError(null)
      if (caisseType) {
        getActiveSettings(caisseType).then(activeSettings => {
          setIsValid(!!activeSettings)
          setSettings(activeSettings)
          if (!activeSettings) {
            setError(`Aucun paramètre configuré pour le type "${caisseType}". Veuillez configurer les paramètres de la Caisse Spéciale avant de créer un contrat.`)
          }
          setIsLoading(false)
        }).catch(err => {
          setIsValid(false)
          setError(`Erreur lors de la vérification des paramètres: ${err?.message || 'Erreur inconnue'}`)
          setIsLoading(false)
        })
      }
    }
  }
} 