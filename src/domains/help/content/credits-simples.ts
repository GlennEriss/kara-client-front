import type { HelpSection, HelpTopic } from '../entities/help.types'

/** Parcours commun aux crédits à intérêt unique (fixe et aide). */
const commonHowTo = (base: string, canExtend: boolean): HelpSection => ({
  kind: 'howto',
  blocks: [
    {
      type: 'steps',
      title: 'Simuler un crédit',
      items: [
        `Dans ${base} › Simulation, choisissez « Simulation standard » (mensualités égales sur une durée) ou « Simulation personnalisée » (montant libre pour chaque mois).`,
        'Saisissez le montant, le taux et la durée : l’échéancier, le total à rembourser et l’intérêt s’affichent.',
        'Exportez la simulation en PDF ou partagez-la par WhatsApp si besoin.',
      ],
    },
    {
      type: 'steps',
      title: 'De la demande au contrat',
      items: [
        'Dans Demandes, enregistrez la demande du membre (montant, mensualité souhaitée, garant, motif).',
        'Approuvez ou rejetez la demande, avec un motif obligatoire.',
        'Sur une demande approuvée, « Créer le contrat » ouvre la simulation, puis les étapes : récapitulatif, contact d’urgence, moyen de paiement (lieu et date de remise), confirmation.',
        'Téléversez le contrat signé : le contrat devient « Actif ».',
      ],
    },
    {
      type: 'steps',
      title: 'Suivre et clôturer le contrat',
      items: [
        'Enregistrez chaque versement depuis l’échéancier de la fiche du contrat (« Payer »).',
        'Quand tout est remboursé : « Remboursement final » (le contrat devient « Déchargé »), puis la quittance signée, puis « Clôturer le contrat ».',
        ...(canExtend ? ['« Augmenter le crédit » ajoute un montant au contrat ; un seul rajout est autorisé.'] : []),
      ],
    },
  ],
})

const COMMON_STATUSES = [
  { term: 'En attente', text: 'Contrat créé, en attente du contrat signé.' },
  { term: 'Actif / Partiel', text: 'Contrat signé ; « Partiel » dès le premier versement.' },
  { term: 'Déchargé', text: 'Tout est remboursé, en attente de la quittance signée et de la clôture.' },
  { term: 'Clos', text: 'Contrat terminé.' },
  { term: 'Clôturé en perte', text: 'Le reste dû a été abandonné par le super admin.' },
]

const statusesSection = (extra: Array<{ term: string; text: string }> = []): HelpSection => ({
  kind: 'statuses',
  blocks: [{ type: 'definitions', items: [...COMMON_STATUSES, ...extra] }],
})

export const creditFixeHelp: HelpTopic = {
  key: 'credit-fixe',
  title: 'Crédit fixe',
  category: 'Crédits',
  summary: 'Prêts à intérêt unique, remboursés en mensualités sur 14 mois au plus.',
  pages: [
    { path: '/credit-fixe/simulation', label: 'Simulation', summary: 'Calculer l’échéancier d’un crédit fixe : intérêt unique, mensualités et total à rembourser.' },
    { path: '/credit-fixe/demandes', label: 'Demandes', summary: 'Enregistrer, approuver ou rejeter les demandes, puis créer le contrat.' },
    { path: '/credit-fixe/contrats', label: 'Contrats', summary: 'Suivre les contrats de crédit fixe : versements, retards, clôture.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Le crédit fixe est un prêt dont l’intérêt est calculé une seule fois, au départ : le membre rembourse le montant plus cet intérêt, en mensualités, sur la durée convenue.',
        },
      ],
    },
    commonHowTo('Crédit Fixe', true),
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Intérêt unique', text: 'Montant × taux (jusqu’à 50 %), appliqué une fois. Total à rembourser = montant + intérêt.' },
            { term: 'Durée', text: 'De 1 à 14 mois ; montant de 1 000 à 10 000 000 FCFA.' },
            { term: 'Manque à gagner', text: '10 % du reste dû pour chaque mois au-delà de la durée prévue, tant que le contrat n’est pas soldé.' },
            { term: 'Rajout', text: 'Un seul rajout par contrat, sur un contrat actif ou partiel sans pénalité impayée.' },
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Le crédit fixe n’a ni intérêts mensuels, ni partie fixe, ni mois de repos, ni commission de garant. Aucune pénalité de retard n’est calculée : un retard se mesure par le manque à gagner.',
        },
      ],
    },
    statusesSection(),
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            {
              question: 'Quelle différence avec le crédit spécial ?',
              answer: 'Au crédit spécial, les intérêts sont recalculés chaque mois sur ce qui reste dû. Au crédit fixe, l’intérêt est calculé une fois, au départ, et ne change plus.',
            },
            {
              question: 'Le membre paie après la fin prévue : que se passe-t-il ?',
              answer: 'Le contrat reste ouvert jusqu’au remboursement complet, et un manque à gagner de 10 % du reste dû est compté pour chaque mois de dépassement.',
            },
          ],
        },
      ],
    },
  ],
}

export const creditAideHelp: HelpTopic = {
  key: 'credit-aide',
  title: 'Crédit aide (Caisse aide)',
  category: 'Crédits',
  summary: 'Petits prêts d’aide à intérêt unique (5 % au plus), remboursés en 3 mois au plus.',
  pages: [
    { path: '/credit-aide/simulation', label: 'Simulation', summary: 'Calculer l’échéancier d’un crédit aide sur 3 mois au plus.' },
    { path: '/credit-aide/demandes', label: 'Demandes', summary: 'Enregistrer, approuver ou rejeter les demandes de crédit aide, puis créer le contrat.' },
    { path: '/credit-aide/contrats', label: 'Contrats', summary: 'Suivre les contrats de crédit aide jusqu’au remboursement ou à la transformation.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Le crédit aide (menu « Caisse Aide ») dépanne un membre sur une courte durée : un intérêt unique et faible, et un remboursement en 3 mois au plus.',
        },
      ],
    },
    commonHowTo('Caisse Aide', false),
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Intérêt unique', text: 'Montant × taux (5 % au plus), appliqué une fois au départ.' },
            { term: 'Durée', text: '3 mois au plus.' },
            {
              term: 'Transformation',
              text: 'Si, au 3e mois, il reste une somme à payer, le contrat passe au statut « Transformé » : le solde restant est à reprendre en crédit spécial.',
            },
            { term: 'Manque à gagner', text: '10 % du reste dû pour chaque mois au-delà de la durée prévue.' },
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Pas de rajout, pas de mois de repos, pas de commission de garant, et aucune pénalité de retard calculée sur le crédit aide.',
        },
      ],
    },
    statusesSection([
      { term: 'Transformé', text: 'Le crédit n’était pas soldé au 3e mois : le reste est à transformer en crédit spécial.' },
    ]),
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            {
              question: 'Un contrat transformé est-il repris automatiquement en crédit spécial ?',
              answer: 'Non. Le statut « Transformé » signale le solde à reprendre ; le nouveau crédit spécial se crée par une demande, comme les autres.',
            },
          ],
        },
      ],
    },
  ],
}
