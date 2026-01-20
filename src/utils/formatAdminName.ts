/**
 * Formate le nom d'un admin pour l'affichage
 * 
 * Règles :
 * - Prendre le premier nom et le premier prénom
 * - Afficher dans l'ordre "Premier Nom Premier Prénom"
 *   Exemple: "MBA ESSONO Patrick Ferdinand" → "MBA Patrick"
 *   Exemple: "Glenn Essono" → "Essono Glenn" (premier nom + premier prénom)
 * 
 * @param firstName - Prénom(s) de l'admin
 * @param lastName - Nom(s) de l'admin
 * @returns Le nom formaté pour l'affichage
 */
export function formatAdminName(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) {
    return 'Admin inconnu'
  }

  // Extraire le premier prénom et le premier nom
  const firstNames = firstName?.trim().split(/\s+/) || []
  const lastNames = lastName?.trim().split(/\s+/) || []

  const firstFirstName = firstNames[0] || ''
  const firstLastName = lastNames[0] || ''

  // Toujours afficher dans l'ordre "Premier Nom Premier Prénom"
  // Exemple: "MBA ESSONO Patrick Ferdinand" → "MBA Patrick"
  if (firstFirstName && firstLastName) {
    return `${firstLastName} ${firstFirstName}`
  }

  // Sinon, retourner ce qu'on a
  return firstLastName || firstFirstName || 'Admin inconnu'
}
