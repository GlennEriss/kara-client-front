# Tests E2E - Approbation d'une Demande d'Adhésion

> Cas de tests E2E complets pour l'approbation avec Playwright

---

## 📋 Vue d'ensemble

**Fichier de test** : `e2e/membership-requests-v2/approve-request.spec.ts`

**Prérequis** :
- Firebase Functions déployées (ou émulateurs)
- Base de données de test configurée
- Admin authentifié

**⚠️ IMPORTANT** : Les tests E2E utilisent les **Cloud Functions** réelles ou les émulateurs Firebase.

---

## 🎭 Scénarios de Test

### 1. Approbation Basique (P0)

#### P0-APPROV-01: Approuver une demande payée avec tous les champs requis

**Description** : Approbation réussie d'une demande payée avec type de membre et PDF.

**Étapes** :
1. Se connecter en tant qu'admin
2. Aller sur la page des demandes d'adhésion
3. Trouver une demande avec statut `pending` et `isPaid: true`
4. Cliquer sur le bouton "Approuver"
5. Vérifier que le modal s'ouvre
6. Sélectionner le type de membre (ex: "Adhérent")
7. Uploader un PDF d'adhésion
8. Cliquer sur "Approuver"
9. Vérifier le toast de succès avec matricule et email
10. Vérifier que le PDF des identifiants est téléchargé automatiquement
11. Vérifier que le statut passe à `approved`
12. Vérifier que le badge de paiement reste "Payé"
13. Vérifier que la demande n'apparaît plus dans les "En attente"

**Data-TestID utilisés** :
- `membership-request-approve-button-{requestId}`
- `approval-modal`
- `approval-modal-membership-type-select`
- `approval-modal-pdf-file-input`
- `approval-modal-approve-button`
- `approval-success-toast`
- `approval-success-matricule`
- `approval-success-email`

**Assertions** :
- Modal visible
- Toast de succès visible
- Statut mis à jour à `approved`
- PDF téléchargé
- User créé dans Firebase Auth
- Document créé dans Firestore `users`
- Subscription créée
- Document PDF archivé dans `documents`

---

#### P0-APPROV-02: Validation - Type de membre requis

**Description** : Le bouton "Approuver" doit être désactivé si le type de membre n'est pas sélectionné.

**Étapes** :
1. Ouvrir le modal d'approbation
2. Ne pas sélectionner le type de membre
3. Uploader un PDF
4. Vérifier que le bouton "Approuver" est désactivé
5. Sélectionner le type de membre
6. Vérifier que le bouton "Approuver" est activé

**Data-TestID utilisés** :
- `approval-modal-membership-type-select`
- `approval-modal-approve-button`
- `approval-modal-membership-type-error`

**Assertions** :
- Bouton désactivé si type manquant
- Message d'erreur affiché si tentative de soumission sans type

---

#### P0-APPROV-03: Validation - PDF d'adhésion requis

**Description** : Le bouton "Approuver" doit être désactivé si le PDF n'est pas uploadé.

**Étapes** :
1. Ouvrir le modal d'approbation
2. Sélectionner le type de membre
3. Ne pas uploader de PDF
4. Vérifier que le bouton "Approuver" est désactivé
5. Uploader un PDF
6. Vérifier que le bouton "Approuver" est activé

**Data-TestID utilisés** :
- `approval-modal-pdf-file-input`
- `approval-modal-approve-button`
- `approval-modal-pdf-error`

**Assertions** :
- Bouton désactivé si PDF manquant
- Message d'erreur affiché si tentative de soumission sans PDF

---

### 2. Gestion Entreprise/Profession (P0)

#### P0-APPROV-04: Créer une entreprise si elle n'existe pas

**Description** : Si l'entreprise n'existe pas, l'admin peut la créer.

**Étapes** :
1. Ouvrir le modal d'approbation pour une demande avec `isEmployed: true` et `companyName`
2. Vérifier que l'entreprise est affichée avec badge "N'existe pas"
3. Cliquer sur "Créer l'entreprise"
4. Vérifier que le modal de création s'ouvre
5. Confirmer la création
6. Vérifier que le badge passe à "Existe"
7. Vérifier que l'entreprise est créée dans Firestore

**Data-TestID utilisés** :
- `approval-modal-company-section`
- `approval-modal-company-exists-badge`
- `approval-modal-create-company-button`
- `create-company-modal`
- `create-company-confirm-button`

**Assertions** :
- Entreprise créée dans Firestore `companies`
- Badge mis à jour
- `companyId` récupéré et utilisé lors de l'approbation

---

#### P0-APPROV-05: Créer une profession si elle n'existe pas

**Description** : Si la profession n'existe pas, l'admin peut la créer.

**Étapes** :
1. Ouvrir le modal d'approbation pour une demande avec `isEmployed: true` et `profession`
2. Vérifier que la profession est affichée avec badge "N'existe pas"
3. Cliquer sur "Créer la profession"
4. Vérifier que le modal de création s'ouvre
5. Confirmer la création
6. Vérifier que le badge passe à "Existe"
7. Vérifier que la profession est créée dans Firestore

**Data-TestID utilisés** :
- `approval-modal-profession-section`
- `approval-modal-profession-exists-badge`
- `approval-modal-create-profession-button`
- `create-profession-modal`
- `create-profession-confirm-button`

**Assertions** :
- Profession créée dans Firestore `professions`
- Badge mis à jour
- `professionId` récupéré et utilisé lors de l'approbation

---

#### P0-APPROV-06: Membre au chômage (pas d'entreprise/profession)

**Description** : Si `isEmployed: false`, aucune vérification d'entreprise/profession.

**Étapes** :
1. Ouvrir le modal d'approbation pour une demande avec `isEmployed: false`
2. Vérifier que les sections entreprise/profession ne sont pas affichées
3. Compléter l'approbation normalement
4. Vérifier que l'approbation réussit sans `companyId`/`professionId`

**Data-TestID utilisés** :
- `approval-modal-company-section` (ne doit pas être visible)
- `approval-modal-profession-section` (ne doit pas être visible)

**Assertions** :
- Sections entreprise/profession absentes
- Approbation réussie sans ces champs

---

### 3. Gestion du PDF (P0)

#### P0-APPROV-07: Upload et suppression du PDF

**Description** : Uploader un PDF, vérifier l'aperçu, puis le supprimer.

**Étapes** :
1. Ouvrir le modal d'approbation
2. Uploader un PDF
3. Vérifier que le nom du fichier s'affiche
4. Vérifier que la taille s'affiche
5. Cliquer sur "Supprimer"
6. Vérifier que le PDF est retiré
7. Vérifier que le bouton "Approuver" redevient désactivé

**Data-TestID utilisés** :
- `approval-modal-pdf-file-input`
- `approval-modal-pdf-file-name`
- `approval-modal-pdf-file-size`
- `approval-modal-pdf-remove-button`

**Assertions** :
- Nom et taille du fichier affichés
- Suppression fonctionnelle
- Bouton réactivé/désactivé selon l'état

---

#### P0-APPROV-08: Validation du format PDF

**Description** : Seuls les fichiers PDF doivent être acceptés.

**Étapes** :
1. Ouvrir le modal d'approbation
2. Tenter d'uploader un fichier non-PDF (ex: .jpg, .docx)
3. Vérifier que le fichier est rejeté
4. Vérifier le message d'erreur "Format PDF uniquement"
5. Uploader un PDF valide
6. Vérifier que le PDF est accepté

**Data-TestID utilisés** :
- `approval-modal-pdf-file-input`
- `approval-modal-pdf-error`

**Assertions** :
- Fichiers non-PDF rejetés
- Message d'erreur affiché
- PDF valide accepté

---

#### P0-APPROV-09: Validation de la taille (max 10 MB)

**Description** : Les PDFs > 10 MB doivent être rejetés.

**Étapes** :
1. Ouvrir le modal d'approbation
2. Tenter d'uploader un PDF > 10 MB
3. Vérifier que le fichier est rejeté
4. Vérifier le message d'erreur "Taille maximale: 10 MB"
5. Uploader un PDF < 10 MB
6. Vérifier que le PDF est accepté

**Data-TestID utilisés** :
- `approval-modal-pdf-file-input`
- `approval-modal-pdf-error`

**Assertions** :
- PDFs > 10 MB rejetés
- Message d'erreur affiché
- PDFs < 10 MB acceptés

---

### 4. États et Erreurs (P0)

#### P0-APPROV-10: État de chargement pendant l'approbation

**Description** : Pendant l'approbation, afficher un spinner et désactiver les boutons.

**Étapes** :
1. Ouvrir le modal d'approbation
2. Remplir tous les champs requis
3. Cliquer sur "Approuver"
4. Vérifier que le spinner apparaît
5. Vérifier que les boutons sont désactivés
6. Vérifier le message "Approbation en cours..."
7. Attendre la fin de l'approbation
8. Vérifier que le modal se ferme

**Data-TestID utilisés** :
- `approval-modal-approve-button`
- `approval-modal-loading-spinner`
- `approval-modal-loading-message`
- `approval-modal-cancel-button` (désactivé)

**Assertions** :
- Spinner visible
- Boutons désactivés
- Message de chargement affiché

---

#### P0-APPROV-11: Erreur API - Demande non payée

**Description** : Si la demande n'est pas payée, l'approbation doit échouer.

**Étapes** :
1. Ouvrir le modal d'approbation pour une demande avec `isPaid: false`
2. Remplir tous les champs
3. Cliquer sur "Approuver"
4. Vérifier le message d'erreur "La demande doit être payée"
5. Vérifier que le modal reste ouvert
6. Vérifier que les champs restent modifiables

**Data-TestID utilisés** :
- `approval-modal-api-error`
- `approval-modal-retry-button`

**Assertions** :
- Message d'erreur affiché
- Modal reste ouvert
- Champs modifiables

---

#### P0-APPROV-12: Erreur API - Demande déjà approuvée

**Description** : Si la demande est déjà approuvée, l'approbation doit échouer.

**Étapes** :
1. Approuver une demande (P0-APPROV-01)
2. Essayer de réapprouver la même demande
3. Vérifier le message d'erreur "La demande est déjà approuvée"
4. Vérifier que le bouton "Approuver" est désactivé ou absent

**Data-TestID utilisés** :
- `approval-modal-api-error`

**Assertions** :
- Message d'erreur affiché
- Approbation impossible

---

### 5. Téléchargement PDF Identifiants (P0)

#### P0-APPROV-13: Téléchargement automatique du PDF des identifiants

**Description** : Après approbation réussie, le PDF des identifiants doit être téléchargé automatiquement.

**Étapes** :
1. Approuver une demande (P0-APPROV-01)
2. Attendre le téléchargement automatique
3. Vérifier que le fichier est téléchargé
4. Vérifier le nom du fichier : `Identifiants_Connexion_{matricule}_{date}.pdf`
5. Ouvrir le PDF et vérifier le contenu :
   - Logo KARA
   - Informations du membre
   - Email
   - Mot de passe
   - Instructions

**Data-TestID utilisés** :
- `approval-success-pdf-downloaded`

**Assertions** :
- PDF téléchargé automatiquement
- Nom de fichier correct
- Contenu du PDF valide

---

### 6. Rollback en Cas d'Erreur (P1)

#### P1-APPROV-14: Rollback si création User échoue

**Description** : Si la création du User échoue, toutes les opérations précédentes doivent être annulées.

**Étapes** :
1. Configurer un mock pour faire échouer la création User
2. Ouvrir le modal d'approbation
3. Remplir tous les champs
4. Cliquer sur "Approuver"
5. Vérifier que l'erreur est affichée
6. Vérifier que :
   - Aucun User n'est créé dans Firebase Auth
   - Aucun document `users` n'est créé
   - Aucune subscription n'est créée
   - Le PDF uploadé reste dans Storage (peut être nettoyé manuellement)
   - Le statut de la demande reste `pending`

**Data-TestID utilisés** :
- `approval-modal-api-error`

**Assertions** :
- Rollback complet effectué
- Aucune donnée orpheline

---

#### P1-APPROV-15: Rollback si création Subscription échoue

**Description** : Si la création de la Subscription échoue, le User créé doit être supprimé.

**Étapes** :
1. Configurer un mock pour faire échouer la création Subscription
2. Ouvrir le modal d'approbation
3. Remplir tous les champs
4. Cliquer sur "Approuver"
5. Vérifier que l'erreur est affichée
6. Vérifier que :
   - Le User créé est supprimé de Firebase Auth
   - Le document `users` est supprimé
   - Aucune subscription n'est créée
   - Le statut de la demande reste `pending`

**Data-TestID utilisés** :
- `approval-modal-api-error`

**Assertions** :
- Rollback complet effectué
- User supprimé

---

### 7. Traçabilité (P1)

#### P1-APPROV-16: Vérifier les champs de traçabilité

**Description** : Après approbation, vérifier que `approvedBy` et `approvedAt` sont enregistrés.

**Étapes** :
1. Approuver une demande (P0-APPROV-01)
2. Vérifier dans Firestore que :
   - `approvedBy` = ID de l'admin connecté
   - `approvedAt` = timestamp serveur
   - `status` = `'approved'`

**Assertions** :
- `approvedBy` présent et correct
- `approvedAt` présent et récent
- Statut mis à jour

---

### 8. Notifications (P1)

#### P1-APPROV-17: Notification d'approbation créée

**Description** : Après approbation, une notification doit être créée.

**Étapes** :
1. Approuver une demande (P0-APPROV-01)
2. Vérifier dans Firestore qu'une notification est créée :
   - `type` = `'status_update'`
   - `metadata.status` = `'approved'`
   - `metadata.requestId` = ID de la demande
   - `metadata.memberId` = matricule
   - `metadata.approvedBy` = ID de l'admin

**Assertions** :
- Notification créée
- Champs corrects
- URL de redirection correcte (`/membership-requests/{requestId}`)

---

### 9. Responsive Design (P2)

#### P2-APPROV-18: Modal responsive sur mobile

**Description** : Le modal doit être adapté aux écrans mobiles.

**Étapes** :
1. Ouvrir le modal d'approbation sur mobile (< 768px)
2. Vérifier que :
   - Le modal prend 95% de la largeur
   - Les sections sont empilées verticalement
   - Les boutons sont empilés verticalement
   - Le texte est lisible
   - Le PDF upload est accessible

**Data-TestID utilisés** :
- `approval-modal` (vérifier les classes responsive)

**Assertions** :
- Layout adapté mobile
- Tous les éléments accessibles

---

## 📊 Résumé des Tests E2E

### Par Priorité

- **P0 (Critique)** : 13 tests
- **P1 (Important)** : 4 tests
- **P2 (Nice to have)** : 1 test

**Total** : **18 tests E2E**

### Par Catégorie

- **Approbation basique** : 3 tests
- **Gestion entreprise/profession** : 3 tests
- **Gestion PDF** : 3 tests
- **États et erreurs** : 3 tests
- **Téléchargement PDF** : 1 test
- **Rollback** : 2 tests
- **Traçabilité** : 1 test
- **Notifications** : 1 test
- **Responsive** : 1 test

---

## 🧪 Structure du Fichier de Test

```typescript
import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList } from './helpers'
import { createPendingPaidRequest, deleteTestMembershipRequest, deleteTestUser } from './fixtures'

test.describe('E2E: Approuver une Demande d\'Adhésion', () => {
  const createdRequests: string[] = []
  const createdUsers: string[] = []

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)
  })

  test.afterEach(async () => {
    // Nettoyer les données de test
    await Promise.all(createdRequests.map(id => deleteTestMembershipRequest(id)))
    await Promise.all(createdUsers.map(id => deleteTestUser(id)))
    createdRequests.length = 0
    createdUsers.length = 0
  })

  // Tests P0
  test('P0-APPROV-01: Approuver une demande payée avec tous les champs requis', async ({ page }) => {
    // ... implémentation
  })

  // ... autres tests
})
```

---

## 📖 Références

- **Data-TestID** : `DATA_TESTID.md`
- **Wireframes** : `../wireframes/`
- **Helpers E2E** : `e2e/membership-requests-v2/helpers/`
- **Fixtures** : `e2e/membership-requests-v2/fixtures/`
