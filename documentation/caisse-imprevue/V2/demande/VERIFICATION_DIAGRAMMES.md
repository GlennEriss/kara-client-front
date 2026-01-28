# Vérification des Diagrammes PlantUML

> Document de vérification de l'implémentation par rapport aux diagrammes d'activité et de séquence

## 📋 Liste des Diagrammes

### Diagrammes de Séquence (Sequence)
1. ✅ `SEQ_CreerDemande.puml` - Créer une demande
2. ✅ `SEQ_ListerDemandes.puml` - Lister les demandes
3. ✅ `SEQ_VoirDetails.puml` - Voir les détails
4. ✅ `SEQ_AccepterDemande.puml` - Accepter une demande
5. ✅ `SEQ_RefuserDemande.puml` - Refuser une demande
6. ✅ `SEQ_ReouvrirDemande.puml` - Réouvrir une demande
7. ✅ `SEQ_SupprimerDemande.puml` - Supprimer une demande
8. ✅ `SEQ_ModifierDemande.puml` - Modifier une demande
9. ✅ `SEQ_CreerContrat.puml` - Créer un contrat
10. ✅ `SEQ_RechercherDemandes.puml` - Rechercher des demandes
11. ✅ `SEQ_TrierDemandes.puml` - Trier des demandes
12. ✅ `SEQ_FiltrerDemandes.puml` - Filtrer des demandes
13. ✅ `SEQ_ExporterDemandes.puml` - Exporter les demandes
14. ✅ `SEQ_ExporterDetailsDemande.puml` - Exporter détails d'une demande

### Diagrammes d'Activité (Activity)
1. ✅ `CreerDemande.puml` - Workflow création
2. ✅ `ListerDemandes.puml` - Workflow liste
3. ✅ `VoirDetails.puml` - Workflow détails
4. ✅ `AccepterDemande.puml` - Workflow acceptation
5. ✅ `RefuserDemande.puml` - Workflow refus
6. ✅ `ReouvrirDemande.puml` - Workflow réouverture
7. ✅ `SupprimerDemande.puml` - Workflow suppression
8. ✅ `ModifierDemande.puml` - Workflow modification
9. ✅ `CreerContrat.puml` - Workflow création contrat
10. ✅ `RechercherDemandes.puml` - Workflow recherche
11. ✅ `TrierDemandes.puml` - Workflow tri
12. ✅ `FiltrerDemandes.puml` - Workflow filtres
13. ✅ `ExporterDemandes.puml` - Workflow export liste
14. ✅ `ExporterDetailsDemande.puml` - Workflow export détails

---

## ✅ Vérifications par Diagramme

### 1. SEQ_CreerDemande / CreerDemande

#### Points vérifiés :
- ✅ `useDemandForm()` initialisé avec `zodResolver(createDemandSchema)`
- ✅ `useDemandFormPersistence()` activé avec debounce 500ms
- ✅ Restauration localStorage avec toast "Données restaurées"
- ✅ `useSubscriptionsCICache()` avec cache 30 min
- ✅ Scroll automatique vers le haut à chaque étape
- ✅ Step 1 : Recherche membre avec debounce 300ms
- ✅ Step 1 : Validation motif (min 10, max 500 caractères)
- ✅ Step 1 : Compteur de caractères affiché
- ✅ Step 2 : Forfaits chargés depuis cache (pas de refetch)
- ✅ Step 2 : Sélection forfait, fréquence, date souhaitée
- ✅ Step 3 : **EmergencyContactMemberSelector avec exclusion du membre** ✅ CORRIGÉ
- ✅ Step 3 : Remplissage automatique si membre sélectionné
- ✅ Validation par étape avec `form.trigger()`
- ✅ Génération ID standardisé : `MK_DEMANDE_CI_{matricule}_{date}_{heure}` ✅
- ✅ Utilisation `setDoc` avec ID explicite (pas `addDoc`) ✅
- ✅ Récupération membre pour obtenir matricule ✅
- ✅ Nettoyage localStorage après création ✅
- ✅ Invalidation cache liste et stats ✅
- ✅ Toast succès et redirection ✅

#### Points à vérifier :
- ⚠️ Le diagramme montre que le repository doit récupérer le membre via `getDoc(doc('members', demandData.memberId))` AVANT de générer l'ID. Actuellement, le service le fait, ce qui est correct.

---

### 2. SEQ_ListerDemandes / ListerDemandes

#### Points vérifiés :
- ✅ `StatisticsV2` affiché AVANT les tabs (stats globales)
- ✅ `useCaisseImprevueDemandsStats()` avec cache 15 min
- ✅ `useCaisseImprevueDemands()` avec pagination serveur
- ✅ Cache 5 min pour la liste
- ✅ Tri par priorité de statut pour tab "Toutes" (PENDING → APPROVED → REJECTED)
- ✅ Pagination haut et bas avec `PaginationWithEllipses`
- ✅ **Prefetch détails au survol** ✅ CORRIGÉ
- ✅ Scroll vers le haut lors du changement de page

#### Points à vérifier :
- ⚠️ La recherche : Le diagramme montre `onSearch(results)` qui filtre la liste, mais actuellement la recherche est séparée. À vérifier si c'est intentionnel ou si la recherche doit filtrer la liste principale.

---

### 3. SEQ_AccepterDemande / AccepterDemande

#### Points vérifiés :
- ✅ Modal avec toutes les sections (infos, motif, contact, résumé)
- ✅ Validation raison (min 10, max 500 caractères)
- ✅ **Optimistic update pour détails ET liste** ✅ CORRIGÉ
- ✅ Traçabilité : `acceptedBy`, `acceptedAt`, `decisionReason`
- ✅ Rollback en cas d'erreur
- ✅ Invalidation cache (liste, stats, détails)
- ✅ Toast succès

---

### 4. SEQ_RefuserDemande / RefuserDemande

#### Points vérifiés :
- ✅ Modal avec toutes les sections
- ✅ Validation motif (min 10, max 500 caractères)
- ✅ **Optimistic update pour détails ET liste** ✅ CORRIGÉ
- ✅ Traçabilité : `rejectedBy`, `rejectedAt`, `decisionReason`
- ✅ Rollback en cas d'erreur
- ✅ Invalidation cache
- ✅ Toast succès

---

### 5. SEQ_ReouvrirDemande / ReouvrirDemande

#### Points vérifiés :
- ✅ Modal avec motif de refus précédent affiché
- ✅ Validation raison (max 500 caractères, optionnel)
- ✅ **Optimistic update pour détails ET liste** ✅ CORRIGÉ
- ✅ Traçabilité : `reopenedBy`, `reopenedAt`, `reopenReason`
- ✅ Rollback en cas d'erreur
- ✅ Invalidation cache
- ✅ Toast succès

---

### 6. SEQ_SupprimerDemande / SupprimerDemande

#### Points vérifiés :
- ✅ Modal avec confirmation checkbox
- ✅ Traçabilité : `deletedBy`, `deletedAt` enregistrés AVANT suppression
- ✅ Suppression définitive du document
- ✅ Invalidation cache
- ✅ Toast succès

---

### 7. SEQ_ModifierDemande / ModifierDemande

#### Points vérifiés :
- ✅ Modal avec formulaire multi-étapes pré-rempli
- ✅ `useSubscriptionsCICache()` pour les forfaits
- ✅ Validation par étape
- ✅ Traçabilité : `updatedBy`, `updatedAt`
- ✅ Invalidation cache
- ✅ Toast succès

---

### 8. SEQ_CreerContrat / CreerContrat

#### Points vérifiés :
- ✅ Modal de confirmation avec checkbox
- ✅ Validation statut APPROVED
- ✅ Création contrat + mise à jour demande
- ✅ Traçabilité : `convertedBy`, `convertedAt`, `contractId`
- ✅ Invalidation cache (demandes + contrats)
- ✅ Toast succès

---

### 9. SEQ_RechercherDemandes / RechercherDemandes

#### Points vérifiés :
- ✅ Debounce 300ms
- ✅ `useDemandSearch()` avec cache 2 min
- ✅ Normalisation query (toLowerCase, trim)
- ✅ Recherche Firestore par préfixe (memberLastName)
- ✅ Filtrage prénom côté client
- ✅ Cache utilisé si présent (< 2 min)

#### Points à vérifier :
- ⚠️ Le diagramme montre `onSearch(results)` qui filtre la liste. Actuellement, la recherche est séparée. À vérifier si la recherche doit filtrer la liste principale ou rester séparée.

---

### 10. SEQ_ExporterDemandes / ExporterDemandes

#### Points vérifiés :
- ✅ Modal avec format (PDF/Excel)
- ✅ Périmètre (Toutes/Période/Nombre)
- ✅ Filtres de statut multiples
- ✅ Tri personnalisable
- ✅ **Calcul d'aperçu (previewCount)** ✅ CORRIGÉ
- ✅ **Avertissement export volumineux (>1000 ou 'all')** ✅ CORRIGÉ
- ✅ Récupération paginée des demandes
- ✅ Génération PDF/Excel
- ✅ Téléchargement fichier

---

### 11. SEQ_ExporterDetailsDemande / ExporterDetailsDemande

#### Points vérifiés :
- ✅ Export PDF détails d'une demande
- ✅ Toutes les sections incluses
- ✅ Tableau versements inclus

---

### 12. SEQ_TrierDemandes / TrierDemandes

#### Points vérifiés :
- ✅ Tri par date (croissant/décroissant)
- ✅ Tri alphabétique (nom/prénom)
- ✅ Refetch avec nouveau tri
- ✅ Index Firestore requis

---

### 13. SEQ_FiltrerDemandes / FiltrerDemandes

#### Points vérifiés :
- ✅ Filtres statut, fréquence, forfait
- ✅ Reset pagination à la page 1
- ✅ Invalidation cache
- ✅ Refetch avec nouveaux filtres

---

## 🔍 Points à Clarifier

1. **Recherche** : Le diagramme `SEQ_RechercherDemandes` montre `onSearch(results)` qui filtre la liste. Actuellement, la recherche est séparée. Faut-il que la recherche filtre la liste principale ou reste-t-elle séparée ?

2. **Validation Step 3** : Le diagramme montre que la Card contact devient verte quand valide. `EmergencyContactMemberSelector` gère déjà cela avec `isFormValid`.

---

## ✅ Résumé

**Total diagrammes** : 28 (14 séquence + 14 activité)

**Implémentés** : ~95%

**Corrections apportées** :
1. ✅ Step3Contact utilise maintenant `EmergencyContactMemberSelector` avec exclusion
2. ✅ Optimistic updates mis à jour pour la liste aussi
3. ✅ Preview count implémenté pour export
4. ✅ Avertissement gros exports implémenté
5. ✅ Prefetch détails au survol implémenté

**Points restants** :
- ⚠️ Intégration recherche dans liste (à clarifier avec l'utilisateur)
