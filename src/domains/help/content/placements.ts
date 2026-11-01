import type { HelpTopic } from '../entities/help.types'

export const placementsHelp: HelpTopic = {
  key: 'placements',
  title: 'Placements',
  category: 'Placements',
  summary:
    'Les bienfaiteurs confient un capital à l’association pour 1 à 7 mois ; ils touchent des commissions, puis récupèrent leur capital.',
  pages: [
    { path: '/placements/demandes', label: 'Demandes', summary: 'Enregistrer les demandes de placement des bienfaiteurs, les accepter et les convertir en placement.' },
    { path: '/placements', label: 'Placements', summary: 'Suivre les placements : commissions à verser, sorties anticipées, restitution du capital.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Un placement est un capital confié par un bienfaiteur. L’association le rémunère par une commission mensuelle et lui rend le capital au terme convenu.',
        },
        {
          type: 'definitions',
          items: [
            { term: 'Commission mensuelle + capital à la fin', text: 'Une commission est versée chaque mois ; le capital est rendu au terme.' },
            { term: 'Capital + commissions à la fin', text: 'Tout est versé en une fois, au terme : le capital et les commissions.' },
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'De la demande au placement',
          items: [
            'Enregistrez la demande du bienfaiteur : montant, taux, durée (1 à 7 mois), mode de versement, date de début.',
            'Acceptez ou refusez la demande, puis convertissez-la en placement en indiquant la remise des fonds (moyen, lieu, date, heure).',
            'Joignez le contrat signé.',
          ],
        },
        {
          type: 'steps',
          title: 'Verser une commission',
          items: [
            'Dans le placement, ouvrez la commission due.',
            'Saisissez le montant versé, le moyen de paiement et la preuve : la commission passe à « Payée ».',
            'Le calendrier (vue Placements) liste aussi les commissions à verser jour par jour.',
          ],
        },
        {
          type: 'steps',
          title: 'Sortie anticipée',
          items: [
            'À la demande du bienfaiteur, enregistrez la sortie anticipée : date et montant du retrait, moyen de versement, motif, preuve et document signé.',
            'L’application calcule ce qui est dû : le capital, plus une commission mensuelle si au moins un mois complet s’est écoulé depuis le début.',
          ],
        },
        {
          type: 'steps',
          title: 'Clôturer au terme',
          items: [
            'Enregistrez la restitution du capital, avec la quittance finale.',
            'Le placement passe à « Clos ».',
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
            { term: 'Commission', text: 'Montant placé × taux du placement, chaque mois.' },
            {
              term: 'Échéancier',
              text: 'Nouveaux placements : 1re commission un mois après le début (terme échu), fin = début + durée. Placements plus anciens : 1re commission le jour du début.',
            },
            { term: 'Sortie anticipée', text: 'Capital + une commission mensuelle, seulement si un mois complet s’est écoulé.' },
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Le capital reçu n’est pas un gain : il doit être rendu. Dans les bilans, seules les commissions comptent, comme une charge pour l’association.',
        },
      ],
    },
    {
      kind: 'statuses',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Brouillon', text: 'Placement en préparation.' },
            { term: 'Actif', text: 'Fonds reçus, commissions en cours.' },
            { term: 'Clos', text: 'Capital rendu au terme.' },
            { term: 'Sortie anticipée', text: 'Le bienfaiteur a récupéré son capital avant le terme.' },
            { term: 'Annulé', text: 'Placement abandonné.' },
            { term: 'Commission due / payée / partielle', text: 'L’état de chaque commission mensuelle.' },
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
              question: 'Le bienfaiteur sort après trois semaines : touche-t-il une commission ?',
              answer: 'Non. Sans mois complet écoulé, la sortie anticipée rend le capital seul.',
            },
            {
              question: 'Pourquoi le capital reçu n’apparaît-il pas comme un bénéfice ?',
              answer: 'Parce qu’il appartient au bienfaiteur et doit lui être rendu. Il entre en trésorerie et dans les fonds à restituer, mais pas dans le résultat.',
            },
            {
              question: 'Une commission est en retard : où la traiter ?',
              answer: 'Ouvrez le placement depuis la liste ou depuis l’échéance correspondante du calendrier, puis enregistrez le versement et sa preuve.',
            },
          ],
        },
      ],
    },
  ],
}
