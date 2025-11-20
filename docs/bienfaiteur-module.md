## Analyse fonctionnelle – Module « Bienfaiteur »

### Architecture applicative ciblée
- **Principe conservé** : `Repository → Service → Hooks → View`.
- Variante selon la complexité : `Repository → Service → Mediator → View` (le mediator orchestre plusieurs services/stores).
- **Organisation dossier** :
  - `src/repositories/bienfaiteur/*` : accès Firestore/REST (évènements, participants, contributions, médias).
  - `src/services/bienfaiteur/*` : logique métier (calculs stats, export CSV/PDF, validation).
  - `src/hooks/bienfaiteur/*` : hooks React (`useCharityEventsList`, `useCharityEvent`, `useCharityContributions`, etc.).
  - `src/mediators/bienfaiteur/*` : optionnel, pour combiner contributions + médias + stats dans une seule page.
- **Trace admin** : tous les services doivent renseigner `createdBy`/`updatedBy` avec `user.id` retourné par `useAuth`.

### 1. Vision générale
- **Objet** : actions caritatives (récollections) organisées par l’Association LE KARA au sein de l’admin `@(admin)`.
- **Besoins** : créer/éditer des évènements, suivre les participants (membres et groupes), enregistrer leurs contributions (financières ou en nature), exposer des médias (photos/vidéos) et produire des statistiques de progression.
- **Contrainte UX** : réutiliser les patterns visuels du dashboard existant (`LayoutDashboard`, `AppSidebar`, cartes, badges, palette bleu-vert).

### 2. Entités et types proposés (`src/types/types.ts`)

#### 2.1 Évènement de charité
```ts
export type CharityEventStatus = 'draft' | 'upcoming' | 'ongoing' | 'closed' | 'archived'

export interface CharityEvent {
  id: string
  title: string
  slug?: string
  description: string
  location: string
  startDate: Date
  endDate: Date
  minContributionAmount?: number
  targetAmount?: number
  currency: string
  coverPhotoUrl?: string | null
  coverPhotoPath?: string | null
  status: CharityEventStatus
  isPublic?: boolean
  totalCollectedAmount: number
  totalContributionsCount: number
  totalParticipantsCount: number
  totalGroupsCount: number
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}
```

#### 2.2 Participants liés
```ts
export type CharityParticipantType = 'member' | 'group'

export interface CharityParticipant {
  id: string
  eventId: string
  participantType: CharityParticipantType
  memberId?: string // User.id
  groupId?: string  // Group.id
  totalAmount: number
  contributionsCount: number
  lastContributionAt?: Date
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}
```

#### 2.3 Contributions (adossées à `Payment`)
```ts
export type CharityContributionType = 'money' | 'in_kind'
export type CharityContributionStatus = 'pending' | 'confirmed' | 'canceled'

export interface CharityContribution {
  id: string
  eventId: string
  participantId: string
  contributionType: CharityContributionType
  payment?: Payment & { paymentType: 'Charity' }
  inKindDescription?: string
  estimatedValue?: number
  proofUrl?: string
  proofPath?: string
  proofType?: 'image' | 'pdf' | 'other'
  receiptUrl?: string // PDF généré style CaisseImprevuePDF
  receiptPath?: string
  status: CharityContributionStatus
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}
```

#### 2.4 Médias d’évènement
```ts
export type CharityMediaType = 'photo' | 'video'

export interface CharityMedia {
  id: string
  eventId: string
  type: CharityMediaType
  url: string
  path: string
  thumbnailUrl?: string
  thumbnailPath?: string
  title?: string
  description?: string
  takenAt?: Date
  createdAt: Date
  createdBy: string
}
```

### 3. Associations avec les types existants
- **Membership = `User`** : les participants individuels pointent vers `User.id`. Les stats peuvent aussi filtrer sur `membershipType === 'bienfaiteur'`.
- **Groupes** : `groupId` référence `Group.id`, permettant d’agréger par groupe.
- **Paiements** : réutilisation de `Payment` + `TypePayment = 'Charity'` pour toutes les contributions financières, garantissant cohérence des modes (`PaymentMode`) et des métadonnées.
- **Documents/Médias** :
  - Étendre `DocumentType` avec `CHARITY_EVENT_MEDIA`, `CHARITY_CONTRIBUTION_RECEIPT`.
  - `CharityContribution` stocke `proofUrl` (photo de la preuve) et `receiptUrl` (facture générée en PDF).
- **Admins (trace)** : chaque création/édition injecte `createdBy`/`updatedBy` issus de `useAuth().user?.uid` pour identifier l’admin responsable.

### 4. Structure de données (suggestion Firestore)
- Collection `charity-events` → documents `CharityEvent`.
- Sous-collections : `participants`, `contributions`, `media`.
- Table/collection transversale `payments` déjà existante : chaque paiement caritatif porte `paymentType: 'Charity'` et l’`eventId` via `CharityContribution`.

### 5. Prochaines étapes possibles
- Insérer ces types dans `src/types/types.ts` (section dédiée, exports).
- Éventuellement enrichir `DocumentType` pour les rapports ou supports PDF du module.
- Mettre à jour les services / stores pour gérer :
  - CRUD d’un `CharityEvent`.
  - Ajout de participants via recherche (`EntitySearchResult` déjà existant).
  - Création d’une `CharityContribution` en liant un `Payment`.
  - Upload et listing des `CharityMedia`.

Ces structures assurent la cohérence avec les types actuels (`User`, `Group`, `Payment`) tout en introduisant clairement la logique métier du module Bienfaiteur.

---

## Analyse des vues (références `docs/1.png` & `docs/2.png`)

### Vue desktop – `docs/1.png`
- **Layout général** : sidebar gauche existante (logo, navigation, CTA “Voir le site public”). En-tête principal avec breadcrumb “Administration / Bienfaiteur”, titre XL, sous-titre descriptif, badge “En ligne” et bouton primaire “Créer un évènement”.
- **Section “Global Stats”** : quatre cartes (évènements annuels, montant total collecté, total participants, prochain évènement). Elles correspondent directement aux agrégats du type `CharityEvent` (via service de stats). Prévoir un hook `useCharityGlobalStats`.
- **Liste filtrable** :
  - Tabs de statut (Tous, À venir, En cours, Terminé, Brouillon).
  - Barre de recherche + filtres (statut, période) + toggle vue tableau/grille.
  - Tableau responsive avec colonnes : Évènement (image + titre + catégorie), Dates & lieu, Statut (badge coloré), Progression (barre vs objectif), Participants (membres + groupes), Actions (voir/éditer).
  - Pagination bas de page si nécessaire.
- **Implémentation** :
  - View `BienfaiteurListPage` réutilisant `LayoutDashboard`.
  - Hook `useCharityEventsList(filters)` pour la liste paginée + stats.
  - Components : `CharityStatsCards`, `CharityEventsTable`, `CharityFilters`.

### Vue mobile – `docs/2.png`
- **Layout single column** : en-tête “Benefactor Events” + barre recherche, switch grille, filtres (statut/date), ensuite cartes verticales.
- **Carte évènement** :
  - Image de couverture en haut, badge statut, date, titre, lieu, progression, nombre de participants, plage de dates, CTA “Voir les détails”, menu contextuel.
  - Pagination circulaire en bas (1,2,3…).
- **Implémentation** :
  - View mobile peut partager la même page Next, mais adapter via composants responsives (`CharityEventCardMobile`).
  - Hook identique `useCharityEventsList` avec param `view='mobile'` pour limiter les colonnes.
  - Conserver les mêmes filtres mais en version icônes / dropdown mobile.

Ces deux vues démontrent comment la couche View consomme les hooks (eux-mêmes branchés sur Services/Repositories), garantissant cohérence desktop/mobile tout en respectant l’architecture imposée.

### Vue détail évènement – `docs/3.png`
- **Layout** : page `Bienfaiteur > Gala Annuel de Charité` avec hero image couvrant la largeur, overlay dégradé, badge statut, titre, dates et lieu visibles dans le bandeau. Boutons “Modifier” et menu actions sur la droite.
- **Statistiques clés** : cartes synthétiques alignées (progression, contributions, participants, groupes, médaille “Top contributions”). Elles reposent sur les agrégats exposés par le service `CharityEventService.getStats(eventId)` puis consommés par un hook `useCharityEventStats`.
- **Tabs** :
  - `Overview` : résumé (objectifs, communiqué officiel, timeline d’activités).
  - `Contributions` : tableau avec filtres (type, statut, période) et actions (export, ajout). Colonnes cohérentes avec le type `CharityContribution`.
  - `Participants` : liste/groupes + vues segmentées.
  - `Media` : galerie de cartes photo/vidéo, upload button.
  - `Settings` : formulaire d’édition (titre, dates, montants, cover, statut).
- **Sections spécifiques visibles sur la maquette** :
  - **Progress card** : grande carte avec barre, cible vs collecté, bouton “Ajouter contribution”.
  - **Timeline** : composant vertical listant les activités (contribution, media, commentaire).
  - **Top contributors** : cartes listant les membres/groupes avec montant total.
  - **Galerie média** : grille 2 colonnes, bouton “Ajouter des médias”.
- **Implémentation** :
  - Page `src/app/(admin)/bienfaiteur/[eventId]/page.tsx`.
  - Hook principal `useCharityEvent(eventId)` exposant `event`, `stats`, `participants`, `contributions`, `media`.
  - Utilisation possible d’un **mediator** pour agréger plusieurs services (events, payments, storage) avant d’hydrater la vue.
  - Composants réutilisables : `CharityHero`, `CharityStatCard`, `CharityContributionTable`, `CharityTimeline`, `CharityMediaGrid`.

Cette vue détail montre l’orchestration complète de la stack `Repo → Service → Mediator/Hook → View` afin d’unifier données évènementielles, financières et médias dans une seule page.

### Vue carte desktop – `docs/4.png`
- **Objectif** : alternative “cards” à la vue tableau (toggle Liste/Cartes).
- **Composition** :
  - Même en-tête (breadcrumb + CTA).
  - Grille responsive de cartes 3 colonnes (desktop) reprenant image, badge statut, dates, titre, lieu, progression, compte participants, jours restants.
  - Actions : `Voir les détails`, menu “…” (PDF, export CSV, duplication).
  - Bouton de switch `Liste/Cartes` dans la barre supérieure.
- **Adaptation design existant** :
  - Cartes héritent des styles `Card` (`rounded-3xl`, ombre douce).
  - Palette badges identique (En cours = vert, À venir = jaune, Terminé = gris).
- **Implémentation** :
  - Composant `CharityEventCard` partagé desktop/mobile (grid vs slider).
  - Hook `useCharityEventsList` fournit `viewMode` + données.
  - Service `CharityProgressService` pour calculer “jours restants / objectif atteint”.

### Vue mobile contributions – `docs/5.png`
- **Header** : identique aux autres détails (image, badge, stats). Tag “Online” pour statut admin.
- **Tabs** : anchor sur `Contributions`.
- **Contenu** :
  - Carte récap “Total collected” avec split cash / in-kind.
  - Liste de contributions (participant, montant, date/heure, type, statut).
  - Bouton flottant “+” pour ajouter contribution.
- **Intégration** :
  - `CharityContributionCardMobile` reprenant tokens (icônes argent, badges `Paid/Pledged`).
  - Hook `useCharityContributions(eventId)` → pagination, filtre type/statu.
  - Lorsqu’on ajoute un don, formulaire capture preuve (image) et déclenche génération de reçu PDF.

### Vue mobile participants – `docs/6.png`
- **Tabs** : `Participants` actif.
- **Fonctionnalités** :
  - Barre de recherche + toggle All/Members/Groups.
  - Cartes simplifiées listant avatar, nom, groupe de rattachement, total donné, nombre d’évènements.
  - Bouton flottant “Ajouter participant”.
- **Implémentation** :
  - Hook `useCharityParticipants(eventId)` avec filtres.
  - Composant `ParticipantListItem` reprenant avatars (peut utiliser `User.photoURL`).
  - Ajout participant ouvre modal reliant `EntitySearch`.

### Vue mobile groupes – `docs/7.png`
- **Filtre rapide** : All / Active / Inactive.
- **Liste** : pour chaque groupe, icône, nom, nombre de membres, total apporté, nombre d’évènements.
- **CTA** : bouton flottant “Ajouter groupe”.
- **Intégration** :
  - `useCharityGroups(eventId)` (ou derived from participants service) fournissant stats par groupe.
  - États “Active/Inactive” basés sur statut participation (contribution récente, invitation en attente).

### Vue mobile groupes (recherche/tri) – `docs/8.png`
- Variation plus détaillée :
  - Barre de recherche + bouton filtre (icône entonnoir).
  - Indicateur “12 groups”.
  - Menu `Sort by` (contributions, alphabetique, membres).
  - Cartes affichent contributions cumulées.
- **Implémentation** :
  - Même hook que ci-dessus mais avec options `sortKey`, `filters`.
  - Filtre drawer mobile pour sélectionner statut, montant min, etc.
  - Utiliser composants UI existants (`Select`, `Sheet`) pour rester cohérent.

### Modal desktop création évènement – `docs/9.png`
- **Usage** : lancé depuis le bouton `+ Créer un évènement`.
- **Contenu** :
  - Sections “Informations générales”, “Financement”, “Types de contributions”, “Visuel”.
  - Champs en grille 2 colonnes (titre + lieu, dates début/fin, texte introductif pleine largeur).
  - Inputs reprennent `InputApp`, `Textarea`, `DatePicker` existants.
  - Boutons radio arrondis pour les types (Espèces, Virement, Don en nature, Autre).
  - Bloc upload image de couverture (preview + guidelines).
  - CTA bas de modal : `Annuler`, `+ Créer l'évènement`.
- **Implémentation** :
  - Composant `CreateCharityEventModal` s’appuyant sur `Dialog`.
  - Hook `useCreateCharityEvent` (mutation) -> `CharityEventService.create(payload, adminId)`.
  - Upload image via `useUploadFile` / service storage, stocker `coverPhotoUrl`.

### Drawer mobile création évènement – `docs/10.png`
- **Adaptation mobile** :
  - `Dialog` devient plein écran (`Sheet` ou `Dialog` responsive) avec header sticky ("Créer un évènement bienfaiteur" + close).
  - Formulaire single column, mêmes champs que desktop.
  - Boutons type contributions en grille 2x2 pour réduire la hauteur.
  - Section visuel : aperçu, bouton "Téléverser une image", lien "Revenir à l'image par défaut".
  - CTA sticky au bas (`Annuler`, `Créer l'évènement`).
- **Implémentation** :
  - Reuse du même composant form, mais wrapper responsive détectant `useMobile`.
  - Gestion du scroll + safe-area pour éviter que le CTA ne masque les inputs.
  - Validation identique (Zod schema côté service).

### Variante modale standalone – `docs/11.png`
- **Contexte** : version page complète ou modale standalone (sans overlay dashboard visible) pour la création d'évènement.
- **Structure identique** à `docs/10.png` :
  - Header avec "X" de fermeture et titre "Créer un évènement bienfaiteur".
  - Section "Informations générales" : titre, lieu, dates (début/fin), texte d'introduction/communiqué.
  - Section "Financement" : objectif financier (FCFA), contribution min. par membre (optionnel).
  - Section "Types de contributions" : radio buttons (Espèces, Virement, Don en nature, Autre) en grille 2x2.
  - Section "Visuel de l'évènement" : placeholder image par défaut, bouton "Téléverser une image", lien "Revenir à l'image par défaut", contraintes formats (JPG, PNG, 1200x600px recommandé).
  - Footer : boutons `Annuler` (secondary) et `Créer l'évènement` (primary).
- **Différences potentielles** :
  - Peut être utilisée comme page dédiée (`/bienfaiteur/create`) plutôt que modale overlay.
  - Navigation breadcrumb possible : "Administration / Bienfaiteur / Créer un évènement".
- **Implémentation** :
  - Composant `CreateCharityEventForm` réutilisable (modal ou page selon route).
  - Hook `useCreateCharityEvent` avec gestion d'état (loading, errors, success).
  - Upload image via `useUploadFile` hook, validation taille/format côté client.
  - Service `CharityEventService.create` avec payload complet + `adminId` depuis `useAuth`.

### Variante modale overlay desktop – `docs/12.png`
- **Contexte** : modale overlay centrée sur le dashboard desktop, avec sidebar et contenu principal visibles en arrière-plan.
- **Layout** :
  - Modal blanc arrondi, ombre portée, centré sur écran.
  - Header : titre "Créer un évènement bienfaiteur" + instructions "Renseignez les informations de base pour lancer une nouvelle action de solidarité." + bouton "X" (fermeture).
  - Contenu scrollable si nécessaire (formulaire long).
  - Footer fixe : boutons `Annuler` et `+ Créer l'évènement` (primary blue).
- **Sections visibles** :
  - "Informations générales" : titre, lieu, dates (début/fin avec icônes calendrier), textarea communiqué.
  - "Financement" : objectif financier, contribution min. par membre.
  - Note : sections "Types de contributions" et "Visuel" peuvent être en dessous (scroll).
- **Intégration dashboard** :
  - Déclenchée depuis bouton "+ Créer un évènement" de la page list (`docs/1.png` ou `docs/4.png`).
  - Utilise composant `Dialog` de shadcn/ui avec `open`/`onOpenChange`.
  - Fermeture : soit via "X", soit via "Annuler", soit après création réussie (redirection vers détail évènement).
- **Implémentation** :
  - Composant `CreateCharityEventModal` utilisant `Dialog` + `CreateCharityEventForm`.
  - Gestion état modal via hook `useCreateCharityEventModal` (open/close, reset form après création).
  - Après création : `router.push(/bienfaiteur/${eventId})` ou fermeture + refresh list.

### Exports & génération de preuves
- **Export CSV** :
  - Service `CharityExportService` s’appuie sur les repos pour récupérer évènements/participants/contributions.
  - Génère un CSV pour les contributions (id, membre/groupe, montant, statut, admin ayant enregistré, date, lien preuve).
  - Action accessible depuis la vue list (`docs/1.png`) et depuis l’onglet Contributions (`docs/3.png`).
- **Export PDF** :
  - Deux usages :
    1. **Rapports d’évènement** (liste contributions + stats) en PDF global.
    2. **Reçus individuels** pour chaque contribution. Lorsqu’un admin enregistre un don, on génère une facture PDF “preuve de don” inspirée de `src/components/caisse-imprevue/CaisseImprevuePDF.tsx` (structure Document/Page, styles, logo, infos donateur, montant, admin, signature). Le chemin est stocké dans `CharityContribution.receiptUrl`.
  - PDF généré côté client (React PDF) ou via service backend selon besoin.
- **Gestion des preuves (images)** :
  - Formulaire d’ajout de contribution permet d’uploader une photo du reçu / capture (stockage Firebase). URL stockée dans `proofUrl`.
  - La vue détail affiche la miniature et permet de télécharger la preuve.
- **Traçabilité admin** :
  - Lors de l'appel service `CharityContributionService.create`, on passe `adminId = useAuth().user?.uid`.
  - `createdBy`/`updatedBy` sont persistés partout (évènement, participant, contribution, média) pour audit.

---

## Plan de réalisation complète du module Bienfaiteur

### 1. Structure des routes Next.js

Créer les pages suivantes dans `src/app/(admin)/bienfaiteur/` :

```
src/app/(admin)/bienfaiteur/
├── page.tsx                    # Liste des évènements (docs/1.png, 2.png, 4.png)
├── create/
│   └── page.tsx                # Création d'évènement (docs/9.png, 11.png, 12.png)
└── [id]/
    ├── page.tsx                # Détail évènement (docs/3.png)
    ├── modify/
    │   └── page.tsx            # Modification évènement
    ├── contributions/
    │   └── page.tsx            # Vue détaillée contributions (optionnel, sinon via tabs)
    ├── participants/
    │   └── page.tsx            # Vue détaillée participants (optionnel, sinon via tabs)
    ├── groups/
    │   └── page.tsx            # Vue détaillée groupes (optionnel, sinon via tabs)
    └── media/
        └── page.tsx            # Galerie médias (optionnel, sinon via tabs)
```

**Référence** : Structure similaire à `src/app/(admin)/caisse-imprevue/` (create, contrats/[id], settings).

### 2. Mise à jour de `src/constantes/routes.ts`

Ajouter dans `routes.admin` :

```typescript
bienfaiteur: '/bienfaiteur',
bienfaiteurList: '/bienfaiteur',
bienfaiteurCreate: '/bienfaiteur/create',
bienfaiteurDetails: (id: string) => `/bienfaiteur/${id}`,
bienfaiteurModify: (id: string) => `/bienfaiteur/${id}/modify`,
bienfaiteurContributions: (id: string) => `/bienfaiteur/${id}/contributions`,
bienfaiteurParticipants: (id: string) => `/bienfaiteur/${id}/participants`,
bienfaiteurGroups: (id: string) => `/bienfaiteur/${id}/groups`,
bienfaiteurMedia: (id: string) => `/bienfaiteur/${id}/media`,
```

### 3. Mise à jour de la Sidebar (`src/components/layout/AppSidebar.tsx`)

Ajouter dans `adminMenuItems` (après "Caisse imprévue") :

```typescript
{
    title: "Bienfaiteur",
    url: routes.admin.bienfaiteur,
    icon: HeartHandshake, // ou une icône dédiée (ex: HandHeart, Gift)
},
```

**Note** : Utiliser `lucide-react` pour l'icône (ex: `HandHeart`, `Gift`, `HeartHandshake`).

### 4. Structure des composants (`src/components/bienfaiteur/`)

Créer le dossier `src/components/bienfaiteur/` avec les composants suivants :

#### 4.1 Composants de liste
- **`CharityEventsList.tsx`** : Liste principale (tableau ou cartes selon vue)
  - Réutilise `Card`, `Badge`, `Button`, `Table` de `@/components/ui`
  - Intègre `CharityStatsCards`, `CharityFilters`, `CharityEventCard`/`CharityEventTableRow`
- **`CharityStatsCards.tsx`** : Cartes de statistiques globales (évènements annuels, montant total, participants, prochain évènement)
- **`CharityFilters.tsx`** : Barre de filtres (statut, période, recherche) + toggle Liste/Cartes
- **`CharityEventCard.tsx`** : Carte d'évènement (pour vue grille, docs/4.png)
- **`CharityEventTableRow.tsx`** : Ligne de tableau (pour vue liste, docs/1.png)

#### 4.2 Composants de détail évènement
- **`CharityEventDetail.tsx`** : Page détail principale (orchestre hero + tabs + sections)
- **`CharityEventHero.tsx`** : Bandeau hero avec image de couverture, badge statut, titre, dates, lieu
- **`CharityEventTabs.tsx`** : Navigation par onglets (Contributions, Participants, Groupes, Médias, Paramètres)
- **`CharityEventStats.tsx`** : Cartes de stats synthétiques (progression, contributions, participants, groupes)
- **`CharityContributionsSection.tsx`** : Section contributions (tableau + filtres + export)
- **`CharityParticipantsSection.tsx`** : Section participants (liste membres + groupes)
- **`CharityGroupsSection.tsx`** : Section groupes (liste avec stats par groupe)
- **`CharityMediaSection.tsx`** : Galerie médias (grille photos/vidéos + upload)
- **`CharityEventSettings.tsx`** : Formulaire d'édition évènement (onglet Paramètres)

#### 4.3 Composants de formulaires
- **`CreateCharityEventForm.tsx`** : Formulaire de création (réutilisable pour modal/page)
  - Sections : Informations générales, Financement, Types de contributions, Visuel
  - Utilise `Input`, `Textarea`, `Select`, `RadioGroup`, `FileInput` de `@/components/ui`
- **`CreateCharityEventModal.tsx`** : Modal wrapper (desktop overlay, docs/12.png)
- **`EditCharityEventForm.tsx`** : Formulaire d'édition (similaire à création, pré-rempli)
- **`AddContributionForm.tsx`** : Formulaire d'ajout de contribution (membre/groupe, type, montant, preuve)
- **`AddParticipantModal.tsx`** : Modal pour ajouter participant (recherche membre/groupe via `EntitySearch`)

#### 4.4 Composants de contributions
- **`CharityContributionCard.tsx`** : Carte contribution individuelle (mobile, docs/5.png)
- **`CharityContributionTable.tsx`** : Tableau contributions (desktop)
- **`CharityContributionReceiptPDF.tsx`** : PDF reçu de contribution (inspiré de `CaisseImprevuePDF.tsx`)
- **`ContributionProofViewer.tsx`** : Modal/lightbox pour visualiser preuve (image)

#### 4.5 Composants de participants
- **`CharityParticipantCard.tsx`** : Carte participant (mobile, docs/6.png)
- **`CharityParticipantList.tsx`** : Liste participants avec filtres (All/Members/Groups)
- **`CharityGroupCard.tsx`** : Carte groupe (mobile, docs/7.png, 8.png)
- **`CharityGroupList.tsx`** : Liste groupes avec recherche/tri

#### 4.6 Composants de médias
- **`CharityMediaGrid.tsx`** : Grille médias (photos/vidéos)
- **`CharityMediaUpload.tsx`** : Upload multiple médias
- **`CharityMediaLightbox.tsx`** : Lightbox pour visualiser média en grand

#### 4.7 Composants utilitaires
- **`CharityProgressBar.tsx`** : Barre de progression (montant collecté vs objectif)
- **`CharityStatusBadge.tsx`** : Badge de statut (draft, upcoming, ongoing, closed, archived)
- **`CharityExportButtons.tsx`** : Boutons export CSV/PDF (depuis liste ou détail)

**Références d'inspiration** :
- `src/components/caisse-imprevue/` : structure similaire (listes, formulaires, modals)
- `src/components/memberships/` : patterns de listes/filtres
- `src/components/caisse-speciale/` : formulaires multi-étapes, PDFs

### 5. Structure des hooks (`src/hooks/bienfaiteur/`)

Créer les hooks suivants :

- **`useCharityEventsList.ts`** : Liste paginée + filtres + stats globales
- **`useCharityEvent.ts`** : Détail d'un évènement (chargement + stats)
- **`useCharityEventStats.ts`** : Stats agrégées d'un évènement
- **`useCreateCharityEvent.ts`** : Mutation création évènement
- **`useUpdateCharityEvent.ts`** : Mutation modification évènement
- **`useCharityContributions.ts`** : Liste contributions d'un évènement
- **`useCreateCharityContribution.ts`** : Mutation ajout contribution
- **`useCharityParticipants.ts`** : Liste participants (membres + groupes)
- **`useAddCharityParticipant.ts`** : Mutation ajout participant
- **`useCharityGroups.ts`** : Liste groupes avec stats
- **`useCharityMedia.ts`** : Liste médias + upload
- **`useCharityExport.ts`** : Export CSV/PDF

**Pattern** : Chaque hook s'appuie sur un service (`CharityEventService`, `CharityContributionService`, etc.) qui lui-même utilise un repository.

### 6. Structure des services (`src/services/bienfaiteur/`)

- **`CharityEventService.ts`** : CRUD évènements, calcul stats
- **`CharityContributionService.ts`** : CRUD contributions, génération reçus PDF
- **`CharityParticipantService.ts`** : Gestion participants (membres/groupes)
- **`CharityMediaService.ts`** : Upload/gestion médias (Firebase Storage)
- **`CharityExportService.ts`** : Export CSV/PDF (rapports, reçus)
- **`CharityStatsService.ts`** : Calculs statistiques (agrégats, progressions)

### 7. Structure des repositories (`src/repositories/bienfaiteur/`)

- **`CharityEventRepository.ts`** : Accès Firestore `charity-events`
- **`CharityContributionRepository.ts`** : Accès sous-collection `contributions`
- **`CharityParticipantRepository.ts`** : Accès sous-collection `participants`
- **`CharityMediaRepository.ts`** : Accès sous-collection `media` + Firebase Storage

**Pattern** : Implémenter `IRepository<T>` (voir `src/repositories/IRepository.ts`).

### 8. Composants UI à réutiliser (`src/components/ui/`)

- **Layout** : `Card`, `CardHeader`, `CardContent`, `CardTitle`
- **Navigation** : `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- **Formulaires** : `Input`, `Textarea`, `Select`, `RadioGroup`, `Checkbox`, `Label`, `Form`, `FileInput`
- **Boutons** : `Button` (variants: default, outline, ghost, destructive)
- **Badges** : `Badge` (variants selon statut)
- **Modals/Dialogs** : `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- **Mobile** : `Sheet` (pour drawer mobile)
- **Tables** : `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- **Progress** : `Progress` (barre de progression)
- **Avatars** : `Avatar`, `AvatarImage`, `AvatarFallback`
- **Autres** : `Breadcrumb`, `Separator`, `Alert`, `Skeleton` (loading states)

### 9. Providers (optionnel)

**Probablement non nécessaire** : Le module peut fonctionner avec hooks React Query directement. Si besoin d'un state global complexe (ex: formulaire multi-étapes avec validation croisée), créer `src/providers/CharityEventProvider.tsx` sur le modèle de `FormCaisseImprevueProvider.tsx`.

### 10. Intégration avec types existants

- **`src/types/types.ts`** : Ajouter les types définis en section 2 (CharityEvent, CharityParticipant, CharityContribution, CharityMedia)
- **`DocumentType`** : Étendre avec `'CHARITY_EVENT_MEDIA'`, `'CHARITY_CONTRIBUTION_RECEIPT'`, `'CHARITY_EVENT_REPORT'`
- **`TypePayment`** : Déjà présent avec `'Charity'` → réutiliser pour contributions financières

### 11. Ordre de réalisation suggéré

1. **Types** : Ajouter types dans `types.ts` + étendre `DocumentType`
2. **Routes** : Mettre à jour `routes.ts` + créer structure pages Next.js (squelettes)
3. **Sidebar** : Ajouter menu "Bienfaiteur"
4. **Repositories** : Implémenter accès Firestore (CRUD de base)
5. **Services** : Logique métier (calculs, validations)
6. **Hooks** : Hooks React Query pour consommation dans composants
7. **Composants liste** : `CharityEventsList` + stats + filtres
8. **Composants détail** : Hero + tabs + sections (contributions, participants, groupes, médias)
9. **Formulaires** : Création/modification évènement, ajout contribution
10. **Exports** : CSV + PDF (reçus + rapports)
11. **Médias** : Upload + galerie
12. **Tests** : Vérification intégration complète

### 12. Points d'attention

- **Responsive** : Adapter composants mobile/desktop (utiliser `useMobile` hook si disponible, ou media queries CSS)
- **Loading states** : Utiliser `Skeleton` pour états de chargement
- **Error handling** : Gérer erreurs Firestore/Storage avec `Alert` ou toasts (`sonner`)
- **Validation** : Utiliser Zod schemas côté service pour valider données avant persistence
- **Permissions** : Vérifier que seuls les admins peuvent créer/modifier (via `useAuth` + middleware si nécessaire)
- **Performance** : Pagination pour listes longues, lazy loading pour médias, memoization des calculs stats

Cette structure assure une cohérence avec le reste de l'application tout en respectant l'architecture `Repository → Service → Hooks → View` et les patterns visuels établis.

