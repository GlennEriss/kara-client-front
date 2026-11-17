import {
  FieldPath,
  FieldValue,
  Filter,
  Timestamp,
  type Firestore,
} from 'firebase-admin/firestore'

type Constraint = { kind: string; args: any[] }
/** Preserve timestamps, references and field transforms while omitting optional fields. */
export function cleanFinanceWrite(value: any): any {
  if (
    value &&
    !(value instanceof Timestamp) &&
    typeof value.toDate === 'function'
  )
    return value.toDate()
  if (Array.isArray(value))
    return value.map((item) =>
      item === undefined ? null : cleanFinanceWrite(item),
    )
  if (value && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, cleanFinanceWrite(item)]),
    )
  return value
}
/**
 * Adapts the modular API used by the repositories to Admin Firestore. Each
 * Unmerged setDoc calls are creation-only here to protect existing financial
 * records from minute-based ID collisions. Each repository receives this port explicitly; browser repositories keep their
 * existing SDK. Authorization belongs to the authenticated finance gateway.
 */
export function createServerFirestorePort(
  db: Firestore,
): typeof import('@/firebase/firestore') {
  const snapshot = (value: any): any => ({
    id: value.id,
    ref: value.ref,
    _snapshot: value,
    exists: () => value.exists,
    data: () => value.data(),
    get: (field: string) => value.get(field),
  })
  const querySnapshot = (value: any) => {
    const docs = value.docs.map(snapshot)
    return {
      docs,
      size: value.size,
      empty: value.empty,
      forEach: (fn: (value: any) => void) => docs.forEach(fn),
    }
  }
  const constraint =
    (kind: string) =>
    (...args: any[]): Constraint => ({ kind, args })
  const filter = (value: Constraint): Filter =>
    value.kind === 'or'
      ? Filter.or(...value.args.map(filter))
      : Filter.where(value.args[0], value.args[1], value.args[2])
  const query = (base: any, ...constraints: Constraint[]) =>
    constraints.reduce((current, item) => {
      if (item.kind === 'or') return current.where(filter(item))
      const args = item.args.map((value) => value?._snapshot ?? value)
      return current[item.kind](...args)
    }, base)
  const collection = (parent: any, ...segments: string[]) =>
    parent.collection(segments.join('/'))
  const doc = (parent: any, ...segments: string[]) =>
    segments.length ? parent.doc(segments.join('/')) : parent.doc()
  const port = {
    db,
    Timestamp,
    FieldValue,
    isFirestoreAvailable: () => true,
    collection,
    doc,
    query,
    collectionGroup: (_db: unknown, name: string) => db.collectionGroup(name),
    where: constraint('where'),
    or: constraint('or'),
    orderBy: constraint('orderBy'),
    startAfter: constraint('startAfter'),
    startAt: constraint('startAt'),
    limit: constraint('limit'),
    limitToLast: constraint('limitToLast'),
    documentId: () => FieldPath.documentId(),
    serverTimestamp: () => FieldValue.serverTimestamp(),
    deleteField: () => FieldValue.delete(),
    increment: (value: number) => FieldValue.increment(value),
    arrayUnion: (...values: unknown[]) => FieldValue.arrayUnion(...values),
    getDoc: async (ref: any) => snapshot(await ref.get()),
    getDocs: async (ref: any) => querySnapshot(await ref.get()),
    getCountFromServer: async (ref: any) => ref.count().get(),
    setDoc: async (ref: any, data: any, options?: any) => {
      if (options) await ref.set(cleanFinanceWrite(data), options)
      else await ref.create(cleanFinanceWrite(data))
    },
    updateDoc: async (ref: any, ...args: any[]) =>
      ref.update(...args.map(cleanFinanceWrite)),
    deleteDoc: async (ref: any) => ref.delete(),
    addDoc: async (ref: any, data: any) => ref.add(cleanFinanceWrite(data)),
    writeBatch: () => {
      const batch = db.batch()
      const scoped = {
        set: (ref: any, data: any, options?: any) => {
          if (options) batch.set(ref, cleanFinanceWrite(data), options)
          else batch.set(ref, cleanFinanceWrite(data))
          return scoped
        },
        update: (ref: any, data: any) => {
          batch.update(ref, cleanFinanceWrite(data))
          return scoped
        },
        delete: (ref: any) => {
          batch.delete(ref)
          return scoped
        },
        commit: () => batch.commit(),
      }
      return scoped
    },
    runTransaction: async (
      _db: unknown,
      fn: (transaction: any) => Promise<unknown>,
    ) =>
      db.runTransaction(async (transaction) => {
        const scoped = {
          get: async (ref: any) => snapshot(await transaction.get(ref)),
          set: (ref: any, data: any, options?: any) => {
            if (options) transaction.set(ref, cleanFinanceWrite(data), options)
            else transaction.set(ref, cleanFinanceWrite(data))
            return scoped
          },
          update: (ref: any, data: any) => {
            transaction.update(ref, cleanFinanceWrite(data))
            return scoped
          },
          delete: (ref: any) => {
            transaction.delete(ref)
            return scoped
          },
        }
        return fn(scoped)
      }),
  }
  // Firebase client and Admin use different nominal reference/snapshot classes.
  // The boundary implements only the modular operations used by repositories.
  return port as unknown as typeof import('@/firebase/firestore')
}
