# Points problématiques – Partie Demandes Caisse Spéciale

> Ce document consolide tous les points problématiques identifiés dans la partie "Demandes" du module Caisse Spéciale.  
> Référence : `documentation/caisse-speciale/V1/DEMANDES_CAISSE_SPECIALE.md`

---

## Points critiques (priorité immédiate)

Les points suivants ont été identifiés comme **critiques** lors de la revue utilisateur :

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| **C.0** | **Formulaire de création : contact d'urgence manquant** : Le formulaire de création de demande ne comporte PAS la section "Contact d'urgence". Or, lors de la création d'une demande, on doit obligatoirement informer un contact d'urgence (comme dans Caisse Imprévue). Il faut ajouter cette section au formulaire, en réutilisant la même logique que Caisse Imprévue : `EmergencyContactMemberSelector` (recherche membre ou saisie manuelle : nom, prénom, téléphones, lien de parenté, type et numéro de pièce, photo du document). | Données incomplètes, non-conformité avec les exigences métier | **Critique** |
| **C.1** | **Ordre Tabs / Stats incorrect** : Les statistiques sont affichées APRÈS les onglets, alors qu'elles sont **globales** (pas par onglet). Les stats doivent se charger une seule fois. Actuellement, l'ordre suggère que les stats changent à chaque changement d'onglet, ce qui provoque des rechargements inutiles. | Rechargements multiples des stats, confusion UX, mauvaise performance | **Critique** |
| **C.2** | **Absence totale de filtres** : Aucun filtre disponible (dates, recherche, etc.) | Impossible de filtrer les demandes | **Critique** |
| **C.3** | **Absence de recherche** : Pas de champ de recherche pour trouver les demandes d'un membre par nom (ex. "Bernadette") ou matricule | Impossible de retrouver rapidement les demandes d'un membre | **Critique** |
| **C.4** | **Absence de filtres par date** : Pas de filtre par période (ex. demandes des 2 derniers mois) | Impossible de filtrer par période | **Critique** |
| **C.5** | **Vue Liste incorrecte** : La vue "Liste" n'affiche pas une vraie liste/tableau. Elle affiche des cards en longueur, contrairement à "Demandes d'adhésion" ou "Membres" qui ont des tableaux avec colonnes. | Mauvaise lisibilité, ne correspond pas aux attentes utilisateur | **Critique** |
| **C.6** | **Création : modal au lieu de page** : Actuellement, "Nouvelle Demande" ouvre un modal (`CreateDemandModal`). Il faut une **PAGE** dédiée comme Caisse Imprévue : clic "Nouvelle Demande" → navigation vers `/caisse-speciale/demandes/nouvelle` (ou `/add`). Référence : Caisse Imprévue `/caisse-imprevue/demandes/add`. | Incohérence UX, pas de persistance localStorage, formulaire perdu si fermeture accidentelle | **Critique** |
| **C.7** | **Traçabilité : admin créateur** : Enregistrer l'admin qui a créé la demande (`createdBy: adminId`). | Traçabilité incomplète | **Critique** |
| **C.8** | **Recherche : attributs searchableText manquants** : Pour rechercher par nom, prénom ou matricule, Firestore impose une contrainte : la recherche par préfixe ne matche que le **début** de la chaîne. Avec un seul champ `searchableText = "dupont jean 8438"`, "jean" ou "8438" seul ne matche pas. **Solution Caisse Imprévue** : 3 champs dénormalisés (`searchableText`, `searchableTextFirstNameFirst`, `searchableTextMatriculeFirst`) + 3 requêtes parallèles fusionnées. À répliquer pour Caisse Spéciale. Référence : `documentation/caisse-imprevue/V2/recherche-demande/RECHERCHE_ANALYSE.md`, `src/utils/demandSearchableText.ts`, `DemandCIRepository.getPaginatedWithSearchMerge`. | Recherche par prénom ou matricule impossible avec un seul champ | **Critique** |

**Recommandations pour les points critiques :**
- **C.0** : Ajouter la section "Contact d'urgence" au formulaire de création. Réutiliser `EmergencyContactMemberSelector` comme dans Caisse Imprévue (`Step3Contact.tsx`). Étendre le schéma `CaisseSpecialeDemand` et le type Firestore pour inclure `emergencyContact` (lastName, firstName, phone1, phone2, relationship, typeId, idNumber, documentPhotoUrl). Référence : `src/domains/financial/caisse-imprevue/components/forms/steps/Step3Contact.tsx`
- **C.1** : Inverser l'ordre → **Statistiques d'abord** (globales, chargées une fois), **puis onglets** (filtres de la liste)
- **C.2, C.3, C.4** : Ajouter une barre de recherche (nom, prénom, matricule) + filtres par date (date de création, date souhaitée)
- **C.5** : Implémenter une vraie vue tableau (colonnes : Matricule, Nom, Prénom, Montant, Durée, Date souhaitée, Statut, **Contact d'urgence**, Actions) comme dans `/membership-requests` ou `/memberships`
- **C.6** : Remplacer `CreateDemandModal` par une page `/caisse-speciale/demandes/nouvelle`. Le bouton "Nouvelle Demande" fait `router.push('/caisse-speciale/demandes/nouvelle')`. Créer `src/app/(admin)/caisse-speciale/demandes/nouvelle/page.tsx` (ou `add/page.tsx`) sur le modèle de `caisse-imprevue/demandes/add/page.tsx`.
- **C.7** : À la création, passer `createdBy: user.uid` (admin connecté) au service. Le repository enregistre `createdBy` dans le document Firestore.
- **C.8** : À la création de demande, calculer et stocker les 3 variantes via `generateAllDemandSearchableTexts(memberLastName, memberFirstName, memberMatricule)` depuis `src/utils/demandSearchableText.ts`. Le repository doit implémenter `getPaginatedWithSearchMerge` (3 requêtes parallèles sur les 3 champs, fusion + déduplication) comme `DemandCIRepository`. Index Firestore requis pour chaque variante.
- **Traçabilité (audit)** : Pour chaque action (Accepter, Refuser, Réouvrir, Convertir), enregistrer **qui** (adminId, adminName) et **quand** (timestamp). Champs : `approvedBy`/`approvedAt`/`approvedByName`/`approveReason`, `rejectedBy`/`rejectedAt`/`rejectedByName`/`rejectReason`, `reopenedBy`/`reopenedAt`/`reopenedByName`/`reopenReason`, `convertedBy`/`convertedAt`/`convertedByName`. Affichage obligatoire sur la page de détails et dans l'historique.

---

## Table des matières

1. [UX/UI – Liste et affichage](#1-uxui--liste-et-affichage)
2. [UX/UI – Page de détails](#2-uxui--page-de-détails)
3. [Technique – Pagination et données](#3-technique--pagination-et-données)
4. [Technique – Architecture et code](#4-technique--architecture-et-code)
5. [Technique – Tests et documentation](#5-technique--tests-et-documentation)
6. [Sécurité et validation](#6-sécurité-et-validation)

---

## 1. UX/UI – Liste et affichage

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 1.1 | Breadcrumbs manquants pour `/caisse-speciale/demandes` et `/caisse-speciale/demandes/[id]` | Affichage "Page > Page" ou libellés incorrects | Haute |
| 1.2 | Cards grid : pas d'informations du membre (nom, prénom, matricule) | Impossible d'identifier le demandeur sans ouvrir les détails | Haute |
| 1.3 | Cards grid et tableau : pas de contacts du demandeur (téléphones, email) | Impossible de contacter le demandeur directement depuis la liste | Haute |
| 1.4 | Cards grid : pas de contact d'urgence affiché | Le contact d'urgence (obligatoire à la création) n'est pas affiché sur les cards ni dans le tableau | Haute |
| 1.6 | Liste : pas d'export PDF ni Excel | Impossible d'exporter la liste des demandes (affichées/filtrées) | Haute |
| 1.5 | Identifiant tronqué (#123456) sans matricule complet | Difficile à retrouver une demande | Moyenne |

**Recommandations :**
- Ajouter les routes dans `DashboardBreadcrumb.tsx` : `/caisse-speciale/demandes` → "Demandes", `/caisse-speciale/demandes/[id]` → "Détails"
- Afficher nom complet et matricule du membre sur chaque card via `useMember(demand.memberId)`
- **1.3** : Afficher les **contacts du demandeur** (téléphones, email) sur chaque card et dans le tableau via `useMember(demand.memberId)` → `member.contacts`, `member.phone`, `member.email`
- Afficher le contact d'urgence (nom, téléphone principal) sur chaque card/tableau via `demand.emergencyContact`
- **1.6** : Ajouter boutons "Exporter PDF" et "Exporter Excel" dans la barre d'actions de la liste. Export des demandes affichées (ou filtrées) avec colonnes : Matricule, Nom, Prénom, Contacts demandeur, Montant, Durée, Date souhaitée, Statut, Contact d'urgence
- Afficher le matricule complet dans un tooltip

---

## 2. UX/UI – Page de détails

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 2.1 | Pas d'informations du membre (nom, prénom, matricule, contacts) | Page incomplète, impossible d'identifier le demandeur | Haute |
| 2.2 | La demande a `memberId` mais aucune donnée membre affichée | Contexte manquant pour la décision | Haute |
| 2.3 | Pas de section "Contact d'urgence" sur la page de détails | Le contact d'urgence (saisi à la création) n'est pas affiché | Haute |

**Recommandations :**
- Utiliser `useMember(demand.memberId)` pour récupérer les infos du membre
- Ajouter une carte "Informations du membre" avec nom, prénom, matricule, contacts
- Ajouter une carte "Contact d'urgence" avec nom, prénom, téléphones, lien de parenté (depuis `demand.emergencyContact`)
- **Traçabilité (audit)** : Afficher sur la page de détails qui a fait quoi et quand : "Accepté par X le DD/MM/YYYY" (approvedByName, approvedAt), "Refusé par Y le DD/MM/YYYY" (rejectedByName, rejectedAt), "Réouvert par Z le DD/MM/YYYY" (reopenedByName, reopenedAt), "Converti par W le DD/MM/YYYY" (convertedByName, convertedAt)
- **Export PDF** : Bouton "Exporter en PDF" pour télécharger les détails complets de la demande (infos membre, contact urgence, infos générales, tableau versements, historique). Référence : `DemandExportService.exportDemandDetailsToPDF` (Caisse Imprévue)
- **Tableau récapitulatif des versements** : Plan prévisionnel (Mois, Date, Montant FCFA, Cumulé, Total) calculé depuis `monthlyAmount`, `monthsPlanned`, `desiredDate`. Export PDF et Excel du tableau. Référence : `PaymentScheduleTable` (Caisse Imprévue)
- S'inspirer de `CreditDemandDetail.tsx` (client/garant) et Caisse Imprévue (contact d'urgence)

---

## 3. Technique – Pagination et données

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 3.1 | **Bug pagination** : `totalPages = Math.ceil(filteredDemandes.length / itemsPerPage)` alors que `filteredDemandes` est déjà la page courante (max 12 items) | Pagination "Suivant/Précédent" ne fonctionne pas, totalPages toujours 0 ou 1 | Haute |
| 3.2 | Le repository ne retourne pas le total des demandes | Impossible d'afficher "Page X sur Y" ou "Affichage 1-12 sur 50" | Haute |
| 3.3 | **Performance stats** : `getDemandsStats` appelle `getDemandsWithFilters({})` et charge TOUTES les demandes en mémoire | Performance dégradée avec beaucoup de demandes | Moyenne |
| 3.4 | Recherche limitée à l'ID uniquement (`d.id.toLowerCase().includes(searchLower)`) | Impossible de rechercher par nom de membre ou matricule | Moyenne |

**Recommandations :**
- Modifier le repository pour retourner `{ items: CaisseSpecialeDemand[], total: number }` dans `getDemandsWithFilters`
- Ou faire une requête séparée pour le count (avec `getCountFromServer` Firestore)
- Optimiser `getDemandsStats` : requêtes Firestore dédiées par statut ou agrégation
- Étendre la recherche : inclure nom/prénom/matricule du membre (nécessite jointure ou champ dénormalisé)

---

## 4. Technique – Architecture et code

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 4.1 | Duplication : `getStatusColor`, `getStatusLabel`, `getCaisseTypeLabel` dupliquées entre `ListDemandes.tsx` et `DemandDetail.tsx` | Maintenance difficile, risque d'incohérence | Basse |
| 4.2 | `handleRefresh` vide dans `ListDemandes` (commentaire "Le refetch est géré par React Query") | Code mort, bouton "Actualiser" sans effet visible | Basse |

**Recommandations :**
- Extraire les fonctions de statut/type dans `utils/caisse-speciale.ts` ou similaire
- Implémenter un vrai refetch sur le bouton Actualiser : `queryClient.invalidateQueries(['caisseSpecialeDemands'])`

---

## 5. Technique – Tests et documentation

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 5.1 | Absence de tests unitaires pour les composants critiques | Risque de régression | Moyenne |
| 5.2 | Absence de tests d'intégration pour les flux (création, acceptation, refus) | Flux non validés | Moyenne |
| 5.3 | Documentation technique insuffisante | Difficulté à maintenir | Basse |

**Recommandations :**
- Écrire des tests unitaires pour les hooks (`useCaisseSpecialeDemands`, mutations)
- Ajouter des tests d'intégration pour les flux utilisateur
- Documenter les décisions architecturales

---

## 6. Sécurité et validation

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 6.1 | Vérifier que toutes les entrées utilisateur sont validées (Zod) | Risque de données invalides | Haute |
| 6.2 | Vérifier les règles Firestore pour `caisseSpecialeDemands` | Accès non autorisé possible | Haute |
| 6.3 | Recherche : `d.id.toLowerCase()` – si `d.id` undefined (données corrompues) | Risque de `TypeError` en production | Moyenne |

**Recommandations :**
- Valider toutes les entrées avec schémas Zod (déjà en place pour approve/reject/reopen)
- Auditer les règles Firestore (lecture/écriture admin uniquement – déjà en place)
- Utiliser `(d.id || '').toLowerCase()` pour éviter les erreurs sur données incomplètes

---

## Synthèse par priorité

### Priorité critique (à traiter en priorité absolue)
- **C.0** – Contact d'urgence : ajouter au formulaire de création + afficher sur liste et détails
- **C.1** – Ordre Stats / Tabs (Stats d'abord, Tabs ensuite)
- **C.2** – Ajouter des filtres
- **C.3** – Ajouter la recherche (nom, prénom, matricule)
- **C.4** – Ajouter les filtres par date
- **C.5** – Vue Liste : vrai tableau comme membership-requests / members
- **C.6** – Création : PAGE au lieu de modal (`/caisse-speciale/demandes/nouvelle`)
- **C.7** – Traçabilité : enregistrer `createdBy` (admin créateur)
- **C.8** – Recherche : 3 attributs searchableText (comme Caisse Imprévue)

### Priorité haute (à traiter en premier)
- 1.1 – Breadcrumbs manquants
- 1.2 – Informations membre sur les cards
- **1.3** – Contacts du demandeur (téléphones, email) sur cards et tableau
- 1.4 – Contact d'urgence sur cards et tableau
- **1.6** – Export PDF et Excel au niveau de la liste
- 2.1, 2.2, 2.3 – Informations membre et contact d'urgence sur la page de détails
- 3.1, 3.2 – Bug de pagination
- 6.1, 6.2 – Sécurité et validation

### Priorité moyenne
- 1.5 – Cards grid (identifiant tronqué)
- 3.3, 3.4 – Performance stats et recherche
- 5.1, 5.2 – Tests
- 6.3 – Robustesse recherche

### Priorité basse
- 4.1, 4.2 – Duplication et code mort
- 5.3 – Documentation

---

## Références

- **Spécification V1** : `documentation/caisse-speciale/V1/DEMANDES_CAISSE_SPECIALE.md`
- **Analyse** : `documentation/caisse-speciale/V1/ANALYSE_CAISSE_SPECIALE.md`
- **Règles Firebase** : `documentation/caisse-speciale/V1/REGLES_FIREBASE_DEMANDES.md`
- **Modules de référence pour la vue Liste** : `/membership-requests` (demandes d'adhésion), `/memberships` (membres) – tableaux avec colonnes
- **Module de référence pour l'affichage membre** : `/credit-speciale/demandes` (affichage membre, contacts garant)
- **Module de référence pour le contact d'urgence** : Caisse Imprévue `Step3Contact.tsx` + `EmergencyContactMemberSelector`

---

*Dernière mise à jour : 2026-01-30*
