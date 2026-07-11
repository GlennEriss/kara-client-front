'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
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

async function resolveAccess(uid: string, getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }>): Promise<AccessData> {
  const usersCol = FIREBASE_COLLECTION_NAMES.USERS || 'users'
  const adminsCol = FIREBASE_COLLECTION_NAMES.ADMINS || 'admins'

  let isSuperAdmin = false
  let permissions: string[] = []
  let permissionsDefined = false

  for (const col of [usersCol, adminsCol]) {
    try {
      const snap = await getDoc(doc(db, col, uid))
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>
        if (hasSuperAdmin(data)) isSuperAdmin = true
        if (Array.isArray(data.permissions) && !permissionsDefined) {
          permissions = (data.permissions as unknown[]).filter((p): p is string => typeof p === 'string')
          permissionsDefined = true
        }
      }
    } catch {
      // ignore et continue
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
 * La source de vérité est le document Firestore (`users/{uid}` puis `admins/{uid}`).
 */
export function useMyAccess(): MyAccess {
  const { user } = useAuth()

  const { data, isLoading } = useQuery<AccessData>({
    queryKey: ['my-access', user?.uid],
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: () => resolveAccess(user!.uid, () => user!.getIdTokenResult()),
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
