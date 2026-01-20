# Notifications - Approbation d'une Demande d'Adhésion

> Documentation des notifications liées à l'approbation d'une demande d'adhésion

---

## 📋 Vue d'ensemble

**Objectif** : Notifier les admins lorsqu'une demande d'adhésion est approuvée et qu'un nouveau membre est créé.

**Acteurs** :
- **Admin KARA** : Reçoit la notification d'approbation
- **Système** : Génère la notification automatiquement après approbation réussie

---

## 🔔 Types de Notifications

### 1. Notification d'Approbation

**Type** : `status_update` (avec `status: 'approved'`)

**Note** : Pour l'instant, on utilise le type générique `status_update`. Un type spécifique `membership_approved` pourra être ajouté plus tard si nécessaire.

**Déclencheur** : Après l'approbation réussie d'une demande d'adhésion

**Destinataires** : Tous les admins

**Objectif** : Informer les admins qu'une demande a été approuvée et qu'un nouveau membre a été créé

---

## 📊 Structure de la Notification

### Format Général

```typescript
{
  id: string,  // ID généré automatiquement
  module: 'memberships',
  entityId: string,  // ID de la demande d'adhésion (requestId)
  type: 'status_update',  // Type générique pour changement de statut
  title: string,
  message: string,
  isRead: boolean,
  createdAt: Timestamp,
  metadata: {
    requestId: string,
    memberId: string,  // Matricule du nouveau membre
    memberName: string,  // Nom complet du membre
    email: string,  // Email généré
    status: 'approved',  // Statut de la demande
    approvedBy: string,  // ID de l'admin qui a approuvé
    approvedAt: Timestamp,
  }
}
```

### Exemple Concret

```typescript
{
  id: 'notif-abc123',
  module: 'memberships',
  entityId: '1634.MK.160126',
  type: 'status_update',
  title: 'Demande d\'adhésion approuvée',
  message: 'La demande de Jean Dupont a été approuvée. Matricule: 1634.MK.160126',
  isRead: false,
  createdAt: Timestamp('2024-01-20T14:30:00Z'),
  metadata: {
    requestId: '1634.MK.160126',
    memberId: '1634.MK.160126',
    memberName: 'Jean Dupont',
    email: 'jeandupont1234@kara.ga',
    status: 'approved',
    approvedBy: 'admin-001',
    approvedAt: Timestamp('2024-01-20T14:30:00Z'),
  }
}
```

---

## 🔄 Flux de Création

### 1. Déclenchement

**Moment** : Après l'approbation réussie, juste après :
- Création de l'utilisateur Firebase Auth ✅
- Création du document `users` ✅
- Création de l'abonnement ✅
- Mise à jour du statut de la demande ✅
- Archivage du document PDF ✅

**Localisation** : Dans l'API route `/api/membership/approve` ou dans le service `MembershipApprovalService`

### 2. Création de la Notification

**Service** : `NotificationService`

**Méthode** : `createApprovalNotification()`

**Paramètres** :
```typescript
{
  requestId: string,
  memberId: string,  // Matricule
  memberName: string,  // firstName + lastName
  email: string,  // Email généré
  approvedBy: string,  // ID de l'admin
}
```

### 3. Implémentation

**Fichier** : `src/services/notifications/NotificationService.ts`

```typescript
/**
 * Crée une notification pour l'approbation d'une demande d'adhésion
 */
async createApprovalNotification(
  requestId: string,
  memberId: string,
  memberName: string,
  email: string,
  approvedBy: string
): Promise<Notification> {
  return this.repository.create({
    module: 'memberships',
    entityId: requestId,
    type: 'status_update',
    title: 'Demande d\'adhésion approuvée',
    message: `La demande de ${memberName} a été approuvée. Matricule: ${memberId}`,
    isRead: false,
    metadata: {
      requestId,
      memberId,
      memberName,
      email,
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    },
  })
}
```

---

## 📱 Affichage dans l'Interface

### 1. Notification Bell

**Composant** : `src/components/layout/NotificationBell.tsx`

**Affichage** :
```
┌─────────────────────────────────────────┐
│  ✅ Demande d'adhésion approuvée        │
│                                         │
│  La demande de Jean Dupont a été        │
│  approuvée. Matricule: 1634.MK.160126  │
│                                         │
│  Il y a 5 minutes                       │
└─────────────────────────────────────────┘
```

### 2. Navigation au Clic

**Action** : Rediriger vers la page de détails de la demande d'adhésion

**URL** : `/membership-requests/{requestId}`

**Implémentation** :
```typescript
// Dans NotificationBell.tsx
if (
  notification.type === 'status_update' && 
  notification.metadata?.status === 'approved' &&
  notification.entityId
) {
  onNavigate(`/membership-requests/${notification.entityId}`)
}
```

### 3. Badge de Notification

**Affichage** : Badge rouge avec le nombre de notifications non lues

**Mise à jour** : Automatique via React Query

---

## 🎯 Cas d'Usage

### Cas 1 : Admin approuve une demande

**Flux** :
1. Admin approuve la demande via le modal
2. API crée l'utilisateur, l'abonnement, etc.
3. API crée la notification `membership_approved`
4. Tous les admins voient la notification dans leur Notification Bell
5. Clic sur la notification → Redirection vers `/membership-requests/{requestId}`

### Cas 2 : Admin consulte les notifications

**Flux** :
1. Admin ouvre le Notification Bell
2. Voit la liste des notifications non lues
3. Clic sur "Demande d'adhésion approuvée"
4. Redirection vers la page de détails de la demande
5. Notification marquée comme lue automatiquement

---

## 🔧 Intégration dans le Flux d'Approbation

### Dans l'API Route

**Fichier** : `src/app/api/membership/approve/route.ts`

```typescript
import { NotificationService } from '@/services/notifications/NotificationService'

export async function POST(req: NextRequest) {
  // ... logique d'approbation ...
  
  // Créer la notification
  const notificationService = new NotificationService()
  await notificationService.createApprovalNotification(
    requestId,
    matricule,
    `${membershipRequest.identity.firstName} ${membershipRequest.identity.lastName}`,
    generatedEmail,
    adminId
  )
  
  return NextResponse.json({
    success: true,
    matricule,
    email: generatedEmail,
    password: temporaryPassword,
    // ...
  })
}
```

### Dans le Service

**Fichier** : `src/services/memberships/MembershipApprovalService.ts`

```typescript
import { NotificationService } from '@/services/notifications/NotificationService'

export class MembershipApprovalService {
  private notificationService: NotificationService
  
  constructor() {
    this.notificationService = new NotificationService()
  }
  
  async approveRequest(params: ApprovalParams): Promise<ApprovalResult> {
    // ... logique d'approbation ...
    
    // Créer la notification
    await this.notificationService.createApprovalNotification(
      requestId,
      result.matricule,
      `${membershipRequest.identity.firstName} ${membershipRequest.identity.lastName}`,
      result.email,
      params.adminId
    )
    
    return result
  }
}
```

---

## 📊 Collection Firestore

**Collection** : `notifications`

**Structure** :
```typescript
notifications/
  {notificationId}/
    - id: string
    - module: 'memberships'
    - entityId: string  // requestId
    - type: 'status_update'
    - title: string
    - message: string
    - isRead: boolean
    - createdAt: Timestamp
    - metadata: {
        requestId: string
        memberId: string
        memberName: string
        email: string
        status: 'approved'
        approvedBy: string
        approvedAt: Timestamp
      }
```

---

## 🔒 Sécurité

### Règles Firestore

**Lecture** : Seuls les admins peuvent lire les notifications

**Écriture** : Seuls les admins peuvent créer des notifications (via l'API)

**Exemple de règle** :
```javascript
match /notifications/{notificationId} {
  allow read: if isAdmin()
  allow create: if isAdmin()
  allow update: if isAdmin() && request.auth.uid == resource.data.metadata.approvedBy
  allow delete: if isAdmin()
}
```

---

## 🎨 Personnalisation

### Message Personnalisé

**Option 1** : Message générique
```typescript
message: `La demande de ${memberName} a été approuvée. Matricule: ${memberId}`
```

**Option 2** : Message détaillé
```typescript
message: `La demande d'adhésion de ${memberName} (${memberId}) a été approuvée par ${adminName}. Email: ${email}`
```

### Badge ou Icône

**Option** : Ajouter un badge ou une icône spécifique pour les notifications d'approbation

**Exemple** :
```typescript
// Dans NotificationBell.tsx
const isApproval = notification.type === 'status_update' && 
                   notification.metadata?.status === 'approved'
{isApproval && <CheckCircle className="w-4 h-4 text-green-500" />}
```

---

## 📝 Points d'Attention

1. **Timing** : Créer la notification **après** toutes les opérations réussies
2. **Erreurs** : Ne pas faire échouer l'approbation si la notification échoue (try-catch)
3. **Destinataires** : Notifier tous les admins (pas seulement celui qui a approuvé)
4. **Métadonnées** : Inclure toutes les informations nécessaires pour la navigation et l'affichage
5. **URL** : S'assurer que l'URL de redirection est correcte (`/membership-requests/{requestId}`)

---

## 🔄 Évolutions Futures

### Notifications Push (Optionnel)

**Idée** : Envoyer des notifications push aux admins via Firebase Cloud Messaging (FCM)

**Implémentation** :
- Utiliser FCM pour envoyer des notifications push
- Notifier tous les admins connectés
- Notification apparaît même si l'application n'est pas ouverte

### Notifications Email (Optionnel)

**Idée** : Envoyer un email de résumé quotidien des approbations

**Implémentation** :
- Cloud Function planifiée (tous les jours à 18h)
- Récupérer toutes les approbations de la journée
- Envoyer un email récapitulatif aux admins

---

## 📚 Références

- **NotificationService** : `src/services/notifications/NotificationService.ts`
- **NotificationBell** : `src/components/layout/NotificationBell.tsx`
- **Types** : `src/types/types.ts` (interface Notification)
- **Documentation Corrections** : `documentation/membership-requests/corrections/notification/README.md` (référence)
