# Documentation - Use Case "Rejeter une Demande d'Adhésion"

> Documentation pour la fonctionnalité de rejet des demandes d'adhésion

---

## 📋 Vue d'ensemble

**Use Case** : UC-MEM-XXX - Rejeter une demande d'adhésion

**Acteurs** :
- **Admin KARA** : Rejette une demande d'adhésion avec un motif justificatif

**Scope** :
- Rejeter une demande d'adhésion (Admin)
- Enregistrer le motif de rejet (obligatoire, minimum 10 caractères)
- Mettre à jour le statut de la demande avec traçabilité
- Envoyer une notification au demandeur (TODO)

---

## 📚 Documentation

### Documents Détaillés
- **[FLUX_REJET.md](./FLUX_REJET.md)** : Flux complet détaillé du rejet
- **[ACTIONS_POST_REJET.md](./ACTIONS_POST_REJET.md)** : Documentation des actions disponibles après le rejet (réouverture, suppression, voir détails, dropdown)

### Diagrammes UML
- **Diagramme d'Activité** : `documentation/membership-requests/rejet/activite/Rejeter.puml`
- **Diagramme de Séquence** : `documentation/membership-requests/rejet/sequence/SEQ_Rejeter.puml`

### Code Existant
- **Composant UI** : `src/domains/memberships/components/modals/RejectModalV2.tsx`
- **Service** : `src/domains/memberships/services/MembershipServiceV2.ts` (méthode `rejectMembershipRequest`)
- **Repository** : `src/domains/memberships/repositories/MembershipRepositoryV2.ts` (méthode `updateStatus`)
- **Hook** : `src/domains/memberships/hooks/useMembershipActionsV2.ts` (mutation `rejectMutation`)

### Cloud Functions
- **Notification de rejet** : `functions/README.md` - Notification automatique au demandeur (optionnel/non prioritaire)
- **Suppression définitive** : `functions/README.md` - Suppression avec nettoyage Storage (obligatoire)

### Notifications
- **README.md** : Documentation complète de toutes les notifications pour le rejet et actions post-rejet

### Wireframes UI/UX
- **MODAL_WHATSAPP_REJET.md** : Modal WhatsApp pour envoi du motif de rejet au demandeur

### Tests
- **README.md** : Vue d'ensemble des tests (unitaires, intégration, E2E)
- **DATA_TESTID.md** : Liste complète des data-testid à ajouter dans les composants (~53 data-testid)
- **TESTS_UNITAIRES.md** : Plan détaillé des tests unitaires (~90 tests)
- **TESTS_INTEGRATION.md** : Plan détaillé des tests d'intégration (~26 tests)
- **TESTS_E2E.md** : Plan détaillé des tests E2E (~20 tests)
- **COUVERTURE.md** : Plan de couverture de code (objectif 80%+)

### Firebase
- **README.md** : Vue d'ensemble des règles et index Firebase
- **FIRESTORE_RULES.md** : Règles Firestore pour le rejet, réouverture et suppression
- **STORAGE_RULES.md** : Règles Storage (suppression via Cloud Function)
- **FIRESTORE_INDEXES.md** : Index Firestore nécessaires pour optimiser les requêtes

---

## 🔍 Analyse de l'Implémentation

### Flux Actuel

1. **UI - Bouton "Rejeter"** :
   - Visible si statut = `'pending'` ou `'under_review'`
   - Désactivé si statut = `'rejected'`
   - Clic sur "Rejeter" → Ouvre le modal `RejectModalV2`

2. **Modal de Rejet** (`RejectModalV2`) :
   - Affiche le nom du demandeur
   - Champ texte obligatoire pour le motif de rejet (textarea)
   - Validation :
     - Minimum 10 caractères
     - Maximum 500 caractères (constante `MAX_REJECTION_REASON_LENGTH`)
   - Boutons : "Annuler" / "Rejeter"
   - État de chargement pendant le traitement

3. **Appel Service** : `MembershipServiceV2.rejectMembershipRequest()`
   - Paramètres :
     - `requestId` : ID de la demande
     - `adminId` : ID de l'admin qui rejette
     - `reason` : Motif de rejet (texte libre)

4. **Validations Service** :
   - Vérifier que le motif n'est pas vide
   - Vérifier longueur minimale (10 caractères)
   - Vérifier longueur maximale (500 caractères)
   - Vérifier que la demande existe

5. **Mise à jour Firestore** :
   - Mise à jour du document `membership-requests/{requestId}` :
     - `status = 'rejected'`
     - `motifReject = reason.trim()` (motif de rejet)
     - `processedBy = adminId` (ID de l'admin qui a rejeté)
     - `processedAt = new Date()` (Date de rejet)
     - `updatedAt = serverTimestamp()` (Date de mise à jour)

6. **Notification** :
   - ✅ **Notification Firestore** : Création automatique d'une notification pour tous les admins (type: `membership_rejected`)
   - ✅ **Bouton WhatsApp** : Bouton "Envoyer WhatsApp" disponible dans les actions post-rejet pour informer manuellement le demandeur
   - ⚠️ **Optionnel / Non prioritaire** : Notification email/SMS automatique au demandeur via Cloud Function Trigger (non implémentée pour l'instant, voir `functions/onMembershipRequestRejected.md`)

7. **Invalidation Cache** :
   - Invalidation React Query :
     - `['membershipRequests']`
     - `['membershipRequest', requestId]`
     - `['notifications']`

8. **Affichage Résultat** :
   - Toast de succès : "Demande rejetée"
   - Fermeture du modal

---

## 🔄 Actions Post-Rejet

Une fois qu'une demande est rejetée, les actions suivantes sont disponibles :

1. **Réouvrir** : Remettre le dossier à l'état "en cours d'examen"
   - Modal de confirmation avec motif de réouverture (obligatoire, 10-500 caractères)
   - Enregistrement de l'admin qui réouvre et de la date de réouverture
   - Statut passe à `'under_review'`

2. **Voir détails** : Consulter toutes les informations du dossier
   - Modal avec toutes les informations (identité, adresse, documents, historique)

3. **Supprimer** : Supprimer définitivement le dossier (irréversible)
   - Modal de confirmation avec validation par matricule
   - Avertissement clair sur la suppression définitive
   - Suppression du document Firestore et optionnellement des documents Storage

4. **Dropdown actions** : Accéder aux documents
   - Fiche d'adhésion (si disponible)
   - Pièce d'identité (recto/verso)

**Documentation détaillée** : Voir [ACTIONS_POST_REJET.md](./ACTIONS_POST_REJET.md)

---

## ⚠️ Points d'Attention Identifiés

### 1. Notification au Demandeur ⚠️ OPTIONNEL
- **Statut** : Optionnel / Non prioritaire
- **Impact** : Le demandeur n'est pas informé du rejet (mais ce n'est pas prioritaire)
- **Solution** : Implémenter l'envoi de notification dans une phase ultérieure (voir `functions/onMembershipRequestRejected.md`)

### 2. Documents Uploadés
- **Conformité** : Les documents uploadés ne sont **PAS** supprimés lors du rejet (conforme aux règles métier)
- **Justification** : Conservation pour audit et historique
- **Note** : Lors de la suppression, les documents peuvent être supprimés ou conservés selon les règles métier

### 3. Validation du Motif
- **Règles** :
  - Obligatoire (non vide)
  - Minimum 10 caractères
  - Maximum 500 caractères
- **Implémentation** : Validations côté client (modal) et côté serveur (service)

### 4. Traçabilité
- **Champs obligatoires lors du rejet** :
  - `processedBy` : ID de l'admin qui a rejeté
  - `processedAt` : Date de rejet
  - `motifReject` : Motif du rejet
- **Champs obligatoires lors de la réouverture** :
  - `reopenedBy` : ID de l'admin qui a réouvert
  - `reopenedAt` : Date de réouverture
  - `reopenReason` : Motif de réouverture
- **Utilité** : Audit, rapports, conformité

### 5. Suppression Définitive
- **Validation** : Validation par matricule obligatoire (double confirmation)
- **Avertissement** : Message clair sur l'irréversibilité de l'action
- **Sécurité** : Empêche les suppressions accidentelles

---

## 📝 Structure de Documentation

```
documentation/membership-requests/rejet/
├── README.md                    # Ce fichier
├── FLUX_REJET.md               # Flux détaillé du rejet
├── ACTIONS_POST_REJET.md       # Documentation des actions post-rejet
├── activite/                    # Diagrammes d'activité
│   └── Rejeter.puml            # (mis à jour avec actions post-rejet)
├── sequence/                    # Diagrammes de séquence
│   └── SEQ_Rejeter.puml        # (existant)
├── functions/                   # Documentation Cloud Functions
│   ├── README.md                # Vue d'ensemble des Cloud Functions
│   ├── onMembershipRequestRejected.md  # Notification automatique au demandeur
│   └── deleteMembershipRequest.md      # Suppression définitive du dossier
├── notification/                # Documentation des notifications
│   └── README.md                # Toutes les notifications pour le rejet
├── wireframes/                  # Wireframes UI/UX
│   └── MODAL_WHATSAPP_REJET.md  # Modal WhatsApp pour notification de rejet
├── test/                        # Documentation des tests
│   ├── README.md                # Vue d'ensemble des tests
│   ├── DATA_TESTID.md           # Liste complète des data-testid
│   ├── TESTS_UNITAIRES.md       # Plan des tests unitaires
│   ├── TESTS_INTEGRATION.md     # Plan des tests d'intégration
│   ├── TESTS_E2E.md             # Plan des tests E2E
│   └── COUVERTURE.md            # Plan de couverture de code
└── firebase/                    # Documentation Firebase
    ├── README.md                # Vue d'ensemble Firebase
    ├── FIRESTORE_RULES.md       # Règles Firestore pour le rejet
    ├── STORAGE_RULES.md         # Règles Storage
    └── FIRESTORE_INDEXES.md     # Index Firestore nécessaires
```

---

## 🎯 Améliorations à Apporter

### 1. Notification au Demandeur
- Créer notification de type `membership_rejected`
- Envoyer notification avec le motif de rejet
- Voir [FLUX_REJET.md](./FLUX_REJET.md) pour les détails

### 2. Tests
- Tests unitaires pour `MembershipServiceV2.rejectMembershipRequest()`
- Tests unitaires pour `RejectModalV2`
- Tests d'intégration pour le flux complet
- Tests E2E avec Playwright

### 3. Documentation Tests
- Créer dossier `test/` avec :
  - `DATA_TESTID.md` : Liste des data-testid
  - `TESTS_UNITAIRES.md` : Tests unitaires
  - `TESTS_INTEGRATION.md` : Tests d'intégration
  - `TESTS_E2E.md` : Tests E2E

### 4. Firebase Rules
- Vérifier les règles Firestore pour le rejet
- S'assurer que seuls les admins peuvent rejeter
- Vérifier les permissions de lecture du champ `motifReject`

---

## 🎯 Prochaines Étapes

1. ✅ Documentation du flux détaillé (`FLUX_REJET.md`)
2. ✅ Documentation des actions post-rejet (`ACTIONS_POST_REJET.md`)
3. ✅ Documentation des Cloud Functions (`functions/README.md`)
4. ⏳ Implémenter `ReopenModalV2` (modal de réouverture)
5. ⏳ Implémenter `DeleteModalV2` (modal de suppression)
6. ⏳ Implémenter `MembershipServiceV2.reopenMembershipRequest()`
7. ⏳ Implémenter Cloud Function `deleteMembershipRequest` (obligatoire)
8. ⏳ Implémenter Cloud Function `onMembershipRequestRejected` (notification automatique - optionnel/non prioritaire)
9. ✅ Documentation des tests créée (`test/`)
10. ⏳ Vérifier/améliorer les règles Firebase
11. ⏳ Implémenter les tests unitaires (~90 tests, couverture 85%+)
12. ⏳ Implémenter les tests d'intégration (~26 tests, couverture 80%+)
13. ⏳ Implémenter les tests E2E (~20 tests, tests préprod obligatoires)

---

## 📖 Références

- **Workflow Approbation** : `documentation/membership-requests/approbation/README.md` (référence pour la structure)
- **Workflow Corrections** : `documentation/membership-requests/corrections/README.md` (référence pour la structure)
- **Code service** : `src/domains/memberships/services/MembershipServiceV2.ts` (lignes 135-174)
- **Code modal** : `src/domains/memberships/components/modals/RejectModalV2.tsx`
- **Code repository** : `src/domains/memberships/repositories/MembershipRepositoryV2.ts` (méthode `updateStatus`)
- **Constantes** : `src/constantes/membership-requests.ts` (`MAX_REJECTION_REASON_LENGTH`)
