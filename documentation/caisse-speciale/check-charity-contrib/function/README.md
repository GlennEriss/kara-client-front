# Cloud Function – Check Charity Contrib

Cette **Cloud Function** maintient le cache **member-charity-summary** à jour : à chaque création, modification ou suppression d’une **contribution** (bienfaiteur), elle recalcule l’éligibilité et la « dernière œuvre » pour le membre concerné et écrit le document `member-charity-summary/{memberId}`. Le step 2 des formulaires Nouvelle demande et Nouveau contrat lit ce document pour afficher les types de caisse accessibles et le bloc « Dernière œuvre ».

---

## Rôle

- Réagir à chaque changement dans **charity-events/{eventId}/contributions**.
- Identifier le **memberId** via le participant lié à la contribution.
- Recalculer pour ce membre : **eligible** (au moins une contribution) et **lastContribution** (dernier événement, date, montant).
- Écrire ou mettre à jour **member-charity-summary/{memberId}** pour une lecture rapide côté client en step 2.

Sans cette Cloud Function, le cache devrait être mis à jour côté client à chaque ajout/suppression de contribution, ce qui est fragile (oubli, multi-clients).

---

## Déclencheur

- **Collection** : sous-collection **contributions** des événements de charité.  
  Chemin Firestore : `charity-events/{eventId}/contributions/{contributionId}`

- **Événements** : création, modification, suppression de document (onCreate, onUpdate, onDelete), ou un seul trigger **onDocumentWritten** (create + update + delete) selon la version Firebase.

- **Région** : même région que le reste de l’app (ex. `europe-west1` si cohérent avec les autres functions).

---

## Logique de la fonction

Pour **chaque** document de contribution créé / modifié / supprimé :

1. **Récupérer le contexte**
   - Depuis le chemin du document : `eventId` (segment `charity-events/{eventId}/contributions/...`).
   - Lire le document contribution pour obtenir **participantId** (et éventuellement `contributionDate`, montant pour lastContribution).

2. **Obtenir le memberId**
   - Lire le document **participant** : `charity-events/{eventId}/participants/{participantId}`.
   - Si `participantType === 'member'` et `memberId` présent → le membre concerné est `memberId`.
   - Si `participantType === 'group'` : selon les règles métier, soit on ignore (éligibilité caisse = membre), soit on met à jour les summaries de tous les membres du groupe (non détaillé ici).

3. **Recalculer l’éligibilité et la dernière œuvre pour ce memberId**
   - Requête : tous les **participants** (tous événements) avec `memberId == X` (collection group sur `participants`, index Firestore à prévoir).
   - Pour chaque participant avec **contributionsCount > 0**, garder `lastContributionAt`, `eventId`, et montant total ou dernière contribution.
   - Parmi eux, prendre la participation avec **lastContributionAt** le plus récent → définit **lastContribution** (eventId, date, montant).
   - Lire le document **charity-events/{eventId}** pour le **nom** de l’événement.
   - **eligible** = au moins un participant avec `contributionsCount > 0`.

4. **Écrire le document de synthèse**
   - **Chemin** : `member-charity-summary/{memberId}` (collection à la racine du projet, ou sous un segment dédié selon votre convention).
   - **Champs suggérés** :
     - `eligible: boolean`
     - `lastContributionAt: Timestamp | null`
     - `lastEventId: string | null`
     - `lastEventName: string | null`
     - `lastAmount: number | null` (optionnel)
     - `updatedAt: Timestamp`

En **onDelete** de contribution : même principe (recalculer pour le memberId du participant, puis écrire le summary ; si plus aucune contribution, `eligible: false`, lastContribution à null).

---

## Index Firestore nécessaires

- **Collection group** sur la sous-collection **participants** :
  - `memberId` (ASC)  
  - Éventuellement `lastContributionAt` (DESC) pour trier côté requête.

À ajouter dans `firestore.indexes.json` si pas déjà présents (voir [Firestore collection group](https://firebase.google.com/docs/firestore/query-data/queries#collection-group-query)).

---

## Règles de sécurité

- La collection **member-charity-summary** doit être **lisible** par les clients autorisés (ex. admins ou utilisateurs authentifiés qui ont le droit d’accéder au formulaire caisse spéciale).
- Les **écritures** dans **member-charity-summary** doivent être **réservées à la Cloud Function** (règles qui n’autorisent pas `request.auth` pour write, ou utilisation du Admin SDK dans la CF uniquement).

---

## Intégration dans les diagrammes

- **Diagramme d’activité** : [../activite/CheckCharityEligibility.puml](../activite/CheckCharityEligibility.puml) – la note flottante décrit le déclenchement sur les contributions et la mise à jour du cache.
- **Diagramme de séquence** : [../sequence/SEQ_CheckCharityEligibility.puml](../sequence/SEQ_CheckCharityEligibility.puml) – la séquence en bas montre le client qui écrit une contribution, le trigger Firestore, et la CF qui met à jour `member-charity-summary/{memberId}`.

---

## Résumé

Cloud Function **syncMemberCharitySummary** : déclenchée sur `charity-events/{eventId}/contributions` ; récupère le participant puis le `memberId` ; recalcule eligible + lastContribution (collection group participants) ; écrit `member-charity-summary/{memberId}`. Le step 2 lit ce document pour afficher les types de caisse et le bloc « Dernière œuvre ».
