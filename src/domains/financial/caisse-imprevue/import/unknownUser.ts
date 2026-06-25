/**
 * Membre « INCONNU INCONNU » : compte placeholder unique servant de valeur par
 * défaut pour les parrains et contacts d'urgence manquants (import + rétroactif).
 *
 * Constantes partagées entre l'écriture client (excelImportWriter) et la route
 * serveur de rattachement rétroactif (api/import-caisse-imprevue/link-unknown).
 */
export const UNKNOWN_USER_ID = 'INCONNU'
export const UNKNOWN_USER_MATRICULE = 'INCONNU'
export const UNKNOWN_USER_FIRST_NAME = 'INCONNU'
export const UNKNOWN_USER_LAST_NAME = 'INCONNU'

/** Champs plats du compte INCONNU (hors timestamps, gérés par chaque appelant). */
export function buildUnknownUserBase(): Record<string, unknown> {
  return {
    id: UNKNOWN_USER_ID,
    matricule: UNKNOWN_USER_MATRICULE,
    civility: '',
    firstName: UNKNOWN_USER_FIRST_NAME,
    lastName: UNKNOWN_USER_LAST_NAME,
    birthDate: '',
    birthPlace: '',
    contacts: [],
    gender: '',
    email: '',
    nationality: '',
    hasCar: false,
    address: { province: '', city: '', district: '', arrondissement: '', additionalInfo: '' },
    companyName: '',
    profession: '',
    identityDocument: '',
    identityDocumentNumber: '',
    photoURL: null,
    photoPath: null,
    subscriptions: [],
    dossier: 'PLACEHOLDER',
    membershipType: 'adherant',
    roles: ['Adherant'],
    isActive: false,
    // Marqueur : compte technique, non éditable comme un vrai membre.
    isPlaceholder: true,
    isUnknownPlaceholder: true,
  }
}
