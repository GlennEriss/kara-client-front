import type { HelpTopic } from '../entities/help.types'

export const evenementsHelp: HelpTopic = {
  key: 'evenements',
  title: 'Événements',
  category: 'Vie de l’association',
  summary: 'Les événements organisés par l’association (assemblées, fêtes, formations, actions caritatives), avec un sondage de lieu si besoin.',
  pages: [{ path: '/events', label: 'Événements', summary: 'Créer et publier un événement, ouvrir un sondage de lieu et confirmer le lieu choisi.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Un événement a un titre, une description, un type, des dates et une affiche. Son lieu est soit fixé dès la création, soit choisi par les membres grâce à un sondage.',
        },
        {
          type: 'list',
          items: [
            'Les onglets trient les événements : à venir, sondages, brouillons, passés, annulés.',
            'Les types : assemblée, célébration, formation, action caritative, autre.',
            'Un événement peut être lié à une collecte de la section Charités ; l’argent y reste suivi.',
          ],
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Créer un événement',
          items: [
            'Cliquez sur « Nouvel événement » et remplissez les informations générales, les dates et l’affiche (JPG, PNG, WebP ou GIF, 5 Mo au plus).',
            'Pour un lieu fixé, indiquez son nom et son adresse.',
            'Pour un sondage, proposez de 2 à 8 lieux et fixez la date et l’heure de clôture du sondage.',
            'Enregistrez en brouillon, ou publiez pour que les membres le voient.',
          ],
        },
        {
          type: 'steps',
          title: 'Clore un sondage',
          items: [
            'Ouvrez l’événement : les résultats montrent le nombre de voix et le pourcentage de chaque lieu, et qui a voté quoi.',
            'Cliquez sur « Confirmer le lieu de l’événement » et choisissez le lieu retenu : il devient le lieu officiel.',
          ],
        },
        {
          type: 'steps',
          title: 'Annuler un événement',
          items: ['Cliquez sur « Annuler l’événement » et indiquez la raison : elle est affichée sur l’événement.'],
        },
      ],
    },
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Qui vote', text: 'Les membres dont l’abonnement est actif, depuis leur espace.' },
            { term: 'Une voix par membre', text: 'Un membre peut changer son vote tant que le sondage est ouvert.' },
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
            { term: 'Brouillon', text: 'Non visible des membres.' },
            { term: 'À venir', text: 'Publié, avec un lieu fixé.' },
            { term: 'Sondage en cours', text: 'Publié ; les membres votent pour le lieu.' },
            { term: 'En cours', text: 'Le sondage est clos et le lieu officiel est choisi.' },
            { term: 'Terminé', text: 'L’événement est passé.' },
            { term: 'Annulé', text: 'L’événement n’aura pas lieu ; la raison est conservée.' },
          ],
        },
      ],
    },
  ],
}

export const documentsAssociationHelp: HelpTopic = {
  key: 'documents-association',
  title: 'Documents de l’association',
  category: 'Vie de l’association',
  summary: 'Les Statuts et le Règlement intérieur de LE KARA : consultation, remplissage, signature et publication aux membres.',
  pages: [{ path: '/statuts', label: 'Documents de l’association', summary: 'Consulter, remplir, signer et publier les Statuts et le Règlement intérieur.' }],
  sections: [
    {
      kind: 'purpose',
      blocks: [
        {
          type: 'text',
          text: 'Les deux textes de l’association, en PDF. Le Comité exécutif y renseigne le lieu et la date d’adoption et les signataires, signe numériquement, puis publie : l’espace membre affiche alors le document daté et signé.',
        },
      ],
    },
    {
      kind: 'howto',
      blocks: [
        {
          type: 'steps',
          title: 'Publier un document signé',
          items: [
            'Choisissez le document : Statuts ou Règlement intérieur.',
            'À gauche, remplissez l’adoption (lieu, date) et les noms des signataires ; ajoutez les signatures numériques.',
            'L’aperçu PDF, à droite, se met à jour au fur et à mesure.',
            'Publiez : cette version remplace la précédente pour les membres. Vous pouvez aussi télécharger le PDF.',
          ],
        },
        {
          type: 'note',
          tone: 'info',
          text: 'À l’ouverture, la page reprend la version publiée : on la corrige sans tout ressaisir. Le remplissage se fait depuis un ordinateur.',
        },
      ],
    },
    {
      kind: 'rules',
      blocks: [
        {
          type: 'definitions',
          items: [
            { term: 'Dernière version', text: 'C’est toujours le dernier texte publié qui fait foi.' },
            { term: 'Agent de recouvrement', text: 'Il consulte les documents, sans les remplir, les télécharger ni les publier.' },
          ],
        },
      ],
    },
  ],
}
