import type { HelpTopic } from '../entities/help.types'
import { boutiquesHelp, charitesHelp, vehiculesHelp } from './bienfaiteur'
import { caisseImprevueHelp } from './caisse-imprevue'
import { caisseSpecialeHelp } from './caisse-speciale'
import { creditSpecialeHelp } from './credit-speciale'
import { creditAideHelp, creditFixeHelp } from './credits-simples'
import { adhesionsHelp, anniversairesHelp, historiquesHelp, membresHelp } from './membres'
import { bilansFinanciersHelp, calendrierHelp, tableauDeBordHelp, utiliserAideHelp } from './pilotage'
import { placementsHelp } from './placements'
import {
  administrationHelp,
  agentsRecouvrementHelp,
  geographieHelp,
  groupesHelp,
  importsHelp,
  journalisationHelp,
  journalRelancesHelp,
  modelesMessagesHelp,
  referencesHelp,
  reinitialisationHelp,
} from './systeme'
import { documentsAssociationHelp, evenementsHelp } from './vie-association'

/** Toutes les fiches, dans l'ordre du centre d'aide. */
export const HELP_TOPICS: HelpTopic[] = [
  tableauDeBordHelp,
  calendrierHelp,
  bilansFinanciersHelp,
  caisseSpecialeHelp,
  caisseImprevueHelp,
  creditSpecialeHelp,
  creditFixeHelp,
  creditAideHelp,
  placementsHelp,
  adhesionsHelp,
  membresHelp,
  anniversairesHelp,
  historiquesHelp,
  charitesHelp,
  vehiculesHelp,
  boutiquesHelp,
  evenementsHelp,
  documentsAssociationHelp,
  administrationHelp,
  agentsRecouvrementHelp,
  journalRelancesHelp,
  journalisationHelp,
  groupesHelp,
  referencesHelp,
  geographieHelp,
  modelesMessagesHelp,
  importsHelp,
  reinitialisationHelp,
  utiliserAideHelp,
]

export const HELP_CATEGORY_ORDER: HelpTopic['category'][] = [
  'Pilotage',
  'Épargne',
  'Crédits',
  'Placements',
  'Membres',
  'Bienfaiteur',
  'Vie de l’association',
  'Système',
  'Utiliser l’aide',
]
