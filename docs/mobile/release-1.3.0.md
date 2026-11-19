# API mobile — livraison LE KARA 1.3.0

Déploiement production autorisé explicitement le 19 novembre 2026, pour accompagner l’APK de production contenant les derniers lots.

## Périmètre

- Présentations, filtres, compteurs, détails et opérations natives des groupes/projets, crédits fixe/aide, placements, charité, véhicules, boutiques, événements, historiques, documents de l’association, équipe, relances, journal, référentiels, modèles de messages et paramètres des caisses.
- Réutilisation des services métier du site, contrôles de permissions et de montants, exports/documents, moteur partagé des cycles et des relances ; formulaires web conservés avec leurs règles.
- API de notifications : consultation, lecture, destinations natives et inscription des appareils selon droits. Adaptation du déclencheur push pour les appareils natifs : périmètre, expiration, mode silencieux et contenu confidentiel conservé dans l’application. Aucun message de test envoyé à un destinataire réel.
- Centre d’aide partagé : 27 fiches pour un Super Admin, recherche du site, catégories, FAQ et métadonnées des trois leçons pédagogiques des groupes.
- Imports et réinitialisation de la base exclus du catalogue mobile ; anciennes API mobiles désactivées. Les outils web restent indépendants.

Le backend cible est `kara-admin`, projet `kara-gabon`, région `us-east4`. Le déclencheur existant `sendPushOnNotification` conserve sa région `europe-west1` ; son runtime passe à Node.js 22, Node.js 20 étant arrivé à sa date de retrait. Les autres fonctions, règles Firestore/Storage et extensions ne sont pas déployées.

## Vérifications avant publication

TypeScript et ESLint des fichiers concernés : aucune erreur (avertissements legacy conservés). 192 tests serveur distincts réussis et trois tests d’intégration déjà désactivés ; l’assertion de capacités a été actualisée pour les sections supplémentaires et un cas de présentation des adhésions a été rejoué après dépassement du délai pendant la compilation Android. Le déclencheur de notifications compile avec Node.js 22. Les écritures métier des tests utilisent des services simulés.

La compilation App Hosting doit réussir avant bascule du trafic. Après publication : contrôler les réponses authentifiées de consultation depuis l’APK ; ne soumettre aucun paiement ni autre modification réelle pour cette vérification.
