# Module Bienfaiteur - Inventaire des éléments manquants

## 📋 Résumé

**État actuel** : ~60% du module est implémenté. Les fonctionnalités de base (liste, création, détail) sont opérationnelles, mais les fonctionnalités avancées (contributions, participants, médias, exports PDF) restent à compléter.

## 🔧 Améliorations techniques requises

### Pagination
- **Liste des évènements** : Implémentation de la pagination (limite par défaut : 12 items)
- **Liste des participants** : Pagination requise (inspirée de `MembershipList.tsx`)
- **Liste des groupes** : Pagination requise (inspirée de `GroupList.tsx`)
- **Liste des contributions** : Pagination requise

### Vue par défaut
- **Mode d'affichage** : Grid par défaut (actuellement en mode liste)

### Upload image de couverture
- **Formulaire création** : Section upload image de couverture (optionnel)
- **Stockage** : Firebase Storage (`charity-events/covers/{eventId}`)
- **Preview** : Affichage aperçu avant upload

### Validation Zod
- **Schema bienfaiteur** : Création de `src/schemas/bienfaiteur.schema.ts`
- **Formulaires** : Utilisation de `react-hook-form` + Zod pour tous les formulaires

### Récupération données externes
- **Membres** : Utilisation des hooks existants (`useAllMembers`)
- **Groupes** : Utilisation des fonctions existantes (`listGroups` from `@/db/group.db`)

---

## 🔴 CRITIQUE - Fonctionnalités essentielles manquantes

### 1. Sections détaillées des tabs dans `CharityEventDetail.tsx`

#### 1.1 Tab "Contributions" 
**Fichier** : `src/components/bienfaiteur/CharityContributionsSection.tsx`  
**Statut** : ❌ Non créé

**À implémenter** :
- Tableau des contributions avec colonnes :
  - Date de contribution
  - Type de contributeur (Membre/Groupe) + nom
  - Groupe de rattachement (si membre)
  - Type de contribution (espèces, virement, en nature)
  - Montant en FCFA (ou description si en nature)
  - Statut (Reçu, En attente, Annulé)
  - Actions (voir preuve, télécharger reçu PDF, modifier, supprimer)
- Filtres en haut :
  - Par type (Tous, Espèces, En nature)
  - Par statut (Tous, Confirmé, En attente, Annulé)
  - Par période (date début/fin)
  - Recherche par nom de contributeur
- Résumé en haut :
  - Total des contributions (espèces + en nature)
  - Split cash / in-kind
- Bouton "Ajouter une contribution" (ouvre modal)
- Export CSV des contributions filtrées
- Pagination si nécessaire

**Composants associés nécessaires** :
- `CharityContributionTable.tsx` - Tableau desktop
- `CharityContributionCard.tsx` - Carte mobile (docs/5.png)
- `AddContributionForm.tsx` - Formulaire d'ajout
- `ContributionProofViewer.tsx` - Modal pour voir preuve (image)

**Hooks nécessaires** : ✅ `useCharityContributions` existe déjà

---

#### 1.2 Tab "Participants"
**Fichier** : `src/components/bienfaiteur/CharityParticipantsSection.tsx`  
**Statut** : ❌ Non créé

**À implémenter** :
- Liste/tableau des participants avec :
  - Avatar + nom complet
  - Groupe de rattachement
  - Contact (téléphone, email)
  - Nombre de contributions
  - Total donné
  - Date dernière contribution
- Filtres :
  - Toggle All/Members/Groups
  - Recherche par nom
  - Filtre par groupe
- Bouton "Ajouter participant" (ouvre modal avec recherche membre/groupe)
- Actions : voir détails, voir contributions, retirer participant

**Composants associés nécessaires** :
- `CharityParticipantList.tsx` - Liste avec filtres
- `CharityParticipantCard.tsx` - Carte mobile (docs/6.png)
- `AddParticipantModal.tsx` - Modal ajout (utilise `EntitySearch`)

**Hooks nécessaires** : ❌ `useCharityParticipants` à créer

---

#### 1.3 Tab "Groupes"
**Fichier** : `src/components/bienfaiteur/CharityGroupsSection.tsx`  
**Statut** : ❌ Non créé

**À implémenter** :
- Liste des groupes participants avec :
  - Nom du groupe
  - Nombre de membres ayant participé
  - Montant total apporté par le groupe
  - Nombre de contributions
  - Statut de participation (Actif, Inactif)
- Filtres :
  - All / Active / Inactive
  - Recherche par nom de groupe
  - Tri (contributions, alphabetique, membres)
- Bouton "Ajouter groupe" (ouvre modal)
- Actions : voir détails, voir membres participants

**Composants associés nécessaires** :
- `CharityGroupList.tsx` - Liste avec recherche/tri
- `CharityGroupCard.tsx` - Carte mobile (docs/7.png, 8.png)

**Hooks nécessaires** : ❌ `useCharityGroups` à créer

---

#### 1.4 Tab "Médias"
**Fichier** : `src/components/bienfaiteur/CharityMediaSection.tsx`  
**Statut** : ❌ Non créé

**À implémenter** :
- Grille de médias (photos/vidéos) :
  - Vignettes avec aperçu
  - Titre et description optionnels
  - Date de prise/upload
  - Actions (voir en grand, supprimer)
- Bouton "Ajouter des médias" (upload multiple)
- Lightbox pour visualisation en grand
- Filtres :
  - Tous / Photos / Vidéos
  - Tri par date

**Composants associés nécessaires** :
- `CharityMediaGrid.tsx` - Grille médias
- `CharityMediaUpload.tsx` - Upload multiple
- `CharityMediaLightbox.tsx` - Lightbox

**Hooks nécessaires** : ❌ `useCharityMedia` à créer  
**Services nécessaires** : ❌ `CharityMediaService` à créer (upload Firebase Storage)

---

#### 1.5 Tab "Paramètres"
**Fichier** : `src/components/bienfaiteur/CharityEventSettings.tsx`  
**Statut** : ❌ Non créé (actuellement juste affichage description)

**À implémenter** :
- Formulaire d'édition complet :
  - Titre
  - Description / communiqué officiel
  - Dates (début/fin)
  - Lieu
  - Montant cible, montant minimum par membre
  - Upload / changement de photo de couverture
  - Statut (sélecteur)
- Boutons : "Enregistrer", "Annuler", "Clôturer l'évènement"
- Validation des champs

**Composants associés nécessaires** :
- `EditCharityEventForm.tsx` - Formulaire d'édition (réutilise logique de création)

**Hooks nécessaires** : ✅ `useUpdateCharityEvent` existe déjà

---

### 2. Formulaires d'ajout manquants

#### 2.1 Formulaire d'ajout de contribution
**Fichier** : `src/components/bienfaiteur/AddContributionForm.tsx`  
**Statut** : ❌ Non créé

**Champs requis** :
- Type de contributeur : Radio/Menu (Membre ou Groupe)
- Sélecteur membre/groupe : Recherche avec `EntitySearch` (composant existant)
- Type de contribution : Radio (Espèces, Virement, Don en nature)
- Si financier :
  - Montant (FCFA)
  - Mode de paiement (airtel_money, mobicash, cash, bank_transfer)
  - Date de contribution
- Si en nature :
  - Description détaillée
  - Valeur estimée (FCFA)
- Upload preuve (image) : FileInput
- Statut : Select (En attente, Confirmé)

**Actions** :
- Validation
- Sauvegarde via `useCreateCharityContribution`
- Génération automatique du reçu PDF après création
- Upload de la preuve sur Firebase Storage
- Mise à jour des stats du participant et de l'évènement

**Référence** : Inspiré de `PaymentCIModal.tsx` (caisse-imprevue)

---

#### 2.2 Modal d'ajout de participant
**Fichier** : `src/components/bienfaiteur/AddParticipantModal.tsx`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- Recherche membre/groupe via `useEntitySearch` (hook existant)
- Affichage résultats avec avatar, nom, groupe
- Sélection d'un participant
- Si membre : affichage infos (groupe de rattachement, contact)
- Si groupe : affichage nombre de membres
- Bouton "Ajouter" qui crée le participant dans Firestore

**Référence** : Inspiré de modals de recherche existantes

---

### 3. Page de modification d'évènement

**Fichier** : `src/app/(admin)/bienfaiteur/[id]/modify/page.tsx`  
**Statut** : ❌ Non créé

**Contenu** :
- Réutilise `EditCharityEventForm.tsx` (ou `CreateCharityEventForm` avec mode édition)
- Charge les données existantes via `useCharityEvent`
- Pré-remplit le formulaire
- Sauvegarde via `useUpdateCharityEvent`
- Redirection vers détail après sauvegarde

---

## 🟡 IMPORTANT - Fonctionnalités avancées

### 4. Génération de reçus PDF

#### 4.1 Composant PDF reçu de contribution
**Fichier** : `src/components/bienfaiteur/CharityContributionReceiptPDF.tsx`  
**Statut** : ❌ Non créé

**Structure** (inspirée de `CaisseImprevuePDF.tsx`) :
- Page 1 : En-tête avec logo KARA
- Informations du donateur :
  - Nom complet
  - Groupe de rattachement (si membre)
  - Contact
- Informations de la contribution :
  - Montant ou description (si en nature)
  - Date de contribution
  - Type de contribution
  - Numéro de reçu (format : `REC-{contributionId}`)
- Informations de l'évènement :
  - Titre
  - Lieu
  - Dates
- Signature admin ayant enregistré
- Mentions légales

**Intégration** :
- Génération automatique lors de la création d'une contribution confirmée
- Stockage dans Firebase Storage
- URL stockée dans `CharityContribution.receiptUrl`
- Bouton "Télécharger reçu" dans le tableau des contributions

**Service** : Ajouter méthode dans `CharityContributionService.generateReceiptPDF()`

---

#### 4.2 Rapport PDF global d'évènement
**Fichier** : `src/components/bienfaiteur/CharityEventReportPDF.tsx`  
**Statut** : ❌ Non créé

**Contenu** :
- Résumé de l'évènement (titre, dates, lieu, objectif)
- Statistiques globales
- Liste complète des contributions (tableau)
- Liste des participants
- Liste des groupes
- Graphiques de progression (si possible avec React PDF)

**Action** : Bouton "Exporter rapport PDF" dans la page détail

---

### 5. Upload et gestion des médias

#### 5.1 Service upload Firebase Storage
**Fichier** : `src/services/bienfaiteur/CharityMediaService.ts`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- `uploadMedia(eventId, file, type, metadata)` :
  - Upload sur Firebase Storage (`charity-events/{eventId}/media/{mediaId}`)
  - Génération thumbnail si image
  - Création document dans Firestore sous-collection `media`
  - Retourne `CharityMedia` avec URLs
- `deleteMedia(eventId, mediaId)` :
  - Suppression du fichier Storage
  - Suppression du document Firestore
- `updateMediaMetadata(eventId, mediaId, updates)`

**Référence** : Inspiré de services d'upload existants dans le projet

---

#### 5.2 Composant upload médias
**Fichier** : `src/components/bienfaiteur/CharityMediaUpload.tsx`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- Drag & drop ou bouton de sélection
- Upload multiple (plusieurs fichiers)
- Prévisualisation avant upload
- Barre de progression par fichier
- Gestion erreurs (taille, format)
- Validation formats (JPG, PNG, MP4, etc.)

---

#### 5.3 Grille de médias
**Fichier** : `src/components/bienfaiteur/CharityMediaGrid.tsx`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- Grille responsive (2-3 colonnes desktop, 1-2 mobile)
- Vignettes avec overlay au survol
- Actions : voir en grand, supprimer, éditer métadonnées
- Lazy loading pour performance
- Filtres : Tous / Photos / Vidéos

---

#### 5.4 Lightbox médias
**Fichier** : `src/components/bienfaiteur/CharityMediaLightbox.tsx`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- Affichage média en plein écran
- Navigation précédent/suivant
- Zoom pour images
- Lecture vidéo intégrée
- Informations (titre, description, date)
- Fermeture par clic ou ESC

---

### 6. Hooks manquants

#### 6.1 Hook participants
**Fichier** : `src/hooks/bienfaiteur/useCharityParticipants.ts`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- `useCharityParticipants(eventId, filters)` - Liste participants avec filtres
- `useAddCharityParticipant()` - Mutation ajout participant
- `useRemoveCharityParticipant()` - Mutation retrait participant

**Service nécessaire** : `CharityParticipantService.ts` (logique métier)

---

#### 6.2 Hook groupes
**Fichier** : `src/hooks/bienfaiteur/useCharityGroups.ts`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- `useCharityGroups(eventId, filters)` - Liste groupes avec stats
- `useAddCharityGroup()` - Mutation ajout groupe

**Service** : Peut réutiliser `CharityParticipantService` (groupes = participants de type 'group')

---

#### 6.3 Hook médias
**Fichier** : `src/hooks/bienfaiteur/useCharityMedia.ts`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- `useCharityMedia(eventId)` - Liste médias
- `useUploadCharityMedia()` - Mutation upload
- `useDeleteCharityMedia()` - Mutation suppression
- `useUpdateCharityMedia()` - Mutation mise à jour métadonnées

**Service nécessaire** : `CharityMediaService.ts`

---

#### 6.4 Hook export
**Fichier** : `src/hooks/bienfaiteur/useCharityExport.ts`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- `useExportContributionsCSV(eventId, filters)` - Export CSV contributions
- `useExportEventsCSV(filters)` - Export CSV évènements
- `useGenerateContributionReceipt(eventId, contributionId)` - Génération reçu PDF
- `useGenerateEventReport(eventId)` - Génération rapport PDF

**Service** : `CharityExportService` existe déjà, mais manque méthodes PDF

---

### 7. Services manquants

#### 7.1 Service participants
**Fichier** : `src/services/bienfaiteur/CharityParticipantService.ts`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- `addParticipant(eventId, memberId/groupId, adminId)` - Ajout participant
- `removeParticipant(eventId, participantId)` - Retrait participant
- `getParticipantsByEvent(eventId, filters)` - Liste avec filtres
- `getParticipantStats(eventId, participantId)` - Stats d'un participant
- `updateParticipantStats(eventId, participantId)` - Recalcul stats après contribution

**Repository** : ✅ `CharityParticipantRepository` existe

---

#### 7.2 Service médias
**Fichier** : `src/services/bienfaiteur/CharityMediaService.ts`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- `uploadMedia(eventId, file, metadata, adminId)` - Upload + création document
- `deleteMedia(eventId, mediaId)` - Suppression Storage + Firestore
- `updateMedia(eventId, mediaId, updates, adminId)` - Mise à jour métadonnées
- `generateThumbnail(imageFile)` - Génération thumbnail pour images

**Dépendances** :
- Firebase Storage
- Service de compression d'images (existe : `imageCompressionService.ts`)

---

#### 7.3 Service stats (optionnel)
**Fichier** : `src/services/bienfaiteur/CharityStatsService.ts`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- `calculateEventProgress(event)` - Calcul pourcentage progression
- `calculateDaysRemaining(event)` - Jours restants
- `getTopContributors(eventId, limit)` - Top contributeurs
- `getContributionsByType(eventId)` - Répartition par type
- `getContributionsByPeriod(eventId, period)` - Évolution temporelle

**Note** : Certaines méthodes existent déjà dans `CharityEventService.getEventStats()`, mais un service dédié peut être utile pour réutilisation.

---

### 8. Composants utilitaires manquants

#### 8.1 Barre de progression
**Fichier** : `src/components/bienfaiteur/CharityProgressBar.tsx`  
**Statut** : ❌ Non créé (actuellement utilisé directement `Progress` de shadcn)

**Fonctionnalités** :
- Composant wrapper autour de `Progress`
- Affichage montant collecté / objectif
- Couleur dynamique selon pourcentage (vert si > 80%, jaune si > 50%, etc.)
- Badge "Objectif atteint" si 100%

**Note** : Peut être optionnel si `Progress` de shadcn suffit

---

#### 8.2 Badge de statut
**Fichier** : `src/components/bienfaiteur/CharityStatusBadge.tsx`  
**Statut** : ❌ Non créé (actuellement utilisé directement `Badge`)

**Fonctionnalités** :
- Composant wrapper avec couleurs prédéfinies par statut
- Icônes associées (draft = brouillon, upcoming = calendrier, etc.)

**Note** : Peut être optionnel si `Badge` de shadcn suffit

---

#### 8.3 Boutons export
**Fichier** : `src/components/bienfaiteur/CharityExportButtons.tsx`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- Bouton "Exporter CSV" (contributions ou évènements)
- Bouton "Exporter PDF" (reçu ou rapport)
- Dropdown menu avec options
- Intégration dans `CharityEventsList` et `CharityEventDetail`

---

### 9. Composants de détail manquants

#### 9.1 Hero section (séparé)
**Fichier** : `src/components/bienfaiteur/CharityEventHero.tsx`  
**Statut** : ❌ Non créé (actuellement intégré dans `CharityEventDetail`)

**Fonctionnalités** :
- Bandeau hero avec image de couverture
- Overlay dégradé
- Badge statut
- Titre, dates, lieu
- Boutons actions (Modifier, menu ...)

**Note** : Peut être extrait de `CharityEventDetail` pour réutilisabilité

---

#### 9.2 Stats cards (séparé)
**Fichier** : `src/components/bienfaiteur/CharityEventStats.tsx`  
**Statut** : ❌ Non créé (actuellement intégré dans `CharityEventDetail`)

**Fonctionnalités** :
- Cartes de stats synthétiques
- Progression, contributions, participants, groupes
- Top contributors

**Note** : Peut être extrait de `CharityEventDetail` pour réutilisabilité

---

### 10. Modals manquantes

#### 10.1 Modal création évènement (desktop overlay)
**Fichier** : `src/components/bienfaiteur/CreateCharityEventModal.tsx`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- Wrapper `Dialog` autour de `CreateCharityEventForm`
- Gestion état open/close
- Fermeture après création réussie
- Utilisé depuis bouton "+ Créer un évènement" de la liste

**Référence** : docs/12.png

---

#### 10.2 Modal visualisation preuve
**Fichier** : `src/components/bienfaiteur/ContributionProofViewer.tsx`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- Modal/Dialog affichant l'image de preuve en grand
- Zoom possible
- Bouton télécharger
- Informations : date upload, admin ayant enregistré

---

### 11. Pages Next.js manquantes

#### 11.1 Page modification évènement
**Fichier** : `src/app/(admin)/bienfaiteur/[id]/modify/page.tsx`  
**Statut** : ❌ Non créé

**Contenu** :
- Charge évènement via `useCharityEvent`
- Affiche `EditCharityEventForm` pré-rempli
- Sauvegarde via `useUpdateCharityEvent`
- Redirection après sauvegarde

---

#### 11.2 Pages dédiées (optionnelles)
**Fichiers** :
- `src/app/(admin)/bienfaiteur/[id]/contributions/page.tsx` - Vue dédiée contributions
- `src/app/(admin)/bienfaiteur/[id]/participants/page.tsx` - Vue dédiée participants
- `src/app/(admin)/bienfaiteur/[id]/groups/page.tsx` - Vue dédiée groupes
- `src/app/(admin)/bienfaiteur/[id]/media/page.tsx` - Vue dédiée médias

**Note** : Optionnel si les tabs dans la page détail suffisent. Peut être utile pour deep linking ou partage d'URL.

---

## 🟢 AMÉLIORATIONS - Fonctionnalités bonus

### 12. Fonctionnalités avancées (non critiques)

#### 12.1 Upload photo de couverture dans formulaire création
**Fichier** : `src/components/bienfaiteur/CreateCharityEventForm.tsx`  
**Statut** : ⚠️ Partiel (section visuel mentionnée mais non implémentée)

**À compléter** :
- Section "Visuel de l'évènement" avec :
  - Aperçu image par défaut
  - Bouton "Téléverser une image"
  - Upload vers Firebase Storage
  - Lien "Revenir à l'image par défaut"
  - Guidelines formats (JPG, PNG, 1200x600px)

---

#### 12.2 Validation Zod dans formulaires
**Fichier** : À créer `src/schemas/charity-event.schema.ts`  
**Statut** : ❌ Non créé

**Fonctionnalités** :
- Schema Zod pour `CharityEvent`
- Schema Zod pour `CharityContribution`
- Validation côté client avant soumission
- Messages d'erreur en français

---

#### 12.3 Pagination avancée
**Fichiers** : Composants liste  
**Statut** : ⚠️ Non implémenté

**Fonctionnalités** :
- Pagination côté client ou serveur
- Limite par page configurable
- Navigation pages
- Indicateur "X résultats sur Y"

---

#### 12.4 Filtres avancés
**Fichier** : `src/components/bienfaiteur/CharityFilters.tsx`  
**Statut** : ⚠️ Basique (statut + recherche)

**À ajouter** :
- Filtre par période (date début/fin)
- Filtre par montant (min/max)
- Filtre par lieu
- Filtres combinables
- Sauvegarde filtres dans URL (query params)

---

#### 12.5 Notifications/Toasts améliorés
**Fichiers** : Tous les composants avec mutations  
**Statut** : ⚠️ Basique (toast simple)

**À améliorer** :
- Messages de succès/erreur plus détaillés
- Notifications pour actions importantes (création contribution, clôture évènement)
- Confirmations pour actions destructives (suppression)

---

#### 12.6 Permissions et sécurité
**Fichiers** : Services et hooks  
**Statut** : ⚠️ Basique (vérification `useAuth`)

**À ajouter** :
- Vérification rôles admin avant mutations
- Middleware Next.js pour protection routes
- Validation côté serveur (si API routes)
- Logs d'audit pour actions sensibles

---

#### 12.7 Optimisations performance
**Fichiers** : Tous les composants  
**Statut** : ⚠️ Non optimisé

**À ajouter** :
- Memoization des calculs stats
- Lazy loading des médias
- Virtualisation pour listes longues
- Debounce sur recherche
- Cache React Query optimisé

---

#### 12.8 Responsive mobile avancé
**Fichiers** : Tous les composants  
**Statut** : ⚠️ Basique

**À améliorer** :
- Drawer mobile pour formulaires (Sheet)
- Navigation mobile optimisée
- Gestures swipe pour médias
- Bottom sheets pour actions

---

## 📊 Statistiques d'implémentation

### Composants
- ✅ Créés : 7/25 (28%)
- ❌ Manquants : 18/25 (72%)

### Hooks
- ✅ Créés : 2/8 (25%)
- ❌ Manquants : 6/8 (75%)

### Services
- ✅ Créés : 3/6 (50%)
- ❌ Manquants : 3/6 (50%)

### Pages
- ✅ Créées : 3/4+ (75%)
- ❌ Manquantes : 1+ (25%)

### Repositories
- ✅ Créés : 4/4 (100%)

---

## 🎯 Priorités d'implémentation

### Priorité 1 (Critique - Fonctionnalités de base)
1. ✅ ~~Repositories~~ - FAIT
2. ✅ ~~Services de base~~ - FAIT
3. ✅ ~~Hooks de base~~ - FAIT
4. ✅ ~~Pages principales~~ - FAIT
5. ✅ ~~Composants liste~~ - FAIT
6. ❌ **Sections tabs détaillées** (Contributions, Participants, Groupes, Médias)
7. ❌ **Formulaires d'ajout** (Contribution, Participant)
8. ❌ **Page modification évènement**

### Priorité 2 (Important - Fonctionnalités avancées)
9. ❌ **Génération reçus PDF**
10. ❌ **Upload médias** (Storage + service)
11. ❌ **Galerie médias** (grille + lightbox)
12. ❌ **Hooks manquants** (Participants, Groupes, Médias, Export)

### Priorité 3 (Améliorations)
13. ❌ **Rapport PDF global**
14. ❌ **Filtres avancés**
15. ❌ **Validation Zod**
16. ❌ **Optimisations performance**

---

## 📝 Notes finales

**Architecture** : ✅ Solide et cohérente  
**Base de données** : ✅ Structure Firestore définie  
**Types** : ✅ Complets  
**UI/UX** : ⚠️ À compléter (sections tabs, formulaires)  
**Fonctionnalités métier** : ⚠️ ~60% implémenté

**Temps estimé pour compléter** :
- Priorité 1 : ~2-3 jours
- Priorité 2 : ~2-3 jours
- Priorité 3 : ~1-2 jours
- **Total** : ~5-8 jours de développement

**Prochaines étapes recommandées** :
1. Implémenter les sections tabs (Contributions, Participants, Groupes, Médias)
2. Créer les formulaires d'ajout (Contribution, Participant)
3. Ajouter l'upload de médias
4. Générer les reçus PDF
5. Tester l'intégration complète

