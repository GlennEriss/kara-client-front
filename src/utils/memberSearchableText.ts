/**
 * Génère un texte de recherche normalisé pour Algolia pour les membres (collection users)
 * 
 * NOTE: searchableText est utilisé dans Algolia (pas dans Firestore)
 * pour simplifier la recherche multi-champs.
 * 
 * Voir documentation/memberships/V2/algolia/README.md pour plus de détails.
 */

export interface MemberSearchableTextData {
  /** Matricule du membre (= ID Firestore = UID Firebase) */
  matricule?: string
  /** Prénom */
  firstName?: string
  /** Nom de famille */
  lastName?: string
  /** Email */
  email?: string
  /** Numéros de téléphone */
  contacts?: string[]
  /** Nom de l'entreprise */
  companyName?: string
  /** Nom de la profession */
  profession?: string
  /** Province de résidence */
  province?: string
  /** Ville de résidence */
  city?: string
  /** Arrondissement */
  arrondissement?: string
  /** Quartier */
  district?: string
}

/**
 * Génère un texte de recherche normalisé contenant tous les champs de recherche pour un membre
 * 
 * @param data - Données du membre
 * @returns Texte normalisé avec tous les champs de recherche (matricule, nom, prénom, email, téléphones, entreprise, profession, adresse)
 * 
 * @example
 * generateMemberSearchableText({
 *   matricule: '0004.MK.040825',
 *   firstName: 'Jean',
 *   lastName: 'Dupont',
 *   email: 'jean.dupont@kara.ga',
 *   contacts: ['+241 65 67 17 34', '065671734'],
 *   companyName: 'KARA Gabon',
 *   profession: 'Ingénieur',
 *   province: 'Estuaire',
 *   city: 'Libreville',
 * })
 * // Returns: "0004.mk.040825 jean dupont jean dupont jean.dupont@kara.ga +24165671734 065671734 kara gabon ingenieur estuaire libreville"
 */
export function generateMemberSearchableText(data: MemberSearchableTextData): string {
  const parts: string[] = []
  
  // Matricule (identifiant principal)
  if (data.matricule) {
    parts.push(normalizeText(data.matricule))
  }
  
  // Prénom
  if (data.firstName) {
    parts.push(normalizeText(data.firstName))
  }
  
  // Nom
  if (data.lastName) {
    parts.push(normalizeText(data.lastName))
  }
  
  // Nom complet (prénom + nom) - permet de chercher "jean dupont"
  if (data.firstName && data.lastName) {
    parts.push(normalizeText(`${data.firstName} ${data.lastName}`))
  }
  
  // Email
  if (data.email) {
    parts.push(normalizeText(data.email))
  }
  
  // Téléphones : normaliser (supprimer espaces, tirets, parenthèses)
  // IMPORTANT : Inclure tous les numéros de téléphone dans searchableText
  if (data.contacts && Array.isArray(data.contacts)) {
    data.contacts.forEach(contact => {
      if (contact && typeof contact === 'string') {
        // Normaliser le téléphone : supprimer espaces, tirets, parenthèses
        const normalizedPhone = contact.replace(/[\s\-\(\)]/g, '').toLowerCase()
        parts.push(normalizedPhone)
      }
    })
  }
  
  // Entreprise
  if (data.companyName) {
    parts.push(normalizeText(data.companyName))
  }
  
  // Profession
  if (data.profession) {
    parts.push(normalizeText(data.profession))
  }
  
  // Province
  if (data.province) {
    parts.push(normalizeText(data.province))
  }
  
  // Ville
  if (data.city) {
    parts.push(normalizeText(data.city))
  }
  
  // Arrondissement
  if (data.arrondissement) {
    parts.push(normalizeText(data.arrondissement))
  }
  
  // Quartier (district)
  if (data.district) {
    parts.push(normalizeText(data.district))
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
 * normalizeText('KARA Gabon') // Returns: "kara gabon"
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

/**
 * Extrait les données de recherche d'un document User Firestore
 * 
 * @param data - Document Firestore brut
 * @returns Données formatées pour generateMemberSearchableText
 */
export function extractMemberSearchableData(data: any): MemberSearchableTextData {
  return {
    matricule: data.matricule,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    contacts: data.contacts,
    companyName: data.companyName,
    profession: data.profession,
    province: data.address?.province,
    city: data.address?.city,
    arrondissement: data.address?.arrondissement,
    district: data.address?.district,
  }
}
