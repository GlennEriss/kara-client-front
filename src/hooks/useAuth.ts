'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/firebase/auth'
import { onAuthStateChanged, User } from 'firebase/auth'

interface AuthState {
  user: User | null
  loading: boolean
  authenticated: boolean
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    authenticated: false
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Vérifier le token côté serveur
        try {
          const token = await user.getIdToken()
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
          })

          const result = await response.json()
          
          setAuthState({
            user: result.authenticated ? user : null,
            loading: false,
            authenticated: result.authenticated
          })
        } catch (error) {
          console.error('Erreur de vérification du token:', error)
          setAuthState({
            user: null,
            loading: false,
            authenticated: false
          })
        }
      } else {
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