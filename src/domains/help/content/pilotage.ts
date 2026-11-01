import type { HelpTopic } from '../entities/help.types'

export const tableauDeBordHelp: HelpTopic = {
  key: 'tableau-de-bord',
  title: 'Tableau de bord',
  category: 'Pilotage',
  summary: 'Les indicateurs opérationnels et financiers vérifiés de tous les modules : demandes, créances, fonds à restituer, retards, manque à gagner et alertes.',
  pages: [{ path: '/dashboard', label: 'Tableau de bord', summary: 'Lire les indicateurs, onglet par onglet, avec des filtres de période, de type de membre et de zone.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Le tableau de bord donne l’état de l’association au moment où vous l’ouvrez. L’onglet Exécutif rassemble les priorités du jour, la situation financière vérifiée et les alertes de tous les modules ; les autres onglets détaillent chacun : caisses, crédits, placements, administration, recouvrement, groupes, métiers et géographie.',
        },
        {
          type: 'definitions',
          items: [
            { term: 'Sommes dues à l’association', text: 'Créances encore dues : crédits restant à rembourser et supports de caisse imprévue non remboursés.' },
            { term: 'Fonds à restituer', text: 'Épargne des caisses et capitaux de placements détenus par l’association, mais appartenant aux membres ou bienfaiteurs.' },
            { term: 'Impayés', text: 'Le nombre de contrats et de placements en retard.' },
            { term: 'Montant en retard', text: 'Part des échéances déjà dépassées qui reste impayée. Ce montant n’est pas encore une perte.' },
            { term: 'Manque à gagner généré restant', text: 'Manque à gagner produit par les seules échéances déjà arrivées, diminué des encaissements enregistrés à ce titre. Aucun mois futur n’est compté.' },
            { term: 'Pertes comptables constatées', text: 'Créances réellement abandonnées lors de la clôture d’un crédit en perte. Elles sont distinctes du manque à gagner et des retards.' },
            { term: 'Alertes opérationnelles', text: 'Pour chaque sous-module, le niveau dépend des dossiers en retard. « Action requise » signale au moins un dossier à traiter ; un clic ouvre directement la liste correspondante.' },
            { term: 'Détails financiers vérifiés', text: 'Les blocs Trésorerie, Résultat, Encours et créances, puis Pertes et risques utilisent le même moteur de calcul que les bilans financiers.' },
            { term: 'Appels à traiter', text: 'Les appels planifiés aujourd’hui et ceux des jours précédents qui ne sont pas encore terminés.' },
            { term: 'Réalisation des appels', text: 'La part des appels planifiés cette semaine qui disposent déjà d’un compte rendu.' },
            { term: 'Taux de joignabilité', text: 'La part des relances de la période ayant abouti à un échange avec le membre.' },
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Filtrer',
          items: [
            'Période : depuis le début, aujourd’hui, 7 ou 30 derniers jours, mois en cours, ou dates personnalisées.',
            'Type de membre (adhérent, bienfaiteur, sympathisant), province et ville.',
            'Dans l’onglet Exécutif, comparez un groupe de modules : caisse, crédit ou placement.',
            'Sur téléphone, utilisez « Afficher » pour ouvrir les filtres ; les filtres actifs restent visibles lorsqu’ils sont repliés.',
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Les cartes KPI, les lignes des détails financiers et les alertes soulignées sont cliquables. Elles ouvrent la page de contrats, le calendrier ou le bilan correspondant.',
        },
        {
          type: 'steps',
          title: 'Passer d’une alerte au dossier à traiter',
          items: [
            'Dans « Alertes opérationnelles », repérez les modules marqués « Action requise ».',
            'Cliquez sur la carte : une caisse ouvre son module ; Crédit spécial, Crédit fixe et Caisse aide ouvrent directement leur liste de contrats.',
            'Dans « Retards et risques de crédit », cliquez sur les échéances en retard pour ouvrir le calendrier, ou sur le manque à gagner pour ouvrir les contrats concernés.',
            'Utilisez le bouton retour du navigateur pour retrouver les mêmes filtres du tableau de bord.',
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Les notes en bas de chaque onglet détaillent comment les montants sont calculés.',
        },
      ],
    },
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            {
              question: 'Quelle différence avec les bilans financiers ?',
              answer: 'Le tableau de bord donne la situation actuelle et les priorités opérationnelles. Ses montants financiers vérifiés utilisent le même moteur que les bilans ; les bilans ajoutent la lecture mois par mois, le choix d’une période et les exports Excel ou PDF.',
            },
            {
              question: 'Les chiffres ne bougent pas après un versement.',
              answer: 'Les indicateurs sont gardés quelques minutes en mémoire. Rechargez la page un peu plus tard.',
            },
          ],
        },
      ],
    },
  ],
}

export const calendrierHelp: HelpTopic = {
  key: 'calendrier',
  title: 'Calendrier',
  category: 'Pilotage',
  summary: 'Les échéances de tous les modules, jour par jour, avec les retards à relancer et le journal des appels.',
  pages: [{ path: '/calendrier', label: 'Calendrier', summary: 'Voir les échéances du mois, encaisser un versement et relancer les membres en retard.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Le calendrier rassemble les échéances à venir et en retard. Une vue par module : Caisse spéciale, Caisse imprévue, Placements, Crédit spécial, Crédit fixe et Caisse aide.',
        },
        {
          type: 'list',
          items: [
            'Chaque jour affiche les échéances prévues ; un clic ouvre le détail des membres concernés.',
            'Les filtres affinent la vue : type de caisse, fréquence de versement, mode de versement des placements.',
            'La liste des versements en retard montre, pour chaque membre, le montant dû, l’échéance la plus ancienne et le dernier contact. Le filtre par mois ne garde que les membres dont l’échéance la plus ancienne tombe dans le mois choisi ; le total et les exports suivent ce filtre.',
            'Le superadmin peut sélectionner plusieurs retardataires, planifier leurs appels sur un jour de la semaine en cours et attribuer le lot à tout compte actif autorisé à consulter le calendrier, notamment un agent de recouvrement. Un lot non attribué reste visible par tous les utilisateurs du calendrier.',
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Encaisser depuis le calendrier',
          items: [
            'Cliquez sur le jour, puis sur l’échéance du membre.',
            'Dans le panneau qui s’ouvre, enregistrez le versement : montant, date, moyen de paiement, preuve.',
          ],
        },
        {
          type: 'steps',
          title: 'Planifier un lot d’appels',
          items: [
            'Dans les versements en retard, cochez les personnes à intégrer au lot.',
            'Cliquez sur « Planifier les appels », puis choisissez aujourd’hui ou un prochain jour de la semaine en cours.',
            'Laissez le lot non attribué ou choisissez un compte actif disposant de l’accès au calendrier.',
            'Les appels apparaissent dans « Appels planifiés cette semaine ». Le compte rendu d’appel marque automatiquement la tâche comme terminée.',
            'Le superadmin utilise « Suivi des lots » pour consulter l’avancement, les appels terminés, la personne qui les a traités et leur date de réalisation.',
            'La création de lots reste facultative : la liste complète des versements en retard et ses actions restent disponibles.',
          ],
        },
        {
          type: 'steps',
          title: 'Relancer un membre en retard',
          items: [
            'Dans les versements en retard, cliquez sur « Appeler ».',
            'Après l’échange, notez l’issue : a promis de payer, a déjà payé, injoignable, numéro invalide, refus de payer, à rappeler plus tard, message envoyé ou autre.',
            'Pour une promesse, indiquez la date promise (et le montant si vous le connaissez). Ajoutez un court commentaire.',
            'L’appel est enregistré dans le journal des relances.',
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
            { term: 'Encaisser', text: 'Réservé aux admins qui ont le droit d’enregistrer des versements depuis le calendrier.' },
            { term: 'Montants masqués', text: 'L’agent de recouvrement relance les membres sans voir les sommes en jeu.' },
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
            {
              question: 'Pourquoi je ne vois pas le bouton d’encaissement ?',
              answer: 'Il faut le droit d’encaisser depuis le calendrier ; demandez-le au super admin.',
            },
          ],
        },
      ],
    },
  ],
}

export const bilansFinanciersHelp: HelpTopic = {
  key: 'bilans-financiers',
  title: 'Bilans financiers',
  category: 'Pilotage',
  superAdminOnly: true,
  summary: 'Le bilan de l’association mois par mois (trésorerie, résultat, encours et risques de chaque module) et le bilan de chaque membre, exportables en Excel ou PDF.',
  pages: [{ path: '/bilans-financiers', label: 'Bilans financiers', summary: 'Générer le bilan d’une période, le lire module par module et l’exporter.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Le bilan rassemble les chiffres de tous les modules sur la période choisie, avec une colonne par mois. La synthèse donne la vue d’ensemble ; chaque onglet détaille un module.',
        },
        {
          type: 'definitions',
          items: [
            { term: 'Trésorerie', text: 'L’argent réellement entré et sorti chaque mois.' },
            { term: 'Résultat', text: 'Ce que l’association gagne (intérêts perçus, pénalités, adhésions…) moins ce qu’elle paie (bonus, commissions, pertes).' },
            { term: 'Encours et créances', text: 'À la fin de chaque mois : ce que les membres doivent encore, et ce que l’association doit rendre (épargne, capitaux des placements).' },
            { term: 'Pertes et risques', text: 'Le manque à gagner généré par les échéances déjà arrivées, les pertes comptables des crédits clôturés en perte, les pénalités impayées et les échéances en retard. Les mois futurs ne sont pas comptés.' },
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Générer et lire un bilan',
          items: [
            'Choisissez une période toute faite (3, 6, 12 derniers mois, année en cours, année précédente) ou un intervalle de mois, puis « Générer le bilan ».',
            'Passez d’un onglet à l’autre : Synthèse, puis un onglet par module.',
            'L’interrupteur « Afficher les explications des lignes » montre ou masque le sens de chaque ligne.',
          ],
        },
        {
          type: 'steps',
          title: 'Bilan d’un membre',
          items: [
            'Dans « Bilan d’un membre », cherchez le membre par nom, prénom ou matricule.',
            'Choisissez « Toute la période » (de sa première opération jusqu’au mois en cours) ou un intervalle de mois, puis « Préparer le bilan ».',
            'Un résumé s’affiche : ce qu’il a versé et reçu, son reste dû et ce que l’association doit lui rendre.',
            '« Afficher dans la page » ouvre son bilan à la place de celui de l’association ; « Télécharger » l’exporte en Excel ou en PDF.',
          ],
        },
        {
          type: 'steps',
          title: 'Exporter',
          items: [
            'Cliquez sur « Exporter (Excel ou PDF) ».',
            'Choisissez le format, le niveau d’explication (complet, minimal ou sans texte), les onglets et les parties à inclure.',
            'Vos choix sont retenus pour le prochain export.',
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
            { term: 'Total / fin', text: 'La somme des mois pour un montant du mois ; la valeur à la fin de la période pour un montant « fin de mois ».' },
            { term: 'Épargne et capitaux', text: 'Ce sont des fonds à rendre : ils entrent en trésorerie mais pas dans le résultat.' },
            { term: 'Intérêts perçus', text: 'Crédit spécial : un versement paie au plus les intérêts de son mois. Crédits fixe et aide : l’intérêt unique est réparti au prorata des versements.' },
            { term: 'Reste dû', text: 'Montant prêté + intérêts arrivés à échéance − versements ; nul dès qu’un contrat est soldé, clos ou clôturé en perte.' },
            { term: 'Période', text: '36 mois au plus, sans mois futur. Le bilan est recalculé à chaque génération à partir de toutes les données.' },
            { term: 'Bilan d’un membre', text: 'Les mêmes calculs, sur ses seuls contrats : caisses, crédits dont il est le client (avec les commissions versées à leurs garants), placements et adhésion. Seuls les modules où il a une opération apparaissent. Jusqu’à 120 mois.' },
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Les bases de calcul de chaque module sont détaillées sous ses tableaux, et dans les exports complets.',
        },
      ],
    },
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            {
              question: 'Pourquoi la trésorerie et le résultat sont-ils si différents ?',
              answer: 'Parce que l’épargne des membres et les capitaux des placements font entrer beaucoup d’argent sans être un gain. À l’inverse, des intérêts produits mais pas encore payés sont un gain attendu, pas de l’argent reçu.',
            },
            {
              question: 'Les chiffres du bilan diffèrent du tableau de bord : lequel croire ?',
              answer: 'À date et avec le même périmètre de membres, les montants financiers vérifiés utilisent le même moteur et doivent correspondre. Un écart peut venir de la période du bilan, d’un filtre du tableau de bord ou d’une opération enregistrée après l’ouverture de la page ; rechargez puis comparez le même périmètre.',
            },
          ],
        },
      ],
    },
  ],
}

export const utiliserAideHelp: HelpTopic = {
  key: 'utiliser-aide',
  title: 'Prise en main et centre d’aide',
  category: 'Utiliser l’aide',
  summary: 'Les premiers repères pour travailler sans erreur, comprendre la navigation et trouver l’aide détaillée de chaque section.',
  pages: [{ path: '/aide', label: 'Centre d’aide', summary: 'Toutes les fiches d’aide, avec une recherche.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'list',
          items: [
            'Le menu latéral ne montre que les sections autorisées pour votre compte. Sur téléphone, ouvrez-le avec le bouton de navigation.',
            'Le bouton « Aide », en haut de chaque page, ouvre la fiche de la page où vous êtes, sans la quitter.',
            'Le centre d’aide (menu Système) regroupe toutes les fiches. La recherche trouve un mot dans toutes les fiches, avec ou sans accents.',
            'Chaque fiche suit le même plan : à quoi sert la section, pas à pas, règles et calculs, statuts, questions fréquentes.',
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Vous ne voyez que les fiches des sections auxquelles vous avez accès.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Première connexion',
          items: [
            'Connectez-vous avec les identifiants remis par le super admin et remplacez le mot de passe temporaire si la plateforme le demande.',
            'Vérifiez votre nom et votre rôle dans l’en-tête, puis parcourez le menu disponible : il correspond à vos accès.',
            'Ouvrez le tableau de bord pour prendre connaissance des priorités, puis la section liée à votre mission.',
            'Utilisez le bouton « Aide » de la page avant une opération que vous ne connaissez pas.',
          ],
        },
        {
          type: 'steps',
          title: 'Traiter une opération en sécurité',
          items: [
            'Retrouvez d’abord la bonne personne par nom et matricule, puis vérifiez le contrat, le statut et les montants.',
            'Pour un paiement, contrôlez la date, l’heure, le moyen, les frais éventuels, l’agent collecteur et la preuve avant de valider.',
            'Téléchargez ou remettez le reçu lorsque l’opération en produit un.',
            'Relisez la fiche après validation et vérifiez que le statut, le montant payé et le reste dû ont bien changé.',
          ],
        },
        {
          type: 'steps',
          title: 'Trouver une réponse',
          items: [
            'Depuis une page, ouvrez son aide contextuelle pour obtenir directement la fiche correspondante.',
            'Dans le centre d’aide, recherchez un mot précis : pénalité, remboursement, lot d’appels, manque à gagner, permission…',
            'Consultez les règles et les statuts avant les questions fréquentes : ils expliquent souvent pourquoi une action est indisponible.',
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
            { term: 'Matricule', text: 'Identifiant unique à utiliser pour distinguer deux personnes portant le même nom.' },
            { term: 'Statut', text: 'État du dossier ou du contrat. Il détermine les actions encore possibles.' },
            { term: 'Preuve', text: 'Photo ou document justifiant un paiement, une remise de fonds ou une restitution.' },
            { term: 'Permission', text: 'Droit accordé à votre compte pour consulter ou réaliser une action. Voir une page ne signifie pas pouvoir tout y faire.' },
            { term: 'Journalisation', text: 'Traçabilité des actions sensibles : auteur, date, section et description.' },
          ],
        },
        {
          type: 'note',
          tone: 'warning',
          text: 'Ne validez jamais une opération financière sur la seule base du nom. Vérifiez le matricule, le contrat, la période et la preuve ; une correction doit rester exceptionnelle et motivée.',
        },
      ],
    },
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Je ne vois pas une section ou un bouton.', answer: 'Votre compte n’a probablement pas l’accès ou la permission correspondante. Rechargez votre session puis demandez au super admin de vérifier Accès & permissions.' },
            { question: 'Une page semble afficher une ancienne valeur.', answer: 'Rechargez la page : certains indicateurs restent quelques minutes en mémoire. Vérifiez aussi les filtres actifs et la période.' },
            { question: 'J’ai validé une mauvaise opération.', answer: 'N’enregistrez pas une deuxième opération pour compenser sans vérifier la règle du module. Prévenez un super admin, conservez la preuve et utilisez uniquement l’action de modification ou d’annulation prévue.' },
            { question: 'L’aide ne répond pas à mon cas.', answer: 'Notez la page, le contrat ou matricule concerné, l’action tentée et le message affiché, puis transmettez ces éléments à l’assistance sans partager de mot de passe.' },
          ],
        },
      ],
    },
  ],
}
