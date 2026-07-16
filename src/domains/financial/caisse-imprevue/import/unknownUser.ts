/**
 * Membre « INCONNU(E) INCONNU(E) » : compte unique servant de valeur par défaut
 * pour les parrains, garants et contacts d'urgence manquants (import + rétroactif).
 *
 * Le compte réel utilisé dans l'app est le membre de matricule 2548.MK.290126
 * (son id de document == son matricule). Les constantes ci-dessous pointent vers
 * lui pour que TOUT le code (import, rattachement) utilise ce compte unique.
 *
 * Constantes partagées entre l'écriture client (excelImportWriter) et la route
 * serveur de rattachement rétroactif (api/import-caisse-imprevue/link-unknown).
 */
export const UNKNOWN_USER_ID = '2548.MK.290126'
export const UNKNOWN_USER_MATRICULE = '2548.MK.290126'
export const UNKNOWN_USER_FIRST_NAME = 'INCONNU'
export const UNKNOWN_USER_LAST_NAME = 'INCONNU'

/**
 * Champs plats du compte inconnu (hors timestamps, gérés par chaque appelant).
 * N'est utilisé qu'en dernier recours si le compte est ABSENT : `ensureUnknownUser`
 * ne l'écrit que si le document n'existe pas, donc le vrai membre 2548.MK.290126
 * n'est jamais écrasé.
 */
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
