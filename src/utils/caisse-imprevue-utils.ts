/**
 * Fonctions utilitaires pour la gestion de la caisse imprévue
 */

/**
 * Calcule l'index du mois (monthIndex) basé sur des cycles de 30 jours
 * à partir de la première date de paiement
 * 
 * @param date - La date pour laquelle on veut calculer le monthIndex
 * @param firstPaymentDate - La première date de paiement du contrat (format yyyy-mm-dd)
 * @returns Le monthIndex (0 = premier mois, 1 = deuxième mois, etc.)
 * 
 * @example
 * Si firstPaymentDate = "2025-10-28"
 * - Du 28/10 au 27/11 : monthIndex = 0
 * - Du 28/11 au 27/12 : monthIndex = 1
 * - Du 28/12 au 27/01 : monthIndex = 2
 */
export function calculateMonthIndex(date: Date, firstPaymentDate: string): number {
  // Convertir firstPaymentDate en objet Date
  const firstDate = new Date(firstPaymentDate)
  
  // Normaliser les heures à 0:00 pour éviter les problèmes de fuseau horaire
  firstDate.setHours(0, 0, 0, 0)
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  // Calculer la différence en millisecondes
  const diffMs = targetDate.getTime() - firstDate.getTime()
  
  // Convertir en jours
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  // Si la date est avant la première date de paiement, retourner -1 ou 0 selon la logique métier
  if (diffDays < 0) {
    return 0
  }
  
  // Calculer le monthIndex basé sur des cycles de 30 jours
  // Utiliser Math.floor pour obtenir l'index du mois
  return Math.floor(diffDays / 30)
}

/**
 * Obtient la période du mois (date de début et de fin) pour un monthIndex donné
 * 
 * @param monthIndex - L'index du mois
 * @param firstPaymentDate - La première date de paiement du contrat (format yyyy-mm-dd)
 * @returns Un objet avec startDate et endDate
 * 
 * @example
 * monthIndex = 0, firstPaymentDate = "2025-10-28"
 * Retourne: { startDate: Date(2025-10-28), endDate: Date(2025-11-27) }
 */
export function getMonthPeriod(monthIndex: number, firstPaymentDate: string): { startDate: Date; endDate: Date } {
  const firstDate = new Date(firstPaymentDate)
  firstDate.setHours(0, 0, 0, 0)
  
  // Calculer la date de début du mois
  const startDate = new Date(firstDate)
  startDate.setDate(startDate.getDate() + (monthIndex * 30))
  
  // Calculer la date de fin du mois (29 jours après la date de début, pour un total de 30 jours)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 29)
  endDate.setHours(23, 59, 59, 999)
  
  return { startDate, endDate }
}

/**
 * Vérifie si une date donnée appartient à un monthIndex spécifique
 * 
 * @param date - La date à vérifier
 * @param monthIndex - L'index du mois
 * @param firstPaymentDate - La première date de paiement du contrat (format yyyy-mm-dd)
 * @returns true si la date appartient au monthIndex, false sinon
 */
export function isDateInMonthIndex(date: Date, monthIndex: number, firstPaymentDate: string): boolean {
  const { startDate, endDate } = getMonthPeriod(monthIndex, firstPaymentDate)
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  return targetDate >= startDate && targetDate <= endDate
}

