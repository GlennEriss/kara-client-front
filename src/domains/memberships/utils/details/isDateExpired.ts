/**
 * Vérifie si une date est expirée (antérieure à aujourd'hui)
 * 
 * @param timestamp - Date, Firestore Timestamp, string ou null/undefined
 * @returns true si la date est passée, false sinon (ou si invalide)
 */
export function isDateExpired(timestamp: any): boolean {
  if (!timestamp) return false

  try {
    let date: Date

    // Gestion Firestore Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate()
    }
    // Gestion Date native
    else if (timestamp instanceof Date) {
      date = timestamp
    }
    // Gestion string/number
    else {
      date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        return false
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day
    date.setHours(0, 0, 0, 0)

    return date < today
  } catch (error) {
    return false
  }
}
