# Modifier une demande – Caisse Spéciale V2

> Documentation de la fonctionnalité **Modifier une demande** sur la page des demandes de caisse spéciale (`/caisse-speciale/demandes`).

**Documentation ciblée :** Ce sous-dossier ne duplique pas la structure complète du sous-dossier [demandes](../demandes/) (diagrammes d’activité, de séquence, workflow détaillé). La modification réutilise le même repository, la même collection Firestore et le même schéma que la création ; le présent README suffit pour implémenter la fonctionnalité. Les règles Firebase nécessaires sont déjà en place (voir section [Firebase](#8-firebase) ci-dessous).

---

## 1. Objectif

- Ajouter un **bouton « Modifier »** dans l’interface des demandes (liste et/ou détail).
- Permettre à l’administrateur de **modifier les données d’une demande** (montant, durée, date souhaitée, contact d’urgence, etc.) avant qu’elle ne soit traitée (acceptée, refusée ou convertie).

## 2. Contexte actuel

### 2.1 Pages concernées

| Page | Route | Rôle |
|------|--------|------|
| Liste des demandes | `/caisse-speciale/demandes` | Tableau / cartes, filtres, stats, actions par demande (Accepter, Refuser, Réouvrir, Voir détails, Supprimer) |
| Détail d’une demande | `/caisse-speciale/demandes/[id]` | Affichage en lecture seule + actions (Accepter, Refuser, Réouvrir, Convertir, Exporter PDF) |

### 2.2 Ce qui existe déjà

- **Repository** : `ICaisseSpecialeDemandRepository.updateDemand(id, Partial<CaisseSpecialeDemand>)` permet de mettre à jour une demande.
- **Service** : `CaisseSpecialeService` utilise `updateDemand` pour les actions Réouvrir et Convertir ; il n’expose pas encore de méthode dédiée « modifier une demande » (mise à jour des champs métier).
- **Création** : formulaire multi-étapes sur `/caisse-speciale/demandes/nouvelle` (sélection membre, infos demande, contact d’urgence) avec schéma `caisseSpecialeDemandFormSchema` et génération des champs `searchableText*`.
- **Aucun bouton « Modifier »** ni page d’édition pour l’instant.

## 3. Règles métier proposées

### 3.1 Quand peut-on modifier ?

- **Modification autorisée uniquement** pour les demandes au statut **`PENDING`** (en attente).
- Une fois la demande **APPROVED**, **REJECTED** ou **CONVERTED**, elle n’est plus modifiable (on ne change pas l’historique de décision).

### 3.2 Quels champs modifier ?

Champs modifiables (alignés sur le formulaire de création, hors identifiants fixes) :

| Champ | Modifiable | Note |
|-------|------------|------|
| `monthlyAmount` | Oui | Montant mensuel (FCFA) |
| `monthsPlanned` | Oui | Durée en mois |
| `desiredDate` | Oui | Date souhaitée de début |
| `cause` | Oui | Motif (optionnel) |
| `caisseType` | Oui | Type de caisse (STANDARD, JOURNALIERE, etc.) |
| `emergencyContact` | Oui | Contact d’urgence (nom, prénom, téléphones, lien, pièce, photo) |
| `memberId` / `groupeId` | Non | Demandeur fixé à la création |
| `contractType` | Non | Individuel / groupe fixé à la création |
| Champs de traçabilité (approvedBy, rejectedBy, etc.) | Non | Gérés par les actions Accepter / Refuser / Réouvrir / Convertir |

### 3.3 Traçabilité

- À chaque modification : mettre à jour **`updatedAt`** et **`updatedBy`** (id de l’admin connecté).
- Optionnel : conserver un historique des modifications (audit) si le métier l’exige plus tard.

### 3.4 Recherche (searchableText)

- Après modification des champs qui influencent l’affichage (nom du membre, etc.), **recalculer et mettre à jour** `searchableText`, `searchableTextFirstNameFirst`, `searchableTextMatriculeFirst` (comme à la création), pour que la recherche et les filtres restent cohérents.

## 4. Parcours utilisateur proposé

1. **Depuis la liste** (`/caisse-speciale/demandes`) : sur une ligne/carte de demande en statut **PENDING**, afficher un bouton **« Modifier »** à côté de « Voir détails », « Accepter », « Refuser ».
2. **Depuis le détail** (`/caisse-speciale/demandes/[id]`) : si la demande est **PENDING**, afficher un bouton **« Modifier »** dans la barre d’actions (à côté d’Accepter, Refuser, Exporter PDF).
3. **Clic sur « Modifier »** : redirection vers la **page d’édition** `/caisse-speciale/demandes/[id]/edit`, calquée sur la page de création `/caisse-speciale/demandes/nouvelle` (formulaire multi-étapes prérempli avec les données de la demande).
4. **Après enregistrement** : redirection vers le détail de la demande (ou la liste), toast de succès, invalidation du cache des demandes et des stats.

## 5. Proposition d’implémentation

### 5.1 Architecture domaine (référence : caisse-imprevue)

L'implémentation suit l'architecture **domains** : le code métier (service, hooks, éventuellement repository) et les composants liés aux demandes vivent sous **`src/domains/financial/caisse-speciale/demandes/`**. Les écrans (liste, détail) restent dans `src/components/caisse-speciale` et **importent les hooks du domaine**.

Structure cible (à créer ou compléter) :

```
src/domains/financial/caisse-speciale/
├── demandes/                    # Sous-domaine demandes (à créer si pas encore présent)
│   ├── services/                # Service métier
│   │   └── CaisseSpecialeDemandService.ts  (ou équivalent)
│   ├── hooks/                   # Hooks (liste, stats, mutations)
│   │   └── useCaisseSpecialeDemandMutations.ts  (ou étendre useCaisseSpecialeDemands)
│   ├── repositories/            # Optionnel : migration du repository existant
│   │   └── CaisseSpecialeDemandRepository.ts
│   └── (page edit dans app/)    # Voir section 6
├── contrats/                    # Existant
└── ...
```

- **Repository** : `updateDemand(id, data)` existe ; s’assurer qu’il met bien à jour `updatedAt` et `updatedBy` et que les règles Firestore autorisent l’`update` pour les demandes (admin uniquement).
- **Service** : ajouter une méthode du type `updateDemandDetails(demandId: string, data: Partial<…>, adminId: string)` qui :
  - vérifie que la demande existe et que `status === 'PENDING'`,
  - recalcule les champs `searchableText*` si nécessaire (via `generateAllDemandSearchableTexts()` ou équivalent),
  - appelle `repository.updateDemand(demandId, { ...data, updatedAt, updatedBy })`.

### 5.2 Frontend

| Élément | Fichier / lieu | Action |
|--------|----------------|--------|
| Service (domaine) | `src/domains/financial/caisse-speciale/demandes/services/` | Méthode `updateDemandDetails` (vérification statut, searchableText, update) |
| Hook / mutation (domaine) | `src/domains/financial/caisse-speciale/demandes/hooks/` | Mutation `updateDemand` (appel service du domaine + invalidation cache) |
| Page d’édition | `src/app/(admin)/caisse-speciale/demandes/[id]/edit/page.tsx` | Même structure que `/demandes/nouvelle` : formulaire multi-étapes prérempli (infos demande + contact d’urgence), soumission via hook du domaine |
| Bouton « Modifier » (liste) | `src/components/caisse-speciale/ListDemandes.tsx` | Afficher si PENDING, clic → `router.push(/caisse-speciale/demandes/[id]/edit)` |
| Bouton « Modifier » (détail) | `src/components/caisse-speciale/DemandDetail.tsx` | Afficher si PENDING, clic → `router.push(/caisse-speciale/demandes/[id]/edit)` |

### 5.3 Validation

- Réutiliser **`caisseSpecialeDemandFormSchema`** (ou un sous-schéma limité aux champs modifiables) pour valider les données avant envoi.
- Côté service : ne pas accepter de modification si `status !== 'PENDING'`.

## 6. Fichiers à créer ou modifier (résumé) – Architecture domaine

| Fichier | Action |
|--------|--------|
| `src/domains/financial/caisse-speciale/demandes/services/CaisseSpecialeDemandService.ts` | Créer ou compléter : méthode `updateDemandDetails(demandId, data, adminId)` (vérification statut + recalcul searchableText + appel repository `updateDemand`) |
| `src/domains/financial/caisse-speciale/demandes/hooks/useCaisseSpecialeDemandMutations.ts` (ou `useCaisseSpecialeDemands.ts`) | Ajouter mutation `updateDemand` (appel service du domaine + invalidation queries `caisseSpecialeDemands`, `caisseSpecialeDemandsStats`) |
| `src/app/(admin)/caisse-speciale/demandes/[id]/edit/page.tsx` | Page d’édition : même structure que `/demandes/nouvelle` (formulaire multi-étapes prérempli), soumission via hook du domaine, puis redirection vers détail ou liste |
| `src/components/caisse-speciale/ListDemandes.tsx` | Bouton « Modifier » (visible si PENDING) → `router.push(/caisse-speciale/demandes/[id]/edit)` |
| `src/components/caisse-speciale/DemandDetail.tsx` | Bouton « Modifier » (visible si PENDING) → `router.push(/caisse-speciale/demandes/[id]/edit)` |
| Repository | Si migré dans le domaine : `src/domains/financial/caisse-speciale/demandes/repositories/`. Sinon, le service du domaine utilise le repository existant (`src/repositories/caisse-speciale/`) via factory ou injection. |

## 7. Références

- [Demandes V2 – README](../demandes/README.md) – Structure et diagrammes (Lister, VoirDetails, CreerDemande, etc.)
- [Demandes V2 – WORKFLOW](../demandes/workflow/WORKFLOW.md) – Phases d’implémentation (Création phase 4, détails phase 3)
- [Demandes V2 – Firebase](../demandes/firebase/FIREBASE.md) – Règles et index de la collection `caisseSpecialeDemands`
- [Repository – updateDemand](../../../../src/repositories/caisse-speciale/ICaisseSpecialeDemandRepository.ts) – Signature existante
- Schéma formulaire : `src/schemas/caisse-speciale.schema.ts` – `caisseSpecialeDemandFormSchema`, `CaisseSpecialeDemandFormInput`
- Génération searchableText : même logique que création (voir service/repository création demande)

---

## 8. Firebase

**Aucune règle supplémentaire à ajouter.** La collection `caisseSpecialeDemands` a déjà dans `firestore.rules` :

- **`allow update: if isAdmin();`** — les admins peuvent mettre à jour n’importe quel champ d’une demande.

La restriction « modification uniquement pour les demandes PENDING » est gérée **côté application** (service : vérifier `status === 'PENDING'` avant d’appeler `updateDemand`). Si le métier exige un jour de bloquer la modification en règles Firestore (ex. refuser l’update si `resource.data.status != 'PENDING'`), on pourra ajouter une condition sur `resource.data.status` dans la règle `allow update`.
