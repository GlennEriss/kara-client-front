/**
 * Catalogue des permissions (accès fin par action) pour les administrateurs.
 *
 * Principes :
 * - Les **superAdmins** ont TOUS les droits : ils ne sont jamais restreints par ces permissions.
 * - Un admin « normal » possède un tableau `permissions: string[]` (clés ci-dessous).
 * - Chaque module a une action « view » (`<module>.view`) qui conditionne l'affichage
 *   de la section dans le menu et l'accès à ses pages.
 * - Les autres actions (`create`, `validate`, ...) conditionnent les boutons/opérations.
 *
 * Convention de clé : `"<moduleKey>.<action>"` (ex. `"members.create"`).
 */

export interface PermissionAction {
  /** Clé complète, ex. "members.create" */
  key: string
  /** Libellé affiché dans l'éditeur */
  label: string
}

export interface PermissionModule {
  /** Identifiant court du module, ex. "members" */
  key: string
  /** Libellé affiché */
  label: string
  /** Préfixes de routes couverts par ce module (pour la garde d'accès par URL). */
  pathPrefixes: string[]
  /** Le module fait-il partie du groupe « Système » (affichage éditeur). */
  system?: boolean
  /** Actions disponibles ; la première DOIT être l'action « view ». */
  actions: PermissionAction[]
}

/** Fabrique les actions standard d'un module à partir de sa clé. */
function actions(moduleKey: string, defs: Array<[string, string]>): PermissionAction[] {
  return defs.map(([action, label]) => ({ key: `${moduleKey}.${action}`, label }))
}

const VIEW: [string, string] = ['view', 'Consulter']
const CREATE: [string, string] = ['create', 'Créer']
const EDIT: [string, string] = ['edit', 'Modifier']
const DELETE: [string, string] = ['delete', 'Supprimer']
const VALIDATE: [string, string] = ['validate', 'Valider']
const PAYMENT: [string, string] = ['payment', 'Enregistrer un paiement']
const EXPORT: [string, string] = ['export', 'Exporter']
const MANAGE: [string, string] = ['manage', 'Gérer']

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: 'calendar',
    label: 'Calendrier',
    // Le journal des relances prolonge le suivi des retards du calendrier :
    // même permission, pour ne pas créer un droit que personne ne possède.
    pathPrefixes: ['/calendrier', '/admin/relances'],
    actions: actions('calendar', [VIEW, EXPORT]),
  },
  {
    key: 'memberRequests',
    label: "Demandes d'adhésion",
    pathPrefixes: ['/membership-requests'],
    actions: actions('memberRequests', [VIEW, VALIDATE, ['reject', 'Rejeter'], EDIT, DELETE, EXPORT]),
  },
  {
    key: 'members',
    label: 'Membres',
    pathPrefixes: ['/memberships'],
    actions: actions('members', [VIEW, CREATE, EDIT, DELETE, EXPORT]),
  },
  {
    // Sous-page de Membres, avec son propre droit pour l'ouvrir sans la liste des
    // membres (agent de recouvrement). Le préfixe plus long l'emporte sur /memberships.
    key: 'birthdays',
    label: 'Anniversaires des membres',
    pathPrefixes: ['/memberships/anniversaires'],
    actions: actions('birthdays', [VIEW, EXPORT]),
  },
  {
    key: 'caisseSpeciale',
    label: 'Caisse Spéciale',
    pathPrefixes: ['/caisse-speciale'],
    actions: actions('caisseSpeciale', [VIEW, CREATE, VALIDATE, PAYMENT, DELETE, EXPORT, ['settings', 'Paramètres']]),
  },
  {
    key: 'caisseImprevue',
    label: 'Caisse Imprévue',
    pathPrefixes: ['/caisse-imprevue'],
    actions: actions('caisseImprevue', [VIEW, CREATE, VALIDATE, PAYMENT, DELETE, EXPORT, ['settings', 'Paramètres']]),
  },
  {
    key: 'creditSpeciale',
    label: 'Crédit Spéciale',
    pathPrefixes: ['/credit-speciale'],
    actions: actions('creditSpeciale', [VIEW, CREATE, VALIDATE, PAYMENT, DELETE, EXPORT]),
  },
  {
    key: 'creditFixe',
    label: 'Crédit Fixe',
    pathPrefixes: ['/credit-fixe'],
    actions: actions('creditFixe', [VIEW, CREATE, VALIDATE, PAYMENT, DELETE, EXPORT]),
  },
  {
    key: 'creditAide',
    label: 'Caisse Aide',
    pathPrefixes: ['/credit-aide'],
    actions: actions('creditAide', [VIEW, CREATE, VALIDATE, PAYMENT, DELETE, EXPORT]),
  },
  {
    key: 'bienfaiteur',
    label: 'Bienfaiteur',
    pathPrefixes: ['/bienfaiteur'],
    actions: actions('bienfaiteur', [VIEW, CREATE, EDIT, ['contribute', 'Gérer les contributions'], DELETE, EXPORT]),
  },
  {
    key: 'vehicules',
    label: 'Véhicules',
    pathPrefixes: ['/vehicules'],
    actions: actions('vehicules', [VIEW, CREATE, EDIT, DELETE]),
  },
  {
    key: 'boutiques',
    label: 'Boutiques',
    pathPrefixes: ['/boutiques'],
    actions: actions('boutiques', [VIEW, MANAGE]),
  },
  {
    key: 'placements',
    label: 'Placements',
    pathPrefixes: ['/placements'],
    actions: actions('placements', [VIEW, CREATE, VALIDATE, ['commission', 'Gérer les commissions'], DELETE, EXPORT]),
  },
  {
    key: 'events',
    label: 'Événements',
    pathPrefixes: ['/events'],
    actions: actions('events', [VIEW, MANAGE]),
  },
  {
    key: 'paymentsHistory',
    label: 'Historique des paiements',
    pathPrefixes: ['/payments-history'],
    actions: actions('paymentsHistory', [VIEW, EXPORT]),
  },
  {
    key: 'contractsHistory',
    label: 'Historique des contrats',
    pathPrefixes: ['/contracts-history'],
    actions: actions('contractsHistory', [VIEW, EXPORT]),
  },
  // ----- Système -----
  {
    key: 'agents',
    label: 'Agents de recouvrement',
    pathPrefixes: ['/admin/agents-recouvrement'],
    system: true,
    actions: actions('agents', [VIEW, MANAGE]),
  },
  {
    key: 'journal',
    label: 'Journalisation',
    pathPrefixes: ['/admin/journalisation'],
    system: true,
    actions: actions('journal', [VIEW]),
  },
  {
    key: 'admins',
    label: 'Administration (admins)',
    pathPrefixes: ['/admin'],
    system: true,
    actions: actions('admins', [VIEW, MANAGE]),
  },
  {
    key: 'groups',
    label: 'Groupes',
    pathPrefixes: ['/groups'],
    system: true,
    actions: actions('groups', [VIEW, MANAGE]),
  },
  {
    key: 'references',
    label: 'Métiers / Entreprises',
    pathPrefixes: ['/jobs', '/companies'],
    system: true,
    actions: actions('references', [VIEW, MANAGE]),
  },
  {
    key: 'geography',
    label: 'Géographie',
    pathPrefixes: ['/geographie'],
    system: true,
    actions: actions('geography', [VIEW, MANAGE]),
  },
  {
    key: 'imports',
    label: 'Imports (membres / caisses)',
    pathPrefixes: ['/import-membres', '/import-caisse-imprevue', '/import-caisse-speciale'],
    system: true,
    actions: actions('imports', [['use', 'Importer']]),
  },
  {
    key: 'messageTemplates',
    label: 'Modèles de messages',
    pathPrefixes: ['/parametres-messages'],
    system: true,
    actions: actions('messageTemplates', [VIEW, MANAGE]),
  },
  {
    key: 'settings',
    label: 'Paramètres (caisses)',
    // Chemins réels des pages de paramètres (le préfixe le plus spécifique gagne
    // sur /caisse-speciale et /caisse-imprevue) — '/settings' seul ne matchait rien.
    pathPrefixes: ['/caisse-speciale/settings', '/caisse-imprevue/settings'],
    system: true,
    actions: actions('settings', [MANAGE]),
  },
]

/** Routes toujours accessibles à tout admin connecté (pas de permission requise). */
export const ALWAYS_ALLOWED_PREFIXES = ['/dashboard']

/**
 * Droits fixes du rôle « Agent de recouvrement » : consultation du calendrier
 * (avec appels et messages de rappel, sans encaissement), de Bienfaiteur, des
 * Événements et des anniversaires des membres (avec les messages de vœux). Imposés quel que soit le contenu de `permissions` en base.
 */
export const AGENT_RECOUVREMENT_PERMISSIONS = ['calendar.view', 'bienfaiteur.view', 'events.view', 'birthdays.view'] as const

/**
 * Droits accordés d'office par un autre : les admins qui voyaient les
 * anniversaires via « Membres » les gardent sans reconfiguration.
 */
export const IMPLIED_PERMISSIONS: Record<string, string> = {
  'birthdays.view': 'members.view',
  'birthdays.export': 'members.export',
}

/** Ajoute aux permissions enregistrées celles qu'elles impliquent. */
export function withImpliedPermissions(permissions: readonly string[]): string[] {
  const granted = new Set(permissions)
  for (const [implied, source] of Object.entries(IMPLIED_PERMISSIONS)) {
    if (granted.has(source)) granted.add(implied)
  }
  return Array.from(granted)
}

/**
 * Pages sans module de permission (donc ouvertes à tout admin) que l'agent
 * peut tout de même ouvrir. Toutes les autres lui sont fermées : une page
 * ajoutée sans module ne lui devient pas accessible par défaut.
 */
export const AGENT_RECOUVREMENT_OPEN_PREFIXES = ['/statuts']

/** Une page sans module de permission est-elle ouverte à l'agent ? */
export function isOpenToAgent(pathname: string): boolean {
  return AGENT_RECOUVREMENT_OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Page d'arrivée de l'agent : le tableau de bord agrège des données qui ne le concernent pas. */
export const AGENT_RECOUVREMENT_HOME = '/calendrier'

/**
 * Pages d'action protégées par une permission autre que « view » : sans cela,
 * une URL de création ou de modification resterait ouverte à qui voit le module.
 */
export const ACTION_ROUTE_PERMISSIONS: Array<{ pattern: RegExp; permission: string }> = [
  { pattern: /^\/events\/nouveau\/?$/, permission: 'events.manage' },
  { pattern: /^\/events\/[^/]+\/edit\/?$/, permission: 'events.manage' },
  { pattern: /^\/bienfaiteur\/create\/?$/, permission: 'bienfaiteur.create' },
  { pattern: /^\/bienfaiteur\/[^/]+\/modify\/?$/, permission: 'bienfaiteur.edit' },
]

/** Permission d'action exigée par une page, ou null. */
export function requiredActionPermissionForPath(pathname: string): string | null {
  return ACTION_ROUTE_PERMISSIONS.find((entry) => entry.pattern.test(pathname))?.permission ?? null
}

/** Toutes les clés de permission existantes (à plat). */
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_MODULES.flatMap((m) => m.actions.map((a) => a.key))

/** Clé de l'action « view » d'un module. */
export function moduleViewKey(moduleKey: string): string {
  return `${moduleKey}.view`
}

/**
 * Trouve le module correspondant à un chemin (préfixe le plus spécifique gagne).
 * Retourne `null` si aucun module ne couvre ce chemin (route non restreinte).
 */
export function moduleForPath(pathname: string): PermissionModule | null {
  let best: { module: PermissionModule; len: number } | null = null
  for (const m of PERMISSION_MODULES) {
    for (const prefix of m.pathPrefixes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        if (!best || prefix.length > best.len) {
          best = { module: m, len: prefix.length }
        }
      }
    }
  }
  return best?.module ?? null
}

/** La permission « view » requise pour accéder à un chemin, ou null si libre. */
export function requiredViewPermissionForPath(pathname: string): string | null {
  if (ALWAYS_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null
  }
  const module = moduleForPath(pathname)
  return module ? moduleViewKey(module.key) : null
}
