'use client'

import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
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

async function hasSuperAdminInFirestore(uid: string, email?: string | null): Promise<boolean> {
  const usersCol = FIREBASE_COLLECTION_NAMES.USERS || 'users'
  const adminsCol = FIREBASE_COLLECTION_NAMES.ADMINS || 'admins'
  const seen = new Set<string>()
  const emailCandidates = Array.from(
    new Set([email?.trim(), email?.trim().toLowerCase()].filter((value): value is string => Boolean(value)))
  )

  for (const col of [usersCol, adminsCol]) {
    try {
      const snap = await getDoc(doc(db, col, uid))
      if (snap.exists()) {
        seen.add(`${col}/${snap.id}`)
        if (hasSuperAdmin(snap.data() as Record<string, unknown>)) return true
      }
    } catch {
      // ignore et continue
    }

    // Documents historiques indexés par matricule : on retrouve le bon admin par email.
    for (const emailValue of emailCandidates) {
      try {
        const snap = await getDocs(query(collection(db, col), where('email', '==', emailValue)))
        for (const docSnap of snap.docs) {
          const key = `${col}/${docSnap.id}`
          if (seen.has(key)) continue
          seen.add(key)
          if (hasSuperAdmin(docSnap.data() as Record<string, unknown>)) return true
        }
      } catch {
        // ignore et continue
      }
    }
  }

  return false
}

/**
 * Indique si l'utilisateur connecté est superAdmin.
 *
 * La source de vérité est le champ `roles` (tableau) du document de l'admin en
 * Firestore — par uid puis par email pour les anciens documents indexés par
 * matricule — avec repli sur le claim du token.
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
      if (await hasSuperAdminInFirestore(user.uid, user.email)) return true
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
