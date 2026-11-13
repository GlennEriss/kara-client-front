import { adminFirestore } from '@/firebase/adminFirestore'
import { hasAdminRole, resolveAdminAccess } from '../access-policy'
import type { SessionClaims } from './session'

/** Une erreur de lecture ne doit jamais devenir des permissions implicites. */
export async function loadAdminAccess(claims: SessionClaims) {
  if (!adminFirestore) throw new Error('Permissions temporairement indisponibles')
  const emails = [...new Set([claims.email?.trim(), claims.email?.trim().toLowerCase()].filter((value): value is string => !!value))]
  const groups = await Promise.all(['users', 'admins'].map(async collection => {
    const ref = adminFirestore!.collection(collection)
    const snapshots = await Promise.all([
      ref.doc(claims.uid).get().then(snap => snap.exists ? [snap] : []),
      ...emails.map(email => ref.where('email', '==', email).get().then(snap => snap.docs)),
    ])
    const seen = new Set<string>()
    const docs = snapshots.flat().filter(snap => {
      if (seen.has(snap.id)) return false
      seen.add(snap.id)
      return true
    }).map(snap => snap.data() as Record<string, unknown>)
    return { collection, docs }
  }))
  const docs = groups.flatMap(group => group.docs)
  const isAdmin = hasAdminRole(claims) || docs.some(hasAdminRole) || groups.some(group => group.collection === 'admins' && group.docs.length > 0)
  return isAdmin ? resolveAdminAccess(docs, claims) : null
}
