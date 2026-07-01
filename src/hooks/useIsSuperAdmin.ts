'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/domains/auth/hooks/useAuth'

/**
 * Indique si l'utilisateur connecté est superAdmin (claim `role` du token).
 * Utilisé pour réserver certaines éditions sensibles (ex. infos d'un contrat).
 */
export function useIsSuperAdmin(): boolean {
  const { user } = useAuth()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setIsSuperAdmin(false)
      return
    }
    user
      .getIdTokenResult()
      .then((res) => {
        if (cancelled) return
        const role = String(res.claims?.role ?? '').toLowerCase()
        setIsSuperAdmin(role.includes('superadmin'))
      })
      .catch(() => {
        if (!cancelled) setIsSuperAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return isSuperAdmin
}
