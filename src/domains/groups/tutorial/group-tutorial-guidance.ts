import type { GroupTutorialLesson, GroupTutorialScene } from "./group-tutorial";

export interface TutorialCase {
  scenario: string;
  objective: string;
  takeaways: readonly string[];
  question: {
    prompt: string;
    answers: readonly string[];
    correct: number;
    explanation: string;
  };
}

export const TUTORIAL_CASES: Record<GroupTutorialLesson["id"], TutorialCase> = {
  create: {
    scenario:
      "Alice, Bruno et Nadia veulent acheter un congélateur ensemble. Vous êtes l’admin : constituez leur groupe « Les Artisans », puis préparez leur projet.",
    objective:
      "Obtenir une fiche avec trois membres, Nadia comme garant et un projet d’achat estimé à 300 000 FCFA.",
    takeaways: [
      "Le groupe rassemble des membres ; chaque projet organise une initiative précise.",
      "Le garant du groupe est un membre Kara identifié. Le référent est un rôle distinct.",
      "Créer un groupe et renseigner un budget ne crée ni demande de financement ni paiement.",
    ],
    question: {
      prompt:
        "Le groupe et son projet à 300 000 FCFA sont créés. Qu’est-ce qui a été financé ?",
      answers: [
        "Les 300 000 FCFA ont été remis au groupe.",
        "Rien pour le moment : le budget est une estimation.",
      ],
      correct: 1,
      explanation:
        "La création organise le groupe et le projet. Le financement se prépare ensuite dans un parcours distinct, avec des dossiers individuels.",
    },
  },
  caisse: {
    scenario:
      "Les trois membres cotisent chacun 10 000 FCFA par mois. Nadia reçoit la première caisse. Kara retient une redevance facultative de 1 000 FCFA.",
    objective:
      "Passer des cotisations à une remise vérifiée : 30 000 FCFA réunis, 1 000 FCFA retenus, 29 000 FCFA nets pour Nadia.",
    takeaways: [
      "Une cotisation partielle laisse un solde à régler. Le mois entier doit être réglé ou effectivement pris en charge avant la remise.",
      "Le tirage désigne un ordre ; il ne remet pas les fonds.",
      "La redevance est facultative. Le net remis est égal à la caisse du mois moins cette retenue.",
      "Confirmer une remise enregistre des fonds déjà remis ; cela ne déclenche aucun transfert.",
    ],
    question: {
      prompt:
        "Seule Alice a versé ses 10 000 FCFA. Peut-on déjà remettre 29 000 FCFA à Nadia ?",
      answers: [
        "Oui, puisque Nadia est première dans l’ordre.",
        "Non : il manque encore les 20 000 FCFA de Bruno et Nadia.",
      ],
      correct: 1,
      explanation:
        "Le tirage et la redevance ne remplacent pas les cotisations. Il faut d’abord réunir les 30 000 FCFA du mois ; la retenue de 1 000 FCFA donne ensuite 29 000 FCFA nets.",
    },
  },
  purchase: {
    scenario:
      "Le congélateur coûte 300 000 FCFA. Alice, Bruno et Nadia choisissent chacun une part de 100 000 FCFA. Nadia est aussi le garant du groupe.",
    objective:
      "Préparer trois demandes individuelles cohérentes et choisir Paul, autre membre Kara, comme garant de la part de Nadia.",
    takeaways: [
      "Les parts égales sont modifiables ; leur somme doit rester égale au total à financer.",
      "Le garant du groupe est proposé, mais personne ne peut garantir sa propre part.",
      "La confirmation crée des demandes en attente. Chaque dossier est ensuite examiné séparément.",
      "L’admin choisit la durée et les conditions de chaque dossier. L’espace membre sert au suivi avec son vocabulaire associatif.",
    ],
    question: {
      prompt:
        "Nadia participe à l’achat et garantit déjà le groupe. Qui doit garantir sa propre part ?",
      answers: [
        "Nadia peut garantir sa propre part.",
        "Un autre membre Kara identifié, par exemple Paul.",
      ],
      correct: 1,
      explanation:
        "Nadia peut garantir Alice et Bruno, mais elle ne peut pas se garantir elle-même. Le garant de sa part doit être remplacé avant de créer les demandes.",
    },
  },
};

interface StepGuidance {
  where: string;
  before: string;
  after: string;
  why: string;
}

export const TUTORIAL_GUIDANCE: Record<GroupTutorialScene, StepGuidance> = {
  "create-start": {
    where: "Groupes → Créer un groupe",
    before: "Liste des groupes",
    after: "Parcours de création ouvert",
    why: "Commencez par réunir les personnes ; leurs projets seront ensuite suivis dans ce groupe.",
  },
  "create-identity": {
    where: "Création → Le groupe",
    before: "Identité à vérifier",
    after: "Nom et objectif validés",
    why: "Un nom clair et un objectif précis permettent aux membres de reconnaître leur collectif.",
  },
  "create-members": {
    where: "Création → Les membres",
    before: "Aucun membre sélectionné",
    after: "Alice, Bruno et Nadia sélectionnés",
    why: "Les participants d’un projet sont ensuite choisis parmi les membres de ce groupe.",
  },
  "create-guarantor": {
    where: "Création → Garant du groupe",
    before: "Garant à choisir",
    after: "Nadia proposée pour les futurs dossiers",
    why: "Le garant est proposé sur les nouveaux dossiers ; sa modification ne réécrit pas les anciens.",
  },
  "create-project": {
    where: "Création → Premier projet",
    before: "Projet à préparer",
    after: "Achat de 300 000 FCFA préparé",
    why: "Le budget décrit un besoin. Il ne prouve pas qu’un financement ou un paiement a eu lieu.",
  },
  "create-review": {
    where: "Création → Récapitulatif",
    before: "Brouillon à confirmer",
    after: "Fiche du groupe et projet disponibles",
    why: "Dans l’application, la confirmation enregistre le groupe. La démonstration reste fictive.",
  },
  "caisse-open": {
    where: "Groupe → Projets → Caisse du marché",
    before: "Liste des projets",
    after: "Suivi de la caisse ouvert",
    why: "Chaque projet conserve ses propres cotisations, son ordre de passage et ses remises.",
  },
  "caisse-plan": {
    where: "Projet → Cotisations mensuelles",
    before: "Aucun cycle configuré",
    after: "3 mois à 30 000 FCFA attendus par mois",
    why: "Cet exemple choisit le rythme mensuel : 3 personnes × 10 000 FCFA par mois. Le même suivi accepte une cotisation et une prise par jour ou par semaine. Dès la première opération, le cycle est conservé.",
  },
  "caisse-payment": {
    where: "Cotisations → Novembre → Enregistrer un versement",
    before: "0 FCFA réunis ; 30 000 FCFA manquants",
    after: "10 000 FCFA réunis ; 20 000 FCFA manquants",
    why: "Le paiement d’Alice ne règle pas les parts des autres. La remise du mois reste indisponible.",
  },
  "caisse-order": {
    where: "Projet → Ordre de récupération",
    before: "Aperçu du tirage non enregistré",
    after: "Nadia, puis Alice, puis Bruno",
    why: "Enregistrer l’ordre le rend visible aux membres. Cela ne crée aucune remise.",
  },
  "caisse-funded": {
    where: "Projet → Remises aux bénéficiaires",
    before: "30 000 FCFA réunis dans l’exemple",
    after: "Remise du mois prête à vérifier",
    why: "Bruno et Nadia ont aussi payé dans cet exemple. Une demande de prise en charge en attente ne suffirait pas.",
  },
  "caisse-fee": {
    where: "Remises → Configurer la redevance facultative",
    before: "Sans retenue : 30 000 FCFA nets",
    after: "Retenue de 1 000 FCFA : 29 000 FCFA nets",
    why: "Cette option concerne les prochaines remises. Les retenues des remises déjà enregistrées restent inchangées.",
  },
  "caisse-payout": {
    where: "Remises → Vérifier → Confirmer la remise effective",
    before: "Remise à vérifier, non enregistrée",
    after: "29 000 FCFA nets enregistrés pour Nadia",
    why: "Ne confirmez qu’après remise réelle. Une seule remise définitive est enregistrable pour ce mois et ce projet.",
  },
  "caisse-history": {
    where: "Admin : historique · Membre : Mes groupes",
    before: "Remise visible dans l’historique admin",
    after: "Nadia consulte sa remise personnelle",
    why: "Le membre voit ses propres montants. Les opérations et les notes administratives restent gérées côté admin.",
  },
  "purchase-open": {
    where: "Projet → Demande collective de crédit fixe",
    before: "Projet sans demande collective",
    after: "Formulaire de répartition ouvert",
    why: "L’achat est commun, mais les demandes et les remboursements restent individuels.",
  },
  "purchase-parts": {
    where: "Demande collective → Répartition",
    before: "Parts à déterminer",
    after: "3 × 100 000 FCFA = 300 000 FCFA",
    why: "Vous pouvez modifier les parts, mais leur somme doit correspondre exactement au total à financer.",
  },
  "purchase-guarantor": {
    where: "Demande collective → Garant de Nadia",
    before: "La part de Nadia attend un autre garant",
    after: "Paul garantit Nadia ; Nadia garantit les autres",
    why: "Personne ne peut être son propre garant. Paul doit être un autre membre Kara identifié.",
  },
  "purchase-review": {
    where: "Demande collective → Vérifier la répartition",
    before: "Montants et garants à vérifier",
    after: "Répartition vérifiée avant confirmation",
    why: "Vérifiez chaque emprunteur et chaque garant. Cette vérification n’approuve aucun dossier.",
  },
  "purchase-requests": {
    where: "Demande collective → Confirmer la création",
    before: "Aucune demande créée",
    after: "3 demandes en attente ; aucun fonds remis",
    why: "La création groupée ne crée pas de contrats actifs. L’admin doit encore traiter chaque dossier.",
  },
  "purchase-follow-up": {
    where: "Projet → Financement du projet",
    before: "3 demandes individuelles en attente",
    after: "Parcours de traitement et suivi identifié",
    why: "L’admin choisit la durée et les conditions de chaque dossier ; le groupe conserve le lien entre les personnes et le projet.",
  },
};
