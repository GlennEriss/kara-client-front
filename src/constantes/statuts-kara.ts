/**
 * Texte des Statuts révisés de l'Association de Secours Mutuel LE KARA.
 *
 * Source unique du document : le composant `StatutsKaraPDF` ne fait que
 * mettre en page ce contenu, dans l'ordre. Toute révision votée en Assemblée
 * Générale se reporte ici — et dans la copie de l'espace membre
 * (kara-members-front/features/statuts/constants/statuts-kara.ts).
 *
 * Le document reprend le texte complet tel que transmis : note d'orientation
 * juridique en tête, Statuts, puis procédure de mise en conformité en annexe.
 */

export type StatutsBloc =
  | { type: 'titre'; texte: string }
  | { type: 'chapitre'; texte: string }
  | { type: 'preambule'; titre: string; paragraphes: string[] }
  | { type: 'article'; titre: string; paragraphes: string[]; puces?: string[] }

/** Note placée en tête du document, sous la devise. */
export const STATUTS_NOTE_ORIENTATION = {
  intitule: "Note d'orientation juridique",
  texte:
    "La présente version révisée transforme l'association LE KARA en Association de Secours Mutuel régie par la Loi n° 35/62 du 10 décembre 1962. Elle clarifie la nature non lucrative des prestations (entraide, secours, prévoyance sociale interne) et exclut explicitement toute activité de crédit rémunéré ou de prêt d'argent à intérêts, conformément aux exigences de la réglementation CEMAC/COBAC relative aux établissements de microfinance et à la profession bancaire.",
} as const

/**
 * Version du texte en vigueur, enregistrée lors de la publication aux membres.
 * À incrémenter à chaque révision votée en Assemblée Générale.
 */
export const STATUTS_VERSION = '2026-01'

export const STATUTS_ENTETE = {
  association: 'ASSOCIATION DE SECOURS MUTUEL LE KARA',
  titre: 'STATUTS RÉVISÉS & MIS EN CONFORMITÉ',
  devise: 'Devise : Intégrité - Solidarité - Dynamisme',
} as const

export const STATUTS_SIGNATURE = {
  lieu: 'Owendo',
  pour: 'Pour le Comité Exécutif :',
  gauche: 'Le Secrétaire Exécutif',
  droiteIntitule: 'Pour le Conseil / Assemblée :',
  droite: 'Le Conseiller Juridique',
} as const

export const STATUTS_BLOCS: StatutsBloc[] = [
  {
    type: 'preambule',
    titre: 'PRÉAMBULE',
    paragraphes: [
      "Dans le cadre d'une chaîne de solidarité, d'entraide fraternelle et de prévoyance sociale, les jeunes du quartier AWOUNGOU, dans la commune d'Owendo, ont mis en place une mutuelle de secours et d'assistance. L'association a un caractère purement social, communautaire et solidaire, fondé sur la mutualisation des risques sociaux et le soutien réciproque entre ses membres.",
    ],
  },

  { type: 'titre', texte: 'TITRE I : DES DISPOSITIONS GÉNÉRALES' },
  {
    type: 'chapitre',
    texte: 'CHAPITRE I : Constitution, Dénomination, Devise, Logo et Dimension Nationale',
  },
  {
    type: 'article',
    titre: 'Article 1 (Constitution)',
    paragraphes: [
      "En application des dispositions de la Loi n° 35/62 du 10 décembre 1962 relative aux associations en République Gabonaise, il est formé entre les Jeunes du quartier AWOUNGOU (commune d'Owendo, province de l'Estuaire) et toute personne adhérant aux présents statuts, une association de secours mutuel appelée « Mutuelle d'Entraide et de Secours Mutuel LE KARA », ci-après désignée « LE KARA ».",
    ],
  },
  {
    type: 'article',
    titre: 'Article 2 (Nature juridique & Rayonnement territorial)',
    paragraphes: [
      "LE KARA est une association apolitique, laïque, à but non lucratif et de secours mutuel. Elle exerce ses activités et déploie ses actions d'entraide sur l'ensemble du territoire national de la République Gabonaise, avec la faculté de créer des antennes, représentations ou sections provinciales dans tout le pays.",
      "Elle s'interdit rigoureusement toute opération bancaire, tout octroi de prêts rémunérés ou d'intérêts financiers, conformément à la réglementation bancaire et macrofinancière en vigueur dans la zone CEMAC.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 3 (Devise)',
    paragraphes: ['La devise de LE KARA est : Intégrité - Solidarité - Dynamisme.'],
  },
  {
    type: 'article',
    titre: 'Article 4 (Logo)',
    paragraphes: [
      'LE KARA est représentée par son logo institutionnel figurant en annexe des présents statuts.',
    ],
  },

  { type: 'chapitre', texte: 'CHAPITRE II : Du Siège Social et de la Durée' },
  {
    type: 'article',
    titre: 'Article 5 (Siège social)',
    paragraphes: [
      "Le siège social de l'association est fixé à Owendo (Quartier Awoungou). Il peut être transféré en tout autre lieu du territoire national sur décision de l'Assemblée Générale prise à la majorité des deux tiers (2/3) des membres présents ou représentés.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 5-bis (Durée)',
    paragraphes: [
      "La durée de l'association est illimitée, sauf cas de dissolution anticipée prévue au Titre IV.",
    ],
  },

  { type: 'chapitre', texte: 'CHAPITRE III : Objet et Volet « Secours Mutuel »' },
  {
    type: 'article',
    titre: 'Article 6 (Objectifs)',
    paragraphes: [
      "LE KARA a pour objet exclusif la solidarité et la prévoyance sociale entre ses membres sur l'ensemble du territoire national. Ses objectifs sont :",
    ],
    puces: [
      "L'assistance sociale et le secours mutuel : Octroi d'aides financières forfaitarisées ou matérielles non remboursables lors d'événements familiaux majeurs (naissances, mariages, maladies graves, hospitalisations, décès) selon le barème fixé par le Règlement Intérieur ;",
      "L'accompagnement moral et physique : Organisation de chaînes de soutien et d'accompagnement effectif lors des événements heureux ou malheureux touchant un membre ou sa famille proche ;",
      "La promotion des initiatives communautaires : Servir de point d'ancrage social pour l'épanouissement des jeunes, la promotion de l'action citoyenne et les œuvres caritatives d'intérêt général à l'échelle nationale.",
    ],
  },

  { type: 'titre', texte: 'TITRE II : ORGANISATION ET FONCTIONNEMENT' },
  { type: 'chapitre', texte: 'CHAPITRE I : Des Membres' },
  {
    type: 'article',
    titre: 'Article 7 (Adhésion)',
    paragraphes: [
      "Peut adhérer à la mutuelle toute personne physique désireuse de concourir à la réalisation de la vision de secours mutuel énoncée à l'article 6 et agréant aux dispositions des présents Statuts et du Règlement Intérieur. L'adhésion est strictement personnelle. La demande est adressée au Secrétaire Exécutif qui notifie la décision d'acceptation ou de rejet après avis formulé par le Comité Exécutif.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 8 (Catégories de membres)',
    paragraphes: ['LE KARA se compose de trois (3) catégories de membres :'],
    puces: [
      "les membres adhérents : Personnes physiques participant activement à la vie de l'association, s'acquittant régulièrement des cotisations statutaires et du fonds de secours mutuel. Ils jouissent du droit de vote et sont éligibles aux organes de gestion.",
      'les membres sympathisants : Personnes physiques souscrivant à la vision de LE KARA. Elles peuvent bénéficier des prestations d\'accompagnement social selon les conditions prévues au Règlement Intérieur. Elles participent aux Assemblées Générales avec voix consultative (sans droit de vote).',
      "les membres bienfaiteurs : Personnes physiques ou morales apportant un soutien financier, matériel ou moral exceptionnel à l'association sans obligation permanente à son égard.",
    ],
  },

  { type: 'chapitre', texte: 'CHAPITRE II : Des Organes de Gestion' },
  {
    type: 'article',
    titre: 'Article 9 (Organes)',
    paragraphes: ['LE KARA est structurée autour de deux organes principaux :'],
    puces: ["L'Assemblée Générale (A.G) ;", 'Le Comité Exécutif (C.E).'],
  },
  {
    type: 'article',
    titre: 'Article 10 (Assemblée Générale)',
    paragraphes: [
      "L'Assemblée Générale est l'instance suprême de décision de LE KARA. Elle regroupe l'ensemble des membres à jour de leurs obligations.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 11 (Sessions ordinaires)',
    paragraphes: [
      "L'Assemblée Générale se réunit deux (2) fois par an en session ordinaire : le dernier samedi du mois de juillet et le dernier samedi du mois d'octobre.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 12 (Report)',
    paragraphes: [
      "L'Assemblée Générale ne peut être reportée qu'en cas de force majeure, pour une durée ne pouvant excéder quinze (15) jours.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 13 & 14 (Session extraordinaire)',
    paragraphes: [
      "L'Assemblée Générale peut être convoquée en session Extraordinaire soit par le Secrétaire Exécutif, soit à la demande des deux tiers (2/3) des membres adhérents, pour délibérer sur des questions urgentes ou majeures (modification des statuts, dissolution, etc.).",
    ],
  },
  {
    type: 'article',
    titre: 'Article 15 (Comité Exécutif)',
    paragraphes: [
      "Le Comité Exécutif est l'organe d'exécution, d'administration et de coordination de la mutuelle. Le Secrétaire Exécutif est élu pour un mandat de quatre (4) ans, renouvelable.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 16 (Neutralité)',
    paragraphes: [
      "Le Comité Exécutif et l'association garantissent une stricte neutralité politique et religieuse.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 17 (Composition du Comité Exécutif)',
    paragraphes: ['Le Comité Exécutif comprend :'],
    puces: [
      'un Secrétaire Exécutif ;',
      'un Secrétaire Exécutif Adjoint ;',
      'un Financier Général ;',
      'un Chargé des Affaires Extérieures ;',
      'un Conseiller Juridique.',
    ],
  },
  {
    type: 'article',
    titre: 'Article 18 (Attributions du Comité Exécutif)',
    paragraphes: [
      "Le Comité Exécutif est investi des pouvoirs d'administration courante, notamment :",
    ],
    puces: [
      'instruction et liquidation des secours sociaux conformément au barème réglementaire ;',
      'gestion financière et tenue de la comptabilité générale et du fonds de secours ;',
      "préparation du bilan financier annuel et du rapport d'activité ;",
      'représentation civile de la mutuelle par le Secrétaire Exécutif.',
    ],
  },

  { type: 'titre', texte: 'TITRE III : RESSOURCES ET GESTION FINANCIÈRE' },
  {
    type: 'article',
    titre: 'Article 18-bis (Ressources)',
    paragraphes: ['Les ressources financières de LE KARA proviennent exclusivement de :'],
    puces: [
      "droits d'adhésion et cotisations ordinaires des membres ;",
      'cotisations spécifiques affectées au Fonds de Secours Mutuel ;',
      'subventions publiques ou privées ;',
      'dons, legs et contributions des membres bienfaiteurs.',
    ],
  },
  {
    type: 'article',
    titre: 'Article 19 (Gestion bancaire & Signatures)',
    paragraphes: [
      "Le Comité Exécutif est tenu d'ouvrir un compte bancaire au nom de l'association « Mutuelle d'Entraide LE KARA ». Les opérations de retrait de fonds nécessitent obligatoirement la double signature conjointe de :",
    ],
    puces: ['le Secrétaire Exécutif ;', 'le Financier Général.'],
  },

  { type: 'titre', texte: 'TITRE IV : RÉVISION, DISSOLUTION ET LIQUIDATION' },
  {
    type: 'article',
    titre: 'Article 20 (Révision)',
    paragraphes: [
      "Les présents statuts ne peuvent être modifiés que par l'Assemblée Générale à la majorité des trois quarts (3/4) des membres présents ou représentés.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 21 (Formalités de déclaration)',
    paragraphes: [
      "En cas de modification statutaire, le Comité Exécutif accomplira les déclarations réglementaires auprès des autorités administratives compétentes (Ministère de l'Intérieur / Gouvernorat / Préfecture).",
    ],
  },
  {
    type: 'article',
    titre: 'Article 22 (Dissolution)',
    paragraphes: [
      "La dissolution volontaire de LE KARA est prononcée par l'Assemblée Générale Extraordinaire convoquée à cet effet, à la majorité des quatre cinquièmes (4/5) des membres.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 23 (Dévolution du patrimoine)',
    paragraphes: [
      "En cas de dissolution, l'Assemblée Générale nomme un liquidateur. L'actif net subsistant ne peut sous aucun prétexte être distribué aux membres. Il est obligatoirement dévolu à une autre association de secours mutuel ou une œuvre d'intérêt général légalement reconnue au Gabon.",
    ],
  },

  { type: 'titre', texte: 'TITRE V : DISPOSITIONS DIVERSES ET FINALES' },
  {
    type: 'article',
    titre: 'Article 24 (Règlement Intérieur)',
    paragraphes: [
      "Un Règlement Intérieur précisant le fonctionnement détaillé du Fonds de Secours Mutuel, les montants des cotisations et la grille d'octroi des prestations sociales est adopté en Assemblée Générale.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 25 (Cas non prévus)',
    paragraphes: [
      "Les cas non prévus par les présents statuts sont tranchés par le Comité Exécutif sous réserve de ratification par la plus proche Assemblée Générale.",
    ],
  },
  {
    type: 'article',
    titre: 'Article 26 (Entrée en vigueur)',
    paragraphes: [
      "Les présents statuts révisés entrent en vigueur dès leur adoption officielle par l'Assemblée Générale Extraordinaire.",
    ],
  },
]

/**
 * Annexe : procédure réglementaire de mise en conformité.
 *
 * Elle suit les Statuts dans le document, sur sa propre page.
 */
export const PROCEDURE_CONFORMITE_ENTETE = {
  titre: 'PROCÉDURE RÉGLEMENTAIRE DE MISE EN CONFORMITÉ',
  introduction:
    "Pour officialiser la transformation des statuts de l'Association LE KARA en Association de Secours Mutuel en République Gabonaise (Loi 35/62), le Comité Exécutif doit suivre scrupuleusement les étapes suivantes :",
  colonnes: ['Étape', 'Action Administrative', 'Modalités & Exigences Légales'] as const,
} as const

export interface EtapeConformite {
  numero: number
  action: string
  modalites: string
  pieces?: string[]
}

export const PROCEDURE_CONFORMITE: EtapeConformite[] = [
  {
    numero: 1,
    action: "Convocation d'une AGE",
    modalites:
      "Convoquer une Assemblée Générale Extraordinaire (AGE) des membres de LE KARA avec à l'ordre du jour : « Adoption de la révision des statuts et passage en Association de Secours Mutuel ». Quorum d'adoption : 3/4 des membres (Art. 20).",
  },
  {
    numero: 2,
    action: 'Rédaction du Procès-Verbal',
    modalites:
      "Établir le Procès-Verbal (PV) de l'AGE constatant la modification des statuts, signé par le bureau de séance (Président de séance et Secrétaire).",
  },
  {
    numero: 3,
    action: 'Mise à jour du Bureau',
    modalites:
      "Joindre la liste actualisée des membres du Comité Exécutif (Nom, Prénom, Profession, Nationalité, Adresse, Pièce d'identité).",
  },
  {
    numero: 4,
    action: 'Dépôt du Dossier Administratif',
    modalites:
      "Déposer le dossier complet en trois (3) exemplaires timbrés auprès du Gouvernorat de l'Estuaire ou de la Préfecture d'Owendo (selon le ressort du siège social) comprenant :",
    pieces: [
      'La demande de modification déposée par le Secrétaire Exécutif ;',
      "Le PV de l'AGE d'adoption ;",
      'Les nouveaux Statuts révisés et le Règlement Intérieur ;',
      "Copie des pièces d'identité des dirigeants.",
    ],
  },
  {
    numero: 5,
    action: 'Récépissé & Journal Officiel',
    modalites:
      "Obtenir le récépissé officiel de modification délivré par les services du Ministère de l'Intérieur / Administration du Territoire et procéder à la publication modificative au Journal Officiel.",
  },
]
