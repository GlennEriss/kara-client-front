/**
 * Génère un texte de recherche normalisé pour les demandes Caisse Imprévue
 *
 * Format : lastName + firstName + matricule (lowercase, sans accents)
 * Utilisé pour la recherche par préfixe Firestore sur la collection caisseImprevueDemands
 *
 * @see documentation/caisse-imprevue/V2/recherche-demande/RECHERCHE_ANALYSE.md
 */

/**
 * Génère le searchableText pour une demande Caisse Imprévue
 *
 * @param lastName - Nom de famille (memberLastName)
 * @param firstName - Prénom (memberFirstName)
 * @param matricule - Matricule du membre (memberMatricule)
 * @returns Texte normalisé : "dupont jean 8438.mk.160126"
 *
 * @example
 * generateDemandSearchableText('Dupont', 'Jean', '8438.MK.160126')
 * // Returns: "dupont jean 8438.mk.160126"
 */
export function generateDemandSearchableText(
  lastName: string,
  firstName: string,
  matricule: string
): string {
  return [lastName, firstName, matricule]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
}
