import type { HelpTopic } from '../entities/help.types'

export const creditSpecialeHelp: HelpTopic = {
  key: 'credit-speciale',
  title: 'Crédit spécial',
  category: 'Crédits',
  summary:
    'Prêts à intérêts mensuels remboursés en 7 mois au plus, avec une partie fixe sans intérêts au-delà. Variantes : crédit en semaines et achat en boutique partenaire.',
  pages: [
    {
      path: '/credit-speciale/simulations',
      label: 'Simulations',
      summary: 'Calculer un échéancier avant toute demande : mensualité, durée, intérêts et commission du garant.',
    },
    {
      path: '/credit-speciale/demandes',
      label: 'Demandes',
      summary: 'Enregistrer les demandes des membres, les approuver ou les rejeter, puis créer le contrat.',
    },
    {
      path: '/credit-speciale/contrats',
      label: 'Contrats',
      summary: 'Suivre les contrats : versements, pénalités, mois de repos, partie fixe, rajout, clôture.',
    },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          text: 'Le crédit spécial est un prêt accordé à un membre, remboursé chaque mois. Les intérêts sont calculés chaque mois sur ce qui reste dû, pendant 7 mois au plus. Le module couvre tout le parcours : simulation, demande, contrat, versements, puis clôture.',
          type: 'text',
        },
        {
          type: 'definitions',
          items: [
            { term: 'Simulations', text: 'Tester un montant et une mensualité, comparer des échéanciers et voir la commission du garant, sans rien enregistrer.' },
            { term: 'Demandes', text: 'La liste des demandes avec leurs filtres (en attente, approuvées, rejetées). Chaque demande a sa fiche détaillée.' },
            {
              term: 'Contrats',
              text: 'La liste des contrats, avec des onglets : Tous, Actif, Mois en cours, Partie fixe, Clos, En perte, Retard. Les statistiques en haut résument le portefeuille.',
            },
            {
              term: 'Fiche d’un contrat',
              text: 'Les chiffres clés (montant versé, reste dû, intérêts perçus, pénalités, manque à gagner), l’échéancier, et les onglets Versements, Pénalité, Historique, Manque à gagner et Commission du garant.',
            },
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Enregistrer une demande',
          items: [
            'Dans Demandes, cliquez sur « Nouvelle demande ».',
            'Choisissez le membre, le type de crédit, le montant, la mensualité souhaitée, la date souhaitée et le motif.',
            'Choisissez le garant parmi les membres. Si le garant n’est pas connu, utilisez le bouton « Contact inconnu » : aucune commission ne lui sera versée.',
            'Validez : la demande est « En attente ».',
          ],
        },
        {
          type: 'steps',
          title: 'Approuver une demande et créer le contrat',
          items: [
            'Ouvrez la demande, puis « Approuver la demande ». Le motif de la décision est obligatoire.',
            'Cliquez sur « Créer le contrat » : la simulation s’ouvre. Choisissez l’échéancier, puis « Utiliser cette simulation ».',
            'Suivez les étapes : récapitulatif, rémunération du garant (si c’est un membre), contact d’urgence, moyen de paiement, avec le lieu et la date de remise de l’argent, puis confirmation.',
            'Le contrat est créé « En attente ». Téléversez le contrat signé depuis la liste ou la fiche : le contrat devient « Actif ».',
          ],
        },
        {
          type: 'steps',
          title: 'Enregistrer un versement',
          items: [
            'Dans la fiche du contrat, sur l’échéance « À payer », cliquez sur « Payer ».',
            'Saisissez la date, l’heure, le montant et le moyen de paiement, puis joignez la preuve.',
            'Si le membre n’a rien versé ce mois-là, saisissez 0 : c’est une « déclaration à 0 FCFA », sans moyen de paiement.',
            'Les pénalités éventuelles sont calculées automatiquement (voir Règles et calculs).',
          ],
        },
        {
          type: 'steps',
          title: 'Accorder un mois de repos',
          items: [
            'Sur l’échéance due, cliquez sur « Mois de repos » et indiquez le motif (maladie, force majeure…).',
            'Le mois ne produit ni intérêt ni commission, la dette ne bouge pas, et le mois ne compte pas dans les 7 mois de la partie spéciale.',
          ],
        },
        {
          type: 'steps',
          title: 'Clôturer un contrat remboursé',
          items: [
            'Quand le reste dû est à 0, cliquez sur « Remboursement final » et saisissez le motif : le contrat devient « Déchargé ».',
            'Générez la quittance, faites-la signer, puis téléversez la quittance signée (PDF de 5 Mo au plus).',
            'Cliquez sur « Clôturer le contrat » avec un motif : le contrat devient « Clos ».',
          ],
        },
        {
          items: [
            '« Augmenter le crédit » (rajout) : ajoute un montant au contrat. Le reste dû et le rajout forment un nouveau cycle, qui repart à M1. Un seul rajout par contrat, possible seulement sur un contrat actif ou partiel, sans pénalité impayée.',
            '« Basculer en fixe » : arrête les intérêts dès la prochaine échéance, avec un motif. Irréversible.',
            '« Clôturer en perte » (super admin) : quand le membre ne remboursera plus, le reste dû est enregistré comme perte. Les sommes récupérées ensuite se saisissent comme récupérations.',
            '« Enregistrer un paiement au garant » : verser au garant les commissions gagnées, depuis l’onglet Commission du garant.',
          ],
          type: 'list',
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
              term: 'Intérêts',
              text: 'Chaque mois, le taux du contrat s’applique à ce qui reste dû au début du mois. Si un mois n’est pas entièrement payé, ce qui manque, intérêts compris, s’ajoute à la dette et produit des intérêts le mois suivant.',
            },
            {
              term: 'Partie spéciale et partie fixe',
              text: 'Les 7 premiers mois (hors mois de repos) forment la partie spéciale, avec intérêts. À partir du 8e mois, ou plus tôt en cas de basculement manuel, le contrat est en partie fixe : plus d’intérêts, le membre rembourse ce qui reste.',
            },
            {
              term: 'Intérêts perçus',
              text: 'Un versement paie au plus les intérêts de son mois. Les intérêts d’un mois impayé passent dans le reste dû : quand le membre les rembourse plus tard, ils comptent comme du capital.',
            },
            {
              term: 'Pénalités de retard',
              text: 'Intérêts du mois × jours de retard ÷ 30. Aucune pénalité jusqu’à 3 jours de retard ; au-delà, tous les jours comptent. Un retard déjà constaté reste toléré pour les mois suivants du cycle (échéance glissante). La pénalité naît quand le versement en retard est enregistré.',
            },
            {
              term: 'Commission du garant',
              text: 'Si le garant est un membre identifié : son taux (2 % proposé, de 0 à 5 %) × le reste dû au début de chaque mois de la partie spéciale. Garant inconnu : 0 % par défaut.',
            },
            {
              term: 'Manque à gagner',
              text: 'Les intérêts que l’association ne touche pas sur les échéances déjà arrivées en partie fixe : taux du contrat × dette au début du mois. Les mois futurs ne sont pas comptés.',
            },
            {
              term: 'Crédit en semaines',
              text: 'De 1 à 3 semaines, une seule échéance. Le taux s’applique une fois ; ni partie fixe, ni mois de repos, ni rajout.',
            },
            {
              term: 'Achat en boutique',
              text: 'Achat chez une boutique partenaire remboursé en 2 ou 3 mensualités égales, avec un taux appliqué une fois. L’association paie le vendeur, moins la remise de la boutique.',
            },
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Une déclaration à 0 FCFA enregistrée à temps ne crée pas de pénalité : elle dit seulement que rien n’a été versé ce mois-là. Les intérêts, eux, continuent de courir.',
        },
      ],
    },
    {
      kind: 'statuses',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'En attente (demande)', text: 'La demande attend une décision.' },
            { term: 'Approuvée / Rejetée', text: 'Décision prise, avec son motif. Une demande rejetée peut être réouverte.' },
            { term: 'En attente (contrat)', text: 'Contrat créé, en attente du contrat signé.' },
            { term: 'Actif', text: 'Contrat signé, aucun versement encore enregistré.' },
            { term: 'Partiel', text: 'Contrat en cours de remboursement.' },
            { term: 'En retard / Bloqué', text: 'Échéance dépassée, ou contrat bloqué à cause de pénalités impayées.' },
            { term: 'Déchargé', text: 'Reste dû à 0, remboursement final validé. En attente de la quittance signée et de la clôture.' },
            { term: 'Clos', text: 'Contrat terminé et archivé.' },
            { term: 'Clôturé en perte', text: 'Le reste dû a été abandonné ; seules des récupérations peuvent encore être saisies.' },
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
              question: 'Pourquoi des intérêts alors que le membre n’a rien versé ?',
              answer: 'Les intérêts dépendent de ce que le membre doit, pas de ce qu’il paie. Un mois impayé produit quand même des intérêts, qui s’ajoutent à la dette. Seuls le mois de repos et la partie fixe arrêtent les intérêts.',
            },
            {
              question: 'Pourquoi le reste dû dépasse-t-il le montant emprunté ?',
              answer: 'Parce que des intérêts impayés se sont ajoutés à la dette pendant la partie spéciale.',
            },
            {
              question: 'Quelle différence entre « Échéances payées » et le nombre de versements ?',
              answer: 'Le compteur « Échéances payées » ne compte que les mois où de l’argent a été versé. Une déclaration à 0 FCFA n’en fait pas partie.',
            },
            {
              question: 'Où voir les contrats qui ne produisent plus d’intérêts ?',
              answer: 'Dans l’onglet « Partie fixe » de la liste des contrats, qui ne montre que les contrats non clôturés.',
            },
          ],
        },
      ],
    },
  ],
}
