# Notifications Automatiques - Nouvelles Demandes d'Adhésion

## 📋 Objectif

Créer une **Cloud Function Firebase** qui notifie automatiquement les administrateurs lorsqu'une nouvelle demande d'adhésion est créée via le formulaire public `/register`.

## 🎯 Problématique

Actuellement, lorsqu'un utilisateur s'inscrit via `/register` :
- ✅ La demande est créée dans Firestore (`membership-requests`)
- ❌ **Aucune notification n'est envoyée aux admins**
- ❌ Les admins doivent consulter manuellement `/membership-requests` pour voir les nouvelles demandes

**Impact** : 
- Retard dans le traitement des demandes
- Absence de suivi en temps réel
- Expérience utilisateur dégradée

## 🔍 Analyse de la Situation Actuelle

### 1. Flux Actuel de Création de Demande

**Flux client actuel :**
```
Utilisateur public (/register)
  → RegistrationFormV2.tsx
    → RegistrationService.submitRegistration()
      → RegistrationRepository.create()
        → createMembershipRequest() (membership.db.ts)
          → Firestore: membership-requests/{matricule} (création document)
```

**Ce qui manque :**
- ❌ Pas de notification automatique après création
- ❌ Les admins ne sont pas alertés en temps réel

### 2. Système de Notifications Existant

**Architecture actuelle :**
- ✅ `NotificationService` : Service de création de notifications
- ✅ `NotificationRepository` : Accès Firestore pour notifications
- ✅ Collection `notifications` : Stockage des notifications
- ✅ Dashboard admin : Affichage des notifications non lues

**Méthode existante :**
```typescript
// NotificationService.createMembershipRequestNotification()
async createMembershipRequestNotification(
  requestId: string,
  type: 'new_request' | 'status_update',
  memberName?: string,
  status?: string
): Promise<Notification>
```

### 3. Cloud Functions Existantes

**Pattern observé :**
- ✅ Cloud Functions scheduled (jobs planifiés) : `functions/src/scheduled/`
- ❌ **Pas encore de trigger Firestore** pour `membership-requests`

**Exemple de trigger Firestore nécessaire :**
```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore'

export const onMembershipRequestCreated = onDocumentCreated(
  'membership-requests/{requestId}',
  async (event) => {
    // Créer automatiquement une notification pour les admins
  }
)
```

## ✅ Solution Proposée

### Approche : Cloud Function Trigger Firestore

**Principe :**
- ✅ **Trigger Firestore** : `onDocumentCreated('membership-requests/{requestId}')`
- ✅ **Exécution automatique** : Déclenché côté serveur dès qu'un document est créé
- ✅ **Fiable et découplé** : Indépendant du client, ne peut pas être contourné
- ✅ **Cohérent** : Même pattern que pour les autres modules (si nécessaire)

### Avantages

1. **Fiabilité** : 
   - Notification garantie même si le client se déconnecte
   - Pas de dépendance à la session utilisateur
   - Gestion des erreurs centralisée

2. **Découplage** :
   - Séparation des responsabilités (client vs serveur)
   - Pas de logique métier côté client

3. **Évolutivité** :
   - Facile d'ajouter d'autres actions automatiques (emails, SMS, etc.)
   - Cohérent avec l'architecture Firebase

### Architecture Technique

```
┌─────────────────────────────────────────────────────────────┐
│ Utilisateur Public (/register)                              │
│   RegistrationFormV2.tsx                                    │
│     → createMembershipRequest()                             │
│       → Firestore: membership-requests/{matricule}          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloud Function Trigger (Firestore)                          │
│   onDocumentCreated('membership-requests/{requestId}')      │
│     → Créer automatiquement une notification                │
│       → Firestore: notifications/{notificationId}           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Admin (/membership-requests)                      │
│   → Affiche les notifications non lues                      │
│   → Badge de notification avec nombre de nouvelles demandes │
└─────────────────────────────────────────────────────────────┘
```

## 📐 Spécifications Techniques

### 1. Cloud Function Trigger

**Fichier** : `functions/src/triggers/onMembershipRequestCreated.ts`

**Fonctionnalités** :
1. Détecter la création d'un document `membership-requests/{requestId}`
2. Extraire les données de la demande (nom, prénom, matricule)
3. Créer une notification pour tous les admins
4. Gérer les erreurs (logging, retry si nécessaire)

**Structure** :
```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'

export const onMembershipRequestCreated = onDocumentCreated(
  {
    document: 'membership-requests/{requestId}',
    region: 'europe-west1', // ou 'us-central1'
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const requestId = event.params.requestId
    const requestData = event.data?.data()

    if (!requestData) {
      console.error('Données de demande manquantes:', requestId)
      return
    }

    // Créer notification pour les admins
    // ...
  }
)
```

### 2. Contenu de la Notification

**Type** : `new_request`
**Module** : `memberships`
**Titre** : "Nouvelle demande d'adhésion"
**Message** : "Une nouvelle demande d'adhésion a été soumise par {Prénom} {Nom}. Matricule: {matricule}."

**Métadonnées** :
```typescript
{
  requestId: string,
  matricule: string,
  memberName: string, // "Prénom Nom"
  memberFirstName?: string,
  memberLastName?: string,
  status: 'pending',
  createdAt: Date,
}
```

### 3. Gestion des Erreurs

**Stratégie** :
- ❌ **Ne pas bloquer** : Les erreurs de notification ne doivent pas empêcher la création de la demande
- ✅ **Logger** : Toutes les erreurs doivent être loggées pour debugging
- ✅ **Monitoring** : Surveiller les logs Cloud Functions pour détecter les problèmes

**Exemple** :
```typescript
try {
  // Créer notification
} catch (error) {
  console.error(`Erreur lors de la création de la notification pour ${requestId}:`, error)
  // Ne pas re-lancer l'erreur pour ne pas bloquer le trigger
}
```

## 🔄 Workflow Complet

### Flux Détaillé

1. **Utilisateur soumet le formulaire** (`/register`)
   - `RegistrationFormV2.onSubmit()` est appelé
   - Les données sont validées (Zod schemas)

2. **Création de la demande** (`createMembershipRequest()`)
   - Document créé dans Firestore : `membership-requests/{matricule}`
   - Statut initial : `status: 'pending'`
   - Timestamps : `createdAt`, `updatedAt`

3. **Trigger Cloud Function** (`onMembershipRequestCreated`)
   - Firebase détecte automatiquement la création
   - Cloud Function s'exécute (asynchrone, côté serveur)

4. **Création de la notification**
   - Notification créée dans `notifications/{notificationId}`
   - Type : `new_request`
   - Module : `memberships`
   - Visible par tous les admins

5. **Affichage dans le Dashboard Admin**
   - Badge de notification mis à jour automatiquement
   - Liste des notifications non lues inclut la nouvelle demande
   - Admin peut cliquer pour aller directement à `/membership-requests`

## 📊 Données de la Notification

### Structure Complète

```typescript
{
  id: string, // Auto-généré par Firestore
  module: 'memberships',
  entityId: string, // ID de la demande (matricule)
  type: 'new_request',
  title: 'Nouvelle demande d\'adhésion',
  message: 'Une nouvelle demande d\'adhésion a été soumise par Jean Dupont. Matricule: 1234.MK.150125',
  isRead: false, // Par défaut non lue
  metadata: {
    requestId: string,
    matricule: string,
    memberName: string, // "Jean Dupont"
    memberFirstName: string, // "Jean"
    memberLastName: string, // "Dupont"
    status: 'pending',
    createdAt: Date,
  },
  createdAt: Date, // Timestamp de création de la notification
  scheduledAt: null, // Pas de notification programmée
  sentAt: null, // Pas de notification externe (SMS/Email) pour l'instant
}
```

## 🔍 Comparaison avec Autres Modules

### Pattern Existant (Caisse Spéciale, Caisse Imprévue, Placement)

**Approche actuelle** : Notification créée côté client depuis le service
```typescript
// Exemple : CaisseSpecialeService.createDemand()
const demand = await this.caisseSpecialeDemandRepository.createDemand(demandData)

// Notification créée depuis le service client
await this.notificationService.createNotification({
  module: 'caisse_speciale',
  entityId: demand.id,
  type: 'new_request',
  title: 'Nouvelle demande de contrat Caisse Spéciale',
  message: `Une nouvelle demande a été créée par ${adminId} pour ${memberName}`,
  // ...
})
```

**Problème avec cette approche** :
- ❌ Dépend du client (peut échouer si problème réseau)
- ❌ Logique métier côté client
- ❌ Peut être contourné ou oublié

**Avantage de Cloud Function** :
- ✅ Déclenché côté serveur, garanti d'exécution
- ✅ Découplé du client
- ✅ Gestion d'erreurs centralisée

## ✅ Plan d'Implémentation

### Phase 1 : Analyse et Documentation (Actuelle)
- [x] Documenter le use case dans `USE_CASES_COMPLETS.puml`
- [x] Créer cette documentation d'analyse
- [ ] Vérifier la cohérence avec l'architecture existante

### Phase 2 : Implémentation Cloud Function
- [ ] Créer `functions/src/triggers/onMembershipRequestCreated.ts`
- [ ] Implémenter la logique de création de notification
- [ ] Ajouter la gestion d'erreurs et logging
- [ ] Tester localement avec l'émulateur Firebase

### Phase 3 : Tests et Validation
- [ ] Tests unitaires pour la Cloud Function
- [ ] Tests d'intégration avec Firestore
- [ ] Vérifier que la notification apparaît dans le dashboard admin
- [ ] Tester le workflow complet : `/register` → notification → dashboard

### Phase 4 : Déploiement
- [ ] Déployer la Cloud Function en dev
- [ ] Tester en dev avec une vraie demande
- [ ] Déployer en préprod
- [ ] Validation finale en préprod
- [ ] Déployer en prod

## 📚 Références

- **Architecture globale** : `documentation/architecture/ARCHITECTURE.md`
- **Architecture notifications** : `documentation/notifications/ARCHITECTURE_NOTIFICATIONS.md`
- **Use case UML** : `documentation/uml/use-cases/USE_CASES_COMPLETS.puml`
- **Module memberships** : `documentation/memberships/ANALYSE_MEMBERSHIPS.md`
- **Cloud Functions Firebase** : [Documentation Firebase](https://firebase.google.com/docs/functions/firestore-events)

## 🎯 Critères de Succès

- ✅ Notification créée automatiquement à chaque nouvelle demande
- ✅ Notification visible dans le dashboard admin
- ✅ Badge de notification mis à jour en temps réel
- ✅ Lien direct vers la demande depuis la notification
- ✅ Gestion d'erreurs robuste (logging, monitoring)
- ✅ Performance : Cloud Function s'exécute en < 2 secondes
