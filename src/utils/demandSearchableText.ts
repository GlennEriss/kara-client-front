/**
 * Génère un texte de recherche normalisé pour les demandes Caisse Imprévue
 *
 * Firestore ne supporte que la recherche par préfixe — la chaîne doit COMMENCER par le terme.
 * On stocke 3 variantes pour permettre la recherche par nom, prénom ou matricule en premier.
 *
 * @see documentation/caisse-imprevue/V2/recherche-demande/RECHERCHE_ANALYSE.md
 */

function normalizeForSearch(...parts: (string | undefined)[]): string {
  return parts
    .filter(Boolean)
    .map((s) => String(s).trim())
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
}

/**
 * Génère le searchableText principal (lastName firstName matricule)
 * Ex: "ndong alain owono 8438.mk.160126"
 */
export function generateDemandSearchableText(
  lastName: string,
  firstName: string,
  matricule: string
): string {
  return normalizeForSearch(lastName, firstName, matricule)
}

/**
 * Variante prénom en premier — permet recherche "alain owono"
 * Ex: "alain owono ndong 8438.mk.160126"
 */
export function generateDemandSearchableTextFirstNameFirst(
  lastName: string,
  firstName: string,
  matricule: string
): string {
  return normalizeForSearch(firstName, lastName, matricule)
}

/**
 * Variante matricule en premier — permet recherche "8438"
 * Ex: "8438.mk.160126 alain owono ndong"
 */
export function generateDemandSearchableTextMatriculeFirst(
  lastName: string,
  firstName: string,
  matricule: string
): string {
  return normalizeForSearch(matricule, firstName, lastName)
}

/**
 * Génère les 3 variantes searchableText pour une demande
 */
export function generateAllDemandSearchableTexts(
  lastName: string,
  firstName: string,
  matricule: string
) {
  return {
    searchableText: generateDemandSearchableText(lastName, firstName, matricule),
    searchableTextFirstNameFirst: generateDemandSearchableTextFirstNameFirst(
      lastName,
      firstName,
      matricule
    ),
    searchableTextMatriculeFirst: generateDemandSearchableTextMatriculeFirst(
      lastName,
      firstName,
      matricule
    ),
  }
}
