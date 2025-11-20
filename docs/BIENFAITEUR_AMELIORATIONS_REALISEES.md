# Module Bienfaiteur - Améliorations Réalisées

## ✅ Changements effectués

### 1. Pagination complète ✅

#### Repository (`CharityEventRepository.ts`)
- ✅ Ajout de l'interface `PaginatedCharityEvents` avec :
  - `events`: Liste des évènements de la page
  - `total`: Nombre total d'évènements
  - `hasMore`: Indicateur de page suivante
  - `lastDoc`: Document Firestore pour pagination cursor-based
- ✅ Nouvelle méthode `getPaginated(filters, page, pageSize)` :
  - Utilisation de `getCountFromServer` pour le total
  - Utilisation de `startAfter` pour pagination efficace
  - Limite par défaut : 12 items
  - Détection automatique s'il y a plus de résultats

#### Service (`CharityEventService.ts`)
- ✅ Nouvelle méthode `getPaginatedEvents(filters, page, pageSize)`
- ✅ Conservation de `getAllEvents` pour les exports sans pagination

#### Hook (`useCharityEvents.ts`)
- ✅ Mise à jour de `useCharityEventsList` pour accepter `page` et `pageSize`
- ✅ Nouveau hook `useAllCharityEvents` pour récupération complète (exports)
- ✅ Query keys incluant page et pageSize pour cache React Query

#### Types (`types.ts`)
- ✅ Ajout du champ `lastDoc` dans `CharityEventFilters` pour pagination

### 2. Vue Grid par défaut ✅

#### Component (`CharityEventsList.tsx`)
- ✅ Changement de la vue par défaut de `'table'` à `'grid'`
- ✅ Implémentation complète de la pagination avec :
  - Affichage du numéro de page et total
  - Boutons Précédent/Suivant
  - Navigation directe par numéro de page
  - Ellipses intelligentes (...) pour grandes listes
  - Scroll automatique en haut lors du changement de page
- ✅ Ajout bouton "Actualiser" dans les filtres
- ✅ Message d'état vide amélioré avec contexte (recherche vs aucun évènement)
- ✅ Skeletons adaptés au mode de vue (grid vs table)

#### Filters (`CharityFilters.tsx`)
- ✅ Type `viewMode` changé de `'table' | 'cards'` à `'grid' | 'table'`
- ✅ Ajout du bouton "Actualiser" avec icon `RefreshCw` animé
- ✅ Props `onRefresh` et `isLoading` pour feedback visuel
- ✅ Titles sur les boutons de vue pour accessibilité

### 3. Schema Zod pour validation ✅

#### Nouveau fichier (`src/schemas/bienfaiteur.schema.ts`)

##### Schema `charityEventSchema`
- ✅ Validation titre (3-150 caractères)
- ✅ Validation lieu (3-100 caractères)
- ✅ Validation description (10-2000 caractères)
- ✅ Validation dates :
  - Date début non dans le passé
  - Date fin après date début
- ✅ Validation montants optionnels (nombres positifs)
- ✅ Validation image couverture :
  - Taille max 5MB
  - Formats: JPG, PNG, WEBP
- ✅ Validation cross-champs (dates, montants)
- ✅ Type dérivé : `CharityEventFormData`
- ✅ Valeurs par défaut exportées

##### Schema `charityContributionSchema`
- ✅ Type de participant (member/group)
- ✅ IDs membre/groupe (au moins un requis)
- ✅ Type de contribution (money/in_kind)
- ✅ Validation conditionnelle selon type :
  - Si money : montant et méthode de paiement requis
  - Si in_kind : description min 10 caractères requise
- ✅ Preuve optionnelle (image/PDF, max 10MB)
- ✅ Date de contribution (non futur)
- ✅ Statut (pending/confirmed/canceled)
- ✅ Type dérivé : `CharityContributionFormData`
- ✅ Valeurs par défaut exportées

##### Schema `charityParticipantSchema`
- ✅ Type de participant (member/group)
- ✅ ID membre ou groupe (au moins un requis)
- ✅ Type dérivé : `CharityParticipantFormData`

##### Schema `charityMediaSchema`
- ✅ Type de média (photo/video)
- ✅ Validation fichier (max 50MB, formats supportés)
- ✅ Métadonnées optionnelles (titre, description, date)
- ✅ Type dérivé : `CharityMediaFormData`

### 4. Upload image de couverture dans formulaire ✅

#### Component (`CreateCharityEventForm.tsx`)
- ✅ Intégration `react-hook-form` + `zodResolver`
- ✅ Utilisation du schema `charityEventSchema`
- ✅ Section "Image de couverture" avec :
  - Zone de drop élégante (border dashed, hover effect)
  - Icon `ImageIcon` et `Upload`
  - Input file caché avec label cliquable
  - Validation côté client (taille, format)
  - Preview de l'image uploadée avec Next.js `Image`
  - Bouton "Supprimer" pour retirer l'image
  - Affichage nom et taille du fichier
  - Guidelines: JPG, PNG, WEBP • Max 5MB • 1200x600px
- ✅ État local pour preview et fichier
- ✅ Méthodes `handleCoverFileChange` et `removeCoverPhoto`
- ✅ Toasts pour erreurs de validation upload
- ✅ Placeholders et textes d'aide en français
- ✅ Design cohérent avec le reste de l'app
- ✅ TODO commenté pour upload Firebase Storage (à implémenter)

### 5. Documentation mise à jour ✅

#### Fichier (`docs/BIENFAITEUR_MANQUANT.md`)
- ✅ Section "Améliorations techniques requises" ajoutée en haut
- ✅ Détails sur :
  - Pagination (liste évènements, participants, groupes, contributions)
  - Vue par défaut Grid
  - Upload image couverture
  - Validation Zod
  - Récupération données externes (membres, groupes)
- ✅ Référence aux hooks existants (`useAllMembers`)
- ✅ Référence aux fonctions existantes (`listGroups` from `@/db/group.db`)

## 📊 Statistiques

### Fichiers modifiés
- ✅ `src/repositories/bienfaiteur/CharityEventRepository.ts` - Ajout pagination
- ✅ `src/services/bienfaiteur/CharityEventService.ts` - Méthode paginée
- ✅ `src/hooks/bienfaiteur/useCharityEvents.ts` - Hooks pagination
- ✅ `src/components/bienfaiteur/CharityEventsList.tsx` - UI pagination + vue grid
- ✅ `src/components/bienfaiteur/CharityFilters.tsx` - Bouton refresh + types
- ✅ `src/components/bienfaiteur/CreateCharityEventForm.tsx` - Upload + Zod
- ✅ `src/types/types.ts` - Champ `lastDoc` dans filters
- ✅ `docs/BIENFAITEUR_MANQUANT.md` - Section améliorations

### Fichiers créés
- ✅ `src/schemas/bienfaiteur.schema.ts` - Tous les schemas Zod
- ✅ `docs/BIENFAITEUR_AMELIORATIONS_REALISEES.md` - Cette documentation

## ⚠️ Points d'attention / TODOs restants

### Upload Firebase Storage
**Fichier** : `CreateCharityEventForm.tsx` (ligne ~95)

**À implémenter** :
```typescript
// Avant createEvent, si coverFile existe:
if (coverFile) {
  // 1. Upload sur Firebase Storage: `charity-events/covers/{timestamp}-{filename}`
  const storage = getStorage()
  const storageRef = ref(storage, `charity-events/covers/${Date.now()}-${coverFile.name}`)
  const uploadTask = await uploadBytes(storageRef, coverFile)
  const downloadURL = await getDownloadURL(uploadTask.ref)
  
  // 2. Ajouter dans eventData:
  coverPhotoUrl: downloadURL,
  coverPhotoPath: uploadTask.ref.fullPath
}
```

**Service nécessaire** : Créer `CharityMediaService.uploadCoverPhoto(file, eventId?)`

### Récupération membres et groupes
**Pour** : `CharityParticipantsSection` et `CharityGroupsSection`

**Hooks/Fonctions à utiliser** :
- ✅ `useAllMembers(filters, page, itemsPerPage)` - Existe déjà dans `@/hooks/useMembers`
- ✅ `listGroups()` - Existe déjà dans `@/db/group.db`

**Pagination** :
- Membres : Utiliser la pagination existante de `useAllMembers`
- Groupes : Ajouter pagination si nécessaire (actuellement `listGroups` retourne tout)

## 🎯 Prochaines étapes prioritaires

1. **Créer `AddContributionForm`** avec `charityContributionSchema` ✅ Schema prêt
2. **Implémenter upload Firebase Storage** pour images de couverture
3. **Créer `CharityContributionsSection`** avec pagination
4. **Créer `CharityParticipantsSection`** avec pagination (utiliser `useAllMembers`)
5. **Créer `CharityGroupsSection`** avec pagination (utiliser `listGroups`)
6. **Créer hooks `useCharityParticipants` et `useCharityGroups`**
7. **Intégrer sections dans `CharityEventDetail`**
8. **Implémenter génération PDF reçus** (inspiré de `CaisseImprevuePDF`)
9. **Implémenter galerie médias** avec upload

## 📝 Notes techniques

### Pagination Firestore
- Utilisation de `startAfter` pour cursor-based pagination (plus efficace que skip)
- Cache des `lastDoc` dans les filtres pour éviter re-fetch
- `getCountFromServer` pour total sans charger tous les documents
- React Query invalide le cache lors des mutations

### Validation Zod
- Schemas réutilisables et composables
- Validation cross-champs avec `.refine()`
- Messages d'erreur en français
- Types TypeScript dérivés automatiquement
- Valeurs par défaut exportées pour réutilisation

### Upload images
- Validation côté client avant upload
- Preview avec FileReader API
- Next.js `Image` component pour optimisation
- TODO: Compression avec `imageCompressionService` si disponible

### Performance
- Pagination limite le nombre de documents chargés
- React Query cache les résultats
- Lazy loading des images avec Next.js Image
- Skeletons pour feedback immédiat

