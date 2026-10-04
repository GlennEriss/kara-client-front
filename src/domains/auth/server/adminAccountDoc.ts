import { adminFirestore } from '@/firebase/adminFirestore'
import type { DocumentReference } from 'firebase-admin/firestore'

/**
 * Fiche `admins` d'un compte : par id (= uid = matricule), sinon par email
 * (anciennes fiches dont l'id ne correspond pas à l'uid Auth).
 */
export async function findAdminDocRef(uid: string, email?: string | null): Promise<DocumentReference | null> {
  if (!adminFirestore) return null
  const byId = adminFirestore.collection('admins').doc(uid)
  if ((await byId.get()).exists) return byId
  if (email) {
    const q = await adminFirestore.collection('admins').where('email', '==', email).limit(1).get()
    if (!q.empty) return q.docs[0].ref
  }
  return null
}
