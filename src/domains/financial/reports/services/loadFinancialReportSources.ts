import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { CreditContract, CreditPayment, CreditPenalty, GuarantorPayment } from '@/types/types'
import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore'
import type { ChildRecord, FinancialReportSources, SourceRecord } from '../entities/financial-report-sources.types'
import { FirestoreReadScope } from './FirestoreReadScope'

/** Les calculs attendent des `Date`, pas des `Timestamp` Firestore. */
function withDates(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate()
  if (Array.isArray(value)) return value.map(withDates)
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, withDates(entry)]))
  }
  return value
}

export const toRecord = (doc: DocumentSnapshot): SourceRecord => ({ id: doc.id, ...(withDates(doc.data() ?? {}) as object) })

async function readCollection(reader: FirestoreReadScope, name: string): Promise<SourceRecord[]> {
  const snapshot = await reader.collection(name)
  return snapshot.docs.map(toRecord)
}

/**
 * Sous-collection `name` de tous les documents de `parentCollection` : une
 * lecture groupée, filtrée sur la collection parente (plusieurs modules
 * utilisent par exemple une sous-collection `payments`).
 */
async function readChildren(reader: FirestoreReadScope, parentCollection: string, name: string): Promise<ChildRecord[]> {
  const snapshot = await reader.collectionGroup(name)
  return snapshot.docs
    .filter((doc) => doc.ref.parent.parent?.parent.id === parentCollection)
    .map((doc) => ({ ...toRecord(doc), parentId: doc.ref.parent.parent!.id }))
}

/** Lit, côté serveur, toutes les données d'un bilan financier. */
export async function loadFinancialReportSources(db: Firestore, reader = new FirestoreReadScope(db)): Promise<FinancialReportSources> {
  const names = firebaseCollectionNames
  const [
    caisseSpecialeContracts,
    caisseSpecialePayments,
    caisseSpecialeRefunds,
    caisseImprevueContracts,
    caisseImprevuePayments,
    caisseImprevueSupports,
    caisseImprevueRefunds,
    creditContracts,
    creditPayments,
    creditPenalties,
    guarantorPayments,
    placements,
    placementCommissions,
    placementEarlyExits,
    membershipRequests,
  ] = await Promise.all([
    readCollection(reader, names.caisseContracts),
    readChildren(reader, names.caisseContracts, 'payments'),
    readChildren(reader, names.caisseContracts, 'refunds'),
    readCollection(reader, names.contractsCI),
    readChildren(reader, names.contractsCI, 'payments'),
    readChildren(reader, names.contractsCI, 'supports'),
    readChildren(reader, names.contractsCI, 'earlyRefunds'),
    readCollection(reader, names.creditContracts),
    readCollection(reader, names.creditPayments),
    readCollection(reader, names.creditPenalties),
    readCollection(reader, names.guarantorPayments),
    readCollection(reader, names.placements),
    readChildren(reader, names.placements, 'commissions'),
    readChildren(reader, names.placements, 'earlyExit'),
    readCollection(reader, names.membershipRequests),
  ])

  return {
    caisseSpecialeContracts,
    caisseSpecialePayments,
    caisseSpecialeRefunds,
    caisseImprevueContracts,
    caisseImprevuePayments,
    caisseImprevueSupports,
    caisseImprevueRefunds,
    creditContracts: creditContracts as unknown as CreditContract[],
    creditPayments: creditPayments as unknown as CreditPayment[],
    creditPenalties: creditPenalties as unknown as CreditPenalty[],
    guarantorPayments: guarantorPayments as unknown as GuarantorPayment[],
    placements,
    placementCommissions,
    placementEarlyExits,
    membershipRequests,
  }
}
