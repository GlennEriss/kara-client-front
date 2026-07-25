'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import {
  fetchMessageTemplateOverrides,
  saveMessageTemplateOverrides,
  type MessageTemplateOverrides,
} from '../db/messageTemplates.db'
import { defaultTemplateBody } from '../constants/message-templates'
import { renderTemplate, type TemplateVariables } from '../utils/renderTemplate'

/**
 * Petit store global des modèles personnalisés.
 *
 * Volontairement indépendant de react-query : ce hook est consommé par des
 * composants feuilles (carte d'anniversaire, bouton de rappel) qui ne doivent
 * pas exiger un QueryClientProvider pour rendre un simple bouton.
 */
type State = {
  overrides: MessageTemplateOverrides
  status: 'idle' | 'loading' | 'ready' | 'error'
}

let state: State = { overrides: {}, status: 'idle' }
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()

function setState(next: State) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): State {
  return state
}

/** Snapshot serveur : aucun modèle chargé, les textes par défaut s'appliquent. */
const SERVER_STATE: State = { overrides: {}, status: 'idle' }
function getServerSnapshot(): State {
  return SERVER_STATE
}

/** Charge les modèles une seule fois ; les appels concurrents partagent la promesse. */
function loadOverrides(force = false): Promise<void> {
  if (!force && (state.status === 'ready' || state.status === 'loading')) {
    return inflight ?? Promise.resolve()
  }
  setState({ ...state, status: 'loading' })
  inflight = fetchMessageTemplateOverrides()
    .then((overrides) => {
      setState({ overrides, status: 'ready' })
    })
    .catch((error) => {
      console.error('[messageTemplates] chargement impossible', error)
      // On reste sur les textes par défaut plutôt que de bloquer un envoi.
      setState({ overrides: {}, status: 'error' })
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Réinitialise le cache — utile dans les tests. */
export function resetMessageTemplatesCache() {
  state = { overrides: {}, status: 'idle' }
  inflight = null
  listeners.forEach((listener) => listener())
}

/** Corps personnalisés enregistrés (vide tant qu'aucun modèle n'a été modifié). */
export function useMessageTemplateOverrides() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    void loadOverrides()
  }, [])

  return {
    data: snapshot.overrides,
    isLoading: snapshot.status === 'idle' || snapshot.status === 'loading',
    isError: snapshot.status === 'error',
    refetch: () => loadOverrides(true),
  }
}

export function useSaveMessageTemplates() {
  const [isPending, setIsPending] = useState(false)

  const save = useCallback(
    async (overrides: MessageTemplateOverrides, adminId?: string) => {
      setIsPending(true)
      try {
        await saveMessageTemplateOverrides(overrides, adminId)
        setState({ overrides, status: 'ready' })
      } finally {
        setIsPending(false)
      }
    },
    []
  )

  return { save, isPending }
}

/**
 * Rend un message à partir de sa clé de modèle.
 *
 * `render` reste utilisable pendant le chargement : il retombe alors sur le
 * texte par défaut, ce qui évite de désactiver les boutons d'envoi.
 */
export function useRenderMessageTemplate() {
  const { data: overrides } = useMessageTemplateOverrides()

  return useCallback(
    (key: string, variables: TemplateVariables = {}) => {
      const body = overrides?.[key]?.trim() || defaultTemplateBody(key)
      return renderTemplate(body, variables)
    },
    [overrides]
  )
}
