## Workflow d'implémentation – Gestion des doublons

Ce document décrit **le plan d'implémentation par étapes** pour la fonctionnalité de détection automatique et d'affichage des **doublons** parmi les demandes d'adhésion.

---

### Prérequis : lire toute la documentation avant d'implémenter

Avant de commencer toute implémentation, **lire intégralement** les documents suivants :

| Document | Contenu à maîtriser |
|---------|----------------------|
| **README principal** (`../README.md`) | Contexte, critères de doublon, modèle de données, index, garde anti-boucle, sécurité, mapping des composants |
| **functions/README.md** | Trigger, normalisation, algorithme de détection, gestion des groupes, résolution, script de migration |
| **firebase/README.md** | Collections, index Firestore (JSON), règles de sécurité `duplicate-groups` |
| **wireframes/WIREFRAME_ALERTE_ET_ONGLET_DOUBLONS.md** | Alerte, onglet Doublons, sections par type, modal de résolution, data-testid, responsive |
| **activite/** et **sequence/** | Flux détection (Cloud Function) et consultation (UI), architecture domaines |

Cela garantit la cohérence avec la spec et évite les oublis (ex. garde anti-boucle, signature `updateDuplicateGroups`, règles Firestore).

---

### Phase 0 – Branche et préparation

- **Objectif** : partir d'une base à jour et isoler le travail.
- **Actions** :
  - Créer une branche à partir de `develop` (ex. `feature/membership-requests-doublons`).
  - Vérifier l'accès au projet Firebase (Firestore, Cloud Functions).

---

### Phase 1 – Modèle de données et index Firestore

- **Objectif** : préparer la structure de données.
- **Actions** :
  1. Ajouter les champs sur `membership-requests` (types TypeScript) :
     - `normalizedEmail: string | null`
     - `normalizedIdentityDocNumber: string | null`
     - `isDuplicate: boolean`
     - `duplicateGroupIds: string[]`
  2. Créer le type `DuplicateGroup` pour la collection `duplicate-groups`.
  3. Ajouter les index Firestore (voir `firebase/README.md`).
  4. Ajouter les règles de sécurité pour `duplicate-groups`.

---

### Phase 2 – Cloud Function de détection

- **Objectif** : implémenter la détection automatique côté serveur.
- **Actions** :
  1. Créer `functions/src/membership-requests/detectDuplicates.ts` :
     - Trigger `onDocumentWritten('membership-requests/{requestId}')`.
     - Fonctions de normalisation (email, téléphone, numéro de pièce).
     - Requêtes de détection (3 en parallèle).
     - Création/mise à jour des groupes dans `duplicate-groups`.
     - Marquage des dossiers (`isDuplicate`, `duplicateGroupIds`).
  2. Gérer le cas de la suppression d'une demande (nettoyage des groupes).
  3. Gérer le cas de la mise à jour sans changement des champs de détection (ne rien faire).
  4. Déployer la fonction en environnement de développement.

**Tests** :
- Créer une demande → vérifier qu'un groupe est créé.
- Créer une 2e demande avec le même téléphone → vérifier que le groupe est mis à jour.
- Supprimer une demande → vérifier le nettoyage.

---

### Phase 3 – Résolution + cleanup (Cloud Function)

- **Objectif** : synchroniser la résolution d'un groupe avec les demandes concernées.
- **Actions** :
  1. Créer `functions/src/membership-requests/onDuplicateGroupResolved.ts` :
     - Trigger sur mise à jour de `duplicate-groups/{groupId}` (changement de `resolvedAt`/`resolvedBy`).
     - Retirer `groupId` des `duplicateGroupIds` des demandes liées.
     - Recalculer `isDuplicate` (true si au moins un autre groupe non résolu).
  2. Ajouter une garde pour ignorer les updates qui ne touchent pas `resolvedAt`/`resolvedBy`.
  3. Déployer la fonction en environnement de développement.

**Tests** :
- Résoudre un groupe → vérifier retrait du `groupId` côté demandes.
- Demande sans autres groupes → `isDuplicate` repasse à `false`.

---

### Phase 4 – Migration des données existantes

- **Objectif** : appliquer la détection aux demandes existantes.
- **Actions** :
  1. Créer un script ou une Cloud Function callable `migrateExistingDuplicates` :
     - Normaliser les champs sur toutes les demandes existantes.
     - Exécuter la détection et créer les groupes.
  2. Tester en environnement de développement.
  3. Exécuter en production (avec supervision).

---

### Phase 5 – Repository et hooks côté client

- **Objectif** : exposer les données des doublons à l'UI.
- **Actions** :
  1. Créer `DuplicateGroupsRepository` :
     - `hasUnresolvedGroups(): Promise<boolean>` (pour l'alerte).
     - `getUnresolvedGroups(): Promise<DuplicateGroup[]>` (pour l'onglet).
     - `resolveGroup(groupId, adminId): Promise<void>` (marquer comme traité).
  2. Créer les hooks :
     - `useDuplicateAlert()` : retourne `{ hasDuplicates, isLoading }`.
     - `useDuplicateGroups()` : retourne `{ groups, isLoading, resolveGroup }`.
  3. Configurer React Query avec cache approprié (ex. 30s pour l'alerte, refetch on focus).

---

### Phase 6 – Alerte administrateur

- **Objectif** : afficher une alerte lorsqu'il existe des doublons.
- **Actions** :
  1. Créer le composant `DuplicatesAlert` :
     - Utilise `useDuplicateAlert()`.
     - Affiche une bannière si `hasDuplicates === true`.
     - Lien vers l'onglet « Doublons ».
  2. Intégrer dans la page des demandes d'adhésion (au-dessus des onglets ou de la liste).
  3. Ajouter les `data-testid` (ex. `duplicates-alert`, `duplicates-alert-link`).

---

### Phase 7 – Onglet « Doublons » (tabs)

- **Objectif** : afficher les groupes de doublons dans un onglet dédié.
- **Actions** :
  1. Ajouter l'onglet « Doublons » dans le système de tabs existant.
  2. Créer le composant `DuplicatesTab` :
     - Utilise `useDuplicateGroups()`.
     - Affiche les groupes par type (sous-onglets ou sections).
     - Pour chaque groupe : valeur en commun, liste des dossiers, liens « Voir la fiche », bouton « Marquer comme traité ».
  3. Gérer l'état vide (« Aucun dossier en doublon »).
  4. Implémenter la résolution d'un groupe (appel `resolveGroup`, toast de succès).
  5. Ajouter les `data-testid`.

---

### Phase 8 – Tests et validation

- **Objectif** : couvrir les cas critiques.
- **Actions** :
  - **Cloud Function** :
    - Tests unitaires : normalisation, logique de détection.
    - Tests d'intégration : création, mise à jour, suppression de demandes.
  - **Repository/Hooks** :
    - Tests unitaires avec mocks Firestore.
  - **UI** :
    - Tests d'intégration : alerte visible si doublons, onglet affiche les groupes.
  - **E2E** (optionnel) :
    - Scénario complet : créer 2 demandes avec même email → voir l'alerte → consulter l'onglet → résoudre.

---

### Phase 9 – Documentation et déploiement

- **Objectif** : finaliser et déployer en production.
- **Actions** :
  1. Vérifier que les diagrammes et le README reflètent l'implémentation.
  2. Mettre à jour les règles Firestore en production.
  3. Déployer la Cloud Function en production.
  4. Exécuter la migration des données existantes.
  5. Déployer le front-end.
  6. Monitorer les erreurs et les performances.

---

## Ordre recommandé

| Phase | Description | Dépendances |
|-------|-------------|-------------|
| 0 | Branche | - |
| 1 | Modèle de données + index | - |
| 2 | Cloud Function | Phase 1 |
| 3 | Résolution + cleanup | Phase 2 |
| 4 | Migration données existantes | Phase 2 |
| 5 | Repository + hooks | Phase 1 |
| 6 | Alerte admin | Phase 5 |
| 7 | Onglet Doublons | Phase 5, 6 |
| 8 | Tests | Phase 2, 7 |
| 9 | Déploiement production | Phase 8 |

---

## Estimation (indicative)

| Phase | Effort |
|-------|--------|
| 0-1 | 0.5 jour |
| 2 | 1-2 jours |
| 3 | 0.5 jour |
| 4 | 0.5 jour |
| 5-7 | 1-2 jours |
| 8 | 1 jour |
| 9 | 0.5 jour |
| **Total** | **4.5-7.5 jours** |
