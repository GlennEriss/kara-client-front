# Mettre un événement de charité « En cours »

> **Statut du document** : **Implémenté** — Action « Mettre en cours » disponible depuis la liste (carte et tableau), avec confirmation ; garde côté service (transition vers `ongoing` uniquement depuis `draft`/`upcoming`) ; invalidation liste + détail + global-stats ; option « En cours » masquée/désactivée dans Paramètres et Modifier pour les événements Terminé/Archivé.

Ce document décrit comment passer un événement de charité du statut **Brouillon** (ou autre) au statut **En cours** dans l’application. L’architecture de la fonctionnalité est alignée sur **`documentation/architecture/`** (flux repositories → services → hooks → composants, domaine **Bienfaiteur** — à terme `domains/complementary/charity/`).

---

## Contexte

- À la **création**, tout nouvel événement est enregistré avec le statut **Brouillon** (`draft`). Le formulaire de création ne propose pas de choix de statut.
- Pour ouvrir la collecte aux participants (contributions, visibilité dans les filtres « En cours »), l’administrateur doit **changer le statut** de l’événement en **En cours** (`ongoing`).

### Statuts disponibles (rappel)

| Valeur     | Libellé   | Usage typique                          |
|-----------|-----------|----------------------------------------|
| `draft`   | Brouillon | Création / préparation                 |
| `upcoming`| À venir   | Annoncé, pas encore ouvert             |
| `ongoing` | En cours  | Collecte ouverte                       |
| `closed`  | Terminé   | Collecte fermée                        |
| `archived`| Archivé   | Archivage long terme                   |

---

## Comment c’est géré en V1

La documentation V1 (`documentation/bienfaiteur/V1/bienfaiteur-module.md`) prévoit :

- Un **onglet Paramètres** dans la vue détail d’un événement, avec un formulaire d’édition incluant le **statut**.
- Une **liste** avec des filtres par statut (Tous, À venir, **En cours**, Terminé, Brouillon).

Elle ne décrit pas une procédure pas à pas dédiée « Mettre un événement en cours ». La possibilité de changer le statut est donc **implicite** dans l’édition de l’événement (Paramètres ou page Modifier).

---

## Procédure (comportement actuel de l’app)

Il existe **trois façons** de mettre un événement **En cours** dans l’interface actuelle.

### Option 1 : Depuis la page détail (onglet Paramètres)

1. Aller sur la **liste des événements** : `/bienfaiteur`.
2. Cliquer sur l’événement concerné (ou ouvrir directement `/bienfaiteur/[id]`).
3. Dans la page **détail** de l’événement, ouvrir l’onglet **Paramètres**.
4. Dans la section **« Statut et visibilité »**, champ **« Statut de l’évènement »** :
   - Ouvrir la liste et choisir **« En cours »**.
5. Cliquer sur **« Enregistrer les modifications »**.

L’événement passe alors en **En cours** ; le badge et les filtres de la liste reflètent le nouveau statut.

### Option 2 : Depuis la page « Modifier l’évènement »

1. Aller sur la **page détail** de l’événement : `/bienfaiteur/[id]`.
2. Cliquer sur le bouton **« Modifier »** (en haut à droite du bandeau hero).
3. Vous êtes redirigé vers **`/bienfaiteur/[id]/modify`** (formulaire complet d’édition).
4. Descendre jusqu’à la carte **« Statut de l’évènement »**.
5. Dans la liste **« Statut * »**, sélectionner **« En cours »**.
6. Cliquer sur **« Enregistrer les modifications »** (ou le bouton d’enregistrement du formulaire).

Résultat identique : le statut en base est mis à jour en **En cours**.

---

### Option 3 : Depuis la liste `/bienfaiteur` (grille et tableau)

1. Aller sur la **liste des événements** : `/bienfaiteur`.
2. Sur un événement en **Brouillon** ou **À venir** :
   - **Vue grille** : cliquer sur **« Mettre en cours »** dans la carte.
   - **Vue tableau** : ouvrir le menu **Actions** (⋮), puis cliquer sur **« Mettre en cours »**.
3. Confirmer dans le dialogue de confirmation.
4. Le statut passe à `ongoing`, un toast de succès est affiché, puis la liste est rafraîchie.

L’action n’est pas proposée pour les événements déjà **En cours**, **Terminé** ou **Archivé**.

---

## Fichiers concernés (référence technique)

| Rôle | Fichier |
|------|--------|
| Création (toujours brouillon) | `src/components/bienfaiteur/CreateCharityEventForm.tsx` — `status: data.status \|\| 'draft'` |
| Détail + onglet Paramètres | `src/components/bienfaiteur/CharityEventDetail.tsx` — onglet `settings` → `CharityEventSettings` |
| Formulaire Paramètres (statut) | `src/components/bienfaiteur/CharityEventSettings.tsx` — Select « Statut de l’évènement » |
| Page Modifier | `src/app/(admin)/bienfaiteur/[id]/modify/page.tsx` → `EditCharityEventForm` |
| Formulaire Modifier (statut) | `src/components/bienfaiteur/EditCharityEventForm.tsx` — carte « Statut de l’évènement », options dont « En cours » |
| Service / persistance | `CharityEventService.updateEvent` / `CharityEventRepository` — mise à jour du champ `status` |
| Types | `src/types/types.ts` — `CharityEventStatus`, `CHARITY_EVENT_STATUS_LABELS` |

---

## Action « Mettre en cours » depuis la liste (implémentée)

L’action est **déjà exposée directement depuis la liste des événements** (`/bienfaiteur`) en vue grille et en vue tableau, avec confirmation utilisateur.

`CharityEventsList` passe `onSetOngoing` et `updatingEventId` à `CharityEventCard` et `CharityEventTable`. La carte affiche le bouton « Mettre en cours » (Brouillon/À venir) avec confirmation ; le tableau propose « Mettre en cours » et « Modifier » dans le menu Actions (⋮), avec confirmation avant passage en cours.

### Objectif

- Un clic depuis la liste pour passer un événement (Brouillon ou À venir) en **En cours**, sans ouvrir la page détail ni les Paramètres.

### Comportement implémenté

1. **Vue Grille (cartes)**  
   - Pour chaque événement dont le statut est **Brouillon** ou **À venir**, un bouton **« Mettre en cours »** est affiché sur la carte.  
   - Au clic : mise à jour du statut en `ongoing`, message de succès (toast), rafraîchissement de la liste.  
   - Ne pas afficher ce bouton pour les événements déjà « En cours », « Terminé » ou « Archivé ».

2. **Vue Tableau**  
   - Dans la colonne **Actions**, le menu (icône ⋮) de chaque ligne propose :  
     - **Voir les détails**  
     - **Mettre en cours** (affiché uniquement si le statut est Brouillon ou À venir)  
     - **Modifier**  
   - Au clic sur « Mettre en cours » : même mise à jour et même feedback que en grille.

---

### Règle métier : garde côté service (implémentée)

La règle est verrouillée dans `CharityEventService.updateEvent` : toute mise à jour avec `status: 'ongoing'` vérifie le statut courant (via `CharityEventRepository.getById`) et rejette avec une erreur métier si le statut n’est pas `draft` ou `upcoming`. Les formulaires Paramètres et Modifier filtrent ou désactivent l’option « En cours » lorsque l’événement est Terminé ou Archivé.

---

### Architecture de la fonctionnalité

La fonctionnalité s’inscrit dans le **domaine Bienfaiteur** (événements de charité ; à terme `domains/complementary/charity/`). Elle respecte l’architecture décrite dans `documentation/architecture/` : **repositories → services → hooks → composants**.

- **Domaine** : Bienfaiteur (complémentaire). Si migration vers `domains/` : `domains/complementary/charity/` (cf. `PLAN_MIGRATION_DOMAINS.md`).
- **Flux** : les composants de liste appellent le **hook** ; le hook appelle le **service** ; le service appelle le **repository**. Réutilisation des couches existantes.

#### Couches impliquées

| Couche | Rôle pour « Mettre en cours » | Fichier (structure actuelle) | Fichier (structure cible `domains/`) |
|--------|--------------------------------|------------------------------|--------------------------------------|
| **Repository** | Mise à jour Firestore du document événement (existant) | `src/repositories/bienfaiteur/CharityEventRepository.ts` | `src/domains/complementary/charity/repositories/CharityEventRepository.ts` |
| **Service** | `updateEvent(id, { status }, adminId)` — garde sur les transitions vers `ongoing` (implémentée) | `src/services/bienfaiteur/CharityEventService.ts` | `src/domains/complementary/charity/services/CharityEventService.ts` |
| **Hook** | Mutation + invalidation cache (liste, détail, global-stats) | `src/hooks/bienfaiteur/useCharityEvents.ts` (`useUpdateCharityEvent`) | `src/domains/complementary/charity/hooks/useCharityEvents.ts` |
| **Composants** | Liste : orchestration + callbacks. Carte / Tableau : bouton ou menu « Mettre en cours » + confirmation | `src/components/bienfaiteur/CharityEventsList.tsx`, `CharityEventCard.tsx`, `CharityEventTable.tsx` | `src/domains/complementary/charity/components/...` |

- **Types** : `src/types/types.ts` (ou `entities/` après migration).
- **Pages** : `src/app/(admin)/bienfaiteur/page.tsx` (aucune nouvelle page).

#### Invalidation du cache (implémentée)

`useUpdateCharityEvent` invalide après succès : `['charity-events', eventId]`, `['charity-events', 'list']` et `['charity-events', 'global-stats']`, afin que les cartes globales et la liste restent à jour.

#### Règles à respecter

- Les **composants** n’appellent que des **hooks** (ou médiateurs), jamais le service ou le repository directement.
- Le **hook** `useUpdateCharityEvent` reste l’entrée unique pour la mise à jour d’un événement côté UI.
- Après succès : invalidation **liste + détail + global-stats** (voir ci‑dessus).

### Contraintes techniques (respectées)

- **UI** : `handleSetOngoing` est passé à `CharityEventCard` et `CharityEventTable` via `onSetOngoing` ; `updatingEventId` permet d’afficher l’état de chargement sur la carte/ligne concernée.
- **Chargement** : Bouton désactivé + indicateur (Loader2) pendant la mutation.
- **Service** : Garde dans `CharityEventService.updateEvent` : transition vers `ongoing` autorisée uniquement depuis `draft` ou `upcoming`.
- **Cache** : Invalidation de `['charity-events', 'global-stats']` dans le hook après succès.

### Fichiers à adapter (référence)

| Couche | Fichier (structure actuelle) |
|--------|------------------------------|
| Composant – liste (orchestration, mutation, callbacks) | `src/components/bienfaiteur/CharityEventsList.tsx` |
| Composant – carte (bouton « Mettre en cours », vue grille) | `src/components/bienfaiteur/CharityEventCard.tsx` |
| Composant – tableau (entrée de menu « Mettre en cours », vue liste) | `src/components/bienfaiteur/CharityEventTable.tsx` |

**En place** : Callbacks branchés, garde service, invalidation global-stats, confirmation depuis la liste (carte et tableau), option « En cours » masquée ou désactivée dans Paramètres et Modifier pour Terminé/Archivé.

Les procédures existantes (onglet Paramètres et page Modifier) restent inchangées et utilisables.

---

## Décisions (pour l’implémentation)

Les réponses suivantes s’appliquent lors de l’implémentation de la garde côté service et des interactions liste (carte / tableau).

1. **Transition `closed` / `archived` → `ongoing`**  
   **Interdite partout.** La garde est implémentée dans `CharityEventService.updateEvent` : toute tentative de passer en `ongoing` depuis un statut autre que `draft` ou `upcoming` est rejetée (erreur métier ou retour explicite). Ainsi, ni le bouton « Mettre en cours » depuis la liste, ni le formulaire Paramètres, ni la page Modifier ne peuvent rouvrir un événement déjà Terminé ou Archivé. L’UI peut en plus désactiver ou masquer l’option « En cours » pour ces statuts.

2. **Confirmation utilisateur avant passage en « En cours »**  
   **Oui, depuis la liste uniquement.** Afficher une confirmation (modale ou dialogue) avant de lancer la mise à jour lorsqu’on clique sur « Mettre en cours » depuis la **carte** ou depuis l’entrée du **menu tableau** (⋮). Depuis l’onglet Paramètres ou la page Modifier, pas de confirmation supplémentaire : l’enregistrement du formulaire suffit.

---

## Résumé

- **Statut** : Implémenté (action depuis la liste avec confirmation, garde service, invalidation liste + détail + global-stats).
- **V1** : Le passage en « En cours » n’est pas décrit pas à pas ; il est couvert par l’édition du statut dans les Paramètres.
- **Comportement actuel** : Tout événement créé est en **Brouillon**. Pour le mettre **En cours**, utiliser l’onglet **Paramètres**, la page **Modifier** (`/bienfaiteur/[id]/modify`) ou l’action rapide depuis la **liste** (`/bienfaiteur`).
- **Action liste** : Disponible en grille (carte) et en tableau (menu Actions), pour Brouillon / À venir uniquement, avec règle **verrouillée côté service** et cache **liste + détail + global-stats** invalidé après mise à jour.
