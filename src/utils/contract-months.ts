import { addMonths } from 'date-fns'

/**
 * Décale une date de `months` mois en restant dans le mois d'arrivée.
 *
 * Règle métier commune aux quatre produits (Caisse Spéciale, Caisse Imprévue,
 * Crédit Spécial, Placement) : un contrat démarré un 29, 30 ou 31 a son
 * échéance suivante le dernier jour du mois quand celui-ci est plus court.
 *
 *   31 janv + 1 mois → 28 févr   (et non 3 mars)
 *   31 janv + 3 mois → 30 avr    (et non 1er mai)
 *
 * `Date.setMonth` déborde sur le mois suivant, ce qui laisse un mois sans
 * échéance puis deux échéances dans le suivant. `addMonths` de date-fns
 * applique le plafonnement attendu.
 *
 * Point d'entrée unique : ne pas réimplémenter ce calcul ailleurs.
 */
export function addContractMonths(date: Date | string | number, months: number): Date {
  // Les appelants passent tantôt une Date, tantôt une chaîne ISO issue du
  // contrat : on normalise ici plutôt que de laisser chacun faire `new Date`.
  return addMonths(date instanceof Date ? date : new Date(date), months)
}
