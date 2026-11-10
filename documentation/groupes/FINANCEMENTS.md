# Financement des projets par crédit fixe ou spécial

## Garant et demande collective

Chaque nouveau groupe désigne un garant parmi les membres Kara identifiés, même d’un autre groupe, ou sélectionne « Contact inconnu ». Cette option réutilise uniquement le compte INCONNU existant (`2548.MK.290126`), qui représente LE KARA et n’ouvre droit à aucune commission. Le référent est un rôle distinct. Les groupes historiques restent lisibles et peuvent renseigner leur garant dans les informations du groupe. Modifier ce garant ne modifie aucune demande ni aucun contrat existant.

**Demande collective de crédit fixe** ouvre le montant total (prérempli avec le budget estimé), la date souhaitée et le motif. Les participants du projet sont sélectionnés par défaut. Les parts égales sont modifiables ; les francs restants sont répartis dans l’ordre affiché. Chaque part est un entier de 1 000 à 10 000 000 FCFA et leur somme doit correspondre exactement au total. Changer le total ou la sélection recalcule les parts égales.

Le garant du groupe est repris sur chaque demande. S’il emprunte, un autre garant doit garantir sa part : un membre Kara ou INCONNU. Le récapitulatif affiche chaque membre, son capital demandé et son garant avant confirmation.

La confirmation crée des demandes `FIXE` ordinaires, statut `PENDING`, en une transaction. Aucun contrat ni aucun paiement n’est créé. Les vérifications de participation et de garant sont refaites dans la transaction ; un profil incomplet bloque tout le lot. Chaque demande suit ensuite sa propre approbation, simulation et signature. Le score, s’il n’est pas encore renseigné, est calculé par le parcours existant à la création du contrat.

`groupProject.collectiveRequestId` relie les demandes d’un même lot et est conservé dans les contrats. Le groupe stocke uniquement une référence de lot, l’identifiant de projet et le nombre de demandes pour éviter les doublons après une reprise réseau. Les montants et emprunteurs ne sont pas copiés dans ce marqueur. Une référence réutilisée avec une autre répartition est refusée. Un nouveau lot explicite reste possible pour un financement ultérieur.

## Parcours administrateur

Dans la fiche d’un projet, **Financement du projet** permet de choisir un participant et un **Type de financement**, puis les actions ci-dessous. Le crédit fixe est présélectionné et recommandé pour un achat au budget défini : intérêt calculé une seule fois, total connu dès le départ. Le crédit spécial reste disponible selon les droits de l’admin. Ce choix ne modifie jamais le type ou les conditions des contrats déjà liés. Une caisse collective sans avance de l’association ne nécessite aucun crédit.

Actions :

- **Nouvelle demande de crédit** : ouvre le formulaire existant, prérempli et verrouillé sur ce participant et sur le type sélectionné (fixe ou spécial). L’approbation, la simulation, la création et la signature du contrat suivent le parcours individuel habituel. Le rattachement est transmis automatiquement de la demande au contrat.
- **Rattacher un contrat existant** : propose les crédits non rattachés du type sélectionné du participant, avec confirmation. Le participant doit toujours appartenir au groupe et au projet au moment de la transaction.
- **Détacher** : retire uniquement le rattachement de la demande ou du contrat après confirmation. Le contrat, la dette et les paiements sont conservés. Détacher une demande dont le contrat vient d’être créé invite à actualiser puis à détacher le contrat, afin de conserver la cohérence des deux fiches.

Les noms du groupe et du projet sont visibles dans les fiches de demande et de contrat. Le groupe conserve l’auteur, la date et une description des créations, rattachements et détachements dans son historique.

La consultation et les totaux sont filtrés par type autorisé (`creditFixe.view`, `creditSpeciale.view`). La création, le rattachement et le détachement nécessitent aussi `groups.manage` et le droit de création du type concerné (`creditFixe.create`, `creditSpeciale.create`). Un projet terminé ou annulé reste consultable, mais n’accepte plus de nouveau financement. Retirer un participant du groupe ne détache pas ses contrats et n’annule aucune dette.

## Données et calculs

### Fréquence des caisses collectives

Le cycle accepte `MONTHLY` (par défaut pour les anciens cycles), `DAILY` et `WEEKLY`. Le montant s’entend par membre et par période, avec une prise par période. Le mensuel conserve `startMonth`, `months` et `dueDay` ; les nouveaux rythmes utilisent `startDate` et `periodCount` (1 à 400). Le journalier inclut les week-ends ; l’hebdomadaire avance de 7 jours à partir de la première date choisie.

Les périodes mensuelles conservent leurs identifiants `YYYY-MM`. Les jours et semaines utilisent la date exacte de leur échéance, `YYYY-MM-DD`. Les identifiants de cotisation et de remise incluent cette période : plusieurs prises dans un même mois restent distinctes, avec une seule remise définitive par période. La configuration est verrouillée à la première opération.

L’ordre de récupération suggère un bénéficiaire pour chaque position du cycle, indépendamment de sa fréquence. L’admin vérifie ce choix ; au-delà des positions disponibles, il doit sélectionner le bénéficiaire. La redevance reste facultative et s’applique à chaque remise. Le crédit fixe affecté à une cotisation reste un contrat distinct, dont la durée n’est pas changée par la fréquence de la caisse.

L’espace membre lit les mêmes périodes et ne renvoie que les cotisations et remises du membre connecté. Le bilan financier continue de compter les dates réelles des mouvements dans leur mois ; les nouveaux rythmes ne créent aucune seconde recette. Aucun changement des règles Firestore n’est nécessaire : les écritures restent administratives et les remises immuables.

Le champ facultatif `groupProject` des documents `creditDemands` et `creditContracts` porte `groupId`, `projectId`, les noms enregistrés du groupe et du projet, la date et l’auteur du rattachement. `null` signifie que le rattachement a été retiré. Un contrat ne peut appartenir qu’à un seul projet à la fois. Seuls les crédits FIXE et SPECIALE sont acceptés. Le type de la demande et celui du contrat doivent correspondre.

Les créations liées et les changements de rattachement sont transactionnels. La création du contrat vérifie à nouveau la participation et réserve la demande approuvée dans la même transaction. Une référence déjà utilisée n’est pas écrasée. Les anciennes références emprunteur par matricule sont résolues avant validation dans la transaction.

Le récapitulatif additionne les moteurs Crédit fixe et Crédit spécial du bilan financier, chacun appliqué uniquement à ses propres contrats : fonds réellement remis depuis l’ouverture, remboursements, reste dû à ce jour, intérêts et pénalités encaissés. Il inclut l’histoire du contrat antérieure au rattachement. Les contrats en préparation ne sont pas comptés comme des décaissements. Le contexte parent/enfant des anciens rajouts est conservé pour calculer les transferts sans compter deux fois les fonds.

Les documents financiers restent dans leurs collections existantes. Aucune dette, aucun versement et aucun revenu ne sont dupliqués dans le groupe. Les cotisations mensuelles ont leur propre suivi décrit ci-dessous. La redevance facultative des caisses collectives est suivie sur chaque remise effective ; le tirage ne crée aucune avance ni remise.

Les lectures utilisent des filtres simples : `groupProject.groupId`, `clientId`, `creditId`, `parentContractId`, et des lectures d’identifiants par lots. Aucun index composite nouveau n’est nécessaire.

## Portail membre et règles

Le portail membre lit uniquement les contrats et demandes dont `clientId` correspond à l’UID ou au matricule de l’utilisateur de session. L’API projette ensuite ses seules participations liées au groupe et au projet : identifiant interne, statut, part, total prévu, montants déjà versés et restant à verser, prochaine échéance lorsqu’elle est enregistrée. Le type de crédit reste un filtre interne au serveur et n’est pas exposé dans ce DTO. Elle ne renvoie aucun auteur de rattachement, aucune preuve, ni les crédits des autres participants. L’API du groupe reste conditionnée à l’appartenance au groupe.

Dans l’interface membre, « Ma participation » conserve ce suivi dans le groupe. Aucun libellé « crédit fixe / spécial », aucune référence technique et aucun lien vers une fiche de crédit n’est affiché. Les demandes en préparation restent des participations proposées, sans reste à verser ni échéance exigible. Le lexique associatif est centralisé dans `shared/constantes/lexique.ts` du portail membre.

Un membre ne peut pas renseigner `groupProject` lors de la création de sa demande. La modification d’un contrat ou du rattachement reste réservée à l’admin par les règles Firestore. Le membre conserve la possibilité habituelle d’annuler sa propre demande en attente.

## Vérification

```sh
pnpm exec vitest run src/domains/groups/__tests__ src/components/groups/__tests__ src/services/credit-speciale/__tests__/CreditSpecialeService.project.test.ts src/domains/financial/reports/__tests__ src/domains/help/__tests__/help.test.ts
pnpm test:rules:groups
pnpm exec tsc --noEmit --incremental false
```


## Cotisations mensuelles et financement d’un mois

L’admin configure le cycle d’un projet Caisse collective : montant entier de 1 000 à 10 000 000 FCFA par participant, premier mois, durée de 1 à 60 mois et jour d’échéance de 1 à 31 (plafonné à la fin des mois courts). Les mois et les participants sont photographiés dans `project.contributionPlan`. Les échéances non encore traitées sont calculées sans création massive de documents. La première opération verrouille le cycle ; une autre composition ou période se gère dans un autre projet.

Chaque opération matérialise `groups/{groupId}/contributions/{projectId}__{period}__{memberId}`. Le document contient le montant attendu, les versements datés et leur auteur, ainsi que les références éventuelles de demande/contrat. Les versements directs sont partiels ou complets, positifs et au plus égaux au solde. La date réelle ne peut pas être future (heure de Libreville). Une référence de versement réessayée avec le même contenu ne crée pas de doublon ; un contenu différent est refusé.

« Financer par crédit fixe » crée une demande ordinaire avec `groupProject.contributionId` et `contributionPeriod`. La transaction contrôle le participant enregistré dans le cycle, son appartenance actuelle au groupe, le mois, le solde exact et un garant distinct de l’emprunteur, membre Kara ou compte INCONNU de LE KARA. Une modification ultérieure des participants du projet ne supprime pas les échéances du cycle et ne bloque pas leur financement pour un membre encore dans le groupe. Elle réserve le mois, sans le payer. La création du contrat conserve ce lien et ne paie toujours rien. Un versement direct pendant une réservation active est refusé ; l’admin peut d’abord détacher le dossier non affecté, ce qui libère le mois sans supprimer le dossier.

Après signature et activation du contrat fixe, « Confirmer la prise en charge » enregistre l’affectation effective de son capital au solde du mois. La transaction vérifie le contrat signé du bon emprunteur, lié au bon projet et au bon mois, et que son capital correspond toujours au solde. Une seconde confirmation n’ajoute rien. Le dossier ayant déjà réglé un mois ne peut plus être détaché/supprimé par le parcours courant : le lien est conservé pour l’historique. Les remboursements ultérieurs du crédit ne sont pas ajoutés une seconde fois aux cotisations.

La source `creditContracts` du bilan conserve le financement. Le module Caisses collectives distingue les cotisations des revenus : seule la redevance retenue lors d’une remise constitue un produit. Une cotisation affectée depuis un crédit fixe est un transfert interne qui compense le décaissement du module Crédit fixe. Le tableau du projet distingue sommes attendues, réglées/pris en charge et restantes. Le tirage et les cotisations ne créent aucune remise automatique.

Le membre ne dispose d’aucun endpoint d’écriture. Son API vérifie la session et l’appartenance au groupe avant de lire ses seuls documents par UID/matricule. Le DTO exclut auteurs, notes administratives, références de dossiers, types de crédit et données d’autrui. Un crédit rattaché à un mois est suivi dans ce mois, au lieu d’être affiché deux fois dans la participation générale. Les sommes restant à verser pour cet accompagnement sont distinctes du solde de la cotisation.

Le contact ouvre uniquement WhatsApp avec groupe, projet, mois et solde, via le numéro public membre déjà configuré. L’ouverture n’envoie aucun message et ne crée aucune demande ni aucun paiement. Toute saisie, demande de crédit fixe, validation et affectation reste dans l’admin.


## Remises et redevance facultative

Après configuration du cycle, `GroupProject.payoutFee` active un montant fixe entier, désactivé par défaut. Le montant doit être strictement inférieur au brut mensuel. Une modification concerne les remises futures uniquement et est historisée.

Dans **Remises aux bénéficiaires**, l’admin choisit le mois et le bénéficiaire du cycle. L’ordre actif propose le participant de même rang lorsque ses participants correspondent au cycle ; ce choix reste à vérifier par l’admin. Le formulaire affiche brut, redevance et net puis demande une confirmation distincte. Le suivi constate une remise effective sans initier de transfert externe. Une seule remise par projet/mois est prévue ; les remises partielles ne sont pas proposées.

`groupPayouts/{groupId__projectId__period}` conserve les identifiants encodés, les noms du groupe/projet/bénéficiaire, la date réelle, le moyen, la référence, une note facultative, l’auteur et les trois montants. La transaction relit le tarif, les cotisations de chaque participant et l’appartenance du bénéficiaire. Tous les versements doivent couvrir exactement le brut et être antérieurs ou égaux à la date de remise. Un aperçu périmé est refusé. Une reprise du même identifiant/contenu est idempotente, une autre remise du mois est refusée. Les règles interdisent la modification et la suppression de ces pièces après création ; la lecture brute est réservée aux admins.

Le serveur membre vérifie le groupe puis ne lit que les remises dont le bénéficiaire correspond à l’UID/matricule de session. Le DTO exclut auteurs, notes, références et données d’autrui ; seuls le mois, la date et les montants brut/redevance/net sont exposés. La redevance actuelle est affichée distinctement des retenues historiques.

Le bilan et les exports comportent un module **Caisses collectives** : cotisations directes, affectations internes, net remis en trésorerie ; redevances en résultat ; fonds détenus = cotisations réglées − remises brutes depuis l’origine. La redevance ne crée pas une deuxième entrée de trésorerie. Le détail et ses exports identifient les membres, groupes et projets. Les charges éventuelles ne sont pas gérées dans ce module. Le bilan individuel n’attribue pas le stock de toute la caisse à un seul membre.
