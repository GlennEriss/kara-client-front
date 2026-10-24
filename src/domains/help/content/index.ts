import type { HelpTopic } from '../entities/help.types'
import { caisseImprevueHelp } from './caisse-imprevue'
import { caisseSpecialeHelp } from './caisse-speciale'
import { creditSpecialeHelp } from './credit-speciale'
import { creditAideHelp, creditFixeHelp } from './credits-simples'
import { bilansFinanciersHelp, calendrierHelp, utiliserAideHelp } from './pilotage'
import { placementsHelp } from './placements'

/** Toutes les fiches, dans l'ordre du centre d'aide. */
export const HELP_TOPICS: HelpTopic[] = [
  calendrierHelp,
  bilansFinanciersHelp,
  caisseSpecialeHelp,
  caisseImprevueHelp,
  creditSpecialeHelp,
  creditFixeHelp,
  creditAideHelp,
  placementsHelp,
  utiliserAideHelp,
]

export const HELP_CATEGORY_ORDER: HelpTopic['category'][] = ['Pilotage', 'Épargne', 'Crédits', 'Placements', 'Utiliser l’aide']
