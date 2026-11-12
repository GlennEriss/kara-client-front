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

export type MessageTemplateCategory = 'relance' | 'evenement' | 'adhesion' | 'assurance' | 'groupe' | 'simulation'

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
  groupe: 'Groupes et accords',
  simulation: 'Simulations et échéanciers',
}

const V = (name: string, description: string): MessageTemplateVariable => ({ name, description })

export const MESSAGE_TEMPLATES: MessageTemplateDefinition[] = [
  {
    key: 'communityEventInvitation', label: 'Événement — invitation aux membres', category: 'evenement',
    description: 'Invitation depuis un événement publié, avec une contribution facultative à sa collecte associée.',
    variables: [V('nom', 'Nom du destinataire'), V('introduction', 'Introduction saisie dans la fenêtre d’invitation'), V('evenement', 'Titre de l’événement'), V('description', 'Description publique'), V('dateDebut', 'Date et heure au Gabon'), V('fin', 'Ligne de fin, vide si aucune date de fin'), V('lieu', 'Lieu ou consigne de choix'), V('lien', 'Lien de la fiche membre'), V('lienEvenement', 'Ligne complète avec le lien, vide si indisponible'), V('contribution', 'Bloc de contribution, uniquement si l’option est cochée et une collecte est disponible')],
    defaultBody: `Bonjour {{nom}},\n\n{{introduction}}\n\n*{{evenement}}*\n{{description}}\nDébut : {{dateDebut}}\n{{fin}}\nLieu : {{lieu}}\n{{lienEvenement}}\n\n{{contribution}}\n\nPour toute information, vous pouvez répondre à ce message.\n\nLE KARA`,
  },
  {
    key: 'charityEventInvitation', label: 'Bienfaiteur — invitation à une collecte', category: 'evenement',
    description: 'Invitation depuis une collecte publique à venir ou en cours.',
    variables: [V('nom', 'Nom du destinataire'), V('introduction', 'Introduction saisie pour l’invitation'), V('evenement', 'Titre de la collecte'), V('description', 'Description publique'), V('dateDebut', 'Date de début au Gabon'), V('fin', 'Ligne complète de fin, facultative'), V('lieu', 'Lieu de la collecte'), V('lien', 'Lien de la collecte dans l’espace membre'), V('lienEvenement', 'Ligne complète avec le lien, facultative'), V('contribution', 'Bloc de contribution si l’option est cochée')],
    defaultBody: `Bonjour {{nom}},\n\n{{introduction}}\n\n*{{evenement}}*\n{{description}}\nDébut : {{dateDebut}}\n{{fin}}\nLieu : {{lieu}}\n{{lienEvenement}}\n\n{{contribution}}\n\nPour toute information, vous pouvez répondre à ce message.\n\nLE KARA`,
  },
  {
    key: 'eventContributionNotice', label: 'Événement / collecte — possibilité de contribuer', category: 'evenement',
    description: 'Bloc ajouté à l’invitation uniquement lorsque la contribution est proposée. Ne confirme aucun encaissement.',
    variables: [V('collecte', 'Titre de la collecte'), V('minimum', 'Ligne de contribution minimale, vide si aucune'), V('lien', 'Lien pour contribuer, facultatif'), V('instructions', 'Étapes selon la disponibilité du lien, avec la réserve sur la réception du don')],
    defaultBody: `Vous pouvez contribuer à la collecte « {{collecte}} », en argent ou en nature.\n{{minimum}}\n{{instructions}}`,
  },
  {
    key: 'groupAgreementReminder', label: 'Groupe — relance d’un accord entre membres', category: 'groupe',
    description: 'Brouillon ouvert depuis le suivi d’un accord. Le message n’est pas envoyé automatiquement.',
    variables: [V('nom', 'Nom du membre qui paie'), V('beneficiaire', 'Nom du bénéficiaire'), V('objet', 'Objet de l’accord'), V('reference', 'Référence de l’accord'), V('montant', 'Solde à régler, avec la devise'), V('echeance', 'Phrase avec la prochaine échéance et son montant, vide si aucune')],
    defaultBody: `Bonjour {{nom}}, LE KARA vous contacte pour le suivi de votre accord « {{objet}} » avec {{beneficiaire}}. Solde à régler : {{montant}}.{{echeance}} Merci de nous indiquer la date prévue de votre règlement.`,
  },
  {
    key: 'creditSimulationCalculated', label: 'Simulation — échéancier calculé', category: 'simulation',
    description: 'Partage WhatsApp de l’échéancier calculé dans les simulations de crédit.',
    variables: [V('produit', 'Nom du service'), V('detail', 'Lignes : échéance, date et montant'), V('montantTotal', 'Total formaté sans devise')],
    defaultBody: `*ÉCHÉANCIER DE CRÉDIT*\n\nEchéances | Date | Montant\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n{{detail}}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal: | | {{montantTotal}} FCFA`,
  },
  {
    key: 'creditSimulationCustom', label: 'Simulation — échéancier personnalisé', category: 'simulation',
    description: 'Partage WhatsApp d’une simulation personnalisée, avec capital, intérêts et reste dû.',
    variables: [V('montant', 'Montant emprunté sans devise'), V('duree', 'Durée avec son unité'), V('date', 'Date de préparation'), V('detail', 'Détail de chaque échéance'), V('montantTotal', 'Total à rembourser sans devise'), V('interets', 'Total des intérêts sans devise')],
    defaultBody: `📊 *ÉCHÉANCIER DE CRÉDIT PERSONNALISÉ*\n\n💰 Montant: {{montant}} FCFA\n📅 Durée: {{duree}}\n📆 Fait le: {{date}}\n\n━━━━━━━━━━━━━━━━━━━━━\n*DÉTAIL DES ÉCHÉANCES*\n━━━━━━━━━━━━━━━━━━━━━\n\n{{detail}}\n\n━━━━━━━━━━━━━━━━━━━━━\n💰 *Total à rembourser: {{montantTotal}} FCFA*\n📈 *Total intérêts: {{interets}} FCFA*`,
  },
  {
    key: 'fixedSimulationSchedule', label: 'Simulation — échéancier fixe / aide', category: 'simulation',
    description: 'Partage de la simulation des modules fixe et aide.',
    variables: [V('produit', 'Titre du module'), V('detail', 'Lignes : échéance, date et montant'), V('montantTotal', 'Total formaté sans devise')],
    defaultBody: `*ÉCHÉANCIER DE {{produit}}*\n\nEchéances | Date | Montant\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n{{detail}}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTotal: | | {{montantTotal}} FCFA`,
  },
  {
    key: 'caisseSimulationSchedule', label: 'Caisse spéciale — simulation et bonus', category: 'simulation',
    description: 'Partage de la simulation de caisse spéciale : versements, bonus et dates de remise.',
    variables: [V('montantTotal', 'Total des versements sans devise'), V('bonus', 'Bonus final sans devise'), V('montantFinal', 'Montant final sans devise'), V('detail', 'Lignes des échéances et remises'), V('date', 'Date de préparation')],
    defaultBody: `*TABLEAU RÉCAPITULATIF*\nCaisse Spéciale LE KARA\n----------------------\n\n*RÉSUMÉ*\n- Total versements : *{{montantTotal}} FCFA*\n- Bonus final : *{{bonus}} FCFA*\n- Montant final : *{{montantFinal}} FCFA*\n\n----------------------\n*ÉCHÉANCIER*\n----------------------\n\n{{detail}}\n\n----------------------\nFait le {{date}}\nLE KARA - Association de solidarite`,
  },
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

En ce jour si spécial, toute la famille LE KARA pense à toi et te souhaite une merveilleuse journée entourée de tes proches.

Que cette nouvelle année t'apporte santé, bonheur et réussite. Tu comptes énormément pour nous ❤️

Avec toute notre affection,
— L'équipe LE KARA`,
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

Petit rappel amical de la part de la famille LE KARA 🙏

Un versement {{typeVersement}} de {{montant}} FCFA pour ta {{produit}} est en retard depuis le {{dateEcheance}} ({{joursRetard}}).

Merci de bien vouloir régulariser dès que possible. Pour toute question, nous restons à ta disposition.

— L'équipe LE KARA`,
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

Petit rappel amical de la part de la famille LE KARA 🙏

Tu as {{nombre}} versements en retard pour ta {{produit}}, pour un total de {{montantTotal}} FCFA (le plus ancien depuis le {{dateEcheance}}, soit {{joursRetard}}) :
{{detail}}

Merci de bien vouloir régulariser dès que possible. Pour toute question, nous restons à ta disposition.

— L'équipe LE KARA`,
  },
  {
    key: 'paymentUpcomingReminder',
    label: 'Préavis — versement à venir',
    description:
      'Envoyé depuis le calendrier pour prévenir un membre avant la date de son prochain versement.',
    category: 'relance',
    variables: [
      V('nom', 'Nom du membre'),
      V('produit', 'Caisse ou crédit concerné'),
      V('typeVersement', 'Libellé du versement'),
      V('montant', 'Montant prévu, formaté'),
      V('dateEcheance', 'Date d’échéance (jj/mm/aaaa)'),
      V('delai', 'Délai naturel : aujourd’hui, demain ou dans N jours'),
    ],
    defaultBody: `Bonjour {{nom}},

Petit message de la famille LE KARA pour te rappeler que ton versement {{typeVersement}} de {{montant}} FCFA pour ta {{produit}} est prévu {{delai}}, le {{dateEcheance}}.

Merci de prendre tes dispositions. Pour toute question, nous restons à ta disposition 🙏

— L'équipe LE KARA`,
  },
  {
    key: 'placementCommissionDue',
    label: 'Information — échéance de placement échue',
    description:
      'Envoyé au bienfaiteur : c’est LE KARA qui doit la commission ou la restitution du capital, le message informe au lieu de réclamer.',
    category: 'relance',
    variables: [
      V('nom', 'Nom du bienfaiteur'),
      V('detail', 'Liste des échéances échues — commissions et restitution du capital (une ligne chacune)'),
    ],
    defaultBody: `Bonjour {{nom}},

L'équipe LE KARA vous informe qu'une ou plusieurs échéances de votre placement sont arrivées à terme :
{{detail}}

Nous vous contactons pour organiser la remise dans les meilleurs délais. Merci de votre confiance 🙏

— L'équipe LE KARA`,
  },
  {
    key: 'placementUpcomingNotice',
    label: 'Information — échéance de placement à venir',
    description:
      'Envoyé au bienfaiteur avant une commission ou une restitution de capital à venir.',
    category: 'relance',
    variables: [
      V('nom', 'Nom du bienfaiteur'),
      V('typeVersement', 'Commission ou restitution du capital'),
      V('montant', 'Montant prévu, formaté'),
      V('dateEcheance', 'Date d’échéance (jj/mm/aaaa)'),
      V('delai', 'Délai naturel : aujourd’hui, demain ou dans N jours'),
    ],
    defaultBody: `Bonjour {{nom}},

L'équipe LE KARA vous informe que votre {{typeVersement}} de {{montant}} FCFA arrive à échéance {{delai}}, le {{dateEcheance}}.

Nous reviendrons vers vous pour organiser la remise. Merci de votre confiance 🙏

— L'équipe LE KARA`,
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
    defaultBody: `Bonjour {{nom}}, votre assurance véhicule{{plaque}}{{compagnie}} arrive à expiration {{echeance}}. Pensez à la renouveler à temps pour rester couvert. — Association LE KARA`,
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
    defaultBody: `Bonjour {{nom}}, nous vous informons que votre assurance véhicule{{plaque}}{{compagnie}} a expiré le {{dateFin}}. Merci de la renouveler dans les meilleurs délais. — Association LE KARA`,
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

Votre demande d'adhésion LE KARA (matricule: {{matricule}}) a été rejetée.

Motif de rejet:
{{motif}}

Pour toute question, veuillez contacter notre service client.

Cordialement,
LE KARA Association`,
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
LE KARA Association`,
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
