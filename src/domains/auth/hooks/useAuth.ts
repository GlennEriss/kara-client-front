'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/firebase/auth'
import { onAuthStateChanged, User } from 'firebase/auth'

/**
 * État d'authentification
 */
export interface AuthState {
  user: User | null
  loading: boolean
  authenticated: boolean
}

/**
 * Hook pour gérer l'état d'authentification de l'utilisateur
 * 
 * Écoute les changements d'état Firebase Auth et met à jour l'état local.
 * Le token est géré automatiquement par AuthFirebaseProvider (refresh automatique).
 * 
 * @returns L'état d'authentification (user, loading, authenticated)
 * 
 * @example
 * ```tsx
 * const { user, loading, authenticated } = useAuth()
 * 
 * if (loading) return <Loader />
 * if (!authenticated) return <Redirect to="/login" />
 * 
 * return <Dashboard user={user} />
 * ```
 */
export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    authenticated: false
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Utilisateur connecté via Firebase
        setAuthState({
          user,
          loading: false,
          authenticated: true
        })
      } else {
        // Utilisateur déconnecté
        setAuthState({
          user: null,
          loading: false,
          authenticated: false
        })
      }
    })

    return () => unsubscribe()
  }, [])

  return authState
}
