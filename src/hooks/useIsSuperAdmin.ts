'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { FIREBASE_COLLECTION_NAMES } from '@/constantes/firebase-collection-names'
import { useAuth } from '@/domains/auth/hooks/useAuth'

/** Un rôle (string) correspond-il à superAdmin ? (insensible à la casse) */
function roleIsSuperAdmin(role: unknown): boolean {
  return typeof role === 'string' && role.toLowerCase().replace(/[^a-z]/g, '').includes('superadmin')
}

/** Cherche superAdmin dans un champ `roles` (tableau) ou `role` (string). */
function hasSuperAdmin(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false
  const roles = data.roles
  if (Array.isArray(roles) && roles.some(roleIsSuperAdmin)) return true
  return roleIsSuperAdmin(data.role)
}

/**
 * Indique si l'utilisateur connecté est superAdmin.
 *
 * La source de vérité est le champ `roles` (tableau) du document de l'admin en
 * Firestore — le custom claim `role` du token n'est pas fiable (ex. après une
 * migration d'UID, les claims ne sont pas recréés). On lit donc `users/{uid}`
 * puis `admins/{uid}`, avec repli sur le claim du token.
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

    const resolve = async () => {
      // 1) Document Firestore (source de vérité) : users puis admins
      const usersCol = FIREBASE_COLLECTION_NAMES.USERS || 'users'
      const adminsCol = FIREBASE_COLLECTION_NAMES.ADMINS || 'admins'
      for (const col of [usersCol, adminsCol]) {
        try {
          const snap = await getDoc(doc(db, col, user.uid))
          if (snap.exists() && hasSuperAdmin(snap.data() as Record<string, unknown>)) {
            return true
          }
        } catch {
          // ignore et continue
        }
      }
      // 2) Repli : custom claim du token
      try {
        const res = await user.getIdTokenResult()
        if (hasSuperAdmin(res.claims as Record<string, unknown>)) return true
      } catch {
        // ignore
      }
      return false
    }

    resolve()
      .then((ok) => {
        if (!cancelled) setIsSuperAdmin(ok)
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
