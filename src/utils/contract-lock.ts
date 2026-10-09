/**
 * Contrat terminé ou résilié : il passe en lecture seule. Plus aucune
 * modification ni suppression (contrat, versements, pénalités, documents),
 * pour que l'historique d'un dossier clos ne puisse plus changer.
 *
 * Restent permises les seules actions qui servent à finir le dossier : la
 * quittance et la clôture d'un crédit soldé, les récupérations après une
 * clôture en perte, le versement de sa commission au garant.
 */
export const CONTRACT_LOCKED_MESSAGE =
  'Ce contrat est terminé ou résilié : il ne peut plus être modifié ni supprimé.'

/** Caisse Spéciale : clôturé ou résilié. */
export const CAISSE_SPECIALE_LOCKED_STATUSES = ['CLOSED', 'RESCINDED'] as const
/** Caisse Imprévue : terminé ou annulé. */
export const CAISSE_IMPREVUE_LOCKED_STATUSES = ['FINISHED', 'CANCELED'] as const
/** Placement : clôturé, sorti par anticipation ou annulé. */
export const PLACEMENT_LOCKED_STATUSES = ['Closed', 'EarlyExit', 'Canceled'] as const
/** Crédit : soldé, clos, clôturé en perte, transformé ou remplacé par une augmentation. */
export const CREDIT_LOCKED_STATUSES = ['DISCHARGED', 'CLOSED', 'WRITTEN_OFF', 'TRANSFORMED', 'EXTENDED'] as const

const includes = (list: readonly string[], status?: string | null) => !!status && list.includes(status)

export const isCaisseSpecialeContractLocked = (status?: string | null) =>
  includes(CAISSE_SPECIALE_LOCKED_STATUSES, status)
export const isCaisseImprevueContractLocked = (status?: string | null) =>
  includes(CAISSE_IMPREVUE_LOCKED_STATUSES, status)
export const isCreditContractLocked = (status?: string | null) => includes(CREDIT_LOCKED_STATUSES, status)
export const isPlacementLocked = (status?: string | null) => includes(PLACEMENT_LOCKED_STATUSES, status)

/** Lève l'erreur standard si le contrat est verrouillé. */
export function assertContractUnlocked(locked: boolean): void {
  if (locked) throw new Error(CONTRACT_LOCKED_MESSAGE)
}
