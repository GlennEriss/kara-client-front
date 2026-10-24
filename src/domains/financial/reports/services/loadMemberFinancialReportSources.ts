import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import type { CreditContract, CreditPayment, CreditPenalty, GuarantorPayment } from '@/types/types'
import type { DocumentSnapshot, Firestore, Query } from 'firebase-admin/firestore'
import type { FinancialReportSubject } from '../entities/financial-report.types'
import type { ChildRecord, FinancialReportSources, SourceRecord } from '../entities/financial-report-sources.types'
import { toRecord } from './loadFinancialReportSources'

/** Limite de valeurs d'un filtre `in` Firestore. */
const IN_QUERY_LIMIT = 30

async function readQuery(query: Query): Promise<SourceRecord[]> {
  const snapshot = await query.get()
  return snapshot.docs.map(toRecord)
}

/** Sous-collection `name` de chacun des documents `parents`. */
async function readChildrenOf(db: Firestore, collection: string, parents: SourceRecord[], name: string): Promise<ChildRecord[]> {
  const lists = await Promise.all(
    parents.map(async (parent) => {
      const snapshot = await db.collection(collection).doc(parent.id).collection(name).get()
      return snapshot.docs.map((doc) => ({ ...toRecord(doc), parentId: parent.id }))
    })
  )
  return lists.flat()
}

/** Documents de `collection` dont `field` vaut l'un des `ids` (par paquets de 30). */
async function readWhereIn(db: Firestore, collection: string, field: string, ids: string[]): Promise<SourceRecord[]> {
  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += IN_QUERY_LIMIT) chunks.push(ids.slice(index, index + IN_QUERY_LIMIT))
  const lists = await Promise.all(chunks.map((chunk) => readQuery(db.collection(collection).where(field, 'in', chunk))))
  return lists.flat()
}

const memberName = (doc: DocumentSnapshot): string => {
  const data = doc.data() ?? {}
  return [data.lastName, data.firstName].filter((part) => typeof part === 'string' && part.trim()).join(' ')
}

/**
 * Lit, côté serveur, les données d'un seul membre : ses contrats de caisse
 * spéciale et imprévue, ses crédits (avec les commissions versées à leurs
 * garants), ses placements et sa demande d'adhésion. Le calcul du bilan est
 * ensuite le même que pour l'association.
 *
 * Renvoie `null` si le membre n'existe pas.
 */
export async function loadMemberFinancialReportSources(
  db: Firestore,
  memberId: string
): Promise<{ subject: FinancialReportSubject; sources: FinancialReportSources } | null> {
  const names = firebaseCollectionNames
  const userDoc = await db.collection(names.users).doc(memberId).get()
  if (!userDoc.exists) return null

  const [caisseSpecialeContracts, caisseImprevueContracts, creditContracts, placements, requestsByMatricule] = await Promise.all([
    readQuery(db.collection(names.caisseContracts).where('memberId', '==', memberId)),
    readQuery(db.collection(names.contractsCI).where('memberId', '==', memberId)),
    readQuery(db.collection(names.creditContracts).where('clientId', '==', memberId)),
    readQuery(db.collection(names.placements).where('benefactorId', '==', memberId)),
    readQuery(db.collection(names.membershipRequests).where('matricule', '==', memberId)),
  ])

  // La demande d'adhésion est aussi référencée par la fiche du membre.
  const dossierId = userDoc.data()?.dossier
  const membershipRequests = [...requestsByMatricule]
  if (typeof dossierId === 'string' && dossierId && !membershipRequests.some((request) => request.id === dossierId)) {
    const dossier = await db.collection(names.membershipRequests).doc(dossierId).get()
    if (dossier.exists) membershipRequests.push(toRecord(dossier))
  }

  const creditIds = creditContracts.map((contract) => contract.id)
  const [
    caisseSpecialePayments,
    caisseSpecialeRefunds,
    caisseImprevuePayments,
    caisseImprevueSupports,
    caisseImprevueRefunds,
    creditPayments,
    creditPenalties,
    guarantorPayments,
    placementCommissions,
    placementEarlyExits,
  ] = await Promise.all([
    readChildrenOf(db, names.caisseContracts, caisseSpecialeContracts, 'payments'),
    readChildrenOf(db, names.caisseContracts, caisseSpecialeContracts, 'refunds'),
    readChildrenOf(db, names.contractsCI, caisseImprevueContracts, 'payments'),
    readChildrenOf(db, names.contractsCI, caisseImprevueContracts, 'supports'),
    readChildrenOf(db, names.contractsCI, caisseImprevueContracts, 'earlyRefunds'),
    readWhereIn(db, names.creditPayments, 'creditId', creditIds),
    readWhereIn(db, names.creditPenalties, 'creditId', creditIds),
    readWhereIn(db, names.guarantorPayments, 'creditId', creditIds),
    readChildrenOf(db, names.placements, placements, 'commissions'),
    readChildrenOf(db, names.placements, placements, 'earlyExit'),
  ])

  const matricule = userDoc.data()?.matricule
  return {
    subject: {
      memberId,
      matricule: typeof matricule === 'string' && matricule ? matricule : memberId,
      name: memberName(userDoc) || memberId,
    },
    sources: {
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
    },
  }
}
