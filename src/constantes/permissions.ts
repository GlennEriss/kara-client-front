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
    actions: actions('calendar', [VIEW, ['payment', 'Encaisser'], EXPORT]),
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
    actions: actions('vehicules', [VIEW, CREATE, EDIT, DELETE, EXPORT]),
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
    // /metiers est la page réelle (onglets Entreprises / Métiers).
    pathPrefixes: ['/metiers', '/jobs', '/companies'],
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
    // Droit transversal, sans page propre : reçus, preuves, médias, contrats…
    key: 'documents',
    label: 'Documents',
    pathPrefixes: [],
    system: true,
    actions: actions('documents', [['download', 'Télécharger (reçus, preuves, médias, PDF)']]),
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
 * Modèle d'accès pré-coché quand on attribue le rôle « Agent de recouvrement » :
 * consultation du calendrier (appels et rappels, sans encaissement), de
 * Bienfaiteur, des Événements et des anniversaires (avec les vœux). Les accès
 * restent ajustables agent par agent dans la fiche admin.
 */
export const AGENT_RECOUVREMENT_PERMISSIONS = ['calendar.view', 'bienfaiteur.view', 'events.view', 'birthdays.view'] as const

/**
 * Modèle d'accès pré-coché pour le « Gestionnaire des véhicules » : tout le
 * module Véhicules (assurances), sans téléchargement des pièces jointes.
 */
export const VEHICULE_MANAGER_PERMISSIONS = [
  'vehicules.view',
  'vehicules.create',
  'vehicules.edit',
  'vehicules.delete',
  'vehicules.export',
] as const

/**
 * Rôles restreints : modèle d'accès pré-coché à l'attribution du rôle, pas de
 * tableau de bord, pas de notifications, pas de pages hors de leurs modules.
 */
export const RESTRICTED_ROLE_TEMPLATES: Record<string, readonly string[]> = {
  AgentRecouvrement: AGENT_RECOUVREMENT_PERMISSIONS,
  GestionnaireVehicules: VEHICULE_MANAGER_PERMISSIONS,
}

/** Rôle restreint d'un compte (à partir de `roles` et/ou `role`), ou null. */
export function restrictedRoleOf(roles?: readonly unknown[] | null, role?: unknown): string | null {
  for (const r of [...(roles ?? []), role]) {
    if (typeof r === 'string' && r in RESTRICTED_ROLE_TEMPLATES) return r
  }
  return null
}

/**
 * Version du format des permissions enregistrées sur une fiche admin. Une fiche
 * enregistrée avant la version 2 ne connaît pas les droits ajoutés depuis
 * (anniversaires, encaissement au calendrier, téléchargement) : on les déduit
 * pour qu'elle garde ses accès. Dès qu'elle est réenregistrée, les cases cochées
 * font foi.
 */
export const PERMISSIONS_VERSION = 2

/** Droits déduits d'un autre sur une fiche antérieure à la version 2 (`'*'` = toujours). */
export const LEGACY_IMPLIED_PERMISSIONS: Record<string, string> = {
  'birthdays.view': 'members.view',
  'birthdays.export': 'members.export',
  'calendar.payment': 'calendar.view',
  'documents.download': '*',
  'vehicules.export': 'vehicules.view',
}

/**
 * Permissions effectives d'une fiche. Avant la version 2, un rôle restreint
 * avait des droits fixes (son modèle) et les autres admins reçoivent les droits déduits.
 */
export function effectivePermissions(
  permissions: readonly string[],
  { version, restrictedRole }: { version?: number; restrictedRole?: string | null },
): string[] {
  if ((version ?? 1) >= PERMISSIONS_VERSION) return [...permissions]
  if (restrictedRole) return [...(RESTRICTED_ROLE_TEMPLATES[restrictedRole] ?? [])]
  const granted = new Set(permissions)
  for (const [implied, source] of Object.entries(LEGACY_IMPLIED_PERMISSIONS)) {
    if (source === '*' || granted.has(source)) granted.add(implied)
  }
  return Array.from(granted)
}

/** Première page accessible, pour un compte sans tableau de bord (agent). */
export function firstAccessiblePath(can: (key: string) => boolean): string | null {
  for (const m of PERMISSION_MODULES) {
    if (m.pathPrefixes.length > 0 && can(moduleViewKey(m.key))) return m.pathPrefixes[0]
  }
  return null
}

/**
 * Pages sans module de permission (donc ouvertes à tout admin) qu'un rôle
 * restreint peut tout de même ouvrir. Toutes les autres leur sont fermées : une page
 * ajoutée sans module ne leur devient pas accessible par défaut.
 */
export const RESTRICTED_ROLE_OPEN_PREFIXES = ['/statuts']

/** Une page sans module de permission est-elle ouverte à un rôle restreint ? */
export function isOpenToRestrictedRole(pathname: string): boolean {
  return RESTRICTED_ROLE_OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Pages d'action protégées par une permission autre que « view » : sans cela,
 * une URL de création ou de modification resterait ouverte à qui voit le module.
 */
export const ACTION_ROUTE_PERMISSIONS: Array<{ pattern: RegExp; permission: string }> = [
  { pattern: /^\/events\/nouveau\/?$/, permission: 'events.manage' },
  { pattern: /^\/events\/[^/]+\/edit\/?$/, permission: 'events.manage' },
  { pattern: /^\/bienfaiteur\/create\/?$/, permission: 'bienfaiteur.create' },
  { pattern: /^\/bienfaiteur\/[^/]+\/modify\/?$/, permission: 'bienfaiteur.edit' },
  { pattern: /^\/vehicules\/[^/]+\/edit\/?$/, permission: 'vehicules.edit' },
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
