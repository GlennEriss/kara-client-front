import type { Firestore } from 'firebase-admin/firestore'
import type { MemberCaller } from '../server/access'
export const memberCaller: MemberCaller = {
  uid: 'UID-TEST',
  email: 'membre@example.test',
  matricule: 'TEST.MK.010126',
  member: { matricule: 'TEST.MK.010126' },
  dossier: { status: 'approved' },
}
/** Faux Firestore en mémoire, jamais connecté à un projet Firebase. */
export function memoryDb(initial: Record<string, Record<string, any>>) {
  const records = new Map(
    Object.entries(initial).map(([path, data]) => [path, { ...data }]),
  )
  const writes: { path: string; data: unknown }[] = [],
    reads: string[] = []
  const ref = (path: string): any => ({
    id: path.split('/').at(-1),
    path,
    get: async () => snapshot(path),
    collection: (name: string) => query(`${path}/${name}`),
    update: async (data: any) => update(path, data),
    set: async (data: any) => update(path, data),
    delete: async () => {
      writes.push({ path, data: null })
      records.delete(path)
    },
  })
  const snapshot = (path: string): any => ({
    id: path.split('/').at(-1),
    exists: records.has(path),
    data: () => records.get(path),
    ref: ref(path),
  })
  const update = (path: string, data: any) => {
    writes.push({ path, data })
    records.set(path, { ...records.get(path), ...data })
  }
  const scalar = (value: any) =>
    value?.toDate?.().getTime() ??
    (value instanceof Date ? value.getTime() : value)
  const query = (
    path: string,
    filters: any[] = [],
    sort?: [string, string],
    max = Infinity,
    collectionGroup = false,
  ): any => ({
    doc: (id: string) => ref(`${path}/${id}`),
    where: (key: string, op: string, value: any) =>
      query(path, [...filters, [key, op, value]], sort, max, collectionGroup),
    orderBy: (key: string, direction = 'asc') =>
      query(path, filters, [key, direction], max, collectionGroup),
    limit: (value: number) =>
      query(path, filters, sort, value, collectionGroup),
    select: () => query(path, filters, sort, max, collectionGroup),
    count: () => ({
      get: async () => {
        const snapshot = await query(
          path,
          filters,
          sort,
          max,
          collectionGroup,
        ).get()
        return { data: () => ({ count: snapshot.size }) }
      },
    }),
    get: async () => {
      reads.push(path)
      const values = [...records]
        .filter(([key]) =>
          collectionGroup
            ? key.split('/').at(-2) === path
            : key.startsWith(path + '/') &&
              key.split('/').length === path.split('/').length + 1,
        )
        .filter(([, data]) =>
          filters.every(([key, op, value]) =>
            op === 'in'
              ? value.includes(data[key])
              : op === 'array-contains'
                ? data[key]?.includes(value)
                : data[key] === value,
          ),
        )
      if (sort) {
        const [key, direction] = sort
        values.sort(
          ([, a], [, b]) =>
            (scalar(a[key]) > scalar(b[key])
              ? 1
              : scalar(a[key]) < scalar(b[key])
                ? -1
                : 0) * (direction === 'desc' ? -1 : 1),
        )
      }
      const docs = values.slice(0, max).map(([key]) => snapshot(key))
      return { docs, size: docs.length, empty: docs.length === 0 }
    },
  })
  const db = {
    collection: (path: string) => query(path),
    collectionGroup: (path: string) =>
      query(path, [], undefined, Infinity, true),
    runTransaction: async (fn: any) =>
      fn({
        get: (r: any) => r.get(),
        update: (r: any, data: any) => update(r.path, data),
        set: (r: any, data: any) => update(r.path, data),
        delete: (r: any) => r.delete(),
      }),
    batch: () => {
      const pending: any[] = []
      return {
        update: (r: any, data: any) => pending.push([r.path, data]),
        commit: async () =>
          pending.forEach(([path, data]) => update(path, data)),
      }
    },
  } as unknown as Firestore
  return { db, records, writes, reads }
}
