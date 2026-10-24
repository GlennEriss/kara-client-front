import type { HelpTopic } from '../entities/help.types'

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
            'La liste des versements en retard montre, pour chaque membre, le montant dû, l’échéance la plus ancienne et le dernier contact.',
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
  summary: 'Le bilan de l’association mois par mois : trésorerie, résultat, encours et risques de chaque module, exportable en Excel ou PDF.',
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
            { term: 'Pertes et risques', text: 'Manque à gagner, pertes constatées, pénalités impayées, échéances en retard.' },
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
              answer: 'Le bilan recalcule tout à partir des versements et de l’historique des contrats, mois par mois. Le tableau de bord additionne certaines valeurs enregistrées. Un écart signale souvent un versement modifié après sa saisie.',
            },
          ],
        },
      ],
    },
  ],
}

export const utiliserAideHelp: HelpTopic = {
  key: 'utiliser-aide',
  title: 'Utiliser l’aide',
  category: 'Utiliser l’aide',
  summary: 'Comment trouver de l’aide sur la plateforme : le bouton Aide de chaque page et ce centre d’aide.',
  pages: [{ path: '/aide', label: 'Centre d’aide', summary: 'Toutes les fiches d’aide, avec une recherche.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'list',
          items: [
            'Le bouton « Aide », en haut de chaque page, ouvre la fiche de la page où vous êtes, sans la quitter.',
            'Le centre d’aide (menu Système) regroupe toutes les fiches. La recherche trouve un mot dans toutes les fiches, avec ou sans accents.',
            'Chaque fiche suit le même plan : à quoi sert la section, pas à pas, règles et calculs, statuts, questions fréquentes.',
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Les fiches sont rédigées section par section : les modules financiers d’abord, les autres pages ensuite. Une page sans fiche renvoie vers ce centre d’aide.',
        },
      ],
    },
  ],
}
