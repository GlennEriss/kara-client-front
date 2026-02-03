# Points problématiques – Partie Contrats Caisse Spéciale (V2)

> Ce document consolide les points problématiques identifiés sur la partie **Contrats** du module Caisse Spéciale, en vue de la migration vers l'architecture domaine.
> Références : `src/components/caisse-speciale/ListContracts.tsx`, `src/app/(admin)/caisse-speciale/contrats/[id]/page.tsx`, `src/app/(admin)/caisse-speciale/contrats/[id]/versements/page.tsx`.

---

## Points critiques (priorité immédiate)

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| **C.0** | **Chargement complet sans pagination** : la liste utilise `getAllContracts()` et filtre côté client. | Performances dégradées, temps de chargement élevé, impossible de scaler | **Critique** |
| **C.1** | **Stats calculées côté client** et recalculées à chaque changement d'onglet/filtre. | UX lente, statistiques incohérentes, rechargements inutiles | **Critique** |
| **C.2** | **Recherche limitée** (ID, memberId, groupeId) et uniquement client. | Impossible de rechercher efficacement par nom, prénom, matricule | **Critique** |
| **C.3** | **Données membre/groupe incomplètes** (groupes non chargés, jointures locales). | Liste imprécise, affichage `Groupe XXXXX` par défaut | **Critique** |
| **C.4** | **Filtres incomplets** : pas de filtres dates (création, échéance), retard calculé côté client uniquement. | Filtrage imprécis et non fiable | **Critique** |
| **C.5** | **Détails bloqués si PDF absent** (redirige vers la liste). | Perte d'accès aux infos, mauvais UX | **Critique** |
| **C.6** | **Versements/exports non standardisés** (logiques d'export réparties, pas de service dédié). | Maintenance difficile, risques de régression | **Critique** |
| **C.7** | **Vue Liste sans vrai tableau** : le mode “Liste” affiche toujours des cards (version “grid” dégradée) au lieu d’un tableau avec colonnes. | Mauvaise lisibilité, UX incohérente, perte d’info scannable | **Critique** |

### Recommandations rapides (C.0 → C.6)

- **C.0** : Implémenter `getContractsWithFilters` paginé (Firestore + count) + `useCaisseContracts` React Query.
- **C.1** : `getContractsStats` côté service/repository avec cache 2 min (global ou filtré).
- **C.2** : Ajouter champs dénormalisés `searchableText*` sur `caisseContracts` + recherche Firestore fusionnée.
- **C.3** : Charger `useMember` / `useGroup` (batch) ou champs dénormalisés (memberName, memberMatricule, groupName).
- **C.4** : Ajouter filtres `createdAtFrom/To`, `nextDueAtFrom/To`, `overdueOnly` côté repo.
- **C.5** : Détails accessibles même sans PDF, afficher bannière + CTA upload.
- **C.6** : Centraliser exports (liste + versements) dans services dédiés.
- **C.7** : Implémenter une vraie vue tableau (colonnes clés + actions), comme `membership-requests` / `memberships`.

---

## Table des matières

1. [UX/UI – Liste et affichage](#1-uxui--liste-et-affichage)
2. [UX/UI – Détails contrat](#2-uxui--détails-contrat)
3. [UX/UI – Versements](#3-uxui--versements)
4. [Technique – Pagination et données](#4-technique--pagination-et-données)
5. [Technique – Architecture et code](#5-technique--architecture-et-code)
6. [Technique – Tests et documentation](#6-technique--tests-et-documentation)
7. [Sécurité et validation](#7-sécurité-et-validation)

---

## 1. UX/UI – Liste et affichage

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 1.1 | Stats affichées après les tabs, et dépendantes du tab actif | Incompréhension des stats globales | Haute |
| 1.2 | Affichage des groupes non fiable (groupes non chargés) | Affichage `Groupe XXXXX` | Haute |
| 1.3 | Recherche incomplète (pas de nom/matricule) | Recherche frustrante | Haute |
| 1.4 | Filtres dates absents (création, échéance) | Impossible d'analyser par période | Haute |
| 1.5 | Badge “Retard” calculé côté client sans garantie | Faux positifs/négatifs | Moyenne |
| 1.6 | Export PDF liste absent (Excel/CSV seulement) | Besoin métier non couvert | Moyenne |

**Recommandations :**
- Afficher les stats **avant** les tabs et les charger une seule fois.
- Charger `groupName` et `memberMatricule` (batch) ou dénormaliser sur `caisseContracts`.
- Ajouter recherche Firestore avec `searchableText*`.
- Ajouter filtres dates et `overdueOnly` côté repository.
- Ajouter export PDF (même template que les autres modules).

---

## 2. UX/UI – Détails contrat

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 2.1 | Détails inaccessibles si PDF manquant | Blocage fonctionnel | Haute |
| 2.2 | CTA upload PDF dispersé (liste uniquement) | UX incohérente | Haute |
| 2.3 | Informations membre/groupe non consolidées | Données partielles | Moyenne |

**Recommandations :**
- Autoriser l'accès aux détails et afficher une bannière “PDF manquant”.
- Centraliser l'upload dans la page détails.
- Ajouter une carte “Membre/Groupe” avec matricule et contacts.

---

## 3. UX/UI – Versements

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 3.1 | Exports gérés dans la page sans service dédié | Maintenance difficile | Moyenne |
| 3.2 | Export PDF/Excel basé sur données client | Risque d'incohérence | Moyenne |

**Recommandations :**
- Extraire un `PaymentsExportService`.
- Standardiser colonnes export (échéance, montant, statut, pénalités, bonus, admin).

---

## 4. Technique – Pagination et données

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 4.1 | `getAllContracts()` sur la liste | Performance dégradée | Critique |
| 4.2 | Pagination calculée côté client | Impossible de scaler | Critique |
| 4.3 | Jointure membres/groupes non optimisée | N+1 potentiel | Haute |

**Recommandations :**
- `getContractsWithFilters(filters, page, limit)` + `getCountFromServer`.
- Mettre en cache les stats et la liste (React Query).
- Dé-normaliser `memberDisplayName`, `memberMatricule`, `groupName` si besoin.

---

## 5. Technique – Architecture et code

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 5.1 | Logique métier concentrée dans `ListContracts.tsx` | Difficulté de maintenance | Moyenne |
| 5.2 | Absence de repository/service dédiés V2 | Architecture non conforme | Haute |

**Recommandations :**
- Créer `src/domains/financial/caisse-speciale/contrats/` (repo + service + hooks).
- Déplacer logique de filtres, stats, exports dans services dédiés.

---

## 6. Technique – Tests et documentation

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 6.1 | Absence de tests unitaires pour stats/filtres | Risque de régression | Moyenne |
| 6.2 | Pas de tests E2E pour flux contrats | Risque fonctionnel | Moyenne |

---

## 7. Sécurité et validation

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 7.1 | Upload PDF sans validation centralisée | Risque de fichiers non conformes | Haute |
| 7.2 | Règles Firestore/Storage non alignées sur V2 | Accès non autorisé possible | Haute |

**Recommandations :**
- Valider type/taille côté client et côté règles Storage.
- Consolider règles dans `firestore.rules` et `storage.rules` (voir FIREBASE.md).

---

## Références

- **V1** : `documentation/caisse-speciale/V1/ANALYSE_CAISSE_SPECIALE.md`
- **UC6 Retard** : `documentation/caisse-speciale/V1/UC6_FILTRAGE_RETARD.md`
- **Composants** : `src/components/caisse-speciale/ListContracts.tsx`
- **Détails** : `src/app/(admin)/caisse-speciale/contrats/[id]/page.tsx`
- **Versements** : `src/app/(admin)/caisse-speciale/contrats/[id]/versements/page.tsx`

---

*Dernière mise à jour : 2026-02-03*
