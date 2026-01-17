# Diagrammes d'Activité - Module Membership Requests

## Vue d'ensemble

Ce document contient **12 diagrammes d'activité** décrivant tous les workflows du module de gestion des demandes d'adhésion. Ces diagrammes sont essentiels pour comprendre le fonctionnement actuel et planifier le refactoring.

## Fichier PlantUML

**Fichier :** `DIAGRAMMES_ACTIVITE.puml`

Tous les diagrammes sont regroupés dans un seul fichier PlantUML. Vous pouvez les visualiser avec :
- PlantUML Online : http://www.plantuml.com/plantuml/uml/
- Extension VSCode : "PlantUML"
- Extension IntelliJ : PlantUML integration

## Liste des Diagrammes

### 1. Voir les Détails
**Workflow :** Navigation vers la page de détails complète d'une demande

**Flux :**
1. Admin clique sur "Voir les détails" (dropdown menu)
2. Navigation vers `/routes/admin/membership-requests/[id]`
3. Chargement de la demande via `useMembershipRequest(requestId)`
4. Récupération informations parrain (si existe)
5. Récupération informations admin traiteur (si existe)
6. Affichage page de détails complète

**Points clés :**
- Utilise `useMembershipRequest` hook
- Gère les cas d'erreur (demande non trouvée)
- Affiche skeleton pendant chargement

---

### 2. Fiche d'Adhésion
**Workflow :** Génération et téléchargement du PDF de la fiche d'adhésion

**Qu'est-ce que c'est ?**
La **Fiche d'Adhésion** est un document PDF officiel contractuel contenant :
- Logo KARA
- Photo du demandeur
- Type de membre (Adhérent/Sympathisant/Bienfaiteur)
- Informations personnelles complètes (identité, adresse)
- Informations entreprise/profession
- Véhicule (si applicable)
- Parrain (si applicable)

**Généré avec :** `react-pdf` (@react-pdf/renderer)

**Flux :**
1. Admin clique "Fiche d'adhésion" (dropdown menu)
2. Modal `MemberDetailsModal` s'ouvre
3. Admin peut prévisualiser ou télécharger
4. Génération PDF avec composant `MutuelleKaraPDF`
5. Création blob et téléchargement automatique
6. Nom de fichier : `NOM_PRENOM_ADHESION_MK_YYYY.pdf`

**Points clés :**
- Génération côté client (react-pdf)
- Téléchargement automatique
- Format standardisé du nom de fichier

---

### 3. Voir la Pièce d'Identité
**Workflow :** Affichage du recto/verso de la pièce d'identité

**Flux :**
1. Admin clique "Voir la pièce d'identité" (dropdown menu)
2. Modal `MemberIdentityModal` s'ouvre
3. Affichage recto par défaut (`showFront = true`)
4. Toggle recto/verso possible
5. Affichage message si pièce non fournie

**Données affichées :**
- `identity.identityDocumentFront` (recto)
- `identity.identityDocumentBack` (verso)

**Points clés :**
- Vue toggle recto/verso
- Gestion cas photos manquantes
- Zoom possible (selon support navigateur)

---

### 4. Statistiques
**Workflow :** Calcul et affichage des statistiques des demandes

**Statistiques actuelles :**
1. **Total** : Nombre total de demandes
2. **En attente** : `status = 'pending'`
3. **Approuvées** : `status = 'approved'`
4. **Rejetées** : `status = 'rejected'`
5. **En cours d'examen** : `status = 'under_review'`

**Flux :**
1. Page se charge → `useMembershipRequestsStats()` appelé
2. 4 requêtes parallèles (Promise.all) pour chaque statut
3. Calcul des totaux et pourcentages
4. Affichage dans `StatsCarousel` avec graphiques camembert

**⚠️ Problème identifié :**
Dans `MembershipRequestsList.tsx` (lignes 1477-1497), les statistiques sont **calculées sur les 10 items de la page** au lieu du total réel !

**Code problématique :**
```typescript
const pending = membershipData.data.filter(
  r => r.status === 'pending'
).length // ❌ Seulement les 10 items de la page !
```

**Solution :**
Utiliser `useMembershipRequestsStats()` hook qui fait des requêtes dédiées pour chaque statut.

---

### 5. Approuver
**Workflow :** Approuver une demande et créer un membre

**Flux complet :**
1. Vérification paiement (bouton désactivé si non payé)
2. Modal confirmation
3. Sélection type de membre (Adhérent/Sympathisant/Bienfaiteur)
4. Vérification entreprise/profession (si renseignées)
5. Upload PDF adhésion (optionnel)
6. Confirmation admin
7. **Fork parallèle :**
   - Upload PDF → Firebase Storage
   - Appel API `/api/create-firebase-user-email-pwd`
8. Création utilisateur Firebase + document `users`
9. Création subscription
10. Archivage PDF (si uploadé) → `DocumentRepository`
11. Mise à jour statut demande = 'approved'
12. Invalidation cache React Query
13. Toast succès (⚠️ avec mot de passe exposé)

**⚠️ Problèmes identifiés :**
- Pas de rollback si erreur après création utilisateur
- Mot de passe exposé dans toast (sécurité)
- Logique métier complexe dans composant React
- Pas de transaction Firestore

---

### 6. Rejeter
**Workflow :** Rejeter une demande d'adhésion

**Flux :**
1. Admin clique "Rejeter" (visible si `pending` ou `under_review`)
2. Modal confirmation
3. Saisie motif de rejet (optionnel mais recommandé)
4. Appel `useUpdateMembershipRequestStatus`
5. Mise à jour Firestore :
   - `status = 'rejected'`
   - `processedBy = adminId`
   - `processedAt = serverTimestamp()`
   - `motifReject = motif`
6. Notification automatique au demandeur
7. Invalidation cache
8. Toast "Demande rejetée avec succès"

**Points clés :**
- Motif de rejet optionnel
- Notification automatique
- Statut peut être 'pending' ou 'under_review' avant rejet

---

### 7. Demander Corrections
**Workflow :** Mettre une demande en examen et demander des corrections

**Flux :**
1. Admin clique "Demander corrections" (`pending` seulement)
2. Modal confirmation
3. Saisie liste corrections (optionnel)
4. **Si corrections fournies :**
   - Génération code sécurité (6 chiffres)
   - Date expiration (48h)
   - Mise à jour Firestore avec code
5. **Sinon :**
   - Simple mise à jour statut = 'under_review'
6. Notification automatique
7. Affichage dans carte :
   - Lien correction : `/register?requestId={id}`
   - Code sécurité (si généré)
   - Boutons copier lien/code
   - Bouton renouveler code
8. **Renouvellement code** (si demandé) :
   - Nouveau code 6 chiffres
   - Nouvelle expiration 48h
   - Toast "Code renouvelé"

**Workflow côté demandeur :**
1. Reçoit lien + code
2. Accède `/register?requestId={id}`
3. Saisit code sécurité
4. Code vérifié (non expiré, non utilisé)
5. Formulaire pré-rempli
6. Modifie données
7. Soumet nouvelle demande
8. Code marqué utilisé (`securityCodeUsed = true`)

**Points clés :**
- Code 6 chiffres (sécurité faible : 1M combinaisons)
- Expiration 48h
- Code à usage unique (marqué utilisé après utilisation)
- Renouvellement possible

---

### 8. Recherche
**Workflow :** Recherche textuelle dans les demandes

**Flux :**
1. Admin tape dans barre de recherche
2. Debounce 300ms
3. `filters.searchQuery` mis à jour
4. Appel `useMembershipRequests` avec `searchQuery`
5. Filtrage côté **CLIENT** après récupération

**⚠️ Problème majeur :**
La recherche est effectuée **côté CLIENT** sur les 10 items de la page seulement, pas sur toute la collection Firestore !

**Code actuel :**
```typescript
// Dans membership.db.ts
// Filtrage fait après récupération, pas dans la requête Firestore
requests.filter(request => 
  searchQuery.toLowerCase().includes(/* ... */)
)
```

**Impact :**
- Recherche incomplète (seulement 10 résultats)
- Inefficace (télécharge toutes les données puis filtre)
- Pas de recherche full-text Firestore

**Solution à implémenter :**
- Utiliser index Firestore pour recherche textuelle
- Ou implémenter recherche côté serveur avec Cloud Functions
- Ou utiliser Algolia/ElasticSearch pour recherche avancée

---

### 9. Filtres
**Workflow :** Application des filtres sur la liste

**Types de filtres :**
1. **Par onglet** (7 onglets) :
   - Toutes, En attente, En cours, Approuvées, Refusées, Payées, Non payées
2. **Par statut** (Select) :
   - Tous, En attente, En cours d'examen, Approuvées, Rejetées
3. **Par paiement** (côté client uniquement) :
   - Payé / Non payé

**Flux :**
1. Initialisation filtres par défaut
2. Admin sélectionne onglet → `filters.status` mis à jour
3. Admin change Select statut → `filters.status` mis à jour
4. Reset pagination (`page = 1`) à chaque changement filtre
5. Appel `useMembershipRequests` avec nouveaux filtres
6. Filtrage "Payé/Non payé" côté client (⚠️ pas côté serveur)
7. Affichage badges filtres actifs
8. Bouton "Réinitialiser" remet filtres par défaut

**Points clés :**
- Filtres statut : côté serveur (Firestore)
- Filtres paiement : côté client (après récupération)
- Reset pagination automatique
- Badges visuels des filtres actifs

---

### 10. Pagination
**Workflow :** Navigation entre les pages de résultats

**Implémentation :**
- Pagination côté serveur (Firestore)
- Utilise curseurs (`startAfter`)
- Total calculé avec `getCountFromServer`
- Limite configurable : 10, 25, 50, 100 items/page

**Flux :**
1. Initialisation `page = 1`, `limit = 10`
2. Récupération 10 documents + total
3. Affichage contrôles :
   - Bouton "Précédent" (disabled si page 1)
   - Numéros de pages avec ellipses
   - Bouton "Suivant" (disabled si dernière page)
   - Info "Page X sur Y • Z résultats"
4. Navigation :
   - Clic "Précédent" → `page - 1`
   - Clic "Suivant" → `page + 1`
   - Clic numéro → `page = numéro`
   - Changement limit → `page = 1` (reset)
5. Scroll automatique en haut après changement page

**Limitations :**
- Pas de tri multi-critères
- Pas de navigation directe dernière page
- Ellipses pour grandes listes (> 5 pages visibles)

---

### 11. Liste des Dossiers
**Workflow :** Chargement et affichage de la liste complète

**Flux :**
1. Accès `/membership-requests`
2. Initialisation états (filtres, activeTab)
3. Appel `useMembershipRequests` avec filtres initiaux
4. **Si chargement :** Afficher 5 skeletons
5. **Si erreur :** Afficher message erreur
6. **Si données :**
   - Calculer statistiques (⚠️ sur 10 items)
   - Filtrer selon activeTab (payé/non payé = client)
   - Afficher en-tête (titre + description)
   - Afficher 7 onglets
   - Afficher StatsCarousel
   - Afficher barre recherche + filtres (dans Card)
   - Afficher liste cartes (`MembershipRequestCard`)
   - Afficher pagination (si > 1 page)

**Structure de la carte :**
- Photo + nom complet
- 6 champs info (email, téléphone, adresse, date, âge, véhicule)
- Badge statut + badge paiement
- Dropdown menu actions ("...")
- Boutons actions (si `status = 'pending'`)

**Points clés :**
- Skeleton pendant chargement
- Gestion erreurs
- Filtrage actif côté client (payé/non payé)
- Pagination visible si nécessaire

---

### 12. Payer
**Workflow :** Enregistrer un paiement pour une demande

**Flux :**
1. Admin clique "Payer" (dropdown menu, si `pending` et `!isPaid`)
2. Modal de paiement s'ouvre
3. Saisie informations :
   - Date (date picker)
   - Heure (time picker)
   - Mode (Espèce, Mobile Money, Virement, Chèque, Carte)
   - Montant (nombre)
   - Type (Membership, Autre)
   - Avec frais (Oui/Non)
4. Validation tous champs remplis
5. Appel `usePayMembershipRequest` mutation
6. Mise à jour Firestore :
   - `isPaid = true`
   - `payments[]` = ajouter nouveau paiement
   - `paidAt = serverTimestamp()`
   - `paidBy = admin.uid`
7. Invalidation cache
8. Fermer modal
9. Toast "Paiement enregistré"
10. Badge change "Non payé" → "Payé"
11. Bouton "Approuver" devient actif

**Notes :**
- Paiement ne change pas le statut (reste `pending`)
- Plusieurs paiements possibles (tableau `payments[]`)
- `isPaid = true` après premier paiement
- Bouton "Approuver" nécessite `isPaid = true`

---

## Statistiques Actuelles - Analyse

### Calcul Actuel (Incorrect)

Dans `MembershipRequestsList.tsx` lignes 1477-1497 :

```typescript
const stats = useMemo(() => {
  if (!membershipData) return null
  
  const total = membershipData.pagination.totalItems // ✅ Correct
  const pending = membershipData.data.filter(r => r.status === 'pending').length // ❌ Seulement 10 items !
  const approved = membershipData.data.filter(r => r.status === 'approved').length // ❌
  const rejected = membershipData.data.filter(r => r.status === 'rejected').length // ❌
  const underReview = membershipData.data.filter(r => r.status === 'under_review').length // ❌
  
  return {
    total, // ✅ Correct
    pending, // ❌ Incorrect (max 10)
    approved, // ❌ Incorrect
    rejected, // ❌ Incorrect
    underReview, // ❌ Incorrect
    pendingPercentage: total > 0 ? (pending / total) * 100 : 0, // ❌ Pourcentage faux
    // ...
  }
}, [membershipData])
```

### Calcul Correct (Hook Disponible)

Hook `useMembershipRequestsStats()` fait des requêtes dédiées :

```typescript
// Dans useMembershipRequests.ts lignes 180-233
const [pending, approved, rejected, underReview] = await Promise.all([
  getMembershipRequestsPaginated({ status: 'pending', limit: 1000 }),
  getMembershipRequestsPaginated({ status: 'approved', limit: 1000 }),
  getMembershipRequestsPaginated({ status: 'rejected', limit: 1000 }),
  getMembershipRequestsPaginated({ status: 'under_review', limit: 1000 }),
]);

return {
  total: allRequests.length,
  pending: pending.pagination.totalItems, // ✅ Correct
  approved: approved.pagination.totalItems, // ✅ Correct
  // ...
};
```

**⚠️ Problème :** Ce hook n'est PAS utilisé dans `MembershipRequestsList` !

---

## Points à Corriger Identifiés

### 🔴 Critique

1. **Statistiques calculées sur 10 items** au lieu du total réel
2. **Recherche côté client** sur 10 items seulement (pas Firestore)
3. **Pas de rollback** lors d'erreur d'approbation (données incohérentes)
4. **Mot de passe exposé** dans toast (sécurité)

### 🟠 Important

5. **Logique métier dans composant React** (approbation, corrections)
6. **Filtres paiement côté client** (pas côté serveur)
7. **Code sécurité faible** (6 chiffres, 1M combinaisons, bruteforce possible)

### 🟡 Mineur

8. **Pagination limitée** (pas de tri multi-critères)
9. **Pas de transaction Firestore** pour opérations complexes

---

## Prochaines Étapes

1. ✅ Analyser tous les workflows (12 diagrammes créés)
2. ⏳ Utiliser `useMembershipRequestsStats()` pour statistiques correctes
3. ⏳ Implémenter recherche côté serveur (index Firestore ou Cloud Functions)
4. ⏳ Refactoriser logique métier hors composants (services dédiés)
5. ⏳ Ajouter rollback/transactions pour approbation
6. ⏳ Sécuriser mot de passe (ne jamais l'exposer dans UI)

---

## Références

- **Code source :** `src/components/memberships/MembershipRequestsList.tsx`
- **Hooks :** `src/hooks/useMembershipRequests.ts`
- **DB :** `src/db/membership.db.ts`
- **Services :** `src/services/memberships/MembershipService.ts`
- **Types :** `src/types/types.ts`
