import type { HelpTopic } from '../entities/help.types'

export const caisseImprevueHelp: HelpTopic = {
  key: 'caisse-imprevue',
  title: 'Caisse imprévue',
  category: 'Épargne',
  summary:
    'Une épargne mensuelle selon un forfait, qui ouvre droit à un support (une avance) en cas d’imprévu, et se récupère à la fin ou en retrait anticipé.',
  pages: [
    { path: '/caisse-imprevue/demandes', label: 'Demandes', summary: 'Recevoir les demandes d’adhésion à la caisse imprévue, les accepter et les convertir en contrat.' },
    { path: '/caisse-imprevue/settings', label: 'Forfaits', summary: 'Gérer les forfaits : montant mensuel, durée, plafonds du support, pénalités.' },
    { path: '/caisse-imprevue', label: 'Contrats', summary: 'Suivre les contrats : versements, supports, retraits et remboursements.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Chaque membre choisit un forfait et verse chaque mois (ou chaque jour) le montant prévu. Après 3 mois payés, il peut demander un support pour faire face à un imprévu. L’épargne lui est rendue à la fin du contrat.',
        },
        {
          type: 'definitions',
          items: [
            { term: 'Forfait', text: 'Code et libellé, montant mensuel, somme nominale à atteindre, durée, montants minimum et maximum du support, taux de pénalité et délai de grâce.' },
            { term: 'Fréquence', text: 'Mensuelle ou journalière : les versements journaliers remplissent le montant du mois.' },
            { term: 'Support', text: 'Une avance accordée au membre, qu’il rembourse ensuite.' },
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'De la demande au contrat',
          items: [
            'Enregistrez la demande du membre, puis acceptez-la ou refusez-la (une demande refusée peut être réouverte).',
            'Convertissez la demande acceptée en contrat : forfait, fréquence, date du premier versement, contact d’urgence.',
            'Validez le document signé envoyé par le membre, ou téléversez-le.',
          ],
        },
        {
          type: 'steps',
          title: 'Enregistrer un versement',
          items: [
            'Ouvrez le contrat et choisissez le mois.',
            'Saisissez la date, l’heure, le montant, le moyen de paiement et la preuve.',
            'Un versement plus grand que le mois est réparti automatiquement sur les mois suivants.',
          ],
        },
        {
          type: 'steps',
          title: 'Accorder un support',
          items: [
            'Le membre doit avoir au moins 3 mois payés et aucun support en cours.',
            'Enregistrez la demande de support (montant dans les limites du forfait, motif, document signé), puis validez-la.',
            'Le support est remboursé par le versement suivant, qui doit couvrir tout le reste du support : la part qui dépasse va à l’épargne du mois.',
          ],
        },
        {
          type: 'steps',
          title: 'Retrait anticipé ou remboursement final',
          items: [
            'Retrait anticipé : le contrat doit être actif, avec au moins un versement.',
            'Remboursement final : toutes les échéances doivent être payées.',
            'Dans les deux cas : demande, validation, puis paiement avec la preuve. Une seule demande en cours à la fois.',
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
            { term: 'Éligibilité au support', text: 'Au moins 3 mois entièrement payés, et aucun support encore actif.' },
            { term: 'Versements bloqués', text: 'Tant qu’un support est actif, un versement doit d’abord le rembourser en entier ; un montant inférieur est refusé.' },
            { term: 'Plafond d’un versement', text: 'Un versement ne peut pas dépasser ce que le contrat peut encore recevoir jusqu’à son terme.' },
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Comme la caisse spéciale, l’épargne de la caisse imprévue est à rendre : elle n’est pas un gain pour l’association. Un support est une avance, comptée comme somme due tant qu’il n’est pas remboursé.',
        },
      ],
    },
    {
      kind: 'statuses',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Actif', text: 'Contrat en cours.' },
            { term: 'Terminé', text: 'Contrat arrivé à son terme.' },
            { term: 'Annulé', text: 'Contrat annulé.' },
            { term: 'Support en attente / actif / remboursé / refusé', text: 'Les étapes d’un support, de la demande au remboursement complet.' },
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
              question: 'Pourquoi un versement est-il refusé ?',
              answer: 'Soit un support est en cours et le montant ne suffit pas à le rembourser, soit le montant dépasse ce que le contrat peut encore recevoir.',
            },
            {
              question: 'Un membre peut-il avoir deux supports en même temps ?',
              answer: 'Non : un nouveau support n’est possible qu’une fois le précédent remboursé.',
            },
          ],
        },
      ],
    },
  ],
}
