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
  demonstration: 'groups',
  title: 'Groupes',
  category: 'Membres',
  summary: 'Créer des groupes de membres, organiser leurs projets et suivre leurs accords de vente, prestation ou prêt entre membres.',
  pages: [{ path: '/groups', label: 'Groupes', summary: 'Créer un groupe, sélectionner ses membres et suivre ses projets collectifs.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Un groupe réunit des membres autour de plusieurs projets. Chaque caisse collective, achat collectif ou autre projet possède son objectif, ses participants et son état : en préparation, en cours, terminé ou annulé. Le référent du groupe est choisi parmi ses membres. Un groupe peut aussi conserver son contrat de caisse spéciale et participer aux charités.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Découvrir les groupes avec une démonstration interactive',
          items: ['Cliquez sur « Voir une démonstration » depuis la liste des groupes, la fiche d’un groupe ou cette aide.', 'Choisissez un parcours : créer un groupe, gérer une caisse et ses remises, ou financer un achat collectif.', 'Lisez le cas concret et son objectif, puis cliquez sur « Commencer le parcours ». « Montrer » anime le curseur pour une seule étape ; vous pouvez aussi cliquer sur l’action encadrée. Comparez l’avant et l’après, lisez « Ce qui a changé » et ouvrez « Pourquoi cette étape ? » si nécessaire.', 'Le résultat reste affiché jusqu’à « Suivant ». « Enchaîner automatiquement les étapes » active une lecture continue avec un temps de lecture adapté. « Retour », la liste des étapes et « Recommencer » permettent de revoir les actions. À la dernière étape, « Bilan » ouvre le récapitulatif et une question avec une explication. Les noms et montants sont fictifs : aucune opération réelle n’est enregistrée.'],
        },
        {
          type: 'steps', title: 'Ventes, prestations et prêts entre membres',
          items: ['Ouvrez le groupe puis « Accords entre membres ». Cliquez sur « Créer des accords ». Les deux parties doivent être des membres identifiés du groupe ; INCONNU représente KARA pour les garanties existantes, pas un vendeur ou un acheteur.', 'Choisissez le type, le bénéficiaire, l’objet, la date et les membres qui paient. Pour une vente, précisez les quantités et les prix. Proposez un rythme mensuel, hebdomadaire ou journalier, puis ajustez les conditions pour chaque membre.', 'Vérifiez chaque échéancier : ses dates et montants peuvent être modifiés avant confirmation. Leur somme doit correspondre au montant de l’accord. Une création produit un accord distinct pour chaque acheteur, sans enregistrer de versement.', 'Ouvrez un accord pour enregistrer un versement réellement reçu : directement par le bénéficiaire, ou encaissé par KARA. Indiquez sa date effective, son mode, une référence et éventuellement un justificatif réservé à l’administration.', 'Si KARA encaisse, le membre a payé cette somme, mais le bénéficiaire ne l’a pas encore reçue. Utilisez « Confirmer un reversement » uniquement après la remise effective. Une remise partielle laisse le complément à reverser.', 'Notez les appels, les promesses et les dates de relance dans l’accord. Le filtre « Relance / promesse arrivée à date » retrouve les suivis à effectuer. WhatsApp ouvre un brouillon à envoyer manuellement ; l’application ne garantit ni son envoi ni sa lecture. Ces suivis restent dans l’accord et ne créent pas de tâche dans le calendrier central.', 'Une erreur de saisie se corrige avec un motif obligatoire : l’écriture reste dans l’historique et est exclue des calculs. Une correction ne constate pas de remboursement. Un accord ne peut être annulé tant qu’il possède des opérations actives.'],
        },
        {
          type: 'steps',
          title: 'Créer un groupe',
          items: ['Cliquez sur « Créer un groupe » et indiquez son nom et sa raison d’être.', 'Recherchez les membres par nom, matricule ou téléphone, sélectionnez-en plusieurs et choisissez un référent si vous le souhaitez. Choisissez aussi le garant du groupe parmi les membres Kara, même d’un autre groupe, ou utilisez « Contact inconnu » : le compte INCONNU représente LE KARA, sans commission de garant.', 'Ajoutez un premier projet ou décochez cette option pour le faire plus tard. La création ouvre ensuite la fiche du groupe.'],
        },
        {
          type: 'steps',
          title: 'Organiser les projets du groupe',
          items: ['Dans « Projets », cliquez sur « Nouveau projet ».', 'Choisissez Caisse collective, Achat collectif ou Autre projet, précisez l’objectif et sélectionnez les participants parmi les membres du groupe.', 'Ouvrez un projet pour consulter ses détails ou modifier son état. Le budget éventuel est une estimation. Pour une caisse collective, configurez ensuite le cycle dans Cotisations : journalières, hebdomadaires ou mensuelles.', 'L’onglet Historique conserve les créations et modifications du groupe et de ses projets.'],
        },
        {
          type: 'steps',
          title: 'Suivre les cotisations d’une caisse collective',
          items: ['Ouvrez le projet de caisse collective puis Cotisations. Choisissez Journalière, Hebdomadaire ou Mensuelle : cotisation et prise suivent le même rythme. Pour les jours ou semaines, indiquez la première date et le nombre de prises ; pour les mois, le premier mois, la durée et le jour d’échéance. Les échéances mensuelles 29 à 31 sont plafonnées au dernier jour des mois plus courts.', 'Le cycle reprend les participants présents au moment de la configuration. Le formulaire affiche les premières et dernières échéances et le montant brut de chaque caisse. La fréquence, le calendrier, le montant et les participants sont conservés dès la première opération ; créez un autre projet pour un nouveau cycle. Les anciens cycles restent mensuels.', 'Choisissez le jour, la semaine ou le mois. « Enregistrer un versement » permet de saisir un paiement réel, partiel ou complet, sa date, son moyen et une référence ou note facultative. Les montants réglés et restant à régler sont actualisés dans le tableau.', 'Pour une avance, « Financer par crédit fixe » ouvre la demande du membre, préremplie et verrouillée sur le solde de la période. Le garant du groupe est proposé et reste modifiable ; le membre doit avoir un autre garant que lui-même. La durée du crédit reste décidée séparément par l’admin.', 'La demande réserve la cotisation sans la payer. Après approbation et création du contrat, faites signer le contrat, puis revenez à la période et utilisez « Confirmer la prise en charge » uniquement après affectation effective de l’avance. Un contrat non signé ne permet pas cette confirmation.', 'Les versements et leur auteur figurent dans l’historique de la période. Une reprise réseau ne duplique pas un versement ou une prise en charge. Pour passer à un paiement direct pendant une demande, détachez d’abord le dossier non affecté depuis le suivi des financements.', 'Dans Mes groupes, le membre consulte uniquement ses cotisations selon leur fréquence, versements et éventuels versements d’accompagnement. Son bouton de contact ouvre un brouillon WhatsApp prérempli au numéro configuré de l’association ; il ne crée aucune demande et aucun paiement dans l’application.'],
        },
        {
          type: 'steps',
          title: 'Remettre une caisse collective et retenir une redevance',
          items: ['Configurez d’abord le cycle de cotisations. Dans « Remises aux bénéficiaires », ouvrez « Configurer la redevance facultative », activez la retenue si nécessaire, indiquez son montant fixe puis enregistrez. Le montant doit être inférieur à la caisse de chaque période.', 'Sélectionnez le jour, la semaine ou le mois de remise selon le cycle. Toutes les cotisations de cette période doivent être réglées ou effectivement prises en charge avant la date de remise. Une demande en attente ne suffit pas.', 'Choisissez le bénéficiaire parmi les participants du cycle encore membres du groupe. Un ordre de passage valide propose le bénéficiaire à chaque période correspondante ; l’admin vérifie ce choix. Le tirage seul ne crée aucune remise.', 'Renseignez la date réelle et le moyen de remise, ainsi qu’une référence ou une note facultative. Cliquez sur « Vérifier la remise » : le récapitulatif affiche le montant brut, la retenue Kara et le net au bénéficiaire.', 'Utilisez « Confirmer la remise effective » uniquement après avoir remis les fonds. Cette saisie ne déclenche aucun transfert. Une seule remise définitive est enregistrable par projet et par période : chaque jour pour une caisse journalière, tous les 7 jours pour une caisse hebdomadaire, ou chaque mois. Une reprise réseau ne la duplique pas.', 'Le membre retrouve ses seules remises dans Mes groupes, avec leur période, le brut, la retenue et le net reçu. Les notes et auteurs administratifs restent privés. Dans le bilan financier et ses exports, Caisses collectives regroupe les opérations selon leurs dates réelles, quelle que soit la fréquence.'],
        },
        {
          type: 'steps',
          title: 'Demander un crédit fixe pour plusieurs membres',
          items: ['Renseignez d’abord le garant dans les informations du groupe. Choisissez un membre Kara identifié ou « Contact inconnu » lorsque LE KARA assure la garantie sans commission ; le référent reste un rôle distinct.', 'Dans le projet, cliquez sur « Demande collective de crédit fixe ». Indiquez le montant à financer, la date souhaitée et le motif.', 'Les participants du projet sont sélectionnés par défaut. Décochez ceux qui ne doivent pas emprunter. Le montant est réparti à parts égales, au franc près ; vous pouvez modifier chaque part. La somme doit rester exactement égale au montant total.', 'Le garant du groupe est repris sur chaque demande. S’il emprunte lui-même, choisissez un autre garant pour sa part : un membre Kara ou le compte INCONNU de LE KARA.', '« Vérifier la répartition » affiche chaque emprunteur, sa part et son garant. Confirmez ensuite la création : une demande individuelle de crédit fixe en attente est créée pour chacun, en une seule opération.', 'Ouvrez chaque demande pour l’approuver ou la rejeter, simuler les conditions puis créer et faire signer son contrat. La création collective n’approuve aucun crédit et ne décaisse aucun fonds.'],
        },
        {
          type: 'steps',
          title: 'Financer le projet avec des crédits individuels',
          items: ['Ouvrez un projet en préparation ou en cours. Dans « Financement du projet », choisissez le « Participant à financer ». Il doit appartenir au groupe et participer au projet. Le « Type de financement » propose le crédit fixe par défaut ; le crédit spécial reste disponible selon vos droits.', '« Nouvelle demande de crédit » ouvre le formulaire prérempli pour ce participant. Complétez la demande, puis utilisez le parcours habituel d’approbation, de création et de signature du contrat. Le rattachement au groupe et au projet est conservé lors de la création du contrat.', '« Rattacher un contrat existant » permet de choisir un crédit fixe ou spécial du participant, du type sélectionné et non rattaché à un autre projet. Vérifiez le contrat puis confirmez le rattachement.', 'Le récapitulatif affiche les fonds réellement remis, les remboursements, le reste dû à ce jour, les intérêts et pénalités encaissés. Chaque contrat ouvre sa fiche ; les demandes sans contrat restent visibles séparément.', 'L’icône de détachement demande confirmation. Elle retire seulement le lien au projet : le contrat, sa dette et ses versements sont conservés. Les créations, rattachements et détachements sont inscrits dans l’historique du groupe.'],
        },
        {
          type: 'steps',
          title: 'Tirer au sort l’ordre de récupération d’une caisse collective',
          items: ['Créez un projet de type Caisse collective ou Autre projet, puis sélectionnez au moins deux participants. Le projet doit être en préparation ou en cours.', 'Ouvrez le projet et cliquez sur « Tirer au sort l’ordre ». Un aperçu numéroté place chaque participant une seule fois.', 'Vérifiez l’aperçu puis cliquez sur « Enregistrer cet ordre » pour le rendre visible dans l’espace membre. « Annuler le tirage » laisse l’ordre enregistré intact.', 'Le membre voit la liste des passages et sa position personnelle. L’historique des tirages, avec les anciens ordres, la date et l’auteur, reste consultable dans le projet côté admin.', 'Si les participants ou le type du projet changent, refaites le tirage. « Refaire le tirage » demande une nouvelle confirmation et conserve les tirages enregistrés précédemment. Un nouveau tirage peut donner le même ordre par hasard.'],
        },
        {
          type: 'steps',
          title: 'Retrouver un groupe dans l’espace membre',
          items: ['Après son ajout par un administrateur, le membre retrouve le groupe dans « Communauté > Mes groupes », même sans abonnement actif.', 'Il ouvre la fiche pour consulter le coordinateur, les membres et tous les projets du groupe. Le repère « Vous participez » et le filtre « Mes participations » distinguent les projets auxquels il est inscrit.', 'Il peut consulter les objectifs, les participants, les statuts, la date cible et le budget estimé. Dans « Ma participation », il suit directement sa part et ses versements sans quitter le groupe. Pour rejoindre un projet ou modifier le groupe, il contacte le coordinateur ou l’association.', 'Le bouton « Actualiser » recharge les changements effectués par l’admin. Les données sont également rechargées au retour sur l’application lorsqu’elles ont plus de 30 secondes.'],
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
          type: 'note',
          tone: 'info',
          text: 'Le financement d’un projet utilise des contrats individuels de crédit fixe ou spécial. Le crédit fixe est présélectionné pour les nouvelles demandes : son intérêt est calculé une seule fois et le total à rembourser est connu dès le départ. Une caisse collective peut retenir une redevance facultative, fixée par l’admin et déduite à chaque remise effective au bénéficiaire. Les cotisations mensuelles d’une caisse collective sont enregistrées séparément des crédits par l’admin dans le suivi du projet. Les demandes et contrats en préparation ne sont pas comptés comme des fonds remis.',
        },
        {
          type: 'definitions',
          items: [
            { term: 'Appartenance et participation', text: 'Un membre peut appartenir à plusieurs groupes. Faire partie du groupe ne l’inscrit pas automatiquement à tous ses projets : l’admin choisit les participants de chaque projet.' },
            { term: 'Accès membre', text: 'Le membre consulte uniquement ses groupes, sans pouvoir créer ou modifier un groupe ou un projet. La liste des membres affiche leurs noms, pas leurs coordonnées privées. L’historique des actions administratives reste dans l’admin.' },
            { term: 'Retrait du groupe', text: 'Le retrait supprime l’accès du membre au groupe et sa participation aux projets en préparation ou en cours. Les projets terminés ou annulés conservent leurs anciens participants. Si le référent est retiré, choisissez un nouveau référent.' },
            { term: 'Budget et versements', text: 'Le budget d’un projet est une estimation. Pour une caisse collective, le projet suit les cotisations individuelles et les remises effectives ; il ne gère pas les dépenses générales d’un achat collectif. Un éventuel contrat de caisse spéciale du groupe conserve son propre suivi financier.' },
            { term: 'Rythme de la caisse collective', text: 'Journalière : une cotisation et une prise par jour, week-ends compris. Hebdomadaire : une cotisation et une prise tous les 7 jours à partir de la première date choisie. Mensuelle : une cotisation et une prise par mois. Le montant est fixé par membre et par période. Exemple : 10 membres à 1 000 FCFA par jour réunissent 10 000 FCFA par prise journalière, avant la redevance éventuelle. Le nombre de périodes est choisi par l’admin ; l’ordre tiré propose un bénéficiaire tant qu’une position correspondante existe.' },
            { term: 'Ordre de récupération', text: 'L’ordre est tiré au sort parmi les participants du projet, puis enregistré par un administrateur. Chaque participant reçoit une position unique. Il ne déclenche aucun paiement et ne calcule pas les dates de passage. Un changement de participants ou de type invalide l’ordre actuel, même si la liste initiale est rétablie ensuite. Les projets terminés ou annulés conservent leur ordre et ne peuvent plus être tirés au sort.' },
            { term: 'Crédits individuels liés au projet', text: 'Chaque participant financé conserve son propre contrat de crédit fixe ou spécial, rattaché à son identité, au groupe et au projet. Ses échéances, remboursements et pénalités restent suivis dans son contrat. Être membre du groupe ne rend pas automatiquement emprunteur ou garant. Un contrat ne peut être rattaché qu’à un projet à la fois.' },
            { term: 'Garant du groupe', text: 'Le garant est un membre Kara identifié, même extérieur au groupe, ou le compte INCONNU déjà existant sélectionné par « Contact inconnu ». INCONNU représente LE KARA et ne reçoit aucune commission. Il est repris sur les nouvelles demandes collectives et proposé sur les nouvelles demandes individuelles du projet. Un emprunteur ne peut pas être son propre garant. Modifier le garant du groupe ne change pas celui des demandes ou contrats déjà créés.' },
            { term: 'Répartition collective', text: 'Pour 500 000 FCFA et 5 participants financés, le parcours propose cinq demandes de crédit fixe de 100 000 FCFA chacune. Une répartition différente est possible si les parts totalisent toujours 500 000 FCFA. Les montants sont des capitaux demandés ; les taux, durées et totaux à rembourser sont déterminés lors de la validation individuelle.' },
            { term: 'Choisir le type de financement', text: 'Le crédit fixe est recommandé pour un achat collectif au budget défini : un intérêt unique et un échéancier prévu. Par exemple, 100 000 FCFA à 10 % donnent 110 000 FCFA à rembourser. Le crédit spécial mensuel classique applique ses intérêts au reste dû pendant la phase spéciale. Ce choix ne transforme pas les contrats déjà rattachés. Une caisse collective sans avance de l’association n’a pas besoin de crédit.' },
            { term: 'Exemple de financement collectif', text: 'Cinq membres souhaitent acheter du matériel pour 500 000 FCFA. Si l’association remet 100 000 FCFA par personne, cinq contrats individuels sont liés au même projet. La vue du projet reprend les 500 000 FCFA remis, les cinq contrats, les remboursements reçus et le reste dû, sans créer de seconde dette ni compter deux fois les encaissements.' },
            { term: 'Périmètre des chiffres et accès', text: 'Le récapitulatif reprend toute l’histoire des contrats liés, même les versements antérieurs au rattachement, avec les mêmes calculs que le bilan financier. Chaque type de crédit nécessite son propre droit de consultation. La création, le rattachement et le détachement nécessitent aussi la gestion des groupes et la création du type de crédit concerné. Le récapitulatif porte seulement sur les types de crédit auxquels vous avez accès. Côté membre, le suivi reste dans Mes groupes : « Ma participation », la part dans le projet, le total prévu, les montants déjà versés, le reste à verser et la prochaine échéance enregistrée. Les participations proposées sont en attente de confirmation. Aucun libellé de crédit, type de produit, référence technique ou lien vers une fiche de crédit n’y est affiché ; les montants des autres participants restent privés.' },
            { term: 'Départ d’un participant et clôture du projet', text: 'Retirer un participant ou terminer un projet ne supprime pas les crédits liés et n’annule aucune dette. Les financements historiques restent consultables. Un projet terminé ou annulé n’accepte plus de nouvelle demande ou de nouveau rattachement ; les contrats conservent leur propre parcours de remboursement et de clôture.' },
            { term: 'Recettes du financement', text: 'Les intérêts effectivement encaissés sur les crédits constituent des recettes pour l’association. Le remboursement du capital rembourse les fonds prêtés ; il reste distingué des intérêts. Le bénéfice se mesure après déduction des charges, notamment des commissions versées aux garants.' },
            { term: 'Caisse collective et avance à un participant', text: 'Le tirage définit l’ordre de récupération. Une cotisation de caisse collective reste distincte d’un remboursement de crédit. Un crédit fixe ou spécial lié au projet correspond à une véritable avance accordée à un participant, avec son propre contrat ; le tirage ne crée aucune dette à lui seul.' },
            { term: 'Redevance facultative par remise', text: 'Dans une caisse collective avec un cycle configuré, l’admin peut activer un montant fixe retenu à chaque remise. Par défaut, aucune redevance ne s’applique. Pour 50 000 FCFA bruts et 1 000 FCFA de redevance Kara, le membre reçoit 49 000 FCFA nets. Le tarif doit laisser un montant net positif. Un changement concerne seulement les prochaines remises. Chaque remise conserve le bénéficiaire, le mois, le brut, la retenue, le net, la date réelle et l’auteur.' },
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
            { question: 'Pourquoi le membre ne voit-il pas son groupe ?', answer: 'Vérifiez son appartenance dans l’onglet Membres du groupe, puis demandez-lui d’actualiser « Mes groupes ». Les interfaces admin et membre doivent utiliser le même environnement Firebase et inclure la fonctionnalité Groupes.' },
            { question: 'Le membre peut-il rejoindre lui-même un projet ou enregistrer un versement ?', answer: 'La participation est attribuée par l’admin. Le membre consulte ses projets et contacte le coordinateur ou l’association pour demander un changement. Il consulte les cotisations et versements enregistrés par l’admin. Le contact pour un règlement ou un accompagnement ouvre WhatsApp ; aucun formulaire de paiement ou de demande n’est proposé côté membre.' },
            { question: 'Pourquoi l’ordre de récupération est-il à refaire ?', answer: 'Le type du projet ou ses participants ont changé depuis le tirage. Les anciens ordres sont conservés dans l’historique, mais un nouveau tirage doit être confirmé pour afficher un ordre valide aux membres.' },
            { question: 'Pourquoi la création du contrat de caisse échoue-t-elle ?', answer: 'Le type de caisse choisi doit être configuré et les montants doivent respecter ses règles, notamment le minimum de la Caisse Libre.' },
            { question: 'Comment l’association gagne-t-elle de l’argent sur un projet de groupe ?', answer: 'Le groupe ne génère aucun revenu automatiquement. Pour les projets financés par crédit fixe ou spécial, les recettes proviennent des intérêts encaissés sur les contrats individuels. Pour une caisse collective, l’admin peut aussi activer une redevance fixe par remise ; elle constitue une recette uniquement quand la remise est enregistrée. Les cotisations du groupe et le capital remboursé restent distincts des recettes ; les charges doivent être déduites pour connaître le bénéfice.' },
            { question: 'Comment rattacher un crédit fixe ou spécial à une caisse collective ou à un achat collectif ?', answer: 'Ouvrez le projet, choisissez son participant et le type de financement puis « Rattacher un contrat existant » et confirmez. Vous pouvez aussi utiliser « Nouvelle demande de crédit » : le lien sera conservé après validation et création du contrat. Le contrat reste individuel et ne peut pas être rattaché à deux projets à la fois.' },
            { question: 'Un crédit unique sera-t-il créé au nom du groupe ?', answer: 'Le fonctionnement retenu repose sur des contrats individuels, pour identifier précisément qui doit rembourser quoi. Un contrat unique au nom du groupe demanderait un fonctionnement spécifique pour définir les emprunteurs et leurs responsabilités ; il n’est pas proposé actuellement.' },
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
  summary: 'Les textes WhatsApp : rappels, invitations aux événements et collectes, accords entre membres, simulations, anniversaires, adhésion et assurance.',
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
            'Invitations aux événements et collectes Bienfaiteur, avec un bloc facultatif pour contribuer.',
            'Relances des accords entre membres d’un groupe.',
            'Partage des simulations : crédit calculé, crédit personnalisé, fixe / aide et caisse spéciale avec bonus.',
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
