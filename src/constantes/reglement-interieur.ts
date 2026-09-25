/**
 * Texte du Règlement Intérieur de la Mutuelle d'Entraide et de Secours Mutuel
 * LE KARA, adopté en Assemblée Générale (Art. 24 des Statuts).
 *
 * Source unique du document : le composant `ReglementInterieurPDF` ne fait que
 * mettre en page ce contenu, dans l'ordre. Toute révision votée en Assemblée
 * Générale se reporte ici — et dans la copie de l'espace membre
 * (kara-members-front/features/statuts/constants/reglement-interieur.ts).
 */

/**
 * Version du texte en vigueur. À incrémenter à chaque révision votée : les
 * membres ayant accepté une version antérieure devront accepter la nouvelle à
 * leur prochaine connexion.
 */
export const REGLEMENT_VERSION = '2026-01'

export const REGLEMENT_ENTETE = {
  association: 'MUTUELLE D\'ENTRAIDE ET DE SECOURS MUTUEL « LE KARA »',
  devise: 'Devise : Intégrité – Solidarité – Dynamisme',
  siege:
    "Siège Social : Awoungou, Commune d'Owendo dans la Province de l'Estuaire en République Gabonaise",
  titre: "RÈGLEMENT INTÉRIEUR DE FONCTIONNEMENT, DE PRÉVOYANCE ET D'ENTRAIDE SOCIALE",
} as const

export const REGLEMENT_SIGNATURE = {
  lieu: 'Owendo (Awoungou)',
  pour: 'Pour le Comité Exécutif :',
  gauche: 'Le Secrétaire Exécutif',
  droiteIntitule: 'Pour la Commission Juridique :',
  droite: 'Le Conseiller Juridique',
  mentionSignature: '(Nom, Prénom et Signature)',
} as const

/** Point numéroté d'un article, avec ses éventuels tirets. */
export interface ReglementPoint {
  texte: string
  puces?: string[]
}

export type ReglementBloc =
  | { type: 'titre'; texte: string }
  | { type: 'preambule'; titre: string; paragraphes: string[] }
  | {
      type: 'article'
      titre: string
      /** Phrase d'introduction placée avant les points numérotés. */
      chapeau?: string
      points?: ReglementPoint[]
      /** Tableau réglementaire inséré après les points. */
      tableau?: 'contributions' | 'prestations'
      /** Note de bas d'article. */
      note?: string
    }

/** Article 6 — grille des contributions mensuelles, niveaux A à E. */
export interface NiveauContribution {
  niveau: string
  total: string
  fonctionnement: string
  secours: string
}

export const GRILLE_CONTRIBUTIONS_COLONNES = [
  'Niveau de Membre',
  'Contribution Mensuelle Totale',
  'Fonctionnement Ordinaire (50%)',
  'Fonds de Secours Mutuel (50%)',
] as const

export const GRILLE_CONTRIBUTIONS: NiveauContribution[] = [
  { niveau: 'Niveau A', total: '10 000 FCFA', fonctionnement: '5 000 FCFA', secours: '5 000 FCFA' },
  { niveau: 'Niveau B', total: '20 000 FCFA', fonctionnement: '10 000 FCFA', secours: '10 000 FCFA' },
  { niveau: 'Niveau C', total: '30 000 FCFA', fonctionnement: '15 000 FCFA', secours: '15 000 FCFA' },
  { niveau: 'Niveau D', total: '40 000 FCFA', fonctionnement: '20 000 FCFA', secours: '20 000 FCFA' },
  { niveau: 'Niveau E', total: '50 000 FCFA', fonctionnement: '25 000 FCFA', secours: '25 000 FCFA' },
]

/** Article 11 — grille des prestations sociales et assistances forfaitaires. */
export interface PrestationSociale {
  evenement: string
  assistance: string
  allocation: string
}

export const GRILLE_PRESTATIONS_COLONNES = [
  'Événement Social Certifié',
  'Assistance Morale & Mobilisation Fraternelle',
  'Allocation Financière Directe (Cash)',
] as const

export const GRILLE_PRESTATIONS: PrestationSociale[] = [
  {
    evenement: '1. Naissance / Maternité',
    assistance:
      "Assistance morale, visite de la commission sociale et remise d'un kit de naissance.",
    allocation: '50 000 FCFA',
  },
  {
    evenement: '2. Mariage Civil du Membre',
    assistance: "Mobilisation des membres et présence d'une délégation au vin d'honneur.",
    allocation: '100 000 FCFA',
  },
  {
    evenement: '3. Hospitalisation (> 3 jours)',
    assistance: 'Visites de réconfort et aide à la prise en charge des frais de pharmacie.',
    allocation: '50 000 FCFA',
  },
  {
    evenement: '4. Décès du Membre Adhérent',
    assistance: 'Prise en charge de la veillée, couronne de fleurs et délégation aux obsèques.',
    allocation: '30 000 FCFA',
  },
  {
    evenement: '5. Décès du Conjoint Légal',
    assistance: 'Soutien logistique lors de la veillée et accompagnement funérarium.',
    allocation: '150 000 FCFA',
  },
  {
    evenement: '6. Décès Enfant / Parent direct',
    assistance: 'Condoléances officielles et activation du réseau de solidarité.',
    allocation: '100 000 FCFA',
  },
]

export const REGLEMENT_BLOCS: ReglementBloc[] = [
  {
    type: 'preambule',
    titre: "PRÉAMBULE D'APPLICATION ET DE CONFORMITÉ JURIDIQUE",
    paragraphes: [
      "Le présent Règlement Intérieur précise et complète les Statuts révisés de la Mutuelle d'Entraide et de Secours Mutuel « LE KARA » (ci-après dénommée « LE KARA »). Rédigé en application de la Loi n° 35/62 du 10 décembre 1962 relative aux associations en République Gabonaise et en conformité avec les règles de gestion financière associative, il fixe les modalités pratiques de fonctionnement, les catégories de membres, la grille des cotisations et placements, le régime des accompagnements et bonus, le barème des secours sociaux non remboursables ainsi que la discipline applicable sur l'ensemble du territoire national.",
    ],
  },

  { type: 'titre', texte: "TITRE I : DISPOSITIONS GÉNÉRALES, ADHÉSION ET QUALITÉ DE MEMBRE" },
  {
    type: 'article',
    titre: "Article 1er : Dénomination, Objet et Champ d'Action",
    points: [
      {
        texte:
          "Conformément aux Statuts, l'association a pour dénomination officielle : Mutuelle d'Entraide et de Secours Mutuel « LE KARA » (sigle « LE KARA »).",
      },
      {
        texte:
          "Le présent Règlement Intérieur définit les règles d'organisation interne, les droits et devoirs des membres et le fonctionnement de ses organes et fonds.",
      },
      {
        texte:
          "LE KARA exerce ses activités sur l'ensemble du territoire national de la République Gabonaise. Le présent Règlement s'impose à tous les membres, quelles que soient leur résidence ou leur section d'attache.",
      },
    ],
  },
  {
    type: 'article',
    titre: "Article 2 : Conditions et Procédure d'Adhésion",
    points: [
      {
        texte:
          "L'adhésion est ouverte à toute personne physique agréant aux Statuts et au présent Règlement Intérieur, sans distinction de race, d'origine, de sexe ou de religion.",
      },
      {
        texte: "L'adhésion est concrétisée par :",
        puces: [
          "La signature et le dépôt d'une fiche officielle d'adhésion adressée au Secrétaire Exécutif ;",
          "Le paiement obligatoire d'un droit d'entrée non remboursable de 10 000 FCFA, payable une seule fois ;",
          "L'acquisition de la carte de membre ;",
          "L'engagement d'honorer régulièrement les cotisations fixées.",
        ],
      },
      {
        texte:
          "L'adhésion est renouvelée chaque année. L'année sociale débute le 1er janvier et se termine le 31 décembre.",
      },
    ],
  },
  {
    type: 'article',
    titre: 'Article 3 : Catégories et Statuts des Membres',
    chapeau: "Conformément à l'Article 8 des Statuts, LE KARA comprend trois (3) catégories de membres :",
    points: [
      {
        texte: 'Les Membres Sympathisants :',
        puces: [
          "Toute personne nouvellement admise acquiert d'office la qualité de membre sympathisant.",
          "Ils partagent la vision de LE KARA et peuvent solliciter l'accompagnement et l'aide de la mutuelle sous certaines conditions.",
          "Ils s'acquittent des cotisations régulières et participent aux Assemblées Générales sans droit de vote.",
        ],
      },
      {
        texte: 'Les Membres Adhérents :',
        puces: [
          'Ce sont les personnes physiques qui animent au quotidien le fonctionnement de la mutuelle.',
          "Ils s'acquittent régulièrement de leurs cotisations, assistent aux réunions, participent aux Assemblées Générales avec droit de vote et exécutent les missions confiées.",
        ],
      },
      {
        texte: 'Les Membres Bienfaiteurs :',
        puces: [
          "Ce sont les personnes physiques ou morales qui apportent un soutien matériel, financier ou moral à la mutuelle sans obligation permanente à son égard.",
        ],
      },
    ],
  },
  {
    type: 'article',
    titre: 'Article 4 : Acquisition, Rétrogradation et Perte de la Qualité de Membre Adhérent',
    points: [
      {
        texte:
          "Passage au statut de Membre Adhérent : La qualité de membre adhérent s'acquiert par décision du Comité Exécutif au vu de la réalisation de deux conditions cumulatives :",
        puces: [
          'Une ancienneté ininterrompue de trois (3) ans au sein de la mutuelle ;',
          "L'intégrité et la régularité exemplaire dans le versement des cotisations mensuelles et le remboursement des accompagnements accordés.",
        ],
      },
      {
        texte:
          "Rétrogradation : Tout membre adhérent ne respectant plus ses engagements financiers (retards répétés de cotisations ou non-respect d'échéancier) peut être rétrogradé par le Comité Exécutif au statut de membre sympathisant.",
      },
      {
        texte:
          'Perte de la qualité de membre : La qualité de membre se perd par démission écrite, décès, ou exclusion prononcée pour faute grave.',
      },
    ],
  },
  {
    type: 'article',
    titre: "Article 5 : Parrainage et Garanties d'Adhésion",
    points: [
      { texte: "L'adhésion peut être effectuée sous le parrainage d'un membre adhérent cotisant." },
      {
        texte:
          'Le parrain se porte automatiquement caution solidaire de son filleul si ce dernier sollicite un accompagnement/crédit spécial.',
      },
      {
        texte:
          "Le filleul conserve la liberté de désigner un autre garant, à condition que celui-ci soit un membre adhérent à jour de ses obligations.",
      },
    ],
  },

  { type: 'titre', texte: 'TITRE II : STRUCTURE DES CONTRIBUTIONS ET NIVEAUX DE COTISATION' },
  {
    type: 'article',
    titre: 'Article 6 : Grille des Contributions Mensuelles (Niveaux A à E)',
    chapeau:
      "Chaque membre (sympathisant ou adhérent) choisit son niveau de souscription mensuelle et s'acquitte de sa contribution au plus tard le 5 de chaque mois. Les montants sont répartis comme suit :",
    tableau: 'contributions',
    note: 'Note : La cotisation de base minimale statutaire est fixée à 10 000 FCFA (Niveau A).',
  },
  {
    type: 'article',
    titre: 'Article 7 : La Caisse Spéciale et Apports des Bienfaiteurs',
    points: [
      {
        texte:
          "Caisse Spéciale : Ouverte aux membres souhaitant contribuer ponctuellement au-delà de leur cotisation mensuelle ordinaire. Le montant d'un apport en Caisse Spéciale est compris entre 51 000 FCFA et 999 999 FCFA.",
      },
      {
        texte:
          "Statut de Bienfaiteur : Tout versement unique ou cumulé égal ou supérieur à 1 000 000 FCFA confère la qualité de membre bienfaiteur. Les membres bienfaiteurs peuvent également souscrire, s'ils le désirent, aux cotisations mensuelles et à la caisse spéciale.",
      },
    ],
  },

  { type: 'titre', texte: 'TITRE III : AVANTAGES, BÉNÉFICES, ACCOMPAGNEMENTS ET BONUS' },
  {
    type: 'article',
    titre: 'Article 8 : Les Accompagnements Financiers Remboursables',
    chapeau:
      "Les membres de LE KARA peuvent bénéficier d'accompagnements financiers destinés à faire face à des besoins urgents ou des projets :",
    points: [
      {
        texte: 'Accompagnement Régulier (Réservé aux Membres Adhérents à jour) :',
        puces: [
          'Destiné au règlement de menues dépenses urgentes.',
          'Octroyé à raison d\'un (1) seul accompagnement par mois.',
          'Le montant maximum est plafonné en fonction du niveau de cotisation du membre : Niveau A : 500 FCFA à 30 000 FCFA ; Niveau B : 500 FCFA à 60 000 FCFA ; Niveau C : 500 FCFA à 90 000 FCFA ; Niveau D : 500 FCFA à 120 000 FCFA ; Niveau E : 500 FCFA à 150 000 FCFA.',
          'Remboursement : Obligatoirement effectué au plus tard avant le versement de la contribution mensuelle suivante.',
        ],
      },
      {
        texte: 'Accompagnement Exceptionnel (Ouvert à toutes les catégories de membres) :',
        puces: [
          'Concerne des montants supérieurs aux plafonds réguliers.',
          "Procédure : Adresser une demande écrite motivée au Secrétaire Exécutif ; s'engager sur l'honneur par écrit ; accepter une contribution financière supplémentaire fixée par le Comité Exécutif ; accepter les pénalités de retard en cas de dépassement d'échéancier.",
        ],
      },
    ],
  },
  {
    type: 'article',
    titre: 'Article 9 : Régime des Bonus Annuels et Restitutions',
    chapeau:
      "Au terme d'un cycle de douze (12) mois, et sous réserve d'un solde comptable excédentaire validé par l'Assemblée, le Comité Exécutif attribue des bonus aux membres après délibération :",
    points: [
      {
        texte:
          "Membres n'ayant sollicité AUCUN accompagnement : Restitution de la totalité de leurs cotisations mensuelles au 13ème mois, assortie d'un bonus financier déterminé par le Comité Exécutif.",
      },
      {
        texte:
          'Membres ayant sollicité un ou plusieurs accompagnements : Restitution partielle de leurs cotisations au 13ème mois.',
      },
      {
        texte:
          "Souscripteurs à la Caisse Spéciale : Remboursement de la totalité des sommes déposées assorti d'un bonus d'encouragement après une durée minimale de 6 mois et maximale de 13 mois. En cas de retrait anticipé volontaire, la totalité du capital déposé est restituée sans bonus.",
      },
      {
        texte:
          'Membres Bienfaiteurs : Restitution de leurs apports au 13ème mois avec un bonus institutionnel fixé par le Comité Exécutif.',
      },
    ],
  },

  {
    type: 'titre',
    texte: 'TITRE IV : FONDS DE SECOURS MUTUEL ET PRESTATIONS SOCIALES NON REMBOURSABLES',
  },
  {
    type: 'article',
    titre: 'Article 10 : Nature Juridique et Période de Carence',
    points: [
      {
        texte:
          'Nature non remboursable : Les secours versés au titre du Fonds de Secours Mutuel sont des allocations sociales définitives. Elles ne constituent en aucun cas des prêts ou crédits.',
      },
      {
        texte:
          "Période de carence : Tout membre est soumis à une période de carence de trois (3) mois révolus à compter de la validation de son adhésion. Pendant cette période, le membre cotise régulièrement mais ne peut percevoir d'allocations en cash du Fonds de Secours (assistance morale uniquement).",
      },
    ],
  },
  {
    type: 'article',
    titre: 'Article 11 : Grille des Prestations Sociales et Assistances Forfaitaires',
    chapeau:
      "Sous réserve d'être à jour de ses cotisations et d'avoir accompli la période de carence, le membre bénéficie des allocations suivantes :",
    tableau: 'prestations',
  },
  {
    type: 'article',
    titre: 'Article 12 : Déclaration et Déblocage des Secours',
    chapeau:
      "Tout événement doit être déclaré au Secrétaire Exécutif dans un délai de 72 heures, avec présentation d'une pièce justificative officielle (acte d'état civil, bulletin d'hospitalisation ou acte de décès). Après validation comptable, l'allocation est remise au membre ou à ses ayants droits légaux.",
  },

  {
    type: 'titre',
    texte: 'TITRE V : ORGANES DE GESTION, ADMINISTRATION ET SÉCURISATION DES FONDS',
  },
  {
    type: 'article',
    titre: 'Article 13 : Composition du Comité Exécutif',
    chapeau:
      'Le Comité Exécutif est l\'organe de gestion, de programmation et de coordination de LE KARA. Il est composé de 5 membres choisis parmi les membres adhérents :',
    points: [
      {
        texte:
          "Le Secrétaire Exécutif : Élu en AG pour un mandat de 4 ans renouvelable. Il représente l'association, convoque et dirige les réunions, nomme les membres du Comité dans les 7 jours suivant son élection et co-signe les actes administratifs et financiers.",
      },
      {
        texte:
          "Le Secrétaire Exécutif Adjoint : Assiste et remplace le Secrétaire Exécutif en cas d'empêchement.",
      },
      {
        texte:
          "Le Financier Général : Tient la comptabilité, perçoit les contributions et co-signe l'ensemble des opérations bancaires.",
      },
      {
        texte:
          'Le Chargé des Affaires Extérieures : Gère la communication, les relations publiques et les antennes provinciales.',
      },
      {
        texte:
          'Le Conseiller Juridique : Veille à la conformité aux lois gabonaises, supervise le respect du Règlement Intérieur et gère les contentieux.',
      },
    ],
  },
  {
    type: 'article',
    titre: 'Article 14 : Gestion Bancaire et Double Signature',
    points: [
      {
        texte:
          'Les fonds de LE KARA sont obligatoirement déposés sur un compte bancaire ouvert au nom de la mutuelle dans un établissement agréé en République Gabonaise.',
      },
      {
        texte:
          "Toute opération d'injonction ou de retrait de fonds requiert la double signature conjointe et obligatoire du Secrétaire Exécutif et du Financier Général.",
      },
    ],
  },

  { type: 'titre', texte: 'TITRE VI : DISCIPLINE, CONFIDENTIALITÉ ET SANCTIONS' },
  {
    type: 'article',
    titre: 'Article 15 : Obligations de Confidentialité et Secret Professionnel',
    points: [
      {
        texte:
          'Les membres prenant part aux réunions du Comité Exécutif ou des Assemblées sont tenus au secret professionnel.',
      },
      {
        texte:
          "Il est strictement interdit de divulguer à des tiers des informations, documents comptables, juridiques ou stratégiques de la mutuelle. Cette obligation persiste après la perte de la qualité de membre.",
      },
      {
        texte:
          "Sous réserve de l'information préalable et du consentement exprès des membres intéressés conformément à la réglementation sur la protection des données personnelles, les communications téléphoniques avec les services de la mutuelle sont susceptibles d'être enregistrées à des fins de preuve.",
      },
    ],
  },
  {
    type: 'article',
    titre: "Article 16 : Discipline et Échelle des Sanctions",
    chapeau:
      "Tout manquement aux dispositions statutaires ou au présent Règlement Intérieur expose l'auteur aux sanctions suivantes :",
    points: [
      {
        texte:
          'Rappel à l\'ordre / Avertissement écrit : Retard de cotisation supérieur à 15 jours ou 2 mois consécutifs de non-versement.',
      },
      {
        texte:
          "Suspension des avantages et prestations : Prononcée automatiquement en cas de retard de cotisation égal à 3 mois consécutifs ou de non-remboursement d'un accompagnement à l'échéance.",
      },
      {
        texte:
          'Exclusion / Radiation définitive : Prononcée par l\'Assemblée Générale pour non-paiement au-delà de 3 mois sans justificatif, détournement de fonds ou faute grave portant atteinte à la mutuelle.',
      },
      {
        texte:
          "Recouvrement des Créances et Voies de Droit : En cas d'insolvabilité organisée frauduleusement ou d'absence de signe de vie sans cas de force majeure, LE KARA se réserve le droit d'émettre un avis de recherche et de publier la photo et l'identité du membre défaillant sur tous supports publics ou réseaux sociaux, sans préjudice des poursuites pénales applicables.",
      },
    ],
  },

  { type: 'titre', texte: 'TITRE VII : ASSEMBLÉES ET DISPOSITIONS FINALES' },
  {
    type: 'article',
    titre: 'Article 17 : Périodicité des Réunions',
    points: [
      {
        texte:
          "Assemblées Générales Ordinaires : Se tiennent deux fois par an, le dernier samedi de juillet et le dernier samedi d'octobre.",
      },
      {
        texte:
          "Réunions Mensuelles : Se tiennent le premier samedi de chaque mois au siège d'Awoungou ou au niveau des sections provinciales.",
      },
    ],
  },
  {
    type: 'article',
    titre: "Article 18 : Modification et Entrée en Vigueur",
    points: [
      {
        texte:
          "Le présent Règlement Intérieur ne peut être modifié que par l'Assemblée Générale sur proposition du Comité Exécutif, statuant à la majorité simple des membres présents ou représentés.",
      },
      {
        texte:
          "Le présent texte harmonisé entre en vigueur dès son adoption officielle par l'Assemblée Générale.",
      },
    ],
  },
]
