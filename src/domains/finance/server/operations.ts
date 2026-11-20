import { createHash } from 'node:crypto'
import type { Firestore, DocumentReference } from 'firebase-admin/firestore'

export class FinanceRequestConflict extends Error {}
function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    )
  return value
}
export async function financeFingerprint(
  input: unknown,
  files: Record<string, File>,
) {
  const hashes = Object.fromEntries(
    await Promise.all(
      Object.entries(files).map(async ([key, file]) => [
        key,
        createHash('sha256')
          .update(Buffer.from(await file.arrayBuffer()))
          .digest('hex'),
      ]),
    ),
  )
  return createHash('sha256')
    .update(JSON.stringify(stable({ input, files: hashes })))
    .digest('hex')
}
export async function beginFinanceOperation(
  db: Firestore,
  uid: string,
  key: string,
  target: string,
  fingerprint: string,
) {
  const id = createHash('sha256').update(`${uid}:${key}`).digest('hex')
  const operation = db.collection('mobileFinanceOperations').doc(id)
  const lock = db
    .collection('mobileFinanceLocks')
    .doc(createHash('sha256').update(target).digest('hex'))
  return db.runTransaction(async (tx) => {
    const [old, currentLock] = await Promise.all([
      tx.get(operation),
      tx.get(lock),
    ])
    if (old.exists) {
      const data = old.data()!
      if (data.fingerprint !== fingerprint)
        throw new FinanceRequestConflict(
          'Cette référence a déjà été utilisée pour une autre saisie.',
        )
      if (data.status === 'DONE')
        return { operation, lock, replay: true, result: data.result }
      if (data.status === 'FAILED')
        throw new FinanceRequestConflict(
          'Cette opération a échoué. Vérifiez l’historique avant une nouvelle saisie.',
        )
      throw new FinanceRequestConflict(
        'Cette opération est en cours. Actualisez l’historique avant de réessayer.',
      )
    }
    if (currentLock.exists)
      throw new FinanceRequestConflict(
        'Une opération est déjà en cours sur ce dossier. Actualisez son historique.',
      )
    tx.create(operation, {
      uid,
      fingerprint,
      target,
      status: 'PENDING',
      createdAt: new Date(),
    })
    tx.create(lock, { operationId: id, uid, createdAt: new Date() })
    return { operation, lock, replay: false, result: undefined }
  })
}
export async function endFinanceOperation(
  db: Firestore,
  operation: DocumentReference,
  lock: DocumentReference,
  status: 'DONE' | 'FAILED',
  result?: unknown,
) {
  await db.runTransaction(async (tx) => {
    const currentLock = await tx.get(lock)
    tx.update(operation, {
      status,
      finishedAt: new Date(),
      ...(status === 'DONE' ? { result: result ?? null } : {}),
    })
    if (currentLock.data()?.operationId === operation.id) tx.delete(lock)
  })
}
