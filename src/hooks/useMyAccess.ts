'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { FIREBASE_COLLECTION_NAMES } from '@/constantes/firebase-collection-names'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { moduleViewKey } from '@/constantes/permissions'

/** Un rôle (string) correspond-il à superAdmin ? (insensible à la casse) */
function roleIsSuperAdmin(role: unknown): boolean {
  return typeof role === 'string' && role.toLowerCase().replace(/[^a-z]/g, '').includes('superadmin')
}

function hasSuperAdmin(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false
  const roles = data.roles
  if (Array.isArray(roles) && roles.some(roleIsSuperAdmin)) return true
  return roleIsSuperAdmin(data.role)
}

interface AccessData {
  isSuperAdmin: boolean
  permissions: string[]
  /** Le champ `permissions` a-t-il été explicitement défini pour cet admin ? */
  permissionsDefined: boolean
}

async function getAccountDocs(uid: string, email?: string | null) {
  const usersCol = FIREBASE_COLLECTION_NAMES.USERS || 'users'
  const adminsCol = FIREBASE_COLLECTION_NAMES.ADMINS || 'admins'
  const docs: Record<string, unknown>[] = []
  const seen = new Set<string>()
  const emailCandidates = Array.from(
    new Set([email?.trim(), email?.trim().toLowerCase()].filter((value): value is string => Boolean(value)))
  )

  for (const col of [usersCol, adminsCol]) {
    try {
      const snap = await getDoc(doc(db, col, uid))
      if (snap.exists()) {
        seen.add(`${col}/${snap.id}`)
        docs.push(snap.data() as Record<string, unknown>)
      }
    } catch {
      // ignore et continue
    }

    // Certains documents admins historiques sont indexés par matricule, pas par
    // UID Firebase Auth. L'email relie alors le compte connecté au bon document.
    for (const emailValue of emailCandidates) {
      try {
        const snap = await getDocs(query(collection(db, col), where('email', '==', emailValue)))
        snap.docs.forEach((docSnap) => {
          const key = `${col}/${docSnap.id}`
          if (!seen.has(key)) {
            seen.add(key)
            docs.push(docSnap.data() as Record<string, unknown>)
          }
        })
      } catch {
        // ignore et continue
      }
    }
  }

  return docs
}

async function resolveAccess(
  uid: string,
  email: string | null | undefined,
  getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }>
): Promise<AccessData> {
  let isSuperAdmin = false
  let permissions: string[] = []
  let permissionsDefined = false

  const accountDocs = await getAccountDocs(uid, email)
  for (const data of accountDocs) {
    if (hasSuperAdmin(data)) isSuperAdmin = true
    if (Array.isArray(data.permissions) && !permissionsDefined) {
      permissions = (data.permissions as unknown[]).filter((p): p is string => typeof p === 'string')
      permissionsDefined = true
    }
  }

  // Repli superAdmin : custom claim du token
  if (!isSuperAdmin) {
    try {
      const res = await getIdTokenResult()
      if (hasSuperAdmin(res.claims)) isSuperAdmin = true
    } catch {
      // ignore
    }
  }

  return { isSuperAdmin, permissions, permissionsDefined }
}

export interface MyAccess {
  isLoading: boolean
  isSuperAdmin: boolean
  /** Ensemble des clés de permission accordées (vide pour un superAdmin — utiliser `can`). */
  permissions: Set<string>
  /** L'admin peut-il effectuer cette action ? (superAdmin → toujours vrai) */
  can: (permissionKey: string) => boolean
  /** Au moins une des permissions ? */
  canAny: (permissionKeys: string[]) => boolean
  /** L'admin peut-il voir/accéder à ce module ? */
  canModule: (moduleKey: string) => boolean
}

/**
 * Accès de l'administrateur connecté : superAdmin + permissions fines.
 * La source de vérité est le document Firestore (`users/admins` par uid, puis
 * par email pour les anciens documents admin indexés par matricule).
 */
export function useMyAccess(): MyAccess {
  const { user } = useAuth()

  const { data, isLoading } = useQuery<AccessData>({
    queryKey: ['my-access', user?.uid, user?.email],
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: () => resolveAccess(user!.uid, user!.email, () => user!.getIdTokenResult()),
  })

  const isSuperAdmin = data?.isSuperAdmin ?? false
  // Rétro-compatibilité : un admin sans champ `permissions` explicite conserve l'accès
  // complet (comportement d'avant la fonctionnalité). L'enforcement démarre une fois
  // des permissions enregistrées (même un tableau vide = « aucun accès »).
  const permissionsDefined = data?.permissionsDefined ?? false
  const permissions = useMemo(() => new Set(data?.permissions ?? []), [data?.permissions])

  return useMemo<MyAccess>(() => {
    const can = (key: string) => isSuperAdmin || !permissionsDefined || permissions.has(key)
    return {
      isLoading: !!user?.uid && isLoading,
      isSuperAdmin,
      permissions,
      can,
      canAny: (keys: string[]) => isSuperAdmin || !permissionsDefined || keys.some((k) => permissions.has(k)),
      canModule: (moduleKey: string) => can(moduleViewKey(moduleKey)),
    }
  }, [isSuperAdmin, permissionsDefined, permissions, isLoading, user?.uid])
}
