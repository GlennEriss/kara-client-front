import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { ContractCI } from '@/types/types'
import type { ContractCIFilters } from '../entities/contract-filters.types'
import { canPaginateContractsCI, type ContractCIPage, type ContractListScope } from '../utils/contract-pagination'

/** Pagination des seuls filtres traduits intégralement dans la requête Firestore. */
export async function readContractsCIPage(
  filters: ContractCIFilters,
  scope: ContractListScope,
  page: number,
  pageSize: number,
  cursor: string | null = null,
): Promise<ContractCIPage> {
  if (!canPaginateContractsCI(filters, scope)) throw new Error('Ce filtre nécessite le parcours complet des contrats')
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) throw new RangeError('Page invalide')
  const { db, collection, query, where, orderBy, getDocs, getCountFromServer, limit, startAfter, doc, getDoc } = await import('@/firebase/firestore')
  const ref = collection(db, firebaseCollectionNames.contractsCI)
  const constraints = []
  const status = filters.status as string | undefined
  if (scope === 'closed') {
    if (status && status !== 'all' && status !== 'CLOTURE' && status !== 'CANCELED' && status !== 'FINISHED') return { items: [], total: 0, nextCursor: null }
    constraints.push(status === 'CANCELED' || status === 'FINISHED' ? where('status', '==', status) : where('status', 'in', ['FINISHED', 'CANCELED']))
  } else if (status && status !== 'all') {
    if (scope === 'open' && ['CLOTURE', 'CANCELED', 'FINISHED'].includes(status)) return { items: [], total: 0, nextCursor: null }
    constraints.push(status === 'CLOTURE' ? where('status', 'in', ['FINISHED', 'CANCELED']) : where('status', '==', status))
  }
  if (filters.paymentFrequency && filters.paymentFrequency !== 'all') constraints.push(where('paymentFrequency', '==', filters.paymentFrequency))
  if (filters.subscriptionCIID) constraints.push(where('subscriptionCIID', '==', filters.subscriptionCIID))
  if (filters.createdAtFrom) constraints.push(where('createdAt', '>=', filters.createdAtFrom))
  if (filters.createdAtTo) constraints.push(where('createdAt', '<=', filters.createdAtTo))
  constraints.push(orderBy('createdAt', 'desc'))
  const base = query(ref, ...constraints)
  const countPromise = getCountFromServer(base)
  // Attacher immédiatement le rejet, même si la recherche du curseur échoue.
  const pagePromise = (async () => {
    let anchor = cursor ? await getDoc(doc(ref, cursor)) : null
    if (!anchor?.exists() && page > 1) {
      // Arrivée directe depuis une URL : retrouver le curseur sans charger toute la collection.
      const preceding = await getDocs(query(base, limit((page - 1) * pageSize)))
      if (preceding.size < (page - 1) * pageSize) return []
      anchor = preceding.docs.at(-1) ?? null
    }
    const result = await getDocs(query(base, ...(anchor?.exists() ? [startAfter(anchor)] : []), limit(pageSize)))
    return result.docs
  })()
  const [count, docs] = await Promise.all([countPromise, pagePromise])
  const items = docs.map((snapshot) => {
    const data = snapshot.data()
    const rawFirst = data.firstPaymentDate
    const date = rawFirst instanceof Date ? rawFirst : rawFirst?.toDate?.() ?? new Date(rawFirst)
    return {
      id: snapshot.id, ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
      firstPaymentDate: !rawFirst ? '' : typeof rawFirst === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawFirst)
        ? rawFirst.split('T')[0] : Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0],
    } as ContractCI
  })
  return { items, total: count.data().count, nextCursor: docs.at(-1)?.id ?? null }
}
