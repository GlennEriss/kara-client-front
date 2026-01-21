/**
 * Formate une date (Date, Firestore Timestamp, string) en format français détaillé
 * 
 * @param timestamp - Date, Firestore Timestamp, string ou null/undefined
 * @returns Date formatée en français (ex: "15 janvier 2024, 14:30") ou "Non définie" si invalide
 */
export function formatDateDetailed(timestamp: any): string {
  // Gestion NaN explicitement (avant le check null/undefined car NaN est falsy)
  if (typeof timestamp === 'number' && isNaN(timestamp)) {
    return 'Date invalide'
  }

  if (!timestamp) return 'Non définie'

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
    // Gestion string
    else if (typeof timestamp === 'string') {
      date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        return 'Date invalide'
      }
    }
    // Autre type (number, etc.)
    else {
      date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        return 'Date invalide'
      }
    }

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return 'Date invalide'
  }
}
