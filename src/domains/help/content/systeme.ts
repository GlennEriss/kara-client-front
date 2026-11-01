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
        {
          type: 'steps',
          title: 'Modifier les accès d’un compte',
          items: [
            'Ouvrez la fiche de l’administrateur puis la partie « Accès & permissions ».',
            'Cochez d’abord les sections qu’il peut consulter, puis les actions autorisées dans chacune.',
            'Enregistrez et demandez à la personne de recharger sa session pour voir son menu actualisé.',
            'Pour retirer temporairement tout accès sans supprimer l’historique, passez le compte en inactif.',
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
            { term: 'Consulter', text: 'Sans le droit « Consulter » d’une section, elle disparaît du menu et sa page est fermée.' },
            { term: 'Documents', text: 'Le droit « Télécharger » couvre les reçus, preuves, médias et contrats PDF de toutes les sections.' },
            { term: 'Contact public', text: 'Le numéro WhatsApp réglé ici est affiché aux membres et aux visiteurs de l’espace membre.' },
            { term: 'Moindre privilège', text: 'N’accordez que les sections et actions nécessaires au travail de la personne. Les droits de consultation et d’action sont distincts.' },
            { term: 'Historique conservé', text: 'Désactiver un compte n’efface pas les actions qu’il a déjà réalisées ; elles restent visibles dans la journalisation.' },
          ],
        },
      ],
    },
    {
      kind: 'statuses',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Actif', text: 'Le compte peut se connecter et utiliser les sections autorisées.' },
            { term: 'Inactif', text: 'La connexion est bloquée, mais la fiche et l’historique du compte sont conservés.' },
          ],
        },
      ],
    },
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Pourquoi une section n’apparaît-elle pas dans le menu ?', answer: 'Le compte ne possède pas l’accès « Consulter » pour cette section, ou son rôle la masque. Vérifiez sa fiche puis rechargez la session.' },
            { question: 'Pourquoi un bouton est-il absent alors que la page est visible ?', answer: 'La consultation de la section est autorisée, mais pas l’action concernée : création, validation, paiement, export ou téléchargement.' },
            { question: 'Faut-il supprimer le compte d’une personne qui quitte son poste ?', answer: 'Non. Passez-le en inactif afin de bloquer la connexion tout en conservant la traçabilité de ses actions.' },
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
        {
          type: 'steps',
          title: 'Contrôler l’activité d’un agent',
          items: [
            'Ouvrez sa fiche pour vérifier son identité et son statut.',
            'Utilisez l’onglet Recouvrement du tableau de bord pour comparer les encaissements attribués aux agents.',
            'Contrôlez séparément les versements enregistrés sans agent afin de compléter l’attribution si nécessaire.',
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
    {
      kind: 'statuses',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Actif', text: 'Proposé dans les formulaires d’encaissement et disponible pour les nouvelles collectes.' },
            { term: 'Inactif', text: 'N’est plus proposé pour une nouvelle collecte ; ses anciens encaissements restent attribués.' },
          ],
        },
      ],
    },
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Pourquoi un agent n’apparaît-il pas lors d’un versement ?', answer: 'Vérifiez qu’il est actif. La fiche d’agent de terrain et le compte de connexion admin sont deux éléments différents.' },
            { question: 'Comment lui permettre d’utiliser le calendrier ?', answer: 'Créez ou modifiez son compte dans Administration, attribuez le rôle Agent de recouvrement et autorisez la consultation du calendrier.' },
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
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Journal de suivi', text: 'Une relance décrit un contact ; elle ne remplace jamais l’enregistrement du versement dans le module financier.' },
            { term: 'Promesse', text: 'La date et le montant promis servent au suivi. Une nouvelle relance permet d’indiquer si la promesse est tenue ou non.' },
            { term: 'Compte rendu', text: 'Un commentaire factuel et court facilite la reprise du dossier par un autre agent.' },
          ],
        },
      ],
    },
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Une promesse reste marquée non tenue après un paiement.', answer: 'Vérifiez qu’une relance ultérieure indique « a déjà payé » pour le même membre et que le versement a bien été enregistré dans le module concerné.' },
            { question: 'Pourquoi un message WhatsApp ne compte-t-il pas comme membre joint ?', answer: 'L’ouverture d’un message ne prouve pas que le membre l’a lu ou répondu. La joignabilité repose sur les appels avec échange confirmé.' },
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
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Lecture seule', text: 'Le journal sert à contrôler les actions ; ses lignes ne se modifient pas depuis cette page.' },
            { term: 'Contexte', text: 'Une description peut contenir l’identifiant de l’élément concerné afin de retrouver son dossier dans le module d’origine.' },
            { term: 'Filtres URL', text: 'La recherche et les filtres restent dans l’adresse pour permettre le retour arrière et le partage d’une vue de contrôle.' },
          ],
        },
      ],
    },
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Pourquoi une action récente n’apparaît-elle pas ?', answer: 'Rechargez la page et vérifiez la période, le module et le type d’action sélectionnés. Certaines actions purement consultatives ne sont pas journalisées.' },
            { question: 'Peut-on supprimer une ligne du journal ?', answer: 'Non depuis la journalisation : la traçabilité doit rester intacte.' },
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
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Pourquoi un membre ne peut-il pas être ajouté ?', answer: 'Vérifiez qu’il existe comme membre approuvé et qu’il n’est pas déjà présent dans le groupe.' },
            { question: 'Pourquoi la création du contrat de caisse échoue-t-elle ?', answer: 'Le type de caisse choisi doit être configuré et les montants doivent respecter ses règles, notamment le minimum de la Caisse Libre.' },
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
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Libellé unique', text: 'Évitez les variantes de casse, d’accent ou d’abréviation qui représentent la même valeur.' },
            { term: 'Suppression', text: 'Avant de supprimer une référence, vérifiez si elle est encore utilisée sur des dossiers existants.' },
          ],
        },
      ],
    },
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Deux métiers identiques apparaissent dans les filtres.', answer: 'Conservez un seul libellé normalisé et corrigez les dossiers qui utilisent l’ancienne variante avant de la supprimer.' },
            { question: 'Pourquoi l’adresse de l’entreprise n’est-elle pas proposée ?', answer: 'Ouvrez l’entreprise et vérifiez que son adresse est renseignée et enregistrée.' },
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
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Hiérarchie', text: 'Chaque lieu dépend de son parent. Une commune mal rattachée fausse les choix d’adresse et les statistiques territoriales.' },
            { term: 'Libellé', text: 'Utilisez le nom officiel et évitez les doublons avec une orthographe différente.' },
          ],
        },
      ],
    },
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Pourquoi un quartier n’apparaît-il pas dans un formulaire ?', answer: 'Vérifiez toute sa chaîne : province, département, commune et arrondissement. Il doit être rattaché au parent sélectionné dans le formulaire.' },
            { question: 'Puis-je créer plusieurs arrondissements à la fois ?', answer: 'Oui, utilisez la création en masse depuis la commune concernée, puis contrôlez les libellés avant validation.' },
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
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Pourquoi une variable reste-t-elle écrite avec ses accolades dans WhatsApp ?', answer: 'Elle n’est pas reconnue pour ce modèle ou la donnée correspondante manque. Utilisez uniquement les variables proposées sur la page.' },
            { question: 'Comment annuler une personnalisation ?', answer: 'Utilisez « Texte par défaut », vérifiez l’aperçu puis enregistrez.' },
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
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Puis-je relancer le même import ?', answer: 'Oui si l’outil l’indique comme idempotent : les membres déjà reconnus sont ignorés et les corrections de masse peuvent être rejouées. Lisez toujours l’analyse avant confirmation.' },
            { question: 'Un contrat est rattaché à INCONNU.', answer: 'Utilisez l’action de re-pointage par matricule après avoir vérifié ou créé le membre correspondant.' },
            { question: 'Que supprime « Supprimer cet import » ?', answer: 'Uniquement les éléments créés par le fichier et la feuille identifiés par cet import. Lisez l’aperçu avant de confirmer.' },
          ],
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
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Aperçu', text: 'Comptage en lecture seule de ce qui serait supprimé ; il ne modifie aucune donnée.' },
            { term: 'Réinitialisation partielle', text: 'Supprime uniquement la section choisie et ses données liées indiquées dans l’aperçu.' },
            { term: 'Réinitialisation totale', text: 'Supprime les données, comptes et fichiers de la plateforme, sauf le compte super admin conservé pour reprendre la configuration.' },
          ],
        },
        {
          type: 'note',
          tone: 'warning',
          text: 'Ne lancez jamais une réinitialisation pour corriger quelques dossiers. Utilisez les actions du module, un script de correction contrôlé ou l’assistance technique.',
        },
      ],
    },
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Puis-je annuler une réinitialisation ?', answer: 'Non. Une fois confirmée, elle est irréversible. La seule récupération possible dépend d’une sauvegarde réalisée avant l’opération.' },
            { question: 'Pourquoi la phrase de confirmation est-elle refusée ?', answer: 'Elle doit être recopiée exactement, avec les espaces et majuscules demandés, après l’aperçu.' },
          ],
        },
      ],
    },
  ],
}
