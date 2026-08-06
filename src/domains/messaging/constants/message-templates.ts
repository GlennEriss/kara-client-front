/**
 * Catalogue des modèles de messages envoyés aux membres (WhatsApp).
 *
 * Chaque modèle a un texte par défaut (celui historiquement codé en dur) et peut
 * être personnalisé depuis Système → Modèles de messages. Les personnalisations
 * sont stockées dans Firestore (`settings/messageTemplates`) ; quand aucune n'est
 * enregistrée, c'est `defaultBody` qui s'applique.
 *
 * Les variables s'écrivent `{{nomDeLaVariable}}` et sont remplacées à l'envoi.
 */

export type MessageTemplateCategory = 'relance' | 'evenement' | 'adhesion' | 'assurance'

export interface MessageTemplateVariable {
  /** Nom utilisé dans le corps, sans les accolades. */
  name: string
  /** Explication affichée à l'administrateur. */
  description: string
}

export interface MessageTemplateDefinition {
  key: string
  label: string
  description: string
  category: MessageTemplateCategory
  variables: MessageTemplateVariable[]
  defaultBody: string
}

export const MESSAGE_TEMPLATE_CATEGORY_LABELS: Record<MessageTemplateCategory, string> = {
  relance: 'Relances de versement',
  evenement: 'Vie de l’association',
  adhesion: 'Demandes d’adhésion',
  assurance: 'Assurance véhicule',
}

const V = (name: string, description: string): MessageTemplateVariable => ({ name, description })

export const MESSAGE_TEMPLATES: MessageTemplateDefinition[] = [
  // ── Vie de l'association ────────────────────────────────────────────────
  {
    key: 'birthday',
    label: 'Souhait d’anniversaire',
    description:
      'Envoyé depuis la page Anniversaires, via le bouton « Souhaiter sur WhatsApp ».',
    category: 'evenement',
    variables: [
      V('prenom', 'Prénom du membre'),
      V('nom', 'Nom du membre'),
      V('age', 'Âge atteint'),
    ],
    defaultBody: `Joyeux anniversaire {{prenom}} ! 🎉🎂

En ce jour si spécial, toute la famille KARA pense à toi et te souhaite une merveilleuse journée entourée de tes proches.

Que cette nouvelle année t'apporte santé, bonheur et réussite. Tu comptes énormément pour nous ❤️

Avec toute notre affection,
— L'équipe KARA`,
  },

  // ── Relances de versement ───────────────────────────────────────────────
  {
    key: 'paymentReminderSingle',
    label: 'Rappel — un versement en retard',
    description:
      'Envoyé depuis le calendrier (liste des versements en retard) quand un seul versement est concerné.',
    category: 'relance',
    variables: [
      V('nom', 'Nom du membre'),
      V('produit', 'Caisse ou service concerné'),
      V('typeVersement', 'Libellé du versement'),
      V('montant', 'Montant dû, formaté'),
      V('dateEcheance', 'Date d’échéance (jj/mm/aaaa)'),
      V('joursRetard', 'Nombre de jours de retard'),
    ],
    defaultBody: `Bonjour {{nom}},

Petit rappel amical de la part de la famille KARA 🙏

Un versement {{typeVersement}} de {{montant}} FCFA pour ta {{produit}} est en retard depuis le {{dateEcheance}} ({{joursRetard}}).

Merci de bien vouloir régulariser dès que possible. Pour toute question, nous restons à ta disposition.

— L'équipe KARA`,
  },
  {
    key: 'paymentReminderMultiple',
    label: 'Rappel — plusieurs versements en retard',
    description:
      'Envoyé depuis le calendrier quand plusieurs versements sont en retard pour le même membre.',
    category: 'relance',
    variables: [
      V('nom', 'Nom du membre'),
      V('produit', 'Caisse ou service concerné'),
      V('nombre', 'Nombre de versements en retard'),
      V('montantTotal', 'Montant total dû, formaté'),
      V('dateEcheance', 'Échéance la plus ancienne (jj/mm/aaaa)'),
      V('joursRetard', 'Retard le plus élevé'),
      V('detail', 'Liste détaillée des versements (une ligne par échéance)'),
    ],
    defaultBody: `Bonjour {{nom}},

Petit rappel amical de la part de la famille KARA 🙏

Tu as {{nombre}} versements en retard pour ta {{produit}}, pour un total de {{montantTotal}} FCFA (le plus ancien depuis le {{dateEcheance}}, soit {{joursRetard}}) :
{{detail}}

Merci de bien vouloir régulariser dès que possible. Pour toute question, nous restons à ta disposition.

— L'équipe KARA`,
  },
  {
    key: 'placementCommissionDue',
    label: 'Information — échéance de placement échue',
    description:
      'Envoyé au bienfaiteur : c’est KARA qui doit la commission ou la restitution du capital, le message informe au lieu de réclamer.',
    category: 'relance',
    variables: [
      V('nom', 'Nom du bienfaiteur'),
      V('detail', 'Liste des échéances échues — commissions et restitution du capital (une ligne chacune)'),
    ],
    defaultBody: `Bonjour {{nom}},

L'équipe KARA vous informe qu'une ou plusieurs échéances de votre placement sont arrivées à terme :
{{detail}}

Nous vous contactons pour organiser la remise dans les meilleurs délais. Merci de votre confiance 🙏

— L'équipe KARA`,
  },

  // ── Assurance véhicule ──────────────────────────────────────────────────
  {
    key: 'insuranceExpiring',
    label: 'Assurance — échéance proche',
    description: 'Rappel envoyé avant l’expiration d’une assurance véhicule.',
    category: 'assurance',
    variables: [
      V('nom', 'Nom du titulaire'),
      V('plaque', 'Plaque d’immatriculation (précédée d’un espace, vide si inconnue)'),
      V('compagnie', 'Compagnie d’assurance (précédée d’une virgule, vide si inconnue)'),
      V('echeance', 'Formulation de l’échéance : « aujourd’hui », « demain », « dans N jours (le jj/mm/aaaa) »'),
      V('dateFin', 'Date de fin de couverture (jj/mm/aaaa)'),
    ],
    defaultBody: `Bonjour {{nom}}, votre assurance véhicule{{plaque}}{{compagnie}} arrive à expiration {{echeance}}. Pensez à la renouveler à temps pour rester couvert. — Association KARA`,
  },
  {
    key: 'insuranceExpired',
    label: 'Assurance — déjà expirée',
    description: 'Rappel envoyé lorsqu’une assurance véhicule est expirée.',
    category: 'assurance',
    variables: [
      V('nom', 'Nom du titulaire'),
      V('plaque', 'Plaque d’immatriculation (précédée d’un espace, vide si inconnue)'),
      V('compagnie', 'Compagnie d’assurance (précédée d’une virgule, vide si inconnue)'),
      V('dateFin', 'Date d’expiration (jj/mm/aaaa)'),
    ],
    defaultBody: `Bonjour {{nom}}, nous vous informons que votre assurance véhicule{{plaque}}{{compagnie}} a expiré le {{dateFin}}. Merci de la renouveler dans les meilleurs délais. — Association KARA`,
  },

  // ── Demandes d'adhésion ─────────────────────────────────────────────────
  {
    key: 'membershipRejected',
    label: 'Adhésion — demande rejetée',
    description: 'Message accompagnant le rejet d’une demande d’adhésion.',
    category: 'adhesion',
    variables: [
      V('prenom', 'Prénom du demandeur'),
      V('matricule', 'Matricule de la demande'),
      V('motif', 'Motif du rejet saisi par l’administrateur'),
    ],
    defaultBody: `Bonjour {{prenom}},

Votre demande d'adhésion KARA (matricule: {{matricule}}) a été rejetée.

Motif de rejet:
{{motif}}

Pour toute question, veuillez contacter notre service client.

Cordialement,
KARA Association`,
  },
  {
    key: 'membershipCorrections',
    label: 'Adhésion — corrections demandées',
    description:
      'Message envoyé au demandeur avec le lien et le code de sécurité pour corriger son dossier.',
    category: 'adhesion',
    variables: [
      V('prenom', 'Prénom du demandeur'),
      V('corrections', 'Liste des corrections demandées (une par ligne)'),
      V('lien', 'Lien vers le formulaire de correction'),
      V('code', 'Code de sécurité formaté'),
      V('dateExpiration', 'Date et heure d’expiration du code'),
      V('tempsRestant', 'Temps restant avant expiration'),
    ],
    defaultBody: `Bonjour {{prenom}},

Votre demande d'adhésion nécessite des corrections :

{{corrections}}

Pour effectuer les corrections, veuillez :
1. Cliquer sur ce lien : {{lien}}
2. Entrer le code de sécurité : {{code}}

⚠️ Le code expire le {{dateExpiration}} (dans {{tempsRestant}})

Cordialement,
KARA Association`,
  },
]

/** Modèles indexés par clé, pour un accès direct. */
export const MESSAGE_TEMPLATES_BY_KEY: Record<string, MessageTemplateDefinition> =
  Object.fromEntries(MESSAGE_TEMPLATES.map((t) => [t.key, t]))

export type MessageTemplateKey = (typeof MESSAGE_TEMPLATES)[number]['key']

/** Texte par défaut d'un modèle (chaîne vide si la clé est inconnue). */
export function defaultTemplateBody(key: string): string {
  return MESSAGE_TEMPLATES_BY_KEY[key]?.defaultBody ?? ''
}
