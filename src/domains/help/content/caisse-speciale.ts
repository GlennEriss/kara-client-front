import type { HelpTopic } from '../entities/help.types'

export const caisseSpecialeHelp: HelpTopic = {
  key: 'caisse-speciale',
  title: 'Caisse spéciale',
  category: 'Épargne',
  summary:
    'L’épargne des membres : des versements réguliers sur une durée choisie, rendus à la fin avec un bonus, ou plus tôt en retrait anticipé.',
  pages: [
    { path: '/caisse-speciale/simulation', label: 'Simulation', summary: 'Estimer l’épargne et le bonus d’un contrat avant de le proposer au membre.' },
    { path: '/caisse-speciale/demandes', label: 'Demandes', summary: 'Recevoir les demandes de contrat, les accepter ou les refuser, puis les convertir en contrat.' },
    { path: '/caisse-speciale/settings', label: 'Paramètres', summary: 'Régler, pour chaque type de caisse, le barème des bonus et le taux des pénalités.' },
    { path: '/caisse-speciale', label: 'Contrats', summary: 'Suivre les contrats d’épargne : versements, retards, remboursements.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'La caisse spéciale permet à un membre (ou à un groupe) d’épargner chaque mois. L’association garde cet argent et le lui rend à la fin du contrat, avec un bonus qui récompense la régularité.',
        },
        {
          type: 'definitions',
          items: [
            { term: 'Standard', text: 'Un montant fixe chaque mois.' },
            { term: 'Journalière', text: 'Des versements au jour le jour, par périodes de 30 jours, pour atteindre le montant du mois.' },
            { term: 'Libre', text: 'Des versements de montant libre.' },
            {
              term: 'Types « charitables »',
              text: 'Les mêmes formules, réservées aux membres qui ont contribué à une œuvre de charité (section Bienfaiteur).',
            },
            { term: 'Fiche d’un contrat', text: 'Ses versements mois par mois, ses remboursements et ses documents.' },
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
            'Dans Demandes, enregistrez la demande (« Nouvelle demande ») : membre ou groupe, type de caisse, montant mensuel, durée.',
            'Acceptez ou refusez la demande.',
            'Convertissez la demande acceptée en contrat. Un contrat peut aussi être créé directement depuis la liste des contrats.',
            'Faites signer le contrat et téléversez le document signé.',
          ],
        },
        {
          type: 'steps',
          title: 'Enregistrer un versement',
          items: [
            'Ouvrez le contrat, puis ses versements.',
            'Sur l’échéance du mois, saisissez le montant, la date, l’heure, le moyen de paiement et la preuve.',
            'Une pénalité est calculée automatiquement si le versement arrive après le 3e jour de retard.',
          ],
        },
        {
          type: 'steps',
          title: 'Rendre l’épargne',
          items: [
            'Remboursement final : quand toutes les échéances sont payées, demandez le remboursement final, faites-le valider, puis marquez-le payé avec la preuve.',
            'Retrait anticipé : avant la fin, le retrait est traité immédiatement. Le contrat est clos et le membre reçoit son épargne et le bonus acquis.',
            'Une demande de remboursement en attente ou approuvée peut être annulée, avec un motif.',
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
            {
              term: 'Retard et pénalités',
              text: 'Jusqu’à 3 jours de retard : aucune pénalité. Du 4e au 12e jour : pénalité = taux journalier des paramètres × montant mensuel × jours de retard. Au-delà de 12 jours, le contrat est considéré en défaut.',
            },
            {
              term: 'Bonus',
              text: 'À partir du 4e mois, selon le barème des paramètres du type de caisse. Le bonus porte sur les mois réellement payés, et il est figé au dernier mois payé à l’heure si un mois reste impayé.',
            },
            { term: 'Pénalités et bonus', text: 'Les pénalités sont retirées du bonus, jamais de l’épargne elle-même.' },
            { term: 'Remboursement final', text: 'Possible seulement quand toutes les échéances prévues sont payées ; une seule demande à la fois.' },
            { term: 'Retrait anticipé', text: 'Possible dès qu’au moins un versement a été fait ; le contrat est alors clos.' },
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Les versements sont une épargne à rendre : dans les bilans financiers, ils entrent en trésorerie mais ne sont pas un gain. Seules les pénalités sont un produit, et les bonus versés une charge.',
        },
      ],
    },
    {
      kind: 'statuses',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Actif', text: 'Contrat à jour.' },
            { term: 'Retard (J+0..3)', text: 'Échéance dépassée depuis 3 jours au plus : pas encore de pénalité.' },
            { term: 'Retard (J+4..12)', text: 'Échéance dépassée de 4 à 12 jours : des pénalités s’appliquent.' },
            { term: 'Résilié (>J+12)', text: 'Retard de plus de 12 jours.' },
            { term: 'Remboursement final en attente', text: 'Le remboursement final est demandé et doit être traité.' },
            { term: 'Clos', text: 'Contrat terminé, épargne rendue.' },
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
              question: 'Pourquoi le bonus est-il plus faible que prévu ?',
              answer: 'Parce qu’il ne compte que les mois payés, qu’il s’arrête au dernier mois payé à l’heure en cas d’impayé, et que les pénalités en sont retirées.',
            },
            {
              question: 'Où changer le taux des pénalités ou le barème des bonus ?',
              answer: 'Dans Caisse spéciale › Paramètres. Chaque type de caisse a ses propres réglages.',
            },
          ],
        },
      ],
    },
  ],
}
