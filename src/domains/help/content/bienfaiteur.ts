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
          title: 'Inviter les membres à contribuer par WhatsApp',
          items: [
            'Activez « Préparer les invitations WhatsApp » lors de la création, ou ouvrez « Inviter par WhatsApp » sur la fiche. La collecte doit être publique avec le statut « À venir » ou « En cours ». Un brouillon, une collecte privée, clôturée ou archivée ne permet pas cette invitation.',
            'Sélectionnez les membres, individuellement ou tous ceux qui possèdent un numéro valide. Personnalisez l’introduction et consultez l’aperçu avec le titre, les dates, le lieu et la contribution minimale si elle est renseignée.',
            'Gardez « Proposer de contribuer à la collecte » activé pour ajouter le lien direct vers la collecte sur https://association-le-kara.com. Le membre peut utiliser « Je veux contribuer » ou répondre sur WhatsApp. Vérifiez ensuite la réception du don avant de le confirmer ou de l’enregistrer dans Contributions.',
            'Ouvrez chaque conversation et confirmez l’envoi dans WhatsApp. Le compteur suit uniquement les ouvertures sur la page actuelle. Aucun paiement ni aucune contribution n’est enregistré par cette invitation.',
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
  summary: 'Le suivi des assurances, la prospection des véhicules assurés ailleurs, les relances des prospects et les commissions des assureurs partenaires.',
  pages: [
    { path: '/vehicules', label: 'Véhicules', summary: 'Enregistrer une assurance, valider les déclarations des membres, renouveler et suivre les reversements.' },
    { path: '/vehicules/prospection', label: 'Prospection assurance', summary: 'Enregistrer les véhicules assurés ailleurs, les attribuer à un parrain, préparer les relances et traiter leur échéance.' },
  ],
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
            'Prospection : les véhicules assurés ailleurs et les contacts à relancer pour préparer leur assurance chez LE KARA. Ces prospects ne comptent pas parmi les assurés.',
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
            'Joignez le reçu de paiement si vous l’avez.',
          ],
        },
        {
          type: 'steps',
          title: 'Valider une déclaration de membre',
          items: [
            'Ouvrez l’onglet « À valider » et contrôlez les informations et le reçu transmis par le membre auprès de l’assureur partenaire.',
            'Complétez notamment le parrain, puis corrigez les champs qui diffèrent : la valeur déclarée et la valeur retenue restent visibles des deux côtés.',
            'Cliquez sur « Enregistrer et valider », ou refusez la déclaration avec un motif.',
          ],
        },
        {
          type: 'steps',
          title: 'Renouveler et relancer',
          items: [
            'À l’échéance, utilisez « Renouveler l’assurance » : la nouvelle période est ajoutée à la fiche.',
            'Le bouton WhatsApp envoie au titulaire un rappel avant ou après l’expiration.',
            'Dans son espace, le membre voit l’alerte et peut utiliser « Demander le renouvellement » pour ouvrir une conversation WhatsApp préremplie avec l’association.',
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
        {
          type: 'steps',
          title: 'Enregistrer et attribuer un prospect',
          items: [
            'Sur le site, ouvrez Véhicules puis « Prospection assurance ». Dans l’app mobile, ouvrez l’onglet « Prospection » du module Véhicules.',
            'Choisissez « Nouveau prospect » puis renseignez le contact, son téléphone, la plaque, le type de véhicule, l’assureur actuel et la fin de l’assurance.',
            'Sélectionnez la ville, l’arrondissement et le quartier dans le référentiel Géographie. Pour un véhicule déjà enregistré, ouvrez Modifier pour compléter ce rattachement ; les anciens noms libres ne sont pas devinés. Les statistiques Véhicules et du tableau de bord regroupent les dossiers par identifiant de quartier et par ville. Si vous choisissez « Autre emplacement », précisez le lieu, par exemple un parking ou un garage. Si le véhicule est de type « Autre », décrivez-le aussi.',
            'L’administration choisit le parrain ou « LE KARA — Inconnu » pour une prospection de l’association. Le membre enregistre ses propres prospects depuis Mes véhicules ; il ne peut pas les attribuer à quelqu’un d’autre.',
            'Pour changer le parrain, l’administration utilise « Attribuer le parrainage » avec un motif. Le nouveau parrain retrouve le dossier dans sa liste.',
          ],
        },
        {
          type: 'steps',
          title: 'Relancer un prospect et traiter son échéance',
          items: [
            'Consultez les prospects « À contacter » et les rappels à J−30, J−15, J−7 et le jour d’expiration. L’administration et le membre parrain reçoivent chacun leur notification.',
            'Utilisez le téléphone ou WhatsApp pour joindre le contact, puis « Enregistrer une relance » pour noter le résultat et, si nécessaire, la prochaine date de relance.',
            'Si le contact souhaite passer chez LE KARA, utilisez « Demander une assurance LE KARA » avec un motif. L’administration est avertie pour prendre en charge la demande.',
            'S’il renouvelle ailleurs, choisissez « Renouvelé ailleurs », indiquez l’assureur et une nouvelle échéance postérieure à la précédente. Le prospect reste à suivre et les rappels repartent sur cette nouvelle date.',
            'Si le contact est perdu, utilisez « Clôturer comme perdu » et précisez le motif. Le dossier et son historique restent consultables en lecture seule.',
          ],
        },
        {
          type: 'steps',
          title: 'Rattacher l’assurance LE KARA réellement souscrite',
          items: [
            'L’administration enregistre d’abord l’assurance dans le module Véhicules, avec les informations réelles du titulaire, du véhicule, de la police et de la période assurée. Une déclaration membre doit être validée.',
            'Revenez au prospect et choisissez « Rattacher l’assurance LE KARA ». Sélectionnez une assurance validée de même plaque et de même parrain, dont la fin de couverture est postérieure à l’ancienne échéance.',
            'Indiquez le résultat puis confirmez. Une assurance déjà rattachée à un autre prospect ne peut pas être utilisée.',
            'Le suivi passe à « Assuré chez LE KARA », les rappels de prospection s’arrêtent et le dossier devient consultable en lecture seule. L’historique reste conservé.',
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
            { term: 'Part du parrain', text: 'Un pourcentage de cette commission revient au parrain du dossier ; le titulaire membre peut se désigner lui-même comme parrain et recevoir cette part. Le reste est gardé par LE KARA.' },
            { term: 'Une ligne par période', text: 'Un reversement est créé à la validation, puis à chaque renouvellement.' },
            { term: 'Bilan financier', text: 'Dans le bilan réservé à l’administration, l’onglet Véhicules — Assurances reprend les commissions réellement reçues, la part de KARA, les remises confirmées aux parrains et les sommes restant à leur reverser. La sortie de trésorerie est comptée uniquement après l’enregistrement de la remise et à sa date ; une notification ne vaut pas paiement. Les commissions attendues restent des prévisions et la prime d’assurance est informative. Le détail par période et les exports permettent de retrouver les dossiers concernés.' },
            { term: 'Commission confidentielle', text: 'Les membres ne voient pas la commission de l’assureur.' },
            { term: 'Échéance synchronisée', text: 'Le statut passe automatiquement à « Expire bientôt » dans les 30 derniers jours, puis à « Expirée ». Le membre reçoit aussi les rappels prévus.' },
            { term: 'Prospect et assuré', text: 'Un prospect est un véhicule assuré ailleurs. Sa fiche ne crée ni couverture chez LE KARA ni commission. L’expiration de son assurance et une demande de devis ne le transforment pas automatiquement en assuré.' },
            { term: 'Parrainage de la prospection', text: 'Le membre consulte et suit les prospects qui lui sont attribués. Seule l’administration peut réattribuer un dossier ou confirmer le rattachement à une assurance validée. « LE KARA — Inconnu » désigne les prospects de l’association, sans membre parrain destinataire.' },
            { term: 'Rappels des prospects', text: 'Les rappels sont prévus à J−30, J−15, J−7 et J, ainsi qu’à la date d’une relance enregistrée. Un même rappel n’est pas répété à chaque passage ; un palier manqué est rattrapé. Un renouvellement ailleurs démarre un nouveau suivi d’échéance. Les dossiers assurés chez LE KARA ou perdus ne reçoivent plus de rappels de prospection.' },
            { term: 'Téléphone et WhatsApp', text: 'Les boutons ouvrent les applications correspondantes. Les appels et l’envoi des messages restent manuels : une notification de rappel ne signifie pas que le prospect a déjà été contacté.' },
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
            { question: 'Pourquoi une assurance est-elle encore « À valider » ?', answer: 'Une déclaration faite par un membre doit être contrôlée puis validée par un administrateur. Ouvrez-la, comparez les pièces et utilisez « Enregistrer et valider ».' },
            { question: 'Pourquoi aucun reversement n’est-il calculé ?', answer: 'Vérifiez que l’assureur est configuré comme partenaire avec ses taux, puis que l’assurance ou son renouvellement a été validé.' },
            { question: 'Le membre ne doit pas voir la commission de l’assureur.', answer: 'C’est prévu : la commission partenaire reste confidentielle. Le membre ne voit que les informations et montants qui lui sont destinés.' },
            { question: 'Le membre voit-il les corrections et les pièces ?', answer: 'Oui. Après validation, sa fiche affiche les corrections retenues, le reçu, la prime et l’échéance. Il ne peut plus modifier le dossier validé.' },
            { question: 'Que faire si l’assurance d’un prospect arrive à terme ?', answer: 'Contactez-le puis enregistrez le résultat : demande d’assurance LE KARA, renouvellement ailleurs avec une nouvelle date, ou clôture comme perdu. Le dossier reste à traiter tant que ce résultat n’est pas enregistré ; aucune couverture n’est créée automatiquement.' },
            { question: 'Pourquoi une assurance n’apparaît-elle pas dans le rattachement du prospect ?', answer: 'Elle doit déjà être enregistrée et validée, correspondre à la plaque et au parrain, avoir une date de fin postérieure à l’ancienne échéance et ne pas être rattachée à un autre prospect. Vérifiez ces informations avant de confirmer.' },
            { question: 'Un membre peut-il consulter les prospects des autres membres ?', answer: 'Non. Il voit ses propres prospects et ceux que l’administration lui attribue. Il peut les relancer et demander leur prise en charge, mais ne peut ni changer le parrain ni confirmer lui-même qu’ils sont assurés chez LE KARA.' },
            { question: 'Le prospect est contacté mais reste marqué « À contacter ». Pourquoi ?', answer: 'Ce repère indique que la fin de l’assurance approche. Il ne remplace pas le statut de suivi Contacté ou Assurance LE KARA demandée. Consultez l’historique et la prochaine relance pour savoir ce qui a déjà été fait.' },
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
            { term: 'À verser au parrain', text: 'La commission est reçue ; la part du parrain reste à lui payer.' },
            { term: 'Versé au membre', text: 'Le reversement est terminé.' },
            { term: 'Prospection — À suivre', text: 'Le véhicule est assuré ailleurs et reste dans le portefeuille de prospection.' },
            { term: 'Prospection — Contacté', text: 'Une relance et son résultat ont été enregistrés.' },
            { term: 'Prospection — Assurance LE KARA demandée', text: 'Le contact souhaite une prise en charge par l’administration. Ce statut ne prouve pas qu’une assurance est souscrite.' },
            { term: 'Prospection — Assuré chez LE KARA', text: 'L’administration a rattaché une assurance validée correspondante. Le suivi est clôturé et les rappels de prospection s’arrêtent.' },
            { term: 'Prospection — Prospect perdu', text: 'Le suivi commercial est clôturé avec un motif ; le dossier et son historique sont conservés.' },
            { term: 'Prospection — À contacter / Échéance dépassée', text: 'Ces repères signalent l’urgence liée à la date de fin. Ils ne créent pas d’assurance et ne clôturent pas le suivi.' },
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
    {
      kind: 'faq',
      blocks: [
        {
          type: 'faq',
          items: [
            { question: 'Pourquoi une boutique ou un article n’apparaît-il pas aux membres ?', answer: 'Il est encore en attente, a été refusé ou est masqué. La boutique et chaque article doivent être validés.' },
            { question: 'Une boutique publiée est-elle automatiquement partenaire du crédit ?', answer: 'Non. Le partenariat d’achat à crédit est activé séparément, avec la remise négociée avec l’association.' },
            { question: 'Que faut-il vérifier avant de valider un article ?', answer: 'Contrôlez le nom, la description, le prix, les photos et la disponibilité. Le prix validé sert ensuite au financement de l’achat à crédit.' },
          ],
        },
      ],
    },
  ],
}
