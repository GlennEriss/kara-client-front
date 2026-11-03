import type { Firestore, QuerySnapshot } from 'firebase-admin/firestore'

/** Déduplique les lectures d'une seule requête, sans cache financier entre deux requêtes. */
export class FirestoreReadScope {
  private readonly snapshots = new Map<string, Promise<QuerySnapshot>>()

  constructor(private readonly db: Firestore) {}

  collection(name: string): Promise<QuerySnapshot> {
    return this.read(`collection:${name}`, () => this.db.collection(name).get())
  }

  collectionGroup(name: string): Promise<QuerySnapshot> {
    return this.read(`group:${name}`, () => this.db.collectionGroup(name).get())
  }

  private read(key: string, load: () => Promise<QuerySnapshot>): Promise<QuerySnapshot> {
    if (!this.snapshots.has(key)) this.snapshots.set(key, load())
    return this.snapshots.get(key)!
  }
}
