/**
 * Utilitaires pour la conversion et l'affichage des dates des agents de recouvrement.
 * Gère les Date JavaScript, Timestamp Firestore, objets sérialisés {seconds/_seconds},
 * chaînes ISO et timestamps numériques.
 */

const EPOCH_TIME = 0

/**
 * Convertit une valeur en Date valide.
 * Retourne null pour les valeurs invalides ou manquantes.
 */
export function toAgentDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null
  if (value === '' || (typeof value === 'string' && value.trim() === '')) return null
  try {
    // Date JavaScript native
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value
    }
    // Firestore Timestamp (objet avec toDate)
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      const toDateFn = (value as { toDate?: () => Date }).toDate
      if (typeof toDateFn === 'function') {
        const d = toDateFn.call(value)
        return d && !isNaN(d.getTime()) ? d : null
      }
    }
    // Objet sérialisé Firestore { seconds, _seconds }
    if (typeof value === 'object' && value !== null) {
      const obj = value as { seconds?: number; _seconds?: number }
      const seconds = obj.seconds ?? obj._seconds
      if (typeof seconds === 'number') {
        const d = new Date(seconds * 1000)
        return isNaN(d.getTime()) ? null : d
      }
    }
    // String ISO (ex: "2024-01-15T10:30:00.000Z") ou number (timestamp)
    if (typeof value === 'string') {
      const d = new Date(value)
      return isNaN(d.getTime()) ? null : d
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return null
      // Si < 1e12, considérer comme secondes (timestamp Unix)
      const ms = value < 1e12 ? value * 1000 : value
      const d = new Date(ms)
      return isNaN(d.getTime()) ? null : d
    }
    return null
  } catch {
    return null
  }
}

/**
 * Formate une date pour l'affichage dans l'UI agent.
 * Retourne "—" pour les dates invalides, manquantes ou epoch (01/01/1970).
 */
export function formatAgentDate(value: unknown): string {
  const date = toAgentDate(value)
  if (!date || isNaN(date.getTime())) return '—'
  // Traiter l'epoch comme "date non renseignée"
  if (date.getTime() === EPOCH_TIME) return '—'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Calcule l'âge à partir d'une date de naissance.
 */
export function getAgentAge(dateNaissance: unknown): number | null {
  const birth = toAgentDate(dateNaissance)
  if (!birth || birth.getTime() === EPOCH_TIME) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return isNaN(age) ? null : age
}
