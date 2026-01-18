# Compatibilité UML - Notifications Corrections

## ✅ Format Respecté

Le format des notifications identifiées **respecte parfaitement** la classe `Notification` définie dans le diagramme de classes (`documentation/uml/classes/CLASSES_SHARED.puml`).

### Structure de la Classe `Notification` (UML)

```plantuml
class Notification {
  + id: string
  + module: NotificationModule
  + entityId: string
  + type: NotificationType
  + title: string
  + message: string
  + isRead: boolean
  + createdAt: Date
  + scheduledAt?: Date
  + sentAt?: Date
  + metadata?: Record<string, any>
  + requestId?: string
  + memberId?: string
  + contractId?: string
}
```

### Correspondance avec les Notifications Identifiées

| Champ UML | Valeur pour les Notifications Corrections | Exemple |
|-----------|-------------------------------------------|---------|
| `id` | Auto-généré par Firestore | `"abc123"` |
| `module` | `'memberships'` (NotificationModule.memberships) | `'memberships'` |
| `entityId` | `requestId` (ID de la demande) | `"req_001"` |
| `type` | Types identifiés (voir ci-dessous) | `'corrections_requested'` |
| `title` | Titre spécifique selon le type | `"Corrections demandées"` |
| `message` | Message descriptif | `"{adminName} a demandé des corrections..."` |
| `isRead` | `false` (par défaut) | `false` |
| `createdAt` | `Date.now()` | `Timestamp` |
| `scheduledAt` | Pour NOTIF-CORR-003 et 004 | `Date` (optionnel) |
| `sentAt` | Optionnel | `Date` (optionnel) |
| `metadata` | Données spécifiques (memberName, adminName, etc.) | `{ requestId, memberName, ... }` |
| `requestId` | `requestId` (pour compatibilité) | `"req_001"` |

---

## 📝 Types à Ajouter

### Dans le Diagramme UML (`CLASSES_SHARED.puml`)

L'enum `NotificationType` doit être mis à jour pour inclure :

```plantuml
enum NotificationType {
  birthday_reminder
  new_request
  status_update
  reminder
  contract_expiring
  payment_due
  contract_created
  contract_finished
  contract_canceled
  commission_due_reminder
  commission_overdue
  placement_activated
  corrections_requested        // ⭐ AJOUTÉ - NOTIF-CORR-001
  corrections_submitted        // ⭐ AJOUTÉ - NOTIF-CORR-002
  security_code_expired        // ⭐ AJOUTÉ - NOTIF-CORR-003
  security_code_expiring_soon  // ⭐ AJOUTÉ - NOTIF-CORR-004
  security_code_renewed        // ⭐ AJOUTÉ - NOTIF-CORR-005
  ...
}
```

✅ **Statut** : Ajouté dans `CLASSES_SHARED.puml` (lignes 200-204)

### Dans le Code TypeScript (`src/types/types.ts`)

Le type `NotificationType` doit être mis à jour pour inclure :

```typescript
export type NotificationType =
  | 'birthday_reminder'
  | 'new_request'
  | 'status_update'
  | 'reminder'
  // ... autres types existants ...
  | 'corrections_requested'        // ⭐ À AJOUTER - NOTIF-CORR-001
  | 'corrections_submitted'        // ⭐ À AJOUTER - NOTIF-CORR-002
  | 'security_code_expired'        // ⭐ À AJOUTER - NOTIF-CORR-003
  | 'security_code_expiring_soon'  // ⭐ À AJOUTER - NOTIF-CORR-004
  | 'security_code_renewed'        // ⭐ À AJOUTER - NOTIF-CORR-005
```

⚠️ **Statut** : **À AJOUTER** dans `src/types/types.ts` lors de l'implémentation

---

## 📋 Exemples de Notifications Complètes

### NOTIF-CORR-001 : Corrections Demandées

```typescript
{
  id: "notif_abc123",                           // Auto-généré
  module: 'memberships',                        // NotificationModule.memberships
  entityId: "req_001",                          // requestId
  type: 'corrections_requested',                // NotificationType
  title: "Corrections demandées",
  message: "Jean Dupont a demandé des corrections pour la demande de Marie Martin",
  isRead: false,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  metadata: {
    requestId: "req_001",
    memberName: "Marie Martin",
    adminName: "Jean Dupont",
    adminId: "admin_001",
    securityCode: "123456",
    expiryDate: "2024-01-17T10:00:00Z",
    correctionsCount: 3
  },
  requestId: "req_001"                          // Pour compatibilité
}
```

### NOTIF-CORR-002 : Corrections Soumises

```typescript
{
  id: "notif_def456",
  module: 'memberships',
  entityId: "req_001",
  type: 'corrections_submitted',
  title: "Corrections soumises",
  message: "Marie Martin a soumis ses corrections pour la demande #req_001",
  isRead: false,
  createdAt: new Date('2024-01-16T14:30:00Z'),
  metadata: {
    requestId: "req_001",
    memberName: "Marie Martin",
    submittedAt: "2024-01-16T14:30:00Z",
    wasExpired: false,
    previousAdminId: "admin_001"
  },
  requestId: "req_001"
}
```

### NOTIF-CORR-003 : Code Expiré (Scheduled)

```typescript
{
  id: "notif_ghi789",
  module: 'memberships',
  entityId: "req_001",
  type: 'security_code_expired',
  title: "Code de sécurité expiré",
  message: "Le code de sécurité pour les corrections de Marie Martin (demande #req_001) a expiré",
  isRead: false,
  createdAt: new Date('2024-01-17T10:05:00Z'),  // Généré par Cloud Function
  scheduledAt: new Date('2024-01-17T10:00:00Z'), // Programmé pour 10:00
  sentAt: new Date('2024-01-17T10:05:00Z'),     // Envoyé à 10:05
  metadata: {
    requestId: "req_001",
    memberName: "Marie Martin",
    expiredAt: "2024-01-17T10:00:00Z",
    adminId: "admin_001",
    daysSinceRequest: 2
  },
  requestId: "req_001"
}
```

---

## ✅ Checklist de Conformité

### Diagramme UML
- [x] Classe `Notification` existe dans `CLASSES_SHARED.puml`
- [x] Enum `NotificationModule` contient `memberships`
- [x] Enum `NotificationType` mis à jour avec les 5 nouveaux types
- [x] Structure des notifications respecte la classe `Notification`

### Code TypeScript
- [ ] Type `NotificationType` dans `src/types/types.ts` à mettre à jour (5 types à ajouter)
- [ ] Interface `Notification` dans `src/types/types.ts` déjà conforme
- [ ] `NotificationService.createCorrectionNotification()` à implémenter

### Format des Données
- [x] Tous les champs obligatoires présents (`module`, `entityId`, `type`, `title`, `message`, `isRead`, `createdAt`)
- [x] Champs optionnels utilisés correctement (`scheduledAt`, `sentAt`, `metadata`)
- [x] Métadonnées stockées dans `metadata` (pas de champs personnalisés hors structure)

---

## 📚 Références

- **Diagramme de Classes** : `documentation/uml/classes/CLASSES_SHARED.puml`
- **Types TypeScript** : `src/types/types.ts`
- **Documentation Notifications** : `documentation/notifications/ANALYSE_NOTIFICATIONS.md`
- **Documentation Corrections** : `../README.md`

---

**Conclusion** : Le format identifié est **100% compatible** avec le diagramme de classes UML. Il suffit d'ajouter les 5 nouveaux types à l'enum `NotificationType` dans le code TypeScript lors de l'implémentation.
