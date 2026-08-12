/**
 * Identité des modules dans le journal d'administration.
 *
 * `module` doit correspondre à une clé de `PERMISSION_MODULES` : la page
 * Journalisation résout le libellé affiché à partir de cette clé, et retombe
 * sur la clé brute si elle est inconnue.
 */

export const PLACEMENT_AUDIT_MODULE = {
  module: 'placements',
  moduleLabel: 'Placements',
} as const

/** Œuvres de charité, contributions et étoiles des membres. */
export const CHARITY_AUDIT_MODULE = {
  module: 'bienfaiteur',
  moduleLabel: 'Bienfaiteur',
} as const
