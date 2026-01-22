# Cartographie V1 – Détails membre

## 1. Composant principal

**Fichier** : `src/components/memberships/MembershipDetails.tsx` (230 lignes)

**Route** : `src/app/(admin)/memberships/[id]/page.tsx`

## 2. Sections d'UI identifiées

### 2.1 Header / En-tête
- **Ligne 65-109** : Section header avec :
  - Bouton "Retour" (navigation arrière)
  - Titre : `{user.firstName} {user.lastName}`
  - Badge matricule : `{user.matricule}`
  - Bouton "Voir le dossier" → `routes.admin.membershipRequestDetails(user.dossier)`
  - Bouton "Créer un contrat" (commenté, ligne 91-107)

### 2.2 Informations personnelles
- **Ligne 113-136** : Carte `Card` avec :
  - Icône `User`
  - Titre : "Informations personnelles"
  - Champs affichés :
    - Genre : `user.gender`
    - Nationalité : `getNationalityName(user.nationality)`
    - Véhicule : `user.hasCar` (Oui/Non avec icône `CarFront`)

### 2.3 Contacts
- **Ligne 138-156** : Carte `Card` avec :
  - Icône `Phone`
  - Titre : "Contacts"
  - Champs affichés :
    - Email : `user.email` (avec icône `Mail`)
    - Téléphones : `user.contacts?.join(', ')`

### 2.4 Profession
- **Ligne 158-174** : Carte `Card` avec :
  - Icône `Briefcase`
  - Titre : "Profession"
  - Champs affichés :
    - Profession : `user.profession`
    - Entreprise : `user.companyName`

### 2.5 Photo du membre
- **Ligne 178-196** : Carte `Card` avec :
  - Icône `User`
  - Titre : "Photo du membre"
  - Affichage :
    - Si `user.photoURL` : `<Image>` avec photo
    - Sinon : Avatar fallback avec icône et texte "Aucune photo fournie"

### 2.6 Adresse
- **Ligne 198-226** : Carte `Card` conditionnelle (si `user.address` existe) avec :
  - Icône `MapPin`
  - Titre : "Adresse"
  - Champs affichés :
    - Province : `user.address.province`
    - Ville : `user.address.city`
    - Quartier : `user.address.district`
    - Arrondissement : `user.address.arrondissement` (conditionnel)

## 3. Appels directs à la DB

### 3.1 Hook `useUser`
- **Ligne 23** : `const { data: user, isLoading, isError, error } = useUser(userId)`
- **Source** : `@/hooks/useMembers`
- **Implémentation** : `getUserById(userId)` depuis `@/db/user.db`
- **Collection Firestore** : `users`
- **Retourne** : `User | null`

### 3.2 `listContractsByMember`
- **Ligne 12** : Import depuis `@/db/caisse/contracts.db`
- **Ligne 30** : `const cs = await listContractsByMember(userId)`
- **Ligne 24** : État local `const [caisseContracts, setCaisseContracts] = React.useState<any[]>([])`
- **Collection Firestore** : `caisse-contracts` (probablement)
- **Retourne** : `Contract[]` (contrats de caisse spéciale/imprevue)
- **Note** : Les contrats sont chargés mais **non affichés** dans l'UI actuelle (stockés dans l'état mais pas utilisés dans le rendu)

### 3.3 `useCaisseSettingsValidation`
- **Ligne 15** : Import depuis `@/hooks/useCaisseSettingsValidation`
- **Ligne 243** : Utilisé dans `CreateCaisseContractButton` (composant interne commenté)
- **Usage** : Validation des paramètres de la Caisse Spéciale avant création de contrat

## 4. Liens vers autres modules

### 4.1 Navigation vers demande d'adhésion
- **Ligne 86** : `router.push(routes.admin.membershipRequestDetails(user.dossier))`
- **Bouton** : "Voir le dossier"
- **Route** : `/admin/membership-requests/[dossier]`
- **Composant cible** : `MembershipRequestDetails` (déjà refactorisé V2)

### 4.2 Liens non présents mais mentionnés dans la doc
D'après `README.md`, les liens suivants devraient être présents mais ne sont **pas visibles** dans le code actuel :
- **Véhicules** : Lien vers gestion des véhicules du membre
- **Contrats caisse spéciale** : Lien vers contrats caisse spéciale
- **Contrats caisse imprevue** : Lien vers contrats caisse imprevue
- **Placements** : Lien vers placements
- **Filleuls** : Lien vers liste des filleuls (`/memberships/[id]/filleuls`)
- **Abonnements** : Modal `MemberSubscriptionModal` (non visible dans le code actuel)

## 5. Modals et composants externes

### 5.1 `MemberSubscriptionModal`
- **Mentionné dans README.md** : Modal pour voir l'historique des abonnements
- **Non visible dans `MembershipDetails.tsx`** : Probablement utilisé ailleurs ou à ajouter

### 5.2 `CreateCaisseContractButton`
- **Ligne 233-404** : Composant interne (commenté dans le JSX, ligne 91-107)
- **Fonctionnalité** : Création d'un contrat Caisse Spéciale
- **Dialog** : Formulaire avec :
  - Montant mensuel
  - Durée (mois)
  - Type de caisse (STANDARD, JOURNALIERE, LIBRE)
  - Date du premier versement
- **Validation** : Utilise `useCaisseSettingsValidation`
- **Service** : `subscribe()` depuis `@/services/caisse/mutations`

## 6. États et gestion d'erreurs

### 6.1 États de chargement
- **Ligne 38-46** : Skeleton simple "Chargement..." dans une `Card`

### 6.2 États d'erreur
- **Ligne 48-61** : Affichage "Utilisateur introuvable" avec bouton "Retour"
- **Gestion** : `if (isError || !user)`

### 6.3 États de données
- **Ligne 24** : `caisseContracts` (état local, non utilisé dans le rendu)
- **Ligne 23** : `user` (depuis `useUser`)

## 7. Données manquantes dans V1

### 7.1 Abonnements
- **Non affichés** : Aucune section pour les abonnements dans le composant actuel
- **Hook disponible** : `useMemberSubscriptions(userId)` existe dans `@/hooks/useMembers`
- **Fonction disponible** : `getMemberSubscriptions(userId)` dans `@/db/member.db`
- **Modal disponible** : `MemberSubscriptionModal` (mentionné dans README.md)

### 7.2 Filleuls
- **Non affichés** : Aucune section pour les filleuls dans le composant actuel
- **Composant disponible** : `FilleulsList` dans `@/components/filleuls/FilleulsList.tsx`
- **Route disponible** : `/memberships/[id]/filleuls`
- **Hook disponible** : `useMemberWithFilleuls(memberId)` dans `@/hooks/filleuls`

### 7.3 Documents
- **Non affichés** : Aucune section pour les documents dans le composant actuel
- **Composant disponible** : `ListDocuments` dans `@/components/member/ListDocuments.tsx`
- **Hook disponible** : `useDocumentList({ memberId })` dans `@/hooks/documents/useDocumentList.ts`

### 7.4 Paiements
- **Non affichés** : Aucune section pour les paiements dans le composant actuel
- **Contrats chargés** : `caisseContracts` mais non utilisés

### 7.5 Contrats
- **Chargés mais non affichés** : `caisseContracts` est chargé mais pas utilisé dans le rendu
- **Fonction disponible** : `listContractsByMember(userId)`

## 8. Problèmes identifiés

### 8.1 Monolithisme
- **Tout dans un seul fichier** : Chargement, logique, UI dans `MembershipDetails.tsx`
- **Pas de séparation des responsabilités** : Logique métier mélangée avec UI

### 8.2 Appels directs à la DB
- **`listContractsByMember`** : Appel direct dans `useEffect` (ligne 26-36)
- **Pas de service/hook de domaine** : Pas d'abstraction pour les contrats

### 8.3 Données chargées mais non utilisées
- **`caisseContracts`** : Chargé mais jamais affiché dans l'UI
- **Gaspillage de ressources** : Requête inutile

### 8.4 Données manquantes
- **Abonnements** : Non affichés malgré hooks disponibles
- **Filleuls** : Non affichés malgré composant disponible
- **Documents** : Non affichés malgré composant disponible
- **Paiements** : Non affichés

### 8.5 Navigation non centralisée
- **Routes hardcodées** : `routes.admin.membershipRequestDetails(user.dossier)` directement dans le composant
- **Pas de handlers dédiés** : Navigation mélangée avec la logique UI

### 8.6 Composant commenté
- **`CreateCaisseContractButton`** : Code présent mais commenté dans le JSX (ligne 91-107)
- **Fonctionnalité inutilisée** : Contrat de création non accessible

## 9. Structure de données utilisée

### 9.1 Type `User`
```typescript
interface User {
  id: string
  matricule: string
  firstName: string
  lastName: string
  gender: string
  nationality: string
  email?: string
  contacts?: string[]
  profession?: string
  companyName?: string
  hasCar: boolean
  photoURL?: string
  address?: {
    province: string
    city: string
    district: string
    arrondissement?: string
  }
  dossier?: string // ID de la demande d'adhésion
}
```

### 9.2 Type `Contract` (caisse)
```typescript
interface Contract {
  id: string
  memberId: string
  status: string
  // ... autres champs
}
```

## 10. Résumé des dépendances

### 10.1 Hooks utilisés
- `useUser(userId)` : `@/hooks/useMembers`
- `useCaisseSettingsValidation(caisseType)` : `@/hooks/useCaisseSettingsValidation` (dans composant interne)

### 10.2 Fonctions DB utilisées
- `getUserById(userId)` : `@/db/user.db` (via `useUser`)
- `listContractsByMember(userId)` : `@/db/caisse/contracts.db`

### 10.3 Services utilisés
- `subscribe()` : `@/services/caisse/mutations` (dans composant interne)

### 10.4 Utilitaires utilisés
- `getNationalityName(nationality)` : `@/constantes/nationality`
- `routes.admin.membershipRequestDetails(dossier)` : `@/constantes/routes`

### 10.5 Composants UI utilisés
- `Card`, `CardContent`, `CardHeader`, `CardTitle` : `@/components/ui/card`
- `Badge` : `@/components/ui/badge`
- `Button` : `@/components/ui/button`
- `Dialog`, `DialogContent`, etc. : `@/components/ui/dialog`
- `Image` : `next/image`

## 11. Mapping vers V2

### 11.1 Sections UI → Composants V2
- **Header** → `MemberDetailsHeader.tsx`
- **Informations personnelles** → `MemberIdentityCard.tsx`
- **Contacts** → `MemberContactCard.tsx`
- **Profession** → `MemberIdentityCard.tsx` (ou section séparée)
- **Photo** → `MemberIdentityCard.tsx` (ou `MemberPhotoCard.tsx`)
- **Adresse** → `MemberAddressCard.tsx`
- **Abonnements** → `MemberSubscriptionCard.tsx` (à ajouter)
- **Documents** → `MemberDocumentsCard.tsx` (à ajouter)
- **Filleuls** → `MemberFilleulsCard.tsx` (à ajouter)
- **Paiements** → `MemberPaymentsCard.tsx` (à ajouter)
- **Contrats** → `MemberContractsCard.tsx` (à ajouter)

### 11.2 Appels DB → Hook V2
- `useUser(userId)` → `useMembershipDetails(memberId).member`
- `listContractsByMember(userId)` → `useMembershipDetails(memberId).contracts`
- `getMemberSubscriptions(userId)` → `useMembershipDetails(memberId).subscriptions`
- `useMemberWithFilleuls(memberId)` → `useMembershipDetails(memberId).filleuls`

### 11.3 Navigation → Handlers V2
- `router.push(routes.admin.membershipRequestDetails(user.dossier))` → `onOpenMembershipRequest()`
- Navigation vers filleuls → `onOpenFilleuls()`
- Navigation vers contrats → `onOpenContracts(moduleKey)`
