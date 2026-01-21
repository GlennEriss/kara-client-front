## Workflow d’implémentation – Détails membre (V2)

### Objectif
Refondre la vue détails membre (`MembershipDetails`) en s’alignant sur le pattern utilisé pour `MembershipRequestDetails` (hook agrégateur + sous‑composants), tout en conservant l’UI/UX existante.

### Séquence d'implémentation (ordre recommandé)

#### Phase 1 : Fondations & cartographie ⏳ **À FAIRE**
1. **Cartographier V1**
   - [ ] Relire `src/components/memberships/MembershipDetails.tsx` et noter toutes les sections d’UI.
   - [ ] Lister tous les appels directs DB : `useUser`, `listContractsByMember`, autres.
   - [ ] Lister tous les liens vers autres modules : caisse, filleuls, véhicules, placements, etc.
2. **Définir les contrats de données V2**
   - [ ] Définir le type `MembershipDetailsViewModel` (données agrégées nécessaires à la vue).
   - [ ] Identifier quels repositories V2 seront utilisés (MemberRepositoryV2, SubscriptionRepositoryV2, services caisse, etc.).

#### Phase 2 : Hook `useMembershipDetails` ⏳ **À FAIRE**
3. **Créer le hook agrégateur** (`src/domains/memberships/hooks/useMembershipDetails.ts`)
   - [ ] Signature : `useMembershipDetails(memberId: string)`.
   - [ ] Utiliser React Query pour charger :
     - [ ] Le membre (`MemberRepositoryV2.getById` ou équivalent).
     - [ ] Les abonnements (`SubscriptionRepositoryV2.getByMemberId`).
     - [ ] Les contrats caisse (`CaisseContractsRepositoryV2.listByMember`).
     - [ ] Les filleuls (`FilleulsRepository.getByParrain`), si existant.
   - [ ] Exposer : `{ member, subscriptions, contracts, filleuls, isLoading, isError, error }`.
   - [ ] Gérer les erreurs (mapping vers messages UI).
4. **Handlers de navigation / actions**
   - [ ] Ajouter dans le hook (ou un petit hook d’UI) les handlers :
     - `onOpenSubscriptionHistory()`
     - `onOpenMembershipRequest()`
     - `onOpenContracts(moduleKey)`
   - [ ] Utiliser `next/navigation` pour la navigation (routes déjà existantes).
5. **Tests unitaires du hook**
   - [ ] Mock des repositories (membres, abonnements, contrats, filleuls).
   - [ ] Cas heureux : toutes les données chargées.
   - [ ] Cas erreur : DB en erreur → `isError`, `error` renseignés.
   - [ ] Cas membre sans abonnements / sans contrats / sans filleuls.

#### Phase 3 : Sous‑composants présentatifs ⏳ **À FAIRE**
6. **Créer les composants de base** (`src/domains/memberships/components/details/`)
   - [ ] `MemberDetailsSkeleton.tsx` (état loading).
   - [ ] `MemberDetailsErrorState.tsx` (état erreur + bouton retour/lien vers liste).
7. **Créer les cartes de sections**
   - [ ] `MemberDetailsHeader.tsx` (titre, badges, actions principales).
   - [ ] `MemberIdentityCard.tsx` (identité).
   - [ ] `MemberContactCard.tsx` (contacts).
   - [ ] `MemberAddressCard.tsx` (adresse).
   - [ ] `MemberSubscriptionCard.tsx` (abonnements).
   - [ ] `MemberDocumentsCard.tsx` (dossier / documents).
   - [ ] `MemberFilleulsCard.tsx` (filleuls / parrainage).
   - [ ] `MemberPaymentsCard.tsx` (paiements).
   - [ ] `MemberContractsCard.tsx` (contrats).
   - [ ] `MemberRelationsCard.tsx` (liens vers autres modules).
8. **Tests unitaires des composants (ciblés)**
   - [ ] Vérifier rendu des informations clés pour chaque carte.
   - [ ] Vérifier l’appel des callbacks (`onOpenSubscriptionHistory`, `onOpenMembershipRequest`, etc.).

#### Phase 4 : Refactor de la page de détails ⏳ **À FAIRE**
9. **Créer le container V2**
   - [ ] `MemberDetailsPage.tsx` (ou `MembershipDetailsPage.tsx`) dans `domains/memberships/components/details/`.
   - [ ] Utiliser `useMembershipDetails(memberId)` pour récupérer les données.
   - [ ] Composer les cartes de sections dans le même ordre visuel que V1.
   - [ ] Gérer les états :
     - `loading` → `MemberDetailsSkeleton`.
     - `error` → `MemberDetailsErrorState`.
10. **Brancher la route Next**
   - [ ] Adapter `src/app/(admin)/memberships/[id]/page.tsx` pour utiliser `MemberDetailsPage` au lieu de `MembershipDetails.tsx`.
   - [ ] Conserver exactement la même URL et la même navigation depuis la liste des membres.
11. **Supprimer progressivement le composant V1**
   - [ ] Garder `MembershipDetails.tsx` en période de transition (si besoin).
   - [ ] Une fois les tests OK → retirer l’ancien composant / le marquer comme legacy.

#### Phase 5 : Tests d’intégration ⏳ **À FAIRE**
12. **Créer les tests d’intégration** (`src/domains/memberships/__tests__/integration/membership-details.integration.test.tsx`)
   - [ ] Scénario **INT-MEMBER-DETAILS-01** : affichage complet pour un membre avec abonnements, contrats, filleuls.
   - [ ] Scénario **INT-MEMBER-DETAILS-02** : membre sans abonnements ni contrats (sections adaptées).
   - [ ] Scénario **INT-MEMBER-DETAILS-03** : erreur de chargement (message + bouton retour).
   - [ ] Scénario **INT-MEMBER-DETAILS-04** : clic sur « Voir le dossier » → navigation vers `MembershipRequestDetails`.
   - [ ] Scénario **INT-MEMBER-DETAILS-05** : clic sur « Voir l’historique » abonnements → ouverture modal.
   - [ ] Scénario **INT-MEMBER-DETAILS-06** : clic sur liens vers modules caisse / véhicules / contrats.

#### Phase 6 : Documentation & finalisation ⏳ **À FAIRE**
13. **Mettre à jour la documentation**
   - [ ] Mettre à jour ce `workflow/README.md` avec les cases cochées.
   - [ ] Compléter `firebase/README.md` (collections/index spécifiques à cette vue).
   - [ ] Compléter `tests/README.md` (checklist détaillée des tests créés).
   - [ ] Ajouter/mettre à jour les diagrammes `activite/*.puml` et `sequence/*.puml`.

### Priorités
- **Critique** : Phase 2 (hook `useMembershipDetails`) + Phase 3 (sous‑composants principaux).
- **Important** : Phase 4 (refactor page) + Phase 5 (tests d’intégration).
- **Finalisation** : Phase 6 (docs, diagrammes, nettoyage legacy).

### Suivi
- Utiliser cette checklist comme référence pendant l’implémentation.
- Chaque phase peut être réalisée dans une PR distincte pour faciliter les reviews.

