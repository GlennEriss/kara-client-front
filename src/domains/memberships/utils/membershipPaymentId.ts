/**
 * Génère l'ID d'un paiement adhésion au format :
 * MK_PYMT_MatriculeMembre_date_heure
 * Exemple : MK_PYMT_7643.MK.210126_160226_1547 pour le 16/02/2026 à 15:47
 *
 * @param matricule - Matricule du membre (ex. 7643.MK.210126 ou #7643.MK.210126)
 * @param date - Date du versement (YYYY-MM-DD ou Date)
 * @param time - Heure du versement (HH:mm ou HHmm)
 */
export function buildMembershipPaymentId(
  matricule: string,
  date: string | Date,
  time: string
): string {
  const matriculeClean = (matricule || '').replace(/^#/, '').trim()
  if (!matriculeClean) {
    throw new Error('Le matricule est requis pour générer l\'ID de paiement')
  }

  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) {
    throw new Error('Date de versement invalide')
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear() % 100).padStart(2, '0')
  const dateStr = `${day}${month}${year}`

  const timePart = (time || '').trim()
  const parts = timePart.split(':')
  const h = (parts[0] ?? '0').padStart(2, '0')
  const m = (parts[1] ?? '0').padStart(2, '0')
  const hourMin = `${h}${m}`.slice(0, 4)
  if (hourMin.length < 4) {
    throw new Error('Heure de versement invalide (attendu HH:mm)')
  }

  return `MK_PYMT_${matriculeClean}_${dateStr}_${hourMin}`
}
