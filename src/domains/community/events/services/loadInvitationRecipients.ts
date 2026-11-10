import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { UNKNOWN_USER_MATRICULE } from '@/domains/financial/caisse-imprevue/import/unknownUser'
import type { User } from '@/types/types'
import { invitationRecipient } from '../utils/event-invitations'

/** Load all members on demand, without subscription lookups or a hidden page limit. */
export async function loadInvitationRecipients() {
  const snapshot = await getDocs(query(collection(db, 'users'),
    where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant'])))
  return snapshot.docs
    .map(doc => ({ ...doc.data(), id: doc.id }) as User)
    .filter(member => member.id !== UNKNOWN_USER_MATRICULE && member.matricule !== UNKNOWN_USER_MATRICULE)
    .map(invitationRecipient)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}
