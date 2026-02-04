# Check Charity Contrib – Plan d’implémentation

Ce document décrit les étapes prévues pour implémenter la règle d’éligibilité aux types de caisse charitable et l’affichage de la **dernière œuvre de charité** en step 2. Référence : [README.md](./README.md) (dont la distinction **participant vs contributeur** et le choix **pas de booléen sur le membre**).

## 0. Branche

- [ ] Créer la branche à partir de `develop`.

## 1. Backend / Données

- [ ] **Critère d’éligibilité** : membre éligible si au moins un `CharityParticipant` (type `member`, ce `memberId`) a **`contributionsCount > 0`** (ne pas se baser sur la seule présence en liste participants).
- [ ] Exposer un service du type `getMemberCharityEligibility(memberId): Promise<{ eligible: boolean, lastContribution?: { eventId, eventName, date, amount? } }>` qui lit le document `member-charity-summary/{memberId}` (pas de booléen sur le membre).
- [ ] Document `member-charity-summary/{memberId}` mis à jour à chaque ajout/suppression de contribution par une **Cloud Function** (voir [function/README.md](./function/README.md)).

## 2. Frontend – Hook / état

- [ ] Créer un hook (ex. `useMemberCharityEligibility(memberId: string | null)`) qui appelle le service et retourne `{ eligible, lastContribution, isLoading, error }`.
- [ ] Mettre en cache la réponse (ex. React Query) pour éviter des appels répétés au même step.
- [ ] Gérer `memberId === null` : considérer comme non éligible et pas de dernière œuvre.

## 3. Formulaire Nouvelle demande

- [ ] Récupérer le `memberId` sélectionné à l’étape 1.
- [ ] Dans **Step2InfosDemande** : utiliser le hook ; selon `eligible`, afficher ou désactiver/masquer les trois options charitable dans le select « Type de caisse ».
- [ ] Si `eligible` et `lastContribution` : afficher un court résumé (ex. « Dernière œuvre : [nom] ([date], [montant si pertinent]) ») sous le select ou en message d’aide.
- [ ] Si non éligible : message explicatif (ex. « Réservé aux membres ayant déjà contribué à une œuvre de charité »).

## 4. Formulaire Nouveau contrat

- [ ] Récupérer le membre (ou le premier membre du groupe) à l’étape 1.
- [ ] Dans **Step2ContractConfiguration** : utiliser le même hook ; selon `eligible`, activer ou désactiver (griser + tooltip) les trois boutons charitable.
- [ ] Afficher le résumé « dernière œuvre » si disponible.
- [ ] Si un type charitable était sélectionné et que `eligible` devient false (cas rare), réinitialiser ou bloquer la validation.

## 5. Tests et recette

- [ ] Membre avec **au moins une contribution** (participant avec `contributionsCount > 0`) → éligible, 3 types charitable proposés, dernière œuvre affichée si applicable.
- [ ] Membre **participant sans contribution** (`contributionsCount === 0`) → **non** éligible, 3 types charitable indisponibles.
- [ ] Membre sans aucun participant → non éligible.
- [ ] Recette manuelle sur `/caisse-speciale/demandes/nouvelle` et `/caisse-speciale/contrats/nouveau` (step 2), et cohérence avec les données enregistrées sous `/bienfaiteur/{eventId}` (onglets Participants, Contributions).

## Référence

- Analyse, participant vs contributeur, et choix d’implémentation : [README.md](./README.md)
