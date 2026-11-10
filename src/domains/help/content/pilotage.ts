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
            { term: 'Top 10 des membres par section', text: 'Les caisses classent les 10 membres ayant le plus versé et les 10 plus grosses épargnes détenues. Les crédits distinguent les remboursements reçus, les restes à rembourser et les retards les plus importants par membre. Les placements classent les capitaux confiés et ceux restant à restituer. Plusieurs contrats d’un membre sont additionnés ; les dossiers de groupe sont exclus de ces tops de membres. Ces montants ne mesurent pas automatiquement un bénéfice de KARA.' },
            { term: 'Membres récents', text: 'L’onglet Exécutif présente les 10 membres les plus récents de la période : date d’approbation de l’adhésion si elle est disponible, sinon date de création de la fiche, avec une mention explicite. Chaque section financière présente aussi les 10 dernières souscriptions de membres, hors brouillons et demandes non finalisées. Les dates sont affichées à l’heure de Libreville et un membre apparaît une seule fois, avec son dernier dossier dans la période choisie.' },
            { term: 'Période des classements', text: 'Les versements, remboursements et capitaux confiés suivent leurs dates réelles, dans la période choisie à l’heure de Libreville, même si le contrat a été créé auparavant. Plusieurs contrats d’une même personne sont regroupés. Les encours, épargnes détenues et retards montrent la situation à ce jour, sans être limités à la date de création des contrats ; les filtres de type de membre et de zone restent appliqués.' },
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
          type: 'steps',
          title: 'Lire les classements',
          items: [
            'Dans chaque onglet, descendez jusqu’aux classements. Le titre, l’explication et l’unité précisent ce qui est comparé ; les rangs indiquent l’ordre décroissant des montants ou effectifs.',
            'Pour les caisses, crédits et placements, choisissez la période pour comparer les versements réalisés. Les classements des encours et retards restent une vue actuelle, expliquée sous leur titre.',
            'Cliquez sur un membre pour ouvrir sa fiche. Les retards sont regroupés par membre avec le nombre de contrats concernés. Les classements des groupes ouvrent les groupes ; les classements existants des administrateurs, collecteurs, métiers et zones restent disponibles.',
            'Dans « Membres les plus récents » ou « Dernières souscriptions », l’ordre est chronologique décroissant et la date remplace le montant. Les filtres de période, de type de membre et de zone restent appliqués.',
            'Un classement vide signifie qu’aucune opération ou aucun dossier ne correspond ; les montants nuls ne sont pas ajoutés aux tops financiers.',
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
            'Le bouton « Payer » ouvre directement le bon onglet, le bon mois et l’échéance concernée. Lorsqu’un membre a plusieurs retards, développez sa ligne pour choisir précisément l’échéance à régler.',
            'Les boutons « Ouvrir le contrat » ou « Ouvrir le placement » permettent de retrouver le dossier depuis les retards, les versements à venir, le panneau d’une échéance et les remises d’argent. Si une personne a plusieurs contrats en retard, développez sa ligne pour choisir le contrat exact.',
            'Le tableau « Versements à venir » anticipe les échéances sur 7, 30, 60 ou 90 jours. Il permet de prévenir le membre sur WhatsApp, d’ouvrir l’échéance et d’exporter la prévision dans Excel.',
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
            'Vous pouvez aussi cliquer sur « Payer » dans les versements en retard : l’échéance exacte s’ouvre automatiquement.',
            'Avec un accès de consultation uniquement, le bouton « Échéance » ouvre le détail sans autoriser l’enregistrement d’un paiement.',
          ],
        },
        {
          type: 'steps',
          title: 'Prévenir avant une échéance',
          items: [
            'Dans « Versements à venir », choisissez l’horizon souhaité : 7, 30, 60 ou 90 jours.',
            'Cliquez sur « Prévenir » pour ouvrir WhatsApp avec le membre, le montant et la date déjà renseignés.',
            'Cliquez sur « Échéance » pour contrôler le détail. Le message envoyé est ajouté à l’historique des contacts.',
            'Les textes des préavis peuvent être personnalisés dans Système → Modèles de messages.',
          ],
        },
        {
          type: 'steps',
          title: 'Configurer les accès au calendrier',
          items: [
            'Dans Administration, ouvrez la fiche du compte et la partie « Accès & permissions ».',
            'Dans Calendrier, cochez « Consulter les échéances et versements » pour autoriser le suivi et les relances.',
            'Cochez « Ouvrir les contrats depuis le calendrier » pour afficher les liens vers les dossiers. Accordez également « Consulter » dans chaque section concernée : caisse, crédit ou placement.',
            'Cochez séparément « Encaisser depuis le calendrier » pour autoriser l’enregistrement des paiements. La consultation et les liens vers les contrats ne donnent pas ce droit.',
            'Enregistrez la fiche. Les superadmins disposent de tous les accès ; les autres comptes suivent les permissions accordées.',
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
            { term: 'Encaisser', text: 'Nécessite les droits « Consulter les échéances et versements » et « Encaisser depuis le calendrier ». La date, le montant, le moyen de paiement et la preuve sont confirmés lors de l’enregistrement.' },
            { term: 'Ouvrir un contrat', text: 'Nécessite le droit « Ouvrir les contrats depuis le calendrier » et le droit de consultation de la section du contrat. Un lien de contrat n’accorde aucun droit de paiement supplémentaire.' },
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
            { term: 'Trésorerie', text: 'Les entrées et sorties enregistrées chaque mois. Les totaux bruts comprennent aussi les affectations internes entre modules, présentées dans les deux sens ; elles ne constituent pas une nouvelle recette.' },
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
            'Cliquez sur un montant ou un nombre pour retrouver les personnes, groupes, contrats et dossiers qui le composent. Un clic dans un mois porte sur ce mois ; un clic dans « Total / fin » porte sur la somme de la période pour un flux, ou sur la valeur finale pour un encours.',
          ],
        },
        {
          type: 'steps',
          title: 'Retrouver les personnes et contrats d’un montant',
          items: [
            'Dans la synthèse ou l’onglet d’un module, cliquez sur la cellule à examiner. Le détail affiche le nom, le matricule ou identifiant, la référence du contrat ou dossier, son statut actuel et sa contribution au montant choisi.',
            'Utilisez la recherche par nom, matricule ou référence. Dans une synthèse couvrant plusieurs modules, filtrez aussi par module. Les garants rémunérés sur les crédits sont indiqués sous le client concerné.',
            'Cliquez sur un nom ou une référence pour ouvrir sa fiche dans un nouvel onglet. Si une ancienne fiche n’existe plus, son identifiant et son montant sont conservés, sans inventer de lien ou de personne.',
            '« Exporter le détail (CSV) » télécharge toutes les lignes correspondant aux filtres, y compris les pages suivantes, avec les colonnes mensuelles. Ce téléchargement complète les exports Excel et PDF du bilan global.',
            'Le détail est recalculé à son ouverture. Si une opération a changé depuis la génération du bilan, un message demande de régénérer le bilan. Un éventuel écart entre arrondis individuels et total global est signalé séparément.',
          ],
        },
        {
          type: 'steps',
          title: 'Consulter tous les contrats et dossiers du bilan',
          items: ['Après génération, cliquez sur « Voir les contrats et dossiers ». La vue reprend le module ouvert ; choisissez « Tous les modules » pour parcourir le bilan entier.', 'Recherchez par nom, matricule ou référence et filtrez par module ou statut. Chaque dossier affiche le membre ou groupe, sa référence, son statut actuel, les personnes associées et ses entrées, sorties et résultat sur la période.', '« Détail mensuel » ouvre les informations du dossier enregistrées (dates, durée, montants selon le type) et les tableaux de trésorerie, résultat, encours et risques calculés pour ce contrat. Les lignes à zéro sont masquées par défaut et peuvent être affichées.', '« Ouvrir la fiche » donne accès au contrat complet. Le bilan conserve aussi les montants d’un ancien contrat disparu, avec la mention Contrat introuvable, sans fabriquer de fiche.', '« Détail complet (CSV) » exporte tous les dossiers filtrés, au-delà de la page affichée, avec chaque indicateur et ses valeurs mensuelles. Un encours correspond à la fin du mois ; il ne faut pas additionner ses mois.'],
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
            'L’option « Inclure les membres et le détail par contrat » est activée par défaut : Excel ajoute les feuilles Contrats et dossiers et Détail par contrat ; PDF ajoute les fiches détaillées des contrats en annexe. Vous pouvez décocher cette option pour exporter seulement les tableaux agrégés.',
            'Les annexes suivent les modules et parties choisis. Si la synthèse est sélectionnée, elles incluent les dossiers de tous les modules qui la composent. Les filtres de recherche de la fenêtre de consultation ne limitent pas cet export global ; utilisez son export CSV pour télécharger seulement les résultats filtrés.',
            'Les dossiers sont relus avant l’export détaillé. Si les montants ont changé depuis la génération, l’export est interrompu avec une invitation à régénérer le bilan, pour ne pas mélanger anciens totaux et nouvelles annexes.',
            'Dans le PDF, les périodes longues sont réparties sur des tableaux de six mois au plus. La dernière colonne reste le total de toute la période, ou la situation à sa fin. Dans Excel, les en-têtes sont figés et les filtres des annexes permettent de retrouver un membre ou un contrat.',
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
            { term: 'Statuts des dossiers', text: 'Les statuts sont présentés en français dans la page et les exports. « En retard avec pénalité » signale un retard avec pénalité appliquée ; « En retard sans pénalité » distingue le retard sans pénalité. « Remboursement final en attente » et « Remboursement anticipé en attente » indiquent les opérations restant à finaliser. Le statut est celui du dossier actuellement, tandis que les chiffres portent sur la période choisie.' },
            { term: 'Total / fin', text: 'La somme des mois pour un montant du mois ; la valeur à la fin de la période pour un montant « fin de mois ».' },
            { term: 'Détail par contrat ou dossier', text: 'Les mêmes moteurs de calcul ventilent la ligne choisie. Les montants négatifs restent visibles, ainsi que les contrats dont le solde est nul sur la période mais qui ont des mouvements mensuels. Le total filtré concerne toutes les pages de résultats, pas seulement la page visible.' },
            { term: 'Épargne et capitaux', text: 'Ce sont des fonds à rendre : ils entrent en trésorerie mais pas dans le résultat.' },
            { term: 'Synthèse, modules et contrats', text: 'Ces vues présentent les mêmes opérations à des niveaux différents. Les contrats expliquent les montants d’un module, et les modules composent la synthèse. Il ne faut pas additionner la synthèse à ses modules ou à ses annexes. Les sous-totaux, totaux et lignes pour information ne s’ajoutent pas une seconde fois aux lignes qu’ils reprennent.' },
            { term: 'Transferts internes', text: 'Une cotisation prise en charge par crédit fixe figure en sortie du crédit et en entrée de la caisse collective. Ces deux mouvements figurent dans les totaux bruts, sans créer de bénéfice supplémentaire. Les intérêts effectivement perçus restent dans le module du crédit.' },
            { term: 'Caisses collectives et redevances', text: 'Les cotisations restent des fonds à remettre aux bénéficiaires. Seule la redevance retenue à la remise effective est une recette de Kara. Pour 50 000 FCFA de caisse et 1 000 FCFA de redevance, le net remis est de 49 000 FCFA ; la retenue ne crée pas une seconde entrée de trésorerie. Les fonds restant à remettre diminuent du montant brut de 50 000 FCFA.' },
            { term: 'Véhicules — Assurances', text: 'Les commissions entrent en trésorerie à la date de réception enregistrée dans Véhicules. Le résultat comprend seulement la part de KARA : commission reçue moins part réservée au parrain. Une commission attendue reste une prévision informative, sans recette ni créance dans la synthèse. La prime d’assurance ne constitue pas une recette.' },
            { term: 'Remise au parrain', text: 'La part du parrain reste dans « Parts restant à reverser » tant que l’administration n’a pas enregistré la remise et sa date. Une notification ou un statut seul ne suffit pas. Le paiement confirmé sort en trésorerie à sa date et diminue la dette, sans être déduit une seconde fois du résultat. Exemple : 20 000 FCFA reçus en octobre, dont 5 000 FCFA pour le parrain, donnent 15 000 FCFA de résultat en octobre ; si la remise est enregistrée en novembre, la sortie de 5 000 FCFA apparaît en novembre.' },
            { term: 'Détail des assurances', text: 'Chaque période initiale ou renouvellement possède une ligne distincte. Le détail retrouve le parrain, le titulaire, la plaque, l’assureur, la police, la période assurée, les montants, les dates et références de réception et de remise, ainsi que le justificatif disponible. Les mêmes chiffres sont repris dans les exports Excel, PDF et CSV. Les commissions des assureurs restent confidentielles et réservées à l’administration.' },
            { term: 'Intérêts perçus', text: 'Crédit spécial : un versement paie au plus les intérêts de son mois. Crédits fixe et aide : l’intérêt unique est réparti au prorata des versements.' },
            { term: 'Garantie LE KARA', text: 'Le garant INCONNU représente LE KARA : aucune commission externe ne lui est due. Les anciennes saisies de commissions sur ce compte technique sont exclues de la trésorerie et du résultat, y compris dans les détails et les exports.' },
            { term: 'Reste dû', text: 'Montant prêté + intérêts arrivés à échéance − versements ; nul dès qu’un contrat est soldé, clos ou clôturé en perte.' },
            { term: 'Période', text: '36 mois au plus, sans mois futur. Le bilan est recalculé à chaque génération à partir de toutes les données.' },
            { term: 'Bilan d’un membre', text: 'Vue réservée à l’administration : mêmes calculs sur ses caisses, crédits dont il est le client (avec les commissions versées à leurs garants), placements, adhésion et opérations collectives. Les assurances sont rattachées au parrain bénéficiaire, avec la part qui lui reste à reverser. Seuls les modules où il a une opération apparaissent. Jusqu’à 120 mois.' },
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
