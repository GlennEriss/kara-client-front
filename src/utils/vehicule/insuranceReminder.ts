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
 * Construit le message de rappel WhatsApp adapté à l'état de l'assurance
 * (bientôt expirée vs déjà expirée). Inclut nom, plaque, compagnie et échéance.
 */
export function buildInsuranceReminderMessage(ins: VehicleInsurance, now: Date = new Date()): string {
  const name = getInsuranceHolderName(ins) || 'cher membre'
  const end = ins.endDate instanceof Date ? ins.endDate : new Date(ins.endDate)
  const endStr = end.toLocaleDateString('fr-FR')
  const plate = ins.plateNumber ? ` (plaque ${ins.plateNumber})` : ''
  const company = ins.insuranceCompany ? `, ${ins.insuranceCompany}` : ''
  const days = daysUntilExpiry(ins, now)

  if (days < 0) {
    return (
      `Bonjour ${name}, nous vous informons que votre assurance véhicule${plate}${company} ` +
      `a expiré le ${endStr}. Merci de la renouveler dans les meilleurs délais. — Association KARA`
    )
  }

  const echeance =
    days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours (le ${endStr})`
  return (
    `Bonjour ${name}, votre assurance véhicule${plate}${company} arrive à expiration ${echeance}. ` +
    `Pensez à la renouveler à temps pour rester couvert. — Association KARA`
  )
}
