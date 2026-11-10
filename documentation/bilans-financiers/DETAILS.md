# Personnes et contrats des bilans financiers

Chaque cellule des tableaux du bilan ouvre le détail de sa contribution par contrat ou dossier, dans la synthèse, les onglets métier et le bilan individuel d’un membre.

## Parcours

- Cliquer dans un mois pour consulter ce mois, ou dans **Total / fin** pour la période. Les encours utilisent la dernière valeur, jamais la somme des stocks mensuels.
- Consulter le nom et le matricule du membre ou du groupe, le contrat/dossier, son module, son statut actuel et le montant. Les garants concernés par les commissions de crédit sont également nommés.
- Rechercher par nom, matricule, référence ou identifiant ; filtrer les modules de la synthèse ; trier et parcourir les résultats par pages de 20.
- Ouvrir les fiches dans un nouvel onglet. Les fiches manquantes sont signalées sans inventer de lien ni supprimer leur contribution.
- Exporter les résultats filtrés en CSV, toutes pages comprises, avec leurs colonnes mensuelles. Les noms et références sont protégés contre l’interprétation en formules de tableur.

## Calcul et accès

`GET /api/financial-reports/details` est réservé au SuperAdmin, comme le bilan. Paramètres : `from`, `to`, `module`, `block`, `line`, éventuellement `month`, `asOf` (date de génération du bilan) et `memberId`.

Le bilan individuel utilise le chargeur existant du membre ; aucune source financière extérieure à son périmètre n’est ajoutée. L’enrichissement lit seulement les identités qui contribuent au détail, par identifiant puis par matricule si nécessaire. Les contacts, adresses et documents privés ne sont ni lus ni retournés. Les réponses utilisent `Cache-Control: private, no-store` et les requêtes client sont isolées par période, date de génération, membre et cellule.

Le calcul normal du bilan et du tableau de bord ne charge pas ce détail. À l’ouverture d’une cellule, les sources sont partitionnées par contrat/dossier et soumises aux mêmes moteurs de calcul. Le crédit conserve le contexte parent/enfants des anciens rajouts tout en calculant la contribution d’un seul contrat. Les caisses restent distinguées par collection, même si leurs contrats ou paiements portent le même identifiant.

La somme des contributions est rapprochée de la ligne du bilan. Un éventuel écart d’arrondi ou de ventilation est présenté séparément. Si les données ont changé depuis l’ouverture du bilan, le montant recalculé est comparé à la cellule affichée et l’interface invite à régénérer le bilan. Il ne s’agit pas d’un instantané historique des documents : les statuts sont les statuts actuels.

## Assurances véhicules

L’onglet **Véhicules — Assurances** lit `vehicleInsuranceRewards`, une opération par période initiale ou renouvellement. La prime est informative. Une commission attendue n’est ni une entrée, ni un gain, ni une créance incluse dans la synthèse.

La réception utilise `partnerReceipt.amount` et `partnerReceipt.receivedAt`. À cette date, le résultat est la commission reçue moins `memberAmount` ; cette part du parrain devient une dette. La sortie utilise exclusivement la remise datée `memberPayment.paidAt`, après réception : un statut ou une notification seuls ne déclenchent pas de sortie. La remise éteint la dette sans seconde charge. Les événements futurs ou sans date valide ne sont pas traités comme des mouvements réalisés. Les dettes antérieures à la période sont conservées.

La synthèse reprend les entrées, sorties, résultat et parts restant à reverser. Les détails et annexes présentent le parrain bénéficiaire, le titulaire, l’assureur, la plaque, la police, les dates, références et justificatifs disponibles. Les fiches d’assurance sont lues par identifiant avec une projection limitée aux noms et références ; aucune pièce ni contact de la fiche n’est chargé. Une fiche disparue ne supprime pas l’historique financier.

Le bilan individuel administratif rattache une période uniquement au parrain bénéficiaire, par identifiant ou matricule, avec déduplication. Ces routes restent réservées au SuperAdmin ; les commissions des assureurs ne sont pas exposées à l’espace membre.

## Vérification

```sh
pnpm exec vitest run src/domains/financial/reports/__tests__ src/app/api/financial-reports/details/__tests__ src/domains/help/__tests__/help.test.ts
pnpm exec tsc --noEmit --incremental false
```
