# Diagrammes de Séquence - Module Membership Requests

Ce document décrit les 13 diagrammes de séquence créés pour le module de gestion des demandes d'adhésion, basés sur la **nouvelle architecture refactorisée**.

---

## Architecture de Référence

Les diagrammes de séquence respectent l'architecture en couches suivante :

```
┌─────────────────────────────────────────────────────────────┐
│                   COUCHE PRÉSENTATION (UI)                  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│  │ Page          │ │ Components    │ │ UI Components │     │
│  │ Components    │ │ (Feature)     │ │ (Réutilisables│     │
│  └───────────────┘ └───────────────┘ └───────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   COUCHE LOGIQUE (HOOKS)                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ React Query Hooks (useQuery, useMutation)             │ │
│  │ - Gestion du cache                                    │ │
│  │ - États de chargement                                 │ │
│  │ - Invalidation                                        │ │
│  └───────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  COUCHE MÉTIER (SERVICES)                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │ MembershipApp-  │ │ MembershipPay-  │ │ Membership    │ │
│  │ rovalService    │ │ mentService     │ │ CorrectionSvc │ │
│  └─────────────────┘ └─────────────────┘ └───────────────┘ │
│  ┌─────────────────┐ ┌─────────────────┐                   │
│  │ MembershipStats │ │ SearchService   │                   │
│  │ Service         │ │ (Algolia/FS)    │                   │
│  └─────────────────┘ └─────────────────┘                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                 COUCHE DONNÉES (REPOSITORY)                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ membership.db.ts                                      │ │
│  │ - Accès Firestore                                     │ │
│  │ - Transformations de données                          │ │
│  └───────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    INFRASTRUCTURE                           │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐ │
│  │ Firestore │ │ Firebase  │ │ Firebase  │ │ API Routes │ │
│  │           │ │ Auth      │ │ Storage   │ │            │ │
│  └───────────┘ └───────────┘ └───────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Liste des Diagrammes

| # | Diagramme | Fichier | Description |
|---|-----------|---------|-------------|
| 1 | Voir les Détails | `SEQ_Voir_Details` | Affichage d'une demande individuelle |
| 2 | Fiche d'Adhésion | `SEQ_Fiche_Adhesion` | Génération et téléchargement du PDF |
| 3 | Voir Pièce d'Identité | `SEQ_Voir_Piece_Identite` | Visualisation recto/verso |
| 4 | Statistiques | `SEQ_Statistiques` | Calcul optimisé côté serveur |
| 5 | Approuver | `SEQ_Approuver` | Workflow complet avec rollback |
| 6 | Rejeter | `SEQ_Rejeter` | Rejet avec motif |
| 7 | Demander Corrections | `SEQ_Demander_Corrections` | Mise en examen avec code sécurité |
| 8 | Recherche | `SEQ_Recherche` | Recherche optimisée serveur |
| 9 | Filtres | `SEQ_Filtres` | Application des filtres statut |
| 10 | Pagination | `SEQ_Pagination` | Navigation cursor-based |
| 11 | Liste des Dossiers | `SEQ_Liste_Dossiers` | Chargement initial complet |
| 12 | Payer | `SEQ_Payer` | Enregistrement d'un paiement |
| 13 | Renouveler Code | `SEQ_Renouveler_Code` | Régénération code sécurité |
| - | Légende | `Legende_Architecture` | Vue d'ensemble architecture |

---

## Détail des Diagrammes

### 1. SEQ_Voir_Details

**Objectif :** Afficher les détails complets d'une demande d'adhésion.

**Flux :**
```
Admin → Page → Hook → Service → Repository → Firestore
```

**Points clés :**
- Navigation vers `/membership-requests/[id]`
- Récupération des données via `useMembershipRequest` hook
- Récupération optionnelle des infos parrain et admin traiteur
- Gestion du cas "demande non trouvée"

**Composants impliqués :**
- `MembershipRequestDetails` (Page)
- `useMembershipRequest` (Hook)
- `MembershipService` (Service)
- `membership.db` (Repository)

---

### 2. SEQ_Fiche_Adhesion

**Objectif :** Générer et télécharger le PDF de fiche d'adhésion.

**Flux :**
```
Admin → Modal → React-PDF → Browser (téléchargement)
```

**Points clés :**
- Utilisation de `@react-pdf/renderer` pour générer le PDF
- Chargement du logo KARA et de la photo du demandeur
- Génération du nom de fichier : `NOM_PRENOM_ADHESION_MK_YYYY.pdf`
- Téléchargement automatique via `URL.createObjectURL`

**Composants impliqués :**
- `MemberDetailsModal` (Component)
- `MutuelleKaraPDF` (React-PDF Component)
- `pdf().toBlob()` (@react-pdf/renderer)

---

### 3. SEQ_Voir_Piece_Identite

**Objectif :** Visualiser les photos recto/verso de la pièce d'identité.

**Flux :**
```
Admin → Modal → next/image → Firebase Storage
```

**Points clés :**
- Toggle entre recto et verso
- Chargement lazy des images depuis Firebase Storage
- Gestion du cas "pièce d'identité non fournie"

**Composants impliqués :**
- `MemberIdentityModal` (Component)
- `next/image` (Image Component)
- Firebase Storage (Infrastructure)

---

### 4. SEQ_Statistiques (Refactorisé)

**Objectif :** Calculer et afficher les statistiques de manière optimisée.

**Flux :**
```
Admin → Page → Hook → API Route → Service → Firestore (agrégation)
```

**Points clés :**
- **AMÉLIORATION :** Calcul côté serveur via API Route
- Utilisation de `getCountFromServer` pour les agrégations Firestore
- Requêtes parallèles pour chaque statut
- Cache React Query avec `staleTime: 1h`

**Composants impliqués :**
- `MembershipRequestsStats` (Component)
- `useMembershipRequestsStats` (Hook)
- `/api/membership-stats` (API Route)
- `MembershipStatsService` (Service)

**Changements par rapport à l'actuel :**
| Avant | Après |
|-------|-------|
| Statistiques sur 10 items | Statistiques sur totalité |
| Calcul côté client | Calcul côté serveur |
| Pas de cache dédié | Cache 1 heure |

---

### 5. SEQ_Approuver (Refactorisé avec Rollback)

**Objectif :** Approuver une demande avec création complète du membre.

**Flux :**
```
Admin → Modal → Hook → ApprovalService → API Route → Firebase Auth/Firestore
```

**Points clés :**
- **AMÉLIORATION :** Système de rollback complet
- Validation des permissions admin dans l'API
- Upload PDF optionnel vers Firebase Storage
- Création de l'utilisateur Firebase Auth
- Création du document `users` dans Firestore
- Création de la souscription
- Archivage du document d'adhésion
- Envoi de notification

**Système de Rollback :**
```typescript
const rollbackActions = [];

// Chaque étape ajoute son rollback
rollbackActions.push(() => deleteUser(uid));
rollbackActions.push(() => deleteDoc(users/{matricule}));
rollbackActions.push(() => deleteSubscription(id));

// En cas d'erreur
for (const rollback of rollbackActions.reverse()) {
  await rollback();
}
```

**Composants impliqués :**
- `MembershipApprovalModal` (Component)
- `useApproveMembershipRequest` (Hook)
- `MembershipApprovalService` (Service)
- `/api/membership/approve` (API Route)
- `NotificationService` (Service)

---

### 6. SEQ_Rejeter

**Objectif :** Rejeter une demande avec motif.

**Flux :**
```
Admin → Modal → Hook → Service → Repository → Firestore + Notification
```

**Points clés :**
- Saisie du motif de rejet (recommandé)
- Mise à jour du statut vers `rejected`
- Enregistrement de `processedBy` et `processedAt`
- Envoi automatique de notification au demandeur

**Composants impliqués :**
- `MembershipRejectionModal` (Component)
- `useUpdateMembershipStatus` (Hook)
- `MembershipService` (Service)
- `NotificationService` (Service)

---

### 7. SEQ_Demander_Corrections

**Objectif :** Mettre une demande en examen avec code de sécurité.

**Flux :**
```
Admin → Modal → Hook → CorrectionService → Repository → Firestore + Notification
```

**Points clés :**
- Génération de code sécurisé à 6 chiffres (`crypto.randomInt`)
- Expiration après 48 heures
- Envoi de notification avec lien + code
- Interface pour copier le lien et le code

**Données mises à jour :**
```typescript
{
  status: 'under_review',
  reviewNote: corrections,
  securityCode: '123456',
  securityCodeExpiry: Date + 48h,
  securityCodeUsed: false,
  reviewedBy: adminId,
  processedAt: serverTimestamp()
}
```

**Composants impliqués :**
- `MembershipCorrectionModal` (Component)
- `useRequestCorrections` (Hook)
- `MembershipCorrectionService` (Service)
- `NotificationService` (Service)

---

### 8. SEQ_Recherche (Optimisée)

**Objectif :** Rechercher des demandes de manière optimisée.

**Flux :**
```
Admin → SearchInput → Filters → Hook → Service → SearchService/Firestore
```

**Points clés :**
- **AMÉLIORATION :** Recherche côté serveur (pas client)
- Debounce 300ms pour limiter les requêtes
- Deux options : Index Firestore OU Algolia

**Option A - Index Firestore :**
```typescript
query(
  where('status', '==', status),
  where('identity.email', '==', searchQuery)
)
```

**Option B - Full-text Search (Algolia) :**
```typescript
algoliaIndex.search(searchQuery, {
  filters: `status:${status}`,
  hitsPerPage: limit
})
```

**Composants impliqués :**
- `SearchInput` (UI Component)
- `MembershipRequestsFilters` (Component)
- `useMembershipRequests` (Hook)
- `MembershipService` / `SearchService` (Service)

---

### 9. SEQ_Filtres

**Objectif :** Filtrer les demandes par statut.

**Flux :**
```
Admin → Tabs/FilterBar → Filters → Hook → Repository → Firestore
```

**Points clés :**
- Deux méthodes de filtrage : onglets ou dropdown
- Reset de la pagination lors du changement de filtre
- Filtrage côté serveur avec `where('status', '==', value)`
- Affichage des badges de filtres actifs

**Filtres disponibles :**
- `all` : Toutes les demandes
- `pending` : En attente
- `under_review` : En cours d'examen
- `approved` : Approuvées
- `rejected` : Refusées

**Composants impliqués :**
- `FilterBar` (UI Component)
- `Tabs` (Component)
- `MembershipRequestsFilters` (Component)
- `useMembershipRequests` (Hook)

---

### 10. SEQ_Pagination

**Objectif :** Naviguer dans les résultats avec pagination cursor-based.

**Flux :**
```
Admin → Pagination → List → Hook → Repository → Firestore
```

**Points clés :**
- Pagination côté serveur avec curseurs Firestore (`startAfter`)
- Calcul du total via `getCountFromServer`
- Support de différentes tailles de page (10, 25, 50, 100)
- Scroll automatique en haut de page après navigation

**Structure de réponse :**
```typescript
{
  data: MembershipRequest[],
  pagination: {
    currentPage: number,
    totalPages: number,
    totalItems: number,
    hasNext: boolean,
    hasPrev: boolean
  },
  cursor: DocumentSnapshot // Pour la page suivante
}
```

**Composants impliqués :**
- `Pagination` (UI Component)
- `MembershipRequestsList` (Component)
- `useMembershipRequests` (Hook)
- `membership.db` (Repository)

---

### 11. SEQ_Liste_Dossiers

**Objectif :** Charger et afficher la liste complète des demandes.

**Flux :**
```
Admin → Page → Layout → [Stats, Filters, DataView, Pagination] en parallèle
```

**Points clés :**
- Chargement parallèle des stats et des données
- Utilisation du `DashboardPageLayout` standardisé
- Trois états d'affichage : loading (skeletons), error, data
- Composants UI réutilisables (SearchInput, FilterBar, DataView, Pagination)

**Structure de la page :**
```
┌─────────────────────────────────────────┐
│ PageHeader (titre + description)        │
├─────────────────────────────────────────┤
│ StatsCarousel (5 cartes statistiques)   │
├─────────────────────────────────────────┤
│ Tabs (onglets de filtrage)              │
├─────────────────────────────────────────┤
│ SearchInput + FilterBar                 │
├─────────────────────────────────────────┤
│ DataView (liste ou grille de cartes)    │
│   └─ MembershipRequestCard × N          │
├─────────────────────────────────────────┤
│ Pagination                              │
└─────────────────────────────────────────┘
```

**Composants impliqués :**
- `MembershipRequestsPage` (Page)
- `DashboardPageLayout` (Layout)
- `MembershipRequestsStats` (Component)
- `MembershipRequestsFilters` (Component)
- `DataView` (UI Component)
- `MembershipRequestCard` (Component)
- `Pagination` (UI Component)

---

### 12. SEQ_Payer

**Objectif :** Enregistrer un paiement pour une demande.

**Flux :**
```
Admin → Modal → Hook → PaymentService → Repository → Firestore
```

**Points clés :**
- Formulaire avec validation des champs requis
- Création d'un objet `Payment` complet
- Mise à jour de `isPaid = true`
- Ajout au tableau `payments[]` (historique)
- Le statut reste `pending` (paiement ≠ approbation)

**Données du paiement :**
```typescript
{
  date: Date,
  time: string,
  mode: PaymentMode,
  amount: number,
  acceptedBy: adminId,
  paymentType: TypePayment,
  withFees: boolean,
  createdAt: serverTimestamp()
}
```

**Composants impliqués :**
- `MembershipPaymentModal` (Component)
- `usePayMembershipRequest` (Hook)
- `MembershipPaymentService` (Service)
- `membership.db` (Repository)

---

### 13. SEQ_Renouveler_Code

**Objectif :** Régénérer le code de sécurité pour les corrections.

**Flux :**
```
Admin → Card → Hook → CorrectionService → Repository → Firestore
```

**Points clés :**
- Génération d'un nouveau code 6 chiffres
- Nouvelle date d'expiration (48h)
- Reset de `securityCodeUsed = false`
- Affichage du nouveau code dans un toast

**Composants impliqués :**
- `MembershipRequestCard` (Component)
- `useRenewSecurityCode` (Hook)
- `MembershipCorrectionService` (Service)
- `membership.db` (Repository)

---

## Correspondance avec les Diagrammes d'Activité

| Diagramme d'Activité | Diagramme de Séquence |
|----------------------|----------------------|
| `Voir_Details` | `SEQ_Voir_Details` |
| `Fiche_Adhesion` | `SEQ_Fiche_Adhesion` |
| `Voir_Piece_Identite` | `SEQ_Voir_Piece_Identite` |
| `Statistiques` | `SEQ_Statistiques` |
| `Approuver` | `SEQ_Approuver` |
| `Rejeter` | `SEQ_Rejeter` |
| `Demander_Corrections` | `SEQ_Demander_Corrections` |
| `Recherche` | `SEQ_Recherche` |
| `Filtres` | `SEQ_Filtres` |
| `Pagination` | `SEQ_Pagination` |
| `Liste_Dossiers` | `SEQ_Liste_Dossiers` |
| `Payer` | `SEQ_Payer` |
| - | `SEQ_Renouveler_Code` (nouveau) |

---

## Correspondance avec les Classes UML

Les diagrammes de séquence utilisent les classes définies dans :

- **`CLASSES_MEMBERSHIP.puml`** :
  - `MembershipRequest`
  - `Payment`
  - `IdentityData`
  - `AddressData`
  - `CompanyData`
  - `DocumentsData`
  - `Subscription`

- **`CLASSES_SHARED.puml`** :
  - `User`
  - `Document`
  - `Notification`
  - `Company`
  - `Profession`

---

## Services à Créer

D'après les diagrammes, les services suivants doivent être implémentés :

```typescript
// src/services/memberships/

// 1. Service d'approbation
class MembershipApprovalService {
  approveRequest(params): Promise<ApprovalResult>
  validateRequest(requestId): Promise<void>
  checkCompanyAndProfession(params): Promise<void>
  uploadApprovalPdf(params): Promise<string>
  createFirebaseUser(params): Promise<UserRecord>
  archiveDocument(params, pdfUrl): Promise<void>
}

// 2. Service de paiement
class MembershipPaymentService {
  registerPayment(requestId, paymentData, adminId): Promise<void>
  getPaymentHistory(requestId): Promise<Payment[]>
}

// 3. Service de correction
class MembershipCorrectionService {
  requestCorrections(requestId, adminId, corrections): Promise<CorrectionResult>
  renewSecurityCode(requestId): Promise<RenewResult>
  validateSecurityCode(requestId, code): Promise<ValidationResult>
  generateSecurityCode(): string
  calculateExpiry(): Date
}

// 4. Service de statistiques
class MembershipStatsService {
  calculateStats(): Promise<MembershipStats>
}

// 5. Service de recherche (optionnel, si Algolia)
class MembershipSearchService {
  search(query, filters): Promise<SearchResult>
  indexRequest(request): Promise<void>
  removeFromIndex(requestId): Promise<void>
}
```

---

## Visualisation

Pour visualiser les diagrammes :

### Extension VS Code
```bash
# Installer l'extension PlantUML (par jebbs)
# Puis ouvrir le fichier .puml et prévisualiser avec Alt+D
```

### En ligne
1. Aller sur http://www.plantuml.com/plantuml/uml/
2. Copier le contenu d'un diagramme (entre `@startuml` et `@enduml`)
3. Visualiser

### CLI
```bash
# Installer PlantUML
brew install plantuml

# Générer les images PNG
plantuml documentation/membership-requests/DIAGRAMMES_SEQUENCE.puml

# Les images seront générées dans le même dossier
```

---

## Prochaines Étapes

1. **Valider** les diagrammes avec l'équipe
2. **Créer** les services selon les interfaces définies
3. **Refactorer** les composants existants pour utiliser la nouvelle architecture
4. **Tester** chaque flux avec des tests d'intégration
5. **Documenter** les API Routes

---

## Références

- `DIAGRAMMES_ACTIVITE.puml` - Diagrammes d'activité sources
- `DIAGRAMMES_ACTIVITE_README.md` - Documentation des activités
- `POINTS_A_CORRIGER.md` - Plan de refactorisation
- `ANALYSE_ACTUELLE.md` - Analyse de l'existant
- `CRITIQUE_ARCHITECTURE.md` - Critique et améliorations
- `documentation/uml/classes/CLASSES_MEMBERSHIP.puml` - Classes du domaine
- `documentation/uml/classes/CLASSES_SHARED.puml` - Classes partagées
