'use client'

import React, { useEffect } from 'react'
import { auth } from '@/firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { startTokenRefreshTimer, refreshAuthToken, stopTokenRefreshTimer } from '@/lib/auth-utils'

interface AuthFirebaseProviderProps {
  children: React.ReactNode
}

export default function AuthFirebaseProvider({ children }: AuthFirebaseProviderProps) {
  useEffect(() => {
    // Écouter les changements d'état d'authentification
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Utilisateur connecté - rafraîchir le token
        //console.log('🔐 Utilisateur connecté:', user.email)
        await refreshAuthToken()
        // Démarrer le timer de rafraîchissement automatique
        startTokenRefreshTimer()
      } else {
        // Utilisateur déconnecté - supprimer le cookie et arrêter le timer
        //console.log('🚪 Utilisateur déconnecté')
        stopTokenRefreshTimer()
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict'
      }
    })

    return () => {
      console.log('🧹 Nettoyage AuthFirebaseProvider')
      unsubscribe()
      stopTokenRefreshTimer()
    }
  }, [])

  return <>{children}</>
}