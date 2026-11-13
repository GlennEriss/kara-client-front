import { FieldValue, type Firestore } from 'firebase-admin/firestore'

export function validateGroupDeletion(groupId: string, confirmation: unknown) {
  if (!groupId || groupId.length > 256 || groupId.includes('/') || ['.', '..'].includes(groupId)) throw new Error('Identifiant de groupe invalide')
  if (typeof confirmation !== 'string' || confirmation.trim() !== groupId) throw new Error('L’identifiant de confirmation ne correspond pas au groupe')
}

/** Suppression explicitement confirmée par un SuperAdmin (vérifié par la route).
 * La fiche est verrouillée avant le nettoyage. Une interruption laisse ce
 * verrou en place : la même opération peut être relancée sans double effet.
 * Les membres et contrats financiers indépendants ne sont jamais supprimés. */
export async function deleteGroupPermanently(db: Firestore, groupId: string, actor: { id: string; name: string }, deleteProofs: () => Promise<void>) {
  const ref = db.collection('groups').doc(groupId)
  const exists = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref)
    if (!snapshot.exists) return null
    tx.update(ref, { deletionInProgress: true, deletionRequestedBy: actor.id, deletionRequestedAt: FieldValue.serverTimestamp() })
    return snapshot.data()!
  })
  if (!exists) return

  // Les contrats financiers conservés doivent garder un intitulé même après
  // disparition du collectif. Aucun membre, projet ni historique n'est copié.
  await db.collection('deletedGroupIdentities').doc(groupId).set({
    name: String(exists.name || exists.label || 'Groupe'),
    label: typeof exists.label === 'string' ? exists.label : null,
    deletedAt: FieldValue.serverTimestamp(), deletedBy: actor.id,
  })

  await db.collection('auditLogs').add({
    adminId: actor.id, adminName: actor.name, action: 'delete', module: 'groups', moduleLabel: 'Groupes',
    targetType: 'groupe', targetId: groupId, createdAt: FieldValue.serverTimestamp(),
    description: 'Suppression définitive du groupe demandée et confirmée par son identifiant.',
  })

  const [members, payouts] = await Promise.all([
    db.collection('users').where('groupIds', 'array-contains', groupId).get(),
    db.collection('groupPayouts').where('groupId', '==', groupId).get(),
  ])
  const writer = db.bulkWriter()
  writer.onWriteError(error => error.failedAttempts < 3)
  const writes: Promise<unknown>[] = []
  for (const member of members.docs) writes.push(writer.update(member.ref, { groupIds: FieldValue.arrayRemove(groupId), updatedAt: FieldValue.serverTimestamp() }))
  for (const payout of payouts.docs) writes.push(writer.delete(payout.ref))
  writes.push(writer.delete(db.collection('groupAgreementLedgers').doc(groupId)))
  // Toutes les promesses sont observées dès leur création ; close attend aussi
  // les tentatives en attente du BulkWriter pour les grands groupes.
  const completed = Promise.all(writes)
  await Promise.all([completed, writer.close()])
  await deleteProofs()
  // recursiveDelete(ref) peut supprimer la fiche parente même si le nettoyage
  // de ses enfants échoue. Garder la fiche verrouillée jusqu'à la fin permet
  // de retrouver le groupe et de relancer l'opération après une interruption.
  for (const child of await ref.listCollections()) await db.recursiveDelete(child)
  await ref.delete()
  await db.collection('auditLogs').add({
    adminId: actor.id, adminName: actor.name, action: 'delete', module: 'groups', moduleLabel: 'Groupes',
    targetType: 'groupe', targetId: groupId, createdAt: FieldValue.serverTimestamp(),
    description: 'Suppression définitive du groupe et de son suivi interne. Membres et contrats financiers conservés.',
  }).catch(() => { console.error('[group-deletion] Journal de fin indisponible ; la demande est déjà journalisée.') })
}
