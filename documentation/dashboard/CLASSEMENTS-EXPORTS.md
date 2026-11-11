# Classements complets et exports du dashboard

Les cartes présentent dix lignes. « Voir plus » ouvre toutes les lignes, avec recherche et pagination de vingt résultats. La recherche conserve les positions d’origine. Le serveur ne coupe plus les classements à dix : toutes les lignes des sources déjà lues sont conservées, sans nouvelle requête par personne.

« Exporter la section » produit une synthèse des indicateurs, répartitions, notes et classements complets de l’onglet actif. Chaque classement possède sa feuille Excel et son chapitre PDF. « Exporter le classement » contient tous les résultats de la recherche, jamais seulement la page affichée.

Les exports reprennent le filtre de période, le type de membre, la province, la ville et la comparaison de modules, ainsi que la date réelle de génération des données, au fuseau de Libreville. Les stocks et les indicateurs « ce mois » restent liés à cette date ; chaque description précise la base du classement. Les valeurs Excel sont numériques, les dates récentes ne sont pas présentées comme des montants et les liens Excel renvoient aux fiches administratives sur l’origine courante.

## Garants

Les onglets Crédit spécial, Crédit fixe et Caisse aide distinguent :

- Nombre de contrats finalisés, selon la date de décaissement ou, à défaut, de création, dans la période.
- Gains réellement reçus : documents `guarantorPayments`, à leur `paymentDate`, sur les contrats de la section. Aucune rémunération calculée ou prévue ne fait office de paiement.

Le périmètre reste celui des emprunteurs de l’onglet ; les identités des garants sont résolues dans l’annuaire complet, même lorsqu’ils habitent ailleurs. Un paiement reste attribué à son bénéficiaire historique si le garant du contrat change. Les identifiants et matricules sont rapprochés, les doublons de paiement ignorés et INCONNU / LE KARA exclu des tops rémunérés.

## Parrains véhicules

L’onglet Véhicules lit les dossiers `vehicle-insurances` et les opérations `vehicleInsuranceRewards`. Ses filtres de type et de zone portent sur les parrains, ce qui permet de conserver les assurances de titulaires non membres.

- Apports : un dossier validé compte une fois, à sa validation ou sa création pour les saisies admin historiques. Les opérations de renouvellement ne créent pas un nouvel apport.
- Commissions du parrain : `memberAmount` uniquement lorsqu’une réception assureur positive et datée existe et que `memberPayment.paidAt` confirme une remise postérieure ou égale à cette réception. Le bénéficiaire de l’opération reste la référence historique.
- Part acquise à KARA : montant effectivement reçu de l’assureur moins part réservée au parrain, au mois de réception. La remise ultérieure ne crée aucune nouvelle charge.
- Reste à reverser : parts réservées moins remises confirmées depuis l’origine, à la date du calcul. Les primes, montants attendus et statuts seuls ne sont pas des gains reçus.

Les exports utilisent les données du snapshot déjà autorisé par la session admin ; ils n’effectuent aucune lecture supplémentaire de la base et ne modifient aucun dossier.
