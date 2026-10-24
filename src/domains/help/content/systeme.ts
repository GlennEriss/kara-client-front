import type { HelpTopic } from '../entities/help.types'

export const administrationHelp: HelpTopic = {
  key: 'administration',
  title: 'Administration',
  category: 'Système',
  summary: 'Les comptes des administrateurs de la plateforme, leurs rôles et leurs accès, section par section.',
  pages: [{ path: '/admin', label: 'Administration', summary: 'Créer un administrateur, régler ses accès, réinitialiser son mot de passe.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'La liste des administrateurs, avec leur rôle et leur statut (actif ou inactif). Seul le super admin crée et modifie les comptes ; les autres admins les consultent en lecture seule.',
        },
        {
          type: 'definitions',
          items: [
            { term: 'Super administrateur', text: 'Tous les droits, sans restriction. Lui seul voit les bilans financiers et la réinitialisation.' },
            { term: 'Administrateur, Secrétaire', text: 'Accès selon les cases cochées sur leur fiche.' },
            { term: 'Agent de recouvrement', text: 'Rôle restreint : par défaut le calendrier (appels, sans encaissement), Bienfaiteur, Événements et les anniversaires. Pas de tableau de bord ni de notifications.' },
            { term: 'Gestionnaire des véhicules', text: 'Rôle restreint : par défaut tout le module Véhicules, sans le téléchargement des pièces jointes.' },
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Créer un administrateur',
          items: [
            'Cliquez sur « Ajouter un administrateur » : civilité, nom, prénom, date de naissance, téléphone (+241), e-mail et photo.',
            'Choisissez le rôle. Pour un rôle restreint, ses accès habituels sont cochés d’office ; ajustez-les si besoin.',
            'Dans « Accès & permissions », cochez pour chaque section ce qu’il peut faire : consulter, créer, valider, enregistrer un paiement, exporter…',
            'Enregistrez : un PDF avec l’e-mail et un mot de passe temporaire se télécharge. Remettez-le en main propre.',
          ],
        },
        {
          type: 'steps',
          title: 'Mot de passe oublié',
          items: ['Sur la fiche de l’admin, cliquez sur « Réinitialiser le mot de passe » : un nouveau mot de passe est téléchargé dans un PDF à lui remettre. L’ancien ne fonctionne plus.'],
        },
      ],
    },
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Consulter', text: 'Sans le droit « Consulter » d’une section, elle disparaît du menu et sa page est fermée.' },
            { term: 'Documents', text: 'Le droit « Télécharger » couvre les reçus, preuves, médias et contrats PDF de toutes les sections.' },
            { term: 'Contact public', text: 'Le numéro WhatsApp réglé ici est affiché aux membres et aux visiteurs de l’espace membre.' },
          ],
        },
      ],
    },
  ],
}

export const agentsRecouvrementHelp: HelpTopic = {
  key: 'agents-recouvrement',
  title: 'Agents de recouvrement',
  category: 'Système',
  summary: 'Les agents de terrain qui collectent les versements des membres, et ce qu’ils ont encaissé.',
  pages: [{ path: '/admin/agents-recouvrement', label: 'Agents de recouvrement', summary: 'Enregistrer les agents de terrain et suivre leur activité.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Chaque agent a une fiche : identité, date de naissance, contacts, pièce d’identité et photo. Quand un admin enregistre un versement (caisse spéciale, caisse imprévue, crédit spécial), il indique l’agent qui l’a collecté.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Ajouter un agent',
          items: [
            'Cliquez sur « Nouvel agent » et remplissez sa fiche.',
            'Il apparaît dans la liste des agents proposée à l’enregistrement des versements.',
            'Un agent qui ne collecte plus se passe en « Inactif » : son historique est conservé.',
          ],
        },
      ],
    },
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Suivi', text: 'L’onglet Recouvrement du tableau de bord répartit les encaissements par agent, et montre le montant encaissé sans agent.' },
            { term: 'Agent et compte admin', text: 'Un agent de terrain n’a pas forcément de compte sur la plateforme. Pour qu’il s’y connecte, créez-lui un compte admin avec le rôle « Agent de recouvrement ».' },
          ],
        },
      ],
    },
  ],
}

export const journalRelancesHelp: HelpTopic = {
  key: 'journal-relances',
  title: 'Journal des relances',
  category: 'Système',
  summary: 'Tous les appels et messages adressés aux membres en retard, avec leur issue et les promesses de paiement.',
  pages: [{ path: '/admin/relances', label: 'Journal des relances', summary: 'Relire les relances, suivre les promesses et l’activité de chaque admin.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Chaque relance faite depuis le calendrier est notée ici : la date, le membre ou le groupe, le produit, le canal (appel ou WhatsApp), l’issue et le commentaire.',
        },
        {
          type: 'definitions',
          items: [
            { term: 'Entrées', text: 'Le nombre de relances de la sélection.' },
            { term: 'Appels et contacts', text: 'Les appels passés, et les membres différents contactés.' },
            { term: 'Joignabilité', text: 'La part des appels où le membre a répondu. Les messages WhatsApp n’y comptent pas : un message envoyé n’est pas un contact établi.' },
            { term: 'Promesses non tenues', text: 'Les promesses de paiement dont la date est passée, sans « a déjà payé » noté ensuite pour ce membre.' },
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Suivre les relances',
          items: [
            'Filtrez par produit, canal, issue ou période.',
            'Le résumé d’activité montre qui a relancé, combien de fois et avec quel résultat.',
            'Exportez la sélection en Excel.',
          ],
        },
      ],
    },
  ],
}

export const journalisationHelp: HelpTopic = {
  key: 'journalisation',
  title: 'Journalisation',
  category: 'Système',
  summary: 'L’historique des actions des administrateurs : qui a fait quoi, quand, dans quelle section.',
  pages: [{ path: '/admin/journalisation', label: 'Journalisation', summary: 'Retrouver une action passée : création, modification, validation, suppression.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Chaque ligne indique la date et l’heure, l’administrateur, la section (module), l’action et sa description. Les indicateurs comptent les entrées, les actions du jour, les administrateurs actifs et les suppressions.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Retrouver une action',
          items: [
            'Cherchez par admin, description ou élément concerné.',
            'Filtrez par action et par module.',
            'Les filtres restent dans l’adresse de la page : le retour arrière retrouve la même liste.',
          ],
        },
      ],
    },
  ],
}

export const groupesHelp: HelpTopic = {
  key: 'groupes',
  title: 'Groupes',
  category: 'Système',
  summary: 'Les groupes de membres, qui épargnent ensemble en caisse spéciale et participent ensemble aux charités.',
  pages: [{ path: '/groups', label: 'Groupes', summary: 'Créer un groupe, y rattacher des membres et lui ouvrir un contrat de caisse.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Un groupe a un nom, un libellé, une description et ses membres. Il peut avoir son propre contrat de caisse spéciale et contribuer aux évènements de charité.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Créer un groupe',
          items: ['Cliquez sur « Créer un groupe » et donnez-lui un nom.', 'Ouvrez le groupe et ajoutez ses membres.'],
        },
        {
          type: 'steps',
          title: 'Ouvrir un contrat de caisse pour le groupe',
          items: [
            'Dans le groupe, cliquez sur « Créer un contrat ».',
            'Choisissez la caisse : Standard, Journalière ou Libre, chacune aussi en version charitable.',
            'Indiquez le montant mensuel, la durée en mois et la date du premier versement.',
          ],
        },
      ],
    },
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Paramètres de la caisse', text: 'Le contrat ne peut être créé que si les paramètres de ce type de caisse sont configurés (Système > Paramètres Caisse).' },
            { term: 'Caisse Libre', text: 'Le total versé par mois doit être d’au moins 100 000 FCFA.' },
            { term: 'Caisse Journalière', text: 'L’objectif du mois est atteint par des versements quotidiens.' },
          ],
        },
      ],
    },
  ],
}

export const referencesHelp: HelpTopic = {
  key: 'metiers-entreprises',
  title: 'Métiers et entreprises',
  category: 'Système',
  summary: 'Les listes de métiers et d’entreprises proposées dans les dossiers des membres.',
  pages: [
    { path: '/metiers', label: 'Métiers et entreprises', summary: 'Gérer les métiers et les entreprises proposés dans les formulaires.' },
    { path: '/jobs', label: 'Métiers', summary: 'Gérer la liste des métiers.' },
    { path: '/companies', label: 'Entreprises', summary: 'Gérer la liste des entreprises.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Quand un membre indique sa profession et son employeur, il choisit dans ces listes. Des listes propres évitent les doublons (« Enseignant », « enseignant ») et rendent fiables les statistiques par métier du tableau de bord.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Gérer les listes',
          items: [
            'Deux onglets : Entreprises et Métiers. Ajoutez, modifiez ou supprimez une entrée.',
            'Une entreprise peut avoir une adresse : elle est alors pré-remplie dans le dossier du membre qui la choisit.',
            'Chaque liste s’exporte en CSV.',
          ],
        },
      ],
    },
  ],
}

export const geographieHelp: HelpTopic = {
  key: 'geographie',
  title: 'Géographie',
  category: 'Système',
  summary: 'Le découpage territorial utilisé pour les adresses : provinces, départements, communes, arrondissements, quartiers.',
  pages: [{ path: '/geographie', label: 'Géographie', summary: 'Gérer les lieux proposés dans les adresses des membres.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Chaque niveau dépend du précédent : une province contient des départements, un département des communes, une commune des arrondissements, un arrondissement des quartiers. Les adresses des membres se choisissent dans ces listes, et le tableau de bord en tire la répartition des membres.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Ajouter un lieu',
          items: [
            'Ouvrez l’onglet du niveau voulu.',
            'Ajoutez le lieu en choisissant son niveau parent (la province d’un département, par exemple), avec un code si besoin.',
            'Les arrondissements peuvent être créés en masse pour une commune.',
          ],
        },
      ],
    },
  ],
}

export const modelesMessagesHelp: HelpTopic = {
  key: 'modeles-messages',
  title: 'Modèles de messages',
  category: 'Système',
  summary: 'Les textes des messages WhatsApp envoyés aux membres : rappels de versement, anniversaires, adhésion, assurance.',
  pages: [{ path: '/parametres-messages', label: 'Modèles de messages', summary: 'Personnaliser le texte de chaque message WhatsApp.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'list',
          items: [
            'Souhait d’anniversaire.',
            'Rappel d’un versement en retard, ou de plusieurs.',
            'Information sur une échéance de placement échue.',
            'Assurance véhicule : échéance proche, ou déjà expirée.',
            'Adhésion : demande rejetée, ou corrections demandées.',
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Modifier un message',
          items: [
            'Modifiez le texte du modèle.',
            'Cliquez sur une variable pour l’ajouter à la fin du message ; survolez-la pour voir ce qu’elle contient.',
            'L’aperçu montre le message avec des données d’exemple.',
            'Enregistrez. « Texte par défaut » revient au texte livré avec l’application.',
          ],
        },
      ],
    },
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Variables', text: 'Elles s’écrivent entre doubles accolades, comme {{prenom}} ou {{montant}}, et sont remplacées à l’envoi par les valeurs du membre.' },
            { term: 'Variable inconnue', text: 'Une variable absente de la liste du modèle ne serait jamais remplacée : la page vous prévient.' },
            { term: 'Personnalisé', text: 'Seuls les modèles modifiés sont enregistrés. Les autres suivent le texte par défaut, même quand il évolue.' },
          ],
        },
      ],
    },
  ],
}

export const importsHelp: HelpTopic = {
  key: 'imports',
  title: 'Imports Excel',
  category: 'Système',
  summary: 'La reprise des membres et des contrats de caisse depuis un fichier Excel, avec vérification avant écriture et annulation possible.',
  pages: [
    { path: '/import-membres', label: 'Import membres', summary: 'Importer les membres depuis la feuille MEMBRES.' },
    { path: '/import-caisse-imprevue', label: 'Import Caisse imprévue', summary: 'Importer les contrats de caisse imprévue actifs et clôturés.' },
    { path: '/import-caisse-speciale', label: 'Import Caisse spéciale', summary: 'Importer les contrats de caisse spéciale, y compris journaliers.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Ces pages reprennent les données tenues auparavant dans un classeur Excel (.xlsx). Chaque feuille a son rôle : MEMBRES pour les membres, CI_ACTIVE et CI_CLOSED pour la caisse imprévue, CS_ACTIVE, CS_CLOSED et JOURNALIERE pour la caisse spéciale.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Importer un fichier',
          items: [
            'Choisissez le fichier .xlsx, puis la feuille.',
            'Lisez l’analyse : ce qui sera créé, les membres à créer, les doublons (plusieurs lignes pour un même contrat) et la façon dont chaque champ sera repris.',
            'Lancez l’import.',
          ],
        },
        {
          type: 'steps',
          title: 'Vérifier et corriger',
          items: [
            'La comparaison entre le fichier et la base signale les contrats en écart.',
            '« Corriger les contrats en écart » rectifie seulement ceux-là ; ils passent ensuite « À jour ».',
          ],
        },
      ],
    },
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Membres existants', text: 'Un membre déjà présent (même matricule) est ignoré : il n’est jamais écrasé.' },
            { term: 'Membres inconnus', text: 'Un contrat dont le membre est introuvable est rattaché au compte INCONNU, puis re-pointé vers le bon membre par matricule.' },
            { term: 'Abonnements', text: 'Un abonnement est créé pour chaque membre importé qui a une date d’inscription.' },
            { term: 'Simulation d’abord', text: 'Les corrections de masse (dates décalées d’un jour, re-pointage INCONNU) comptent d’abord les documents concernés, puis s’appliquent après confirmation. Elles peuvent être relancées sans risque.' },
          ],
        },
        {
          type: 'note',
          tone: 'warning',
          text: '« Supprimer cet import » efface tout ce que l’import de ce fichier et de cette feuille a créé.',
        },
      ],
    },
  ],
}

export const reinitialisationHelp: HelpTopic = {
  key: 'reinitialisation',
  title: 'Réinitialisation',
  category: 'Système',
  superAdminOnly: true,
  summary: 'La suppression des données d’une section, ou de toute la plateforme. Irréversible, réservée au super admin.',
  pages: [{ path: '/reinitialisation', label: 'Réinitialisation', summary: 'Vider une section ou toute la base, après un aperçu.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Cette page sert à repartir de zéro, par exemple après des essais. Elle vide une section (membres, caisses, crédits, placements, bienfaiteur, boutiques, événements, index de recherche) ou tout : base de données, comptes, fichiers et index de recherche. Le compte du super admin est conservé.',
        },
        {
          type: 'note',
          tone: 'warning',
          text: 'Les données supprimées ne peuvent pas être récupérées. Faites une sauvegarde avant.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Réinitialiser',
          items: [
            'Lancez d’abord l’aperçu : il compte ce qui serait supprimé, sans rien effacer.',
            'Pour supprimer, recopiez la phrase de confirmation demandée (par exemple « SUPPRIMER TOUT LE KARA » pour tout effacer).',
            'À la fin, la page confirme que le compte du super admin est toujours présent.',
          ],
        },
      ],
    },
  ],
}
