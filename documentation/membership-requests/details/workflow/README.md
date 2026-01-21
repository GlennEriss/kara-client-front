## Workflow – Refactor vue détails d’une demande d’adhésion

### Objectif
Refondre la structure (hooks, services, repo, utils) tout en conservant l’UI/UX existante de `MembershipRequestDetails`.

### Séquence d'implémentation (ordre recommandé)

#### Phase 1 : Fondations (utilitaires et helpers) ✅ **TERMINÉE**
1. **Extraire utilitaires** (`src/domains/memberships/utils/details/`)
   - [x] Créer `formatDateDetailed.ts` (gestion Date/Firestore/string → fr-FR)
   - [x] Créer `isDateExpired.ts` (détection expiration)
   - [x] Créer `formatAddress.ts` (formatage adresse complète/partielle)
   - [x] Créer `resolveAdhesionPdfUrl.ts` (logique fallback PDF : `adhesionPdfURL` → Firestore `documents`)
   - [x] Tests unitaires utilitaires (100% couverture)

#### Phase 2 : Hook de données (conteneur) ✅ **TERMINÉE**
2. **Créer hook `useMembershipRequestDetails`** (`src/domains/memberships/hooks/`)
   - [x] Hook agrège : `MembershipRepositoryV2.getById` + `getAdminById(processedBy)` + `useIntermediary(code)` + `resolveAdhesionPdfUrl`
   - [x] Gestion états : `isLoading`, `isError`, `error`
   - [x] Retourne : `{ request, admin, intermediary, adhesionPdfUrlResolved, isLoading, isError, error }`
   - [x] Cache React Query pour éviter appels multiples
   - [x] Tests unitaires hook (≥80% couverture)

#### Phase 3 : Sous-composants présentatifs (ordre suggéré) ✅ **TERMINÉE**
3. **Composants de base** (`src/domains/memberships/components/details/`)
   - [x] `DetailsSkeleton.tsx` (squelette partagé)
   - [x] `DetailsErrorState.tsx` (état erreur/not found + boutons retry/back)
   - [x] `InfoField.tsx` et `ModernCard.tsx` (composants partagés)

4. **Composants sections (ordre logique d'affichage)**
   - [x] `DetailsHeaderStatus.tsx` (titre, statut badge, matricule, dates, navigation back)
   - [x] `DetailsIdentityCard.tsx` (identité + photo)
   - [x] `DetailsContactCard.tsx` (contacts + email)
   - [x] `DetailsAddressCard.tsx` (adresse formatée)
   - [x] `DetailsEmploymentCard.tsx` (profession/entreprise/intermédiaire)
   - [x] `DetailsPaymentCard.tsx` (paiement : payé/non payé, historique)
   - [x] `DetailsDocumentsCard.tsx` (PDF adhésion + pièces d'identité)
   - [x] `DetailsMetaCard.tsx` (admin traiteur, dates, corrections si `reviewNote`)
   - [x] `DetailsPhotoCard.tsx` (photo du demandeur - colonne latérale)
   - [ ] Tests unitaires chaque composant (≥80% couverture) - **À compléter si nécessaire**

#### Phase 4 : Refacto composant principal ✅ **TERMINÉE**
5. **Refactoriser `MembershipRequestDetails.tsx`**
   - [x] Remplacer monolithe par composition des sous-composants
   - [x] Utiliser `useMembershipRequestDetails` pour données
   - [x] Conserver design existant (mêmes classes/styles CSS)
   - [x] Gérer états : loading (skeletons), error (error state), success (sections)
   - [x] Réduction de 834 lignes à ~150 lignes

#### Phase 5 : Tests d'intégration ✅ **TERMINÉE**
6. **Tests d'intégration** (`src/domains/memberships/__tests__/integration/membership-request-details.integration.test.tsx`)
   - [x] Scénario chargement réussi (toutes sections visibles) - `INT-DETAILS-01`
   - [x] Scénario erreur 404 (message + retour) - `INT-DETAILS-02`
   - [x] Scénario erreur réseau (retry) - `INT-DETAILS-03`
   - [x] Scénario PDF adhésion (URL directe + fallback Firestore + manquant) - `INT-DETAILS-04/05/06`
   - [x] Scénario paiement (payé/non payé) - `INT-DETAILS-07/08`
   - [x] Scénario statut "under_review" (corrections) - `INT-DETAILS-09`
   - [x] Scénario navigation (retour liste) - `INT-DETAILS-10`
   - [x] Scénarios supplémentaires (chargement, admin, intermédiaire) - `INT-DETAILS-11/12/13`

#### Phase 6 : Documentation & vérifications ✅ **TERMINÉE**
7. **Mise à jour documentation**
   - [x] Vérifier règles Firebase (Firestore/Storage) dans `firebase/README.md` - ✅ Aucune modification nécessaire
   - [x] Mettre à jour diagrammes activité/séquence si flux modifiés - ✅ Diagrammes déjà créés en Phase 0
   - [x] Compléter checklist tests (`tests/README.md`) avec résultats - ✅ Checklist mise à jour
   - [x] Vérifier couverture globale (objectif ≥80%) - ✅ Utilitaires 100%, Hook ≥80%, Intégration complète

### Ordre de priorité (si itération)
- **Critique** : Phase 1 (utilitaires) + Phase 2 (hook) → base pour tout le reste
- **Important** : Phase 3 (sous-composants) → peut être fait en parallèle par section
- **Finalisation** : Phase 4 (refacto principal) + Phase 5 (tests intégration) + Phase 6 (docs)

### Suivi & validation
- **Checklist** : cocher chaque item au fur et à mesure de l'implémentation
- **Tests** : exécuter tests unitaires après chaque phase (Phase 1, 2, 3) et tests d'intégration après Phase 5
- **Documentation** : mettre à jour `tests/README.md` avec résultats, `firebase/README.md` si règles modifiées
- **Diagrammes** : ajuster `activite/` et `sequence/` si flux significativement modifiés
- **Code review** : valider chaque phase avant de passer à la suivante (surtout Phase 1-2 critiques)
