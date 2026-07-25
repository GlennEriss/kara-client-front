import type { VehicleInsurance } from '@/types/types'

/** Nom complet du titulaire de l'assurance (membre ou non-membre). */
export function getInsuranceHolderName(ins: VehicleInsurance): string {
  const first = ins.holderType === 'member' ? ins.memberFirstName : ins.nonMemberFirstName
  const last = ins.holderType === 'member' ? ins.memberLastName : ins.nonMemberLastName
  return [first, last].filter(Boolean).join(' ').trim()
}

/** Numéro de téléphone à contacter (même résolution que le tableau des assurances). */
export function getInsuranceHolderPhone(ins: VehicleInsurance): string {
  return (ins.primaryPhone || ins.memberContacts?.[0] || ins.nonMemberPhone1 || '').trim()
}

/** Nombre de jours (entier) avant expiration ; négatif si déjà expirée. */
export function daysUntilExpiry(ins: VehicleInsurance, now: Date = new Date()): number {
  const end = ins.endDate instanceof Date ? ins.endDate : new Date(ins.endDate)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Modèle et variables du rappel d'assurance, selon l'état de la couverture
 * (bientôt expirée vs déjà expirée). Le texte est édité par l'administrateur
 * dans Système → Modèles de messages ; ici on ne fournit que les données.
 */
export function insuranceReminderTemplate(
  ins: VehicleInsurance,
  now: Date = new Date()
): { key: 'insuranceExpiring' | 'insuranceExpired'; variables: Record<string, string> } {
  const end = ins.endDate instanceof Date ? ins.endDate : new Date(ins.endDate)
  const endStr = end.toLocaleDateString('fr-FR')
  const days = daysUntilExpiry(ins, now)

  const common = {
    nom: getInsuranceHolderName(ins) || 'cher membre',
    // Ponctuation incluse : la variable disparaît proprement si l'info manque.
    plaque: ins.plateNumber ? ` (plaque ${ins.plateNumber})` : '',
    compagnie: ins.insuranceCompany ? `, ${ins.insuranceCompany}` : '',
    dateFin: endStr,
  }

  if (days < 0) {
    return { key: 'insuranceExpired', variables: common }
  }

  const echeance =
    days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours (le ${endStr})`
  return { key: 'insuranceExpiring', variables: { ...common, echeance } }
}
