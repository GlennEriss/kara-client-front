/**
 * Génère un texte de recherche normalisé pour Algolia
 * 
 * NOTE: searchableText est utilisé dans Algolia (pas dans Firestore)
 * pour simplifier la recherche multi-champs.
 * 
 * Voir SEARCHABLETEXT_ALGOLIA.md pour plus de détails.
 */

export interface SearchableTextData {
  id?: string
  matricule?: string
  identity?: {
    firstName?: string
    lastName?: string
    email?: string
    contacts?: string[]
  }
}

/**
 * Génère un texte de recherche normalisé contenant tous les champs de recherche
 * 
 * @param data - Données de la demande d'adhésion
 * @returns Texte normalisé avec tous les champs de recherche (ID, matricule, nom, email, téléphones)
 * 
 * @example
 * generateSearchableText({
 *   id: '1234.MK.5678',
 *   matricule: '1234.MK.5678',
 *   identity: {
 *     firstName: 'Jean',
 *     lastName: 'Dupont',
 *     email: 'jean@example.com',
 *     contacts: ['+241 65 67 17 34', '65671734'],
 *   },
 * })
 * // Returns: "1234.mk.5678 1234.mk.5678 jean dupont jean dupont jean@example.com +24165671734 65671734"
 */
export function generateSearchableText(data: SearchableTextData): string {
  const parts: string[] = []
  
  // ID du document
  if (data.id) {
    parts.push(normalizeText(data.id))
  }
  
  // Matricule
  if (data.matricule) {
    parts.push(normalizeText(data.matricule))
  }
  
  // Prénom
  if (data.identity?.firstName) {
    parts.push(normalizeText(data.identity.firstName))
  }
  
  // Nom
  if (data.identity?.lastName) {
    parts.push(normalizeText(data.identity.lastName))
  }
  
  // Nom complet (prénom + nom)
  if (data.identity?.firstName && data.identity?.lastName) {
    parts.push(normalizeText(`${data.identity.firstName} ${data.identity.lastName}`))
  }
  
  // Email
  if (data.identity?.email) {
    parts.push(normalizeText(data.identity.email))
  }
  
  // Téléphones : normaliser (supprimer espaces, tirets, parenthèses)
  // IMPORTANT : Inclure tous les numéros de téléphone dans searchableText
  if (data.identity?.contacts && Array.isArray(data.identity.contacts)) {
    data.identity.contacts.forEach(contact => {
      if (contact && typeof contact === 'string') {
        // Normaliser le téléphone : supprimer espaces, tirets, parenthèses
        const normalizedPhone = contact.replace(/[\s\-\(\)]/g, '').toLowerCase()
        parts.push(normalizedPhone)
      }
    })
  }
  
  return parts.join(' ')
}

/**
 * Normalise un texte pour la recherche
 * - Convertit en minuscules
 * - Supprime les accents
 * - Trim les espaces
 * 
 * @param text - Texte à normaliser
 * @returns Texte normalisé
 * 
 * @example
 * normalizeText('Jean-François') // Returns: "jean-francois"
 * normalizeText('  ÉLÈVE  ') // Returns: "eleve"
 */
export function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .trim()
}
