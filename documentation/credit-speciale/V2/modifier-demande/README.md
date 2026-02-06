# Modifier une demande – Crédit Spéciale V2

> Documentation de la fonctionnalité **Modifier une demande** sur la page des demandes de crédit spéciale (`/credit-speciale/demandes`).

**Documentation ciblée :** Ce sous-dossier décrit comment la demande est créée depuis le modal « Nouvelle Demande », puis propose un **modal de modification** en réutilisant la même UX (modal) et l’architecture **domains**.

---

## 1. Objectif

- Ajouter un **bouton « Modifier »** dans l’interface des demandes (liste et/ou détail).
- Permettre à l’administrateur de **modifier les données d’une demande** (montant, mensualité, date souhaitée, cause, garant, etc.) **avant** qu’elle ne soit traitée (acceptée, refusée ou convertie en contrat), via un **modal** cohérent avec le modal de création « Nouvelle Demande ».

---

## 2. Contexte actuel : création depuis le modal « Nouvelle Demande »

### 2.1 Où s’ouvre le modal

| Élément | Détail |
|--------|--------|
| Page | `/credit-speciale/demandes` (`src/app/(admin)/credit-speciale/demandes/page.tsx`) |
| Composant liste | `ListDemandes` (`src/components/credit-speciale/ListDemandes.tsx`) |
| Bouton | **« Nouvelle Demande »** (icône Plus), dans la barre d’actions au-dessus du tableau/grille |
| État | `isCreateModalOpen` → clic ouvre `CreateCreditDemandModal` |

```tsx
// ListDemandes.tsx (extrait)
<Button onClick={() => setIsCreateModalOpen(true)}>
  <Plus className="w-4 h-4 mr-2" />
  Nouvelle Demande
</Button>
// ...
<CreateCreditDemandModal
  isOpen={isCreateModalOpen}
  onClose={() => setIsCreateModalOpen(false)}
/>
```

### 2.2 Modal de création : CreateCreditDemandModal

| Aspect | Détail |
|--------|--------|
| Fichier | `src/components/credit-speciale/CreateCreditDemandModal.tsx` |
| Composant UI | `Dialog` (shadcn) avec `DialogContent` `max-w-4xl max-h-[90vh] overflow-y-auto` |
| Formulaire | `react-hook-form` + `zodResolver(creditDemandFormSchema)` |
| Schéma | `creditDemandFormSchema`, `CreditDemandFormInput` dans `src/schemas/credit-speciale.schema.ts` |
| Données membres | `useAllMembers` pour la recherche client / garant |
| Soumission | `useCreditDemandMutations().create` → `CreditSpecialeService.createDemand` avec `createdBy: user.uid` |

**Sections du formulaire (création) :**

1. **Type de crédit** : `creditType` (SPECIALE, FIXE, AIDE)
2. **Client** : recherche membre → `clientId`, `clientFirstName`, `clientLastName`, `clientContacts`
3. **Informations du crédit** : `amount`, `monthlyPaymentAmount`, `desiredDate`, `cause`
4. **Garant** : recherche membre → `guarantorId`, `guarantorFirstName`, `guarantorLastName`, `guarantorRelation`, `guarantorIsMember`

Après succès : `form.reset()`, fermeture du modal, invalidation des queries `creditDemands` et `creditDemandsStats` (dans le hook).

### 2.3 Backend existant (demandes)

- **Repository** : `ICreditDemandRepository` (`src/repositories/credit-speciale/`) expose déjà **`updateDemand(id, data)`** avec `Partial<Omit<CreditDemand, 'id' | 'createdAt'>>` et mise à jour de `updatedAt`.
- **Service** : `CreditSpecialeService` expose `createDemand` et **`updateDemandStatus`** mais **pas** de méthode dédiée « modifier les champs métier » d’une demande (équivalent de `updateDemandDetails` en caisse spéciale).
- **Hook** : `useCreditDemandMutations()` dans `src/hooks/useCreditSpeciale.ts` expose `create` et `updateStatus`, pas de mutation `updateDemand` pour la modification des champs.

---

## 3. Règles métier proposées pour la modification

### 3.1 Quand peut-on modifier ?

- **Modification autorisée uniquement** pour les demandes au statut **`PENDING`** (en attente).
- Une fois la demande **APPROVED** ou **REJECTED** (ou convertie en contrat), elle n’est plus modifiable.

### 3.2 Champs modifiables

Champs alignés sur le formulaire de création, **hors identifiants fixés à la création** :

| Champ | Modifiable | Note |
|-------|------------|------|
| `creditType` | Oui | SPECIALE, FIXE, AIDE |
| `amount` | Oui | Montant (FCFA) |
| `monthlyPaymentAmount` | Oui | Mensualité souhaitée (FCFA) |
| `desiredDate` | Oui | Date souhaitée |
| `cause` | Oui | Motif (10–500 caractères) |
| `guarantorId`, `guarantorFirstName`, `guarantorLastName`, `guarantorRelation`, `guarantorIsMember` | Oui | Garant (recherche membre comme en création) |
| `clientId`, `clientFirstName`, `clientLastName`, `clientContacts` | Non | Demandeur fixé à la création |
| Champs de décision (adminComments, score, eligibilityOverride, etc.) | Non | Gérés par les actions Accepter / Refuser |
| `createdAt`, `createdBy` | Non | Traçabilité création |

### 3.3 Traçabilité

- À chaque modification : mettre à jour **`updatedAt`** et **`updatedBy`** (id de l’admin connecté). Le repository `updateDemand` gère déjà `updatedAt` ; il faut s’assurer que `updatedBy` est envoyé dans le payload.

---

## 4. Parcours utilisateur proposé (modal de modification)

1. **Depuis la liste** (`/credit-speciale/demandes`) : sur une carte/ligne de demande en statut **PENDING**, afficher un bouton **« Modifier »** (à côté de « Voir détails », « Valider », « Refuser », etc.).
2. **Depuis le détail** (`/credit-speciale/demandes/[id]`) : si la demande est **PENDING**, afficher un bouton **« Modifier »** dans la barre d’actions.
3. **Clic sur « Modifier »** : ouvrir un **modal d’édition** (même pattern que le modal de création), prérempli avec les données de la demande, avec les mêmes sections (type de crédit, infos crédit, garant ; client en lecture seule ou masqué).
4. **Enregistrement** : soumission via mutation du domaine → mise à jour en base, fermeture du modal, toast de succès, invalidation du cache des demandes et des stats.

On reste en **modal** pour rester cohérent avec « Nouvelle Demande » et éviter de quitter la page liste/détail.

---

## 5. Architecture domains proposée

L’implémentation suit l’architecture **domains** (référence : `caisse-imprevue`, `caisse-speciale`). Le code métier (service, hooks, types) vit sous **`src/domains/financial/credit-speciale/demandes/`**. Les composants UI (liste, détail, modals) restent dans `src/components/credit-speciale` et **importent les hooks du domaine**.

### 5.1 Structure cible

```
src/domains/financial/credit-speciale/
├── demandes/                           # Sous-domaine demandes (à créer)
│   ├── entities/
│   │   └── demand.types.ts             # CreditDemand (réexport), UpdateCreditDemandInput
│   ├── services/
│   │   └── CreditDemandService.ts       # updateDemandDetails(demandId, data, adminId)
│   ├── hooks/
│   │   ├── useCreditDemandMutations.ts # create, updateStatus, updateDemand (nouvelle mutation)
│   │   └── index.ts
│   └── (optionnel) repositories/       # Si migration du repo existant plus tard
├── contrats/                           # Existant si déjà présent
└── ...
```

- **Service (domaine)** : nouveau fichier ou extension du service existant. Méthode **`updateDemandDetails(demandId, data, adminId)`** qui :
  - vérifie que la demande existe et que `status === 'PENDING'`,
  - construit le payload (champs modifiables + `updatedAt`, `updatedBy`),
  - appelle le **repository existant** `CreditDemandRepository.updateDemand(demandId, payload)` (le repository reste pour l’instant dans `src/repositories/credit-speciale/` ; le service du domaine l’utilise via factory ou injection).
- **Hook (domaine)** : mutation **`updateDemand`** qui appelle le service du domaine et invalide les queries `creditDemands`, `creditDemand`, `creditDemandsStats`.

Le **modal** peut rester dans `src/components/credit-speciale/` (ex. `EditCreditDemandModal.tsx`) et utiliser le hook du domaine pour la mutation, comme `CreateCreditDemandModal` utilise aujourd’hui `useCreditDemandMutations` depuis `src/hooks/useCreditSpeciale.ts`. À terme, on pourra faire pointer `useCreditDemandMutations` vers le domaine (ou exporter le hook depuis le domaine et l’utiliser dans le modal).

### 5.2 Fichiers à créer ou modifier (résumé)

| Fichier | Action |
|--------|--------|
| `src/domains/financial/credit-speciale/demandes/entities/demand.types.ts` | Créer : type `UpdateCreditDemandInput` (champs modifiables) |
| `src/domains/financial/credit-speciale/demandes/services/CreditDemandService.ts` | Créer : `updateDemandDetails(demandId, data, adminId)` (vérif PENDING + appel repository `updateDemand`) |
| `src/domains/financial/credit-speciale/demandes/hooks/useCreditDemandMutations.ts` | Créer (ou déplacer depuis `useCreditSpeciale`) : ajouter mutation `updateDemand` (appel service domaine + invalidation cache) |
| `src/components/credit-speciale/EditCreditDemandModal.tsx` | Créer : modal Dialog, formulaire prérempli (sections type crédit, infos crédit, garant ; client en lecture seule), soumission via hook du domaine |
| `src/components/credit-speciale/ListDemandes.tsx` | Afficher bouton « Modifier » si `demande.status === 'PENDING'`, clic ouvre `EditCreditDemandModal` avec `demand={demande}` |
| `src/components/credit-speciale/CreditDemandDetail.tsx` | Afficher bouton « Modifier » si `demand.status === 'PENDING'`, clic ouvre `EditCreditDemandModal` avec `demand={demand}` |
| Service / Repository existants | Le service du domaine peut s’appuyer sur `ServiceFactory.getCreditSpecialeService()` pour récupérer la demande et sur le repository pour `updateDemand` ; ou exposer `updateDemandDetails` dans `CreditSpecialeService` et l’appeler depuis le hook du domaine. |

### 5.3 Modal d’édition (EditCreditDemandModal) – proposition

- **Props** : `isOpen`, `onClose`, `demand: CreditDemand` (demande courante).
- **Contenu** : même structure que `CreateCreditDemandModal` (Cards : Type de crédit, Client, Informations du crédit, Garant).
  - **Client** : affichage en lecture seule (nom, prénom, matricule) sans recherche, car non modifiable.
  - **Type de crédit, montant, mensualité, date souhaitée, cause** : champs éditables, préremplis avec `demand`.
  - **Garant** : recherche membre comme en création, préremplie avec le garant actuel si présent.
- **Validation** : réutiliser **`creditDemandFormSchema`** (ou un sous-schéma limité aux champs modifiables) pour valider avant envoi.
- **Soumission** : `updateDemand.mutateAsync({ id: demand.id, data })` puis `onClose()` et toast (géré dans le hook).

Référence d’UX modal : `EditDemandModalV2` dans `src/domains/financial/caisse-imprevue/components/modals/EditDemandModalV2.tsx` (formulaire plus court) ; pour le crédit spéciale, réutiliser le layout du `CreateCreditDemandModal` pour cohérence.

---

## 6. Service : méthode updateDemandDetails

Deux options :

**Option A – Étendre le service existant**  
- Dans `CreditSpecialeService` (et `ICreditSpecialeService`) : ajouter  
  `updateDemandDetails(demandId: string, data: Partial<UpdateCreditDemandInput>, adminId: string): Promise<CreditDemand | null>`  
- Vérifier `status === 'PENDING'`, puis appeler `this.creditDemandRepository.updateDemand(demandId, { ...data, updatedBy: adminId })`.  
- Le hook (domaine ou global) appelle cette méthode.

**Option B – Service dans le domaine**  
- Créer `CreditDemandService` dans `src/domains/financial/credit-speciale/demandes/services/` qui reçoit le repository (ou la factory) et expose `updateDemandDetails`.  
- Le repository reste dans `src/repositories/credit-speciale/` ; le domaine l’utilise via factory.

Les deux options sont compatibles avec un modal dans `src/components/credit-speciale/` et des hooks soit dans le domaine soit dans `useCreditSpeciale.ts` (en appelant le service qui expose `updateDemandDetails`).

---

## 7. Validation et schéma

- Réutiliser **`creditDemandFormSchema`** (ou un schéma dérivé limité aux champs modifiables : `creditType`, `amount`, `monthlyPaymentAmount`, `desiredDate`, `cause`, garant) pour le formulaire du modal d’édition.
- Côté service : refuser toute modification si `status !== 'PENDING'`.

---

## 8. Firebase

Aucune règle supplémentaire à documenter ici : la collection des demandes de crédit est déjà protégée ; l’`update` est géré par les règles existantes. La restriction « modification uniquement pour PENDING » est gérée **côté application** (service).

---

## 9. Références

- **Création (modal)** : `src/components/credit-speciale/CreateCreditDemandModal.tsx`
- **Liste** : `src/components/credit-speciale/ListDemandes.tsx` (bouton « Nouvelle Demande », état `isCreateModalOpen`)
- **Schéma** : `src/schemas/credit-speciale.schema.ts` – `creditDemandFormSchema`, `CreditDemandFormInput`
- **Repository** : `src/repositories/credit-speciale/ICreditDemandRepository.ts` – `updateDemand(id, data)`
- **Repository impl** : `src/repositories/credit-speciale/CreditDemandRepository.ts` – `updateDemand`
- **Types** : `src/types/types.ts` – `CreditDemand`, `CreditDemandStatus`
- **Modal d’édition (référence)** : `src/domains/financial/caisse-imprevue/components/modals/EditDemandModalV2.tsx`
- **Doc caisse spéciale (modifier demande)** : `documentation/caisse-speciale/V2/modifier-demande/README.md`
