import type { HelpTopic } from '../entities/help.types'

export const adhesionsHelp: HelpTopic = {
  key: 'adhesions',
  title: 'Demandes d’adhésion',
  category: 'Membres',
  summary: 'Les dossiers des personnes qui veulent rejoindre LE KARA : paiement de l’adhésion, corrections, approbation ou rejet.',
  pages: [
    { path: '/membership-requests', label: 'Demandes d’adhésion', summary: 'Traiter les dossiers : payer, demander des corrections, approuver ou rejeter.' },
    { path: '/memberships/add', label: 'Nouvelle demande', summary: 'Saisir le dossier d’adhésion d’une personne à sa place.' },
    { path: '/memberships/update', label: 'Modifier une demande', summary: 'Corriger les informations d’un dossier d’adhésion.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Chaque personne qui veut devenir membre remplit un dossier : identité, contacts, adresse, profession, pièce d’identité et photo. Le dossier arrive ici. L’admin enregistre le paiement de l’adhésion, vérifie le dossier, puis l’approuve : la personne devient membre et reçoit ses identifiants de connexion.',
        },
        {
          type: 'list',
          items: [
            'Les indicateurs en haut comptent les dossiers par statut et par paiement (payés, non payés).',
            'La recherche trouve un dossier par nom, e-mail, téléphone, identifiant de la demande ou matricule.',
            'Deux affichages : en liste ou en grille. Les dossiers s’exportent en Excel ou en PDF.',
            'L’onglet des doublons regroupe les dossiers qui partagent un téléphone, un e-mail ou un numéro de pièce d’identité.',
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Traiter un dossier',
          items: [
            'Ouvrez le dossier et vérifiez les informations, la photo et la pièce d’identité (recto et verso).',
            'Enregistrez le paiement : date, heure, montant (10 300 FCFA par défaut), moyen de paiement, avec ou sans frais, et la preuve.',
            'Cliquez sur « Approuver » : choisissez le type de membre (adhérent, bienfaiteur ou sympathisant) et joignez la fiche d’adhésion signée, en PDF.',
            'Le PDF des identifiants de connexion se télécharge : remettez-le au nouveau membre.',
          ],
        },
        {
          type: 'steps',
          title: 'Demander des corrections',
          items: [
            'Dans « Plus d’actions », choisissez « Demander des corrections » et écrivez une correction par ligne.',
            'Le dossier passe « En cours d’examen ». Envoyez au demandeur, par WhatsApp, le lien et le code de sécurité à 6 chiffres.',
            'Le code est valable 48 heures. S’il a expiré, régénérez-le : l’ancien code ne fonctionne plus.',
          ],
        },
        {
          type: 'steps',
          title: 'Rejeter, réouvrir, supprimer',
          items: [
            'Rejeter : indiquez le motif ; il peut être envoyé au demandeur par WhatsApp.',
            'Un dossier rejeté peut être réouvert, avec une justification : il revient en attente.',
            'Un dossier rejeté peut aussi être supprimé définitivement, en recopiant son matricule pour confirmer.',
          ],
        },
        {
          type: 'steps',
          title: 'Traiter les doublons',
          items: [
            'Une alerte signale les dossiers en doublon. Ouvrez l’onglet des doublons.',
            'Comparez les dossiers du groupe, supprimez celui qui est en trop si besoin, puis confirmez la résolution.',
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
            { term: 'Payer avant d’approuver', text: 'Le bouton « Approuver » reste grisé tant que le paiement de l’adhésion n’est pas enregistré.' },
            { term: 'Fiche d’adhésion', text: 'Le PDF signé est obligatoire à l’approbation. Il reste consultable et peut être remplacé ensuite.' },
            { term: 'Identifiants', text: 'À l’approbation, un compte de connexion (e-mail et mot de passe) est créé pour le membre. Si le membre les perd, « Générer les identifiants » réinitialise son mot de passe et produit un nouveau PDF.' },
            { term: 'Abonnement', text: 'L’approbation crée le premier abonnement du membre, valable un an.' },
          ],
        },
      ],
    },
    {
      kind: 'statuses',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'En attente', text: 'Dossier reçu, à payer puis à approuver.' },
            { term: 'En cours d’examen', text: 'Des corrections ont été demandées : on attend que le demandeur les fasse avec son code.' },
            { term: 'Approuvée', text: 'La personne est membre.' },
            { term: 'Rejetée', text: 'Dossier refusé, en lecture seule ; il peut être réouvert ou supprimé.' },
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
              question: 'Pourquoi je ne peux pas approuver ce dossier ?',
              answer: 'Le paiement de l’adhésion n’est pas encore enregistré, ou le dossier n’est plus « En attente » (corrections demandées, déjà approuvé ou rejeté).',
            },
            {
              question: 'Le demandeur n’a pas reçu son code de correction.',
              answer: 'Ouvrez le dossier, copiez le lien de correction ou renvoyez-le par WhatsApp. Si le code a expiré, régénérez-le.',
            },
          ],
        },
      ],
    },
  ],
}

export const membresHelp: HelpTopic = {
  key: 'membres',
  title: 'Membres',
  category: 'Membres',
  summary: 'La liste des membres de LE KARA et la fiche de chacun : identité, abonnement, contrats, paiements, documents et filleuls.',
  pages: [
    { path: '/memberships', label: 'Membres', summary: 'Retrouver un membre, voir sa fiche, ses contrats, ses paiements et ses documents.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Cette section regroupe toutes les personnes dont l’adhésion a été approuvée. Trois onglets : la liste des membres, les véhicules des membres et les anniversaires.',
        },
        {
          type: 'text',
          text: 'Chaque membre a un type, choisi à l’approbation de son adhésion : adhérent, bienfaiteur ou sympathisant. Ce type sert de filtre ici et dans le tableau de bord.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Retrouver un membre',
          items: [
            'Cherchez par nom, matricule ou téléphone.',
            'Filtrez par type de membre, par abonnement (valide, expiré, sans abonnement) ou par sexe.',
            'Ouvrez sa fiche depuis la liste.',
          ],
        },
        {
          type: 'list',
          items: [
            'Fiche du membre : identité, contacts, adresse et position, profession, bénéficiaire, pièce d’identité.',
            'Contrats : ses contrats de caisse spéciale, caisse imprévue, crédits et placements, avec un lien vers chacun.',
            'Paiements, abonnements et documents (fiche d’adhésion, pièces, contrats PDF).',
            'Filleuls : les personnes qu’il a parrainées avec son code d’intermédiaire.',
            'Rémunérations : les commissions qu’il a gagnées comme garant de crédits spéciaux.',
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
            { term: 'Matricule', text: 'Identifiant unique du membre, attribué à l’adhésion. Il sert à le retrouver partout.' },
            { term: 'Abonnement', text: 'Valable un an. Un membre dont l’abonnement a expiré apparaît dans « Expirés ».' },
            { term: 'Position', text: 'La latitude et la longitude de son domicile, si elles ont été relevées.' },
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
              question: 'Comment ajouter un membre ?',
              answer: 'Un membre s’ajoute par une demande d’adhésion : « Nouvelle demande » dans Demandes d’adhésion, puis paiement et approbation.',
            },
            {
              question: 'Un membre a perdu son mot de passe.',
              answer: 'Dans Demandes d’adhésion, ouvrez son dossier approuvé et utilisez « Générer les identifiants » : un nouveau mot de passe est créé dans un PDF à lui remettre.',
            },
          ],
        },
      ],
    },
  ],
}

export const anniversairesHelp: HelpTopic = {
  key: 'anniversaires',
  title: 'Anniversaires',
  category: 'Membres',
  summary: 'Les anniversaires des membres, du jour et à venir, avec l’envoi des vœux par WhatsApp.',
  pages: [
    { path: '/memberships/anniversaires', label: 'Anniversaires', summary: 'Voir qui fête son anniversaire et lui envoyer un message.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'list',
          items: [
            'Les anniversaires sont regroupés : aujourd’hui, cette semaine, à venir ce mois-ci, passés récemment.',
            'Une vue calendrier et une vue liste ; le filtre par mois affiche un ou plusieurs mois.',
            'Pour chaque membre : date de naissance, prochain anniversaire et nombre de jours restants.',
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Souhaiter un anniversaire',
          items: [
            'Cliquez sur le bouton WhatsApp du membre.',
            'Le message d’anniversaire s’ouvre dans WhatsApp, déjà rempli ; envoyez-le.',
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Le texte du message se modifie dans Système > Modèles de messages. La liste s’exporte en Excel ou en PDF.',
        },
      ],
    },
  ],
}

export const historiquesHelp: HelpTopic = {
  key: 'historiques',
  title: 'Historiques des paiements et des contrats',
  category: 'Membres',
  summary: 'Tous les paiements d’un membre ou d’une demande, et tous les contrats PDF signés, au même endroit.',
  pages: [
    { path: '/payments-history', label: 'Historique des paiements', summary: 'Les paiements d’un dossier, tous modules confondus.' },
    { path: '/contracts-history', label: 'Historique des contrats', summary: 'Les contrats PDF de chaque membre : adhésion, caisse spéciale, caisse imprévue.' },
  ],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Historique des paiements', text: 'Pour un membre ou une demande : adhésion, abonnements, caisses, crédits, placements, dons. Il s’ouvre depuis la fiche du membre ou le dossier d’adhésion.' },
            { term: 'Historique des contrats', text: 'La liste des membres avec leurs documents PDF, classés par onglet : adhésions, caisse spéciale, caisse imprévue.' },
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Retrouver un contrat signé',
          items: [
            'Ouvrez l’historique des contrats et cherchez le membre par nom, matricule ou téléphone.',
            'Ouvrez sa fiche, choisissez l’onglet du module, puis affichez ou téléchargez le PDF.',
            'Les filtres limitent la liste par type de document, par format et par période.',
          ],
        },
      ],
    },
  ],
}
