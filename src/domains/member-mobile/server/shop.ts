import type { Firestore } from 'firebase-admin/firestore'
import type { MemberCaller } from './access'
import { memberIds, ownedRows } from './data'

export async function memberShops(db: Firestore, caller: MemberCaller) {
  const matches = await Promise.all(
    ['ownerMemberId', 'ownerMatricule', 'submittedBy'].map((field) =>
      ownedRows(db, 'shops', field, caller),
    ),
  )
  const ids = memberIds(caller)
  const owned = matches.flat().filter(row => {
    const owner = row.ownerMemberId || row.ownerMatricule
    return ids.includes(owner || row.submittedBy)
  })
  const unique = new Map(owned.map(row => [row.id, row]))
  return [...unique.values()].map((row) => ({
    id: row.id,
    name: String(row.name || 'Ma boutique'),
    category: String(row.category || ''),
    status: String(row.status || 'approved'),
    rejectionReason: String(row.rejectionReason || ''),
    hasPendingChanges: !!row.pendingChanges,
    pendingChangesRejectionReason: String(
      row.pendingChangesRejectionReason || '',
    ),
  }))
}

export async function memberShopDirectory(db: Firestore) {
  const snapshot = await db.collection('shops').orderBy('name').get()
  return snapshot.docs.flatMap(doc => {
    const shop = doc.data()
    if ((shop.status ?? 'approved') !== 'approved' || shop.isActive === false) return []
    return [{
      id: doc.id,
      name: String(shop.name || 'Boutique'),
      category: String(shop.category || ''),
      city: String(shop.city || ''),
      description: String(shop.description || ''),
      cover: String(shop.gallery?.[0]?.url || shop.photoURL || ''),
      phone: String(shop.phone || ''),
      whatsapp: String(shop.whatsapp || ''),
      acceptsCredit: shop.acceptsCredit === true,
    }]
  }).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}
