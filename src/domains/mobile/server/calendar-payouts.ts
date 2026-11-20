import type { Firestore, Query } from 'firebase-admin/firestore'
import { firebaseCollectionNames as names } from '@/constantes/firebase-collection-names'
import {
  createUpcomingPayoutsReader,
  type PayoutProduct,
  type UpcomingPayout,
} from '@/services/calendar/upcomingPayouts'
import type {
  CaisseContract,
  CaissePayment,
  CaisseSettings,
} from '@/services/caisse/types'
import type { ContractCI, PaymentCI, Placement } from '@/types/types'
import { fromFirestore } from './calendar-service'
import { businessWallTime, withBusinessDates } from './calendar-dates'

export async function getMobileUpcomingPayouts(
  db: Firestore,
  product: PayoutProduct,
  horizonMonths: number,
  now = new Date(),
): Promise<UpcomingPayout[]> {
  const read = async (query: Query): Promise<any[]> =>
    (await query.get()).docs.map((doc) => ({
      ...(withBusinessDates(fromFirestore(doc.data())) as object),
      id: doc.id,
    }))
  const one = async (path: string) => {
    const doc = await db.doc(path).get()
    return doc.exists
      ? {
          ...(withBusinessDates(fromFirestore(doc.data())) as object),
          id: doc.id,
        }
      : null
  }
  const reader = createUpcomingPayoutsReader({
    getAllContracts: async (filters) =>
      (await read(
        db
          .collection(names.caisseContracts)
          .where('status', 'in', filters.statuses),
      )) as CaisseContract[],
    listPayments: async (id) =>
      (await read(
        db.collection(`${names.caisseContracts}/${id}/payments`),
      )) as CaissePayment[],
    listRefunds: (id) =>
      read(
        db
          .collection(`${names.caisseContracts}/${id}/refunds`)
          .orderBy('createdAt', 'desc'),
      ),
    listRefundsCI: (id) =>
      read(
        db
          .collection(`${names.contractsCI}/${id}/earlyRefunds`)
          .orderBy('createdAt', 'desc'),
      ),
    getActiveSettings: async (type) =>
      ((
        await read(
          db
            .collection(names.caisseSettings)
            .where('caisseType', '==', type)
            .where('isActive', '==', true)
            .orderBy('effectiveAt', 'desc')
            .limit(1),
        )
      )[0] as CaisseSettings) || null,
    getUserById: (id) => one(`${names.users}/${id}`),
    getGroupById: (id) => one(`${names.groups}/${id}`),
    getCaisseImprevueService: () => ({
      getContractsCIPaginated: async (filters) =>
        (await read(
          db
            .collection(names.contractsCI)
            .where('status', '==', filters.status),
        )) as ContractCI[],
      getPaymentsByContractId: async (id) =>
        (await read(
          db.collection(`${names.contractsCI}/${id}/payments`),
        )) as PaymentCI[],
    }),
    getPlacementService: () => ({
      listPlacements: async (filters) =>
        (await read(
          db
            .collection(names.placements)
            .where('status', 'in', filters.statuses),
        )) as Placement[],
      getEarlyExit: (id) => one(`${names.placements}/${id}/earlyExit/current`),
      listCommissions: (id) =>
        read(db.collection(`${names.placements}/${id}/commissions`)),
    }),
  })
  return reader(horizonMonths, businessWallTime(now), product)
}
