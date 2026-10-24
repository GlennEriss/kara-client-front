import type { HelpTopic } from '../entities/help.types'

export const charitesHelp: HelpTopic = {
  key: 'charites',
  title: 'Charités',
  category: 'Bienfaiteur',
  summary: 'Les évènements de charité (récollections) : participants, contributions en argent ou en nature, groupes et médias.',
  pages: [{ path: '/bienfaiteur', label: 'Charités', summary: 'Créer un évènement de charité, enregistrer les contributions et suivre la collecte.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Un évènement de charité rassemble les dons des membres et des groupes pour une cause, à un lieu et à des dates donnés. Sa fiche montre le montant collecté, l’objectif, le nombre de contributions, de participants et de groupes.',
        },
        {
          type: 'definitions',
          items: [
            { term: 'Contributions', text: 'Chaque don reçu : en argent (montant, moyen de paiement) ou en nature (description du don, valeur estimée).' },
            { term: 'Participants', text: 'Les membres et les groupes qui ont contribué, avec le total de chacun.' },
            { term: 'Groupes', text: 'Les groupes de membres qui participent ensemble.' },
            { term: 'Médias', text: 'Les photos et vidéos de l’évènement.' },
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Créer un évènement',
          items: [
            'Cliquez sur « Créer un évènement » : titre, description, lieu, dates de début et de fin.',
            'Si besoin, fixez une contribution minimale, un objectif de collecte et une photo de couverture.',
            'Choisissez sa visibilité : public ou privé.',
          ],
        },
        {
          type: 'steps',
          title: 'Enregistrer une contribution',
          items: [
            'Dans l’onglet Contributions, ajoutez une contribution.',
            'Choisissez le contributeur (membre ou groupe) et le type : argent ou nature.',
            'Renseignez le montant et le moyen de paiement, ou la description du don et sa valeur estimée, puis la date et la preuve.',
            'Un reçu PDF est produit pour la contribution.',
          ],
        },
        {
          type: 'steps',
          title: 'Traiter les déclarations des membres',
          items: [
            'Depuis leur espace, les membres peuvent déclarer une contribution. Les déclarations en attente s’affichent en tête de l’onglet Contributions.',
            'Confirmez-la (la contribution est alors enregistrée) ou refusez-la.',
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
            { term: 'Brouillon', text: 'En préparation.' },
            { term: 'À venir', text: 'Annoncé, pas encore commencé.' },
            { term: 'En cours', text: 'La collecte est ouverte. Ce statut ne se choisit que depuis Brouillon ou À venir.' },
            { term: 'Terminé', text: 'L’évènement est passé.' },
            { term: 'Archivé', text: 'Rangé, conservé pour l’historique.' },
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
              question: 'Une contribution en nature compte-t-elle dans le total collecté ?',
              answer: 'Oui, pour sa valeur estimée. Sans valeur estimée, elle compte comme contribution mais n’ajoute rien au montant collecté.',
            },
            {
              question: 'Comment lier un évènement de charité à un évènement de la communauté ?',
              answer: 'Dans Événements, au moment de créer ou modifier l’évènement, choisissez la collecte associée. L’argent reste suivi ici.',
            },
          ],
        },
      ],
    },
  ],
}

export const vehiculesHelp: HelpTopic = {
  key: 'vehicules',
  title: 'Véhicules',
  category: 'Bienfaiteur',
  summary: 'Le suivi des assurances des véhicules des membres et des personnes qu’ils parrainent, et les commissions des assureurs partenaires.',
  pages: [{ path: '/vehicules', label: 'Véhicules', summary: 'Enregistrer une assurance, valider les déclarations des membres, renouveler et suivre les reversements.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Chaque fiche décrit une assurance : le titulaire, le véhicule (type, marque, modèle, année, plaque, énergie, puissance fiscale), l’assureur, le numéro de police, la prime et la période de validité.',
        },
        {
          type: 'list',
          items: [
            'Assurances : toutes les assurances validées, avec leurs dates de fin.',
            'À valider : les assurances déclarées par les membres depuis leur espace.',
            'Reversements : la commission de l’assureur sur chaque période et la part reversée au membre.',
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Enregistrer une assurance',
          items: [
            'Cliquez sur « Ajouter l’assurance » et choisissez le titulaire : un membre, ou une personne non membre parrainée par un membre.',
            'Renseignez le véhicule, l’assureur, la police, la prime, les dates de début et de fin.',
            'Joignez la police et le reçu si vous les avez.',
          ],
        },
        {
          type: 'steps',
          title: 'Valider une déclaration de membre',
          items: [
            'Ouvrez l’onglet « À valider » et vérifiez la déclaration auprès de l’assureur partenaire.',
            'Corrigez les champs qui diffèrent : la valeur déclarée et la valeur retenue restent visibles.',
            'Cliquez sur « Enregistrer et valider », ou refusez la déclaration avec un motif.',
          ],
        },
        {
          type: 'steps',
          title: 'Renouveler et relancer',
          items: [
            'À l’échéance, utilisez « Renouveler l’assurance » : la nouvelle période est ajoutée à la fiche.',
            'Le bouton WhatsApp envoie au titulaire un rappel avant ou après l’expiration.',
          ],
        },
        {
          type: 'steps',
          title: 'Suivre un reversement',
          items: [
            'Quand l’assureur paie sa commission, enregistrez le montant reçu, la date et la référence.',
            'Versez ensuite sa part au membre : date, moyen de paiement, référence et preuve.',
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
            { term: 'Commission', text: 'L’assureur partenaire verse à LE KARA un pourcentage de la prime. Le taux est enregistré pour chaque assureur.' },
            { term: 'Part du membre', text: 'Un pourcentage de cette commission revient au membre qui a enregistré le véhicule ; le reste est gardé par LE KARA.' },
            { term: 'Une ligne par période', text: 'Un reversement est créé à la validation, puis à chaque renouvellement.' },
            { term: 'Commission confidentielle', text: 'Les membres ne voient pas la commission de l’assureur.' },
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
            { term: 'Active', text: 'L’assurance court encore plus de 30 jours.' },
            { term: 'Expire bientôt', text: 'Elle se termine dans les 30 jours.' },
            { term: 'Expirée', text: 'Sa date de fin est passée.' },
            { term: 'Commission à recevoir', text: 'Reversement en attente du paiement de l’assureur.' },
            { term: 'À verser au membre', text: 'La commission est reçue ; la part du membre reste à lui payer.' },
            { term: 'Versé au membre', text: 'Le reversement est terminé.' },
          ],
        },
      ],
    },
  ],
}

export const boutiquesHelp: HelpTopic = {
  key: 'boutiques',
  title: 'Boutiques',
  category: 'Bienfaiteur',
  summary: 'L’annuaire des commerces des membres, visible par tous les membres, et les achats à crédit dans les boutiques partenaires.',
  pages: [{ path: '/boutiques', label: 'Boutiques', summary: 'Valider les boutiques et leurs articles, gérer les partenariats d’achat à crédit.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Les membres présentent leur commerce depuis leur espace : nom, spécialité, description, contacts, localisation, horaires et photos. Une fois validée, la boutique apparaît dans l’annuaire des membres.',
        },
        {
          type: 'definitions',
          items: [
            { term: 'À valider', text: 'Les boutiques soumises par les membres et les modifications qu’ils proposent sur une boutique déjà publiée.' },
            { term: 'Publiées', text: 'Validées et visibles dans l’annuaire.' },
            { term: 'Masquées', text: 'Refusées ou retirées de l’annuaire.' },
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Valider une boutique',
          items: [
            'Ouvrez l’onglet « À valider » et examinez la fiche.',
            'Validez-la, ou refusez-la avec un motif : le membre le reçoit et peut corriger puis resoumettre.',
            'Pour une modification proposée, seuls les champs qui changent sont montrés, avant et après.',
          ],
        },
        {
          type: 'steps',
          title: 'Ouvrir l’achat à crédit',
          items: [
            'Sur la boutique, ouvrez « Achat à crédit » et indiquez la remise accordée à l’association (0 à 99 %).',
            'Validez les articles proposés par le propriétaire : leur prix engage l’association.',
            'Les membres peuvent alors acheter ces articles à crédit.',
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
            { term: 'Règlement du vendeur', text: 'L’association paie le vendeur : le prix moins la remise négociée.' },
            { term: 'Remboursement', text: 'Le membre rembourse l’association en 2 ou 3 mensualités égales. L’intérêt est appliqué une seule fois, sans partie fixe, mois de repos ni rajout.' },
            { term: 'Gain de l’association', text: 'Les remises obtenues des vendeurs plus les intérêts payés par les membres.' },
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'Le suivi « Ventes » montre, par boutique partenaire, ce que l’association a financé, versé aux vendeurs, ce qui reste à verser et ce qui a été remboursé.',
        },
      ],
    },
  ],
}
