/**
 * Extraction des chemins Firebase Storage à partir d'un document Firestore, pour
 * supprimer les fichiers liés (preuves de versement, documents signés…) lors de
 * la suppression d'un contrat/versement.
 *
 * Deux conventions coexistent dans l'app :
 *  - champ `*Path` : le chemin Storage direct (ex. `caisse/xxx/payments/yyy.jpg`) ;
 *  - champ `*Url`/`*URL` : l'URL de téléchargement Firebase (le chemin y est encodé).
 */

/** Chemin Storage encodé dans une URL de téléchargement Firebase, sinon null. */
export function storagePathFromUrl(url: string): string | null {
  const m = url.match(/\/o\/([^?]+)/)
  if (!m) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return null
  }
}

/**
 * Collecte récursivement les chemins Storage d'un objet Firestore :
 *  - toute valeur d'un champ `*Path` non-URL ;
 *  - le chemin décodé de toute URL Firebase Storage d'un champ `*Url`/`*URL`.
 */
export function collectStoragePaths(value: unknown, out: string[] = []): string[] {
  if (!value) return out
  if (Array.isArray(value)) {
    for (const v of value) collectStoragePaths(v, out)
    return out
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === 'string' && v) {
        if (/path$/i.test(k) && !/^https?:\/\//i.test(v)) {
          out.push(v)
        } else if (/url$/i.test(k) && v.includes('/o/')) {
          const p = storagePathFromUrl(v)
          if (p) out.push(p)
        }
      } else if (v && typeof v === 'object') {
        collectStoragePaths(v, out)
      }
    }
  }
  return out
}
