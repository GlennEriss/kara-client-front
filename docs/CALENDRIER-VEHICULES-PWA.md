# Calendrier véhicules et retrait de la PWA

## Échéances des véhicules

Le calendrier admin propose un onglet Véhicules, selon le droit `vehicules.view`.
La route web `/api/calendar/vehicles?month=AAAA-MM` exige aussi `calendar.view`.
La route mobile `/api/mobile/calendar/vehicles` conserve la garde administrative
existante, le mot de passe initial et les mêmes droits. Aucune permission n’est
élargie. Les réponses sont privées et non mises en cache ; une source indisponible
retourne une erreur, jamais une liste vide trompeuse.

La projection utilise la date de fin actuelle de `vehicle-insurances` : assurances
validées et anciens dossiers sans statut de déclaration. Brouillons, dossiers en
attente ou refusés sont exclus. Pour `insurance-prospects`, seuls À suivre, Contacté
et Assurance LE KARA demandée sont inclus ; Assuré chez LE KARA et Prospect perdu
ne restent pas dans les relances. Un renouvellement déplace l’échéance vers la
nouvelle date. Les dates et retards se calculent au jour civil du Gabon.

La vue web propose mois, grille, journée, recherche et filtres origine/état/quartier.
Une assurance ouvre son dossier existant ; un prospect ouvre la prospection
filtrée sur son immatriculation. Les contacts téléphone et WhatsApp sont
interactifs et le quartier utilise les identifiants déjà rattachés à Géographie.
La légende et le plan d’appels financiers sont masqués dans cet onglet.

La version mobile admin possède une grille, une liste et un horizon de 30 jours,
avec les mêmes champs et une ouverture des fiches entièrement native. Aucun
paiement ou remboursement financier n’est appliqué aux assurances. Le calendrier
véhicules de l’espace membre reste prévu dans son lot d’intégration véhicules.

Le modèle accepte encore les dates historiques en Timestamp ou en chaîne civile ;
la lecture parcourt donc les deux collections avant projection mensuelle. Aucun
index, migration ou changement de données n’est nécessaire pour cette livraison.

## Sites web ordinaires, notifications conservées

Le portail membre ne génère plus de manifeste ni de worker Workbox : dépendance
`@ducanh2912/next-pwa`, configuration, invitations d’installation et métadonnées
standalone sont retirées. Le site admin n’activait déjà plus de PWA ; le nettoyage
des anciennes installations y est également raccordé. Les logos/favicons restent.

Les composants `RetireLegacyPwa` désinscrivent uniquement les anciens scripts
`/sw.js` et `/service-worker.js` du même domaine, puis effacent les caches PWA
connus (Workbox, start-url/pages et anciens caches d’images/polices). Les autres
caches, préférences, sessions, IndexedDB et données métier ne sont pas supprimés.
`public/sw.js` est conservé comme worker de retrait pour les anciennes visites :
il n’enregistre aucun fetch/cache et se désinscrit à son activation. Il n’est
plus enregistré par le site.

Le worker `/firebase-messaging-sw.js`, les abonnements FCM et les permissions
navigateur ne sont pas désactivés. Le démarrage du push attend la même promesse
de nettoyage que le layout : une inscription FCM en attente ou en cours
d’installation n’est jamais désinscrite comme une ancienne PWA. Le retrait s’appliquera lors des prochaines
visites après déploiement. Une icône déjà épinglée dans le système peut rester
un raccourci web ; aucune désinstallation système n’est déclenchée.

## Validation locale

124 tests ciblés serveur/web admin, 13 tests web membre, 154 tests unitaires
mobiles et 13 parcours Expo web passent. Vérifications de confidentialité,
déclarations en attente, dates/renouvellements, permissions, filtres, navigation,
aperçu/téléchargement, conservation de FCM et retrait des caches PWA. API membre
réelles vérifiées en lecture seule avec le compte fourni ; API calendrier véhicules
admin 200 sur novembre 2026, sans échéance dans les données locales actuelles.

TypeScript et lint passent. Aucun build APK ni déploiement effectué.
