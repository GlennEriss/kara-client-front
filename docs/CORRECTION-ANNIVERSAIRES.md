# Correction des dates de naissance importées

Correction exécutée le 19 novembre 2026 sur `kara-gabon` (production).

## Résultat

| Situation | Fiches |
| --- | ---: |
| Dates corrigées et vérifiées | 129 |
| Imports absents du classeur de référence | 9 |
| Désaccord entre dossier et classeur | 3 |
| Imports sans date de naissance | 4 |
| Fiches non importées, préservées | 20 |
| Total `users` | 165 |

Les 129 corrections sont également vérifiées dans l’index Algolia `members-prod`
(date de naissance, mois, jour et jour de l’année). Une nouvelle simulation après
correction retourne 129 fiches déjà alignées et aucune nouvelle correction.

## Périmètre et preuves

La correction exige simultanément :

- `isMigrated === true` et présence de `dateShiftFixedAt` ;
- un dossier d’adhésion importé, portant le même matricule ;
- une date identique dans le dossier et la feuille `MEMBRES` du classeur
  `GESTION MEMBRES KARA 2026-4.xlsx` ;
- une date dans la fiche membre exactement un jour après cette date de référence.

Le fichier déclaré à l’import est `GESTION-2.xlsx`, distinct du classeur disponible.
La comparaison porte donc sur les matricules et sur l’accord des deux références,
sans considérer le classeur disponible comme une autorisation de remplacer les
cas discordants. Aucun jour n’a été soustrait aux 12 cas non confirmés.

Une seule transaction a mis à jour `birthDate`, `birthMonth`, `birthDay`,
`birthDayOfYear`, `updatedAt` et le marqueur `birthDateReconciliation`. Les
préconditions sur les versions des fiches et des dossiers protègent les éditions
concurrentes. Le marqueur de l’ancienne correction `dateShiftFixedAt` est conservé.

Les 36 autres fiches sont inchangées. Les dossiers d’adhésion n’ont pas été
modifiés. Aucune modification des contrats, des versements, de Firebase Auth ou
de la base de développement n’a été effectuée.

## Sauvegardes et script

Les sauvegardes et rapports privés se trouvent hors du dépôt, dans
`~/Library/Application Support/LE KARA/backups/birthdays/` (fichiers en mode `0600`).
Le préfixe de la sauvegarde appliquée est
`kara-gabon-2026-11-19T11-31-53-836Z-apply`.
Elle contient les valeurs initiales des champs concernés, les versions des
documents et le plan exact des corrections. Aucune donnée personnelle n’est
incluse dans cette documentation.

`scripts/reconcile-imported-birthdays.mjs` fonctionne en simulation par défaut.
Il vérifie l’empreinte SHA-256 du classeur et exige un nombre attendu de corrections
pour toute application. Les références extraites du classeur sont conservées
dans le même dossier privé, sous `source-dates-2026-11-19.json`.

Les six tests du plan de correction couvrent le périmètre importé, les conflits,
les dates invalides, les changements d’année, les années bissextiles et les
exécutions répétées :

```sh
node --test scripts/__tests__/reconcile-imported-birthdays.test.mjs
```

Les 9 références manquantes et les 3 désaccords nécessitent le fichier importé
d’origine ou une autre pièce confirmant la bonne date. Les 4 dates absentes
doivent être renseignées à partir d’une référence fiable.
