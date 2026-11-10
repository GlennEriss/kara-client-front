export type GroupTutorialScene =
  | "create-start"
  | "create-identity"
  | "create-members"
  | "create-guarantor"
  | "create-project"
  | "create-review"
  | "caisse-open"
  | "caisse-plan"
  | "caisse-payment"
  | "caisse-order"
  | "caisse-funded"
  | "caisse-fee"
  | "caisse-payout"
  | "caisse-history"
  | "purchase-open"
  | "purchase-parts"
  | "purchase-guarantor"
  | "purchase-review"
  | "purchase-requests"
  | "purchase-follow-up";
export interface GroupTutorialStep {
  id: GroupTutorialScene;
  title: string;
  instruction: string;
  action: string;
  outcome: string;
}
export interface GroupTutorialLesson {
  id: "create" | "caisse" | "purchase";
  title: string;
  description: string;
  steps: readonly GroupTutorialStep[];
}
export const GROUP_TUTORIAL_MEMBERS = [
  "Alice ONDO",
  "Bruno MBA",
  "Nadia MINKO",
] as const;
export const GROUP_TUTORIAL_STEP_MS = 9000;
export const GROUP_TUTORIAL_APPLY_MS = 1400;
/** Leave enough time to read the result before continuous playback advances. */
export const getGroupTutorialStepDuration = (step: GroupTutorialStep) =>
  Math.max(
    GROUP_TUTORIAL_STEP_MS,
    GROUP_TUTORIAL_APPLY_MS + step.outcome.split(/\s+/).length * 350 + 3000,
  );
export const GROUP_TUTORIAL_LESSONS: readonly GroupTutorialLesson[] = [
  {
    id: "create",
    title: "Créer un groupe",
    description: "Membres, garant et premier projet.",
    steps: [
      {
        id: "create-start",
        title: "Commencer un groupe",
        instruction:
          "Dans la liste des groupes, « Créer un groupe » ouvre le parcours de création.",
        action: "Créer un groupe",
        outcome:
          "Le parcours s’ouvre. Aucun groupe réel n’est créé dans cette démonstration.",
      },
      {
        id: "create-identity",
        title: "Présenter le collectif",
        instruction:
          "Donnez un nom au groupe et expliquez son objectif. Ici, les membres veulent s’équiper ensemble.",
        action: "Continuer",
        outcome:
          "Le nom et l’objectif sont prêts. Passez au choix des membres.",
      },
      {
        id: "create-members",
        title: "Choisir les membres",
        instruction:
          "Recherchez et sélectionnez les personnes. Un membre peut appartenir à plusieurs groupes.",
        action: "Sélectionner les trois membres",
        outcome:
          "Alice, Bruno et Nadia sont sélectionnés pour le groupe fictif « Les Artisans ».",
      },
      {
        id: "create-guarantor",
        title: "Désigner le garant",
        instruction:
          "Choisissez un membre Kara identifié comme garant du groupe. Il sera proposé sur les futurs dossiers, avec possibilité de le remplacer.",
        action: "Choisir Nadia MINKO comme garant",
        outcome:
          "Nadia est le garant du groupe. Si elle emprunte elle-même, un autre membre Kara devra garantir sa propre part.",
      },
      {
        id: "create-project",
        title: "Préparer le premier projet",
        instruction:
          "Choisissez un projet, ses participants et son objectif. Le budget reste une estimation à ce stade.",
        action: "Préparer le projet d’achat",
        outcome:
          "Le projet « Congélateur partagé » réunit les trois participants, avec un budget estimé de 300 000 FCFA.",
      },
      {
        id: "create-review",
        title: "Vérifier puis créer",
        instruction:
          "Vérifiez le groupe, ses membres, son garant et son projet avant de confirmer la création.",
        action: "Créer le groupe",
        outcome:
          "La fiche du groupe est prête. Dans l’application, cette étape crée le groupe et son projet ; ici, elle affiche seulement un exemple.",
      },
    ],
  },
  {
    id: "caisse",
    title: "Caisse et remises",
    description: "Cotisations, ordre et redevance.",
    steps: [
      {
        id: "caisse-open",
        title: "Ouvrir une caisse collective",
        instruction:
          "Depuis le groupe, ouvrez un projet de type « Caisse collective ». Chaque projet possède son propre suivi.",
        action: "Voir le projet de caisse",
        outcome:
          "La caisse du marché est ouverte dans cet exemple, avec Alice, Bruno et Nadia comme participants.",
      },
      {
        id: "caisse-plan",
        title: "Configurer les cotisations",
        instruction:
          "Choisissez le rythme : journalier, hebdomadaire ou mensuel. Cet exemple est mensuel : indiquez le montant par membre, le premier mois, la durée et le jour d’échéance. Dès la première opération, le cycle est conservé.",
        action: "Créer le cycle",
        outcome:
          "L’exemple prévoit 10 000 FCFA par membre pendant trois mois : la caisse attend donc 30 000 FCFA chaque mois.",
      },
      {
        id: "caisse-payment",
        title: "Enregistrer un versement",
        instruction:
          "Choisissez le mois et le membre, puis saisissez le versement réellement reçu. Des versements partiels sont également possibles.",
        action: "Confirmer le versement d’Alice",
        outcome:
          "Alice a réglé 10 000 FCFA. Il reste 20 000 FCFA à réunir ; la remise du mois n’est pas encore disponible.",
      },
      {
        id: "caisse-order",
        title: "Enregistrer l’ordre de passage",
        instruction:
          "Le tirage présente un aperçu. Confirmez-le pour le rendre visible aux membres. L’ordre affiché ici est illustratif.",
        action: "Enregistrer cet ordre",
        outcome:
          "Dans cet exemple, Nadia passe en premier, puis Alice et Bruno. Le tirage ne crée aucune remise à lui seul.",
      },
      {
        id: "caisse-funded",
        title: "Vérifier que le mois est réglé",
        instruction:
          "Pour poursuivre l’exemple, les versements de Bruno et de Nadia ont aussi été enregistrés. Le mois est maintenant entièrement réglé.",
        action: "Consulter les remises",
        outcome:
          "Les 30 000 FCFA sont réunis. L’admin peut préparer la remise ; une simple demande de prise en charge en attente ne suffirait pas.",
      },
      {
        id: "caisse-fee",
        title: "Activer une redevance facultative",
        instruction:
          "L’admin peut activer une retenue fixe par remise. Ici, il choisit 1 000 FCFA. Sans cette option, le bénéficiaire reçoit toute la caisse.",
        action: "Enregistrer la redevance",
        outcome:
          "Les prochaines remises retiendront 1 000 FCFA pour Kara. Une modification ultérieure ne recalculera pas les anciennes remises.",
      },
      {
        id: "caisse-payout",
        title: "Vérifier le net remis",
        instruction:
          "Vérifiez le bénéficiaire, la date réelle et le moyen de remise. Confirmez uniquement après remise effective des fonds.",
        action: "Confirmer la remise effective",
        outcome:
          "Dans cet exemple : 30 000 FCFA de caisse − 1 000 FCFA de redevance = 29 000 FCFA remis à Nadia. Une seule remise du mois est enregistrée.",
      },
      {
        id: "caisse-history",
        title: "Retrouver le suivi",
        instruction:
          "L’admin conserve la remise dans son historique. Le membre consulte ses propres versements et remises dans « Mes groupes ».",
        action: "Afficher le suivi de Nadia",
        outcome:
          "Nadia voit le montant de la caisse, la retenue et ses 29 000 FCFA nets reçus. Son espace reste un suivi ; les opérations sont gérées par l’admin.",
      },
    ],
  },
  {
    id: "purchase",
    title: "Financer un achat",
    description: "Répartition et garanties individuelles.",
    steps: [
      {
        id: "purchase-open",
        title: "Préparer la demande collective",
        instruction:
          "Dans le projet d’achat, « Demande collective de crédit fixe » prépare un dossier individuel pour chaque participant retenu.",
        action: "Demande collective de crédit fixe",
        outcome:
          "Le formulaire de répartition est ouvert. L’emprunt reste individuel, même si l’achat est commun.",
      },
      {
        id: "purchase-parts",
        title: "Répartir le montant",
        instruction:
          "Pour cet achat de 300 000 FCFA, sélectionnez les trois participants. Les parts égales restent modifiables ; leur somme doit correspondre au total.",
        action: "Répartir à parts égales",
        outcome:
          "Alice, Bruno et Nadia demandent chacun 100 000 FCFA, soit exactement 300 000 FCFA au total.",
      },
      {
        id: "purchase-guarantor",
        title: "Choisir un autre garant pour Nadia",
        instruction:
          "Nadia est le garant du groupe et participe à l’achat. Elle ne peut pas garantir sa propre part : choisissez un autre membre Kara pour elle.",
        action: "Choisir Paul NGUEMA pour Nadia",
        outcome:
          "Nadia garantit Alice et Bruno. Paul, autre membre Kara, garantit uniquement la part de Nadia.",
      },
      {
        id: "purchase-review",
        title: "Vérifier chaque dossier",
        instruction:
          "Le récapitulatif présente le montant demandé et le garant de chaque personne. Vérifiez-le avant de créer les demandes.",
        action: "Vérifier la répartition",
        outcome:
          "Les trois parts et les trois garanties sont vérifiées. Aucune demande n’a encore été approuvée et aucun fonds n’a été remis.",
      },
      {
        id: "purchase-requests",
        title: "Créer les demandes individuelles",
        instruction:
          "La confirmation crée les demandes en attente, liées au même projet. Elle ne crée pas automatiquement des contrats actifs.",
        action: "Créer les trois demandes",
        outcome:
          "Trois demandes de crédit fixe de 100 000 FCFA sont en attente. Chaque dossier suivra son propre parcours de traitement.",
      },
      {
        id: "purchase-follow-up",
        title: "Traiter puis suivre les dossiers",
        instruction:
          "L’admin examine chaque demande, choisit la durée et les conditions, puis fait signer chaque contrat. Le projet regroupe ensuite leur suivi.",
        action: "Voir le suivi du projet",
        outcome:
          "Le groupe conserve le lien entre les dossiers. Les remboursements et le reste dû restent propres à chaque membre ; l’espace membre présente son suivi avec le vocabulaire associatif.",
      },
    ],
  },
];
