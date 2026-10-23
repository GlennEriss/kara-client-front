import type { CreditContract, CreditPayment, CreditPenalty, GuarantorPayment } from '@/types/types'

/** Document Firestore brut, dates déjà converties en `Date`. */
export type SourceRecord = Record<string, unknown> & { id: string }

/** Document d'une sous-collection, avec l'id de son document parent. */
export type ChildRecord = SourceRecord & { parentId: string }

/** Toutes les données lues pour un bilan. */
export interface FinancialReportSources {
  caisseSpecialeContracts: SourceRecord[]
  /** `caisseContracts/{id}/payments` */
  caisseSpecialePayments: ChildRecord[]
  /** `caisseContracts/{id}/refunds` */
  caisseSpecialeRefunds: ChildRecord[]
  caisseImprevueContracts: SourceRecord[]
  /** `contractsCI/{id}/payments` : un document par mois, avec ses versements. */
  caisseImprevuePayments: ChildRecord[]
  /** `contractsCI/{id}/supports` */
  caisseImprevueSupports: ChildRecord[]
  /** `contractsCI/{id}/earlyRefunds` : retraits anticipés et remboursements finaux. */
  caisseImprevueRefunds: ChildRecord[]
  creditContracts: CreditContract[]
  creditPayments: CreditPayment[]
  creditPenalties: CreditPenalty[]
  guarantorPayments: GuarantorPayment[]
  placements: SourceRecord[]
  /** `placements/{id}/commissions` */
  placementCommissions: ChildRecord[]
  /** `placements/{id}/earlyExit` */
  placementEarlyExits: ChildRecord[]
  /** Demandes d'adhésion, avec leur tableau `payments`. */
  membershipRequests: SourceRecord[]
}

export interface FinancialReportContext {
  months: string[]
  /** Date du calcul : rien n'est compté après elle. */
  now: Date
}
