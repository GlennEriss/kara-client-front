'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { FIREBASE_COLLECTION_NAMES } from '@/constantes/firebase-collection-names'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { moduleViewKey } from '@/constantes/permissions'
import { resolveAdminAccess, type ResolvedAdminAccess } from '@/domains/auth/access-policy'

type AccessData = ResolvedAdminAccess

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
  const accountDocs = await getAccountDocs(uid, email)
  let claims: Record<string, unknown> = {}
  try { claims = (await getIdTokenResult()).claims } catch { /* Les fiches restent la référence. */ }
  return resolveAdminAccess(accountDocs, claims)
}

export interface MyAccess {
  isLoading: boolean
  isSuperAdmin: boolean
  /** Rôle restreint (agent de recouvrement, gestionnaire des véhicules) : pas de tableau de bord ni de pages hors modules. */
  isAgent: boolean
  /** Clé du rôle restreint, ou null. */
  restrictedRole: string | null
  /** Peut encaisser depuis le calendrier (droit « calendar.payment »). */
  canRecordPayments: boolean
  /** Peut télécharger des documents : reçus, preuves, médias (droit « documents.download »). */
  canDownloadDocuments: boolean
  /**
   * Voit les montants du calendrier et les remises à venir. L'agent de
   * recouvrement relance les membres sans connaître les sommes en jeu.
   */
  canSeeAmounts: boolean
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
  const { user, loading: authLoading } = useAuth()

  const { data, isLoading } = useQuery<AccessData>({
    queryKey: ['my-access', user?.uid, user?.email],
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: () => resolveAccess(user!.uid, user!.email, () => user!.getIdTokenResult()),
  })

  const isSuperAdmin = data?.isSuperAdmin ?? false
  const isAgent = !isSuperAdmin && (data?.isAgent ?? false)
  const restrictedRole = isAgent ? (data?.restrictedRole ?? null) : null
  // Rétro-compatibilité : un admin sans champ `permissions` explicite conserve l'accès
  // complet (comportement d'avant la fonctionnalité). L'enforcement démarre une fois
  // des permissions enregistrées (même un tableau vide = « aucun accès »).
  const permissionsDefined = data?.permissionsDefined ?? false
  const accessResolved = !!data
  const permissions = useMemo(() => new Set(data?.permissions ?? []), [data?.permissions])

  return useMemo<MyAccess>(() => {
    const can = (key: string) => accessResolved && (isSuperAdmin || !permissionsDefined || permissions.has(key))
    return {
      isLoading: !!authLoading || (!!user?.uid && isLoading),
      isSuperAdmin,
      isAgent,
      restrictedRole,
      canRecordPayments: can('calendar.view') && can('calendar.payment'),
      canDownloadDocuments: can('documents.download'),
      canSeeAmounts: accessResolved && restrictedRole !== 'AgentRecouvrement',
      permissions,
      can,
      canAny: (keys: string[]) => keys.some(can),
      canModule: (moduleKey: string) => can(moduleViewKey(moduleKey)),
    }
  }, [isSuperAdmin, isAgent, restrictedRole, permissionsDefined, accessResolved, permissions, isLoading, authLoading, user?.uid])
}
