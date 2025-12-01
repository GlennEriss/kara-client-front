# Notifications d'anniversaires – Détails d'implémentation

Ce document détaille **spécifiquement** comment les notifications d'anniversaires (J-2, J, J+1) sont générées, stockées et affichées. Il complète [`ARCHITECTURE_NOTIFICATIONS.md`](./ARCHITECTURE_NOTIFICATIONS.md).

## 1. Calcul des jours jusqu'à l'anniversaire

### 1.1. Algorithme de calcul

```typescript
function calculateDaysUntilBirthday(birthDate: Date, today: Date = new Date()): number {
  // Normaliser les dates (ignorer les heures)
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const birthDateNormalized = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate())
  
  // Calculer l'anniversaire de cette année
  const currentYear = todayNormalized.getFullYear()
  let nextBirthday = new Date(currentYear, birthDateNormalized.getMonth(), birthDateNormalized.getDate())
  
  // Si l'anniversaire de cette année est déjà passé, prendre l'année prochaine
  if (nextBirthday < todayNormalized) {
    nextBirthday = new Date(currentYear + 1, birthDateNormalized.getMonth(), birthDateNormalized.getDate())
  }
  
  // Calculer la différence en jours
  const diffTime = nextBirthday.getTime() - todayNormalized.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}
```

### 1.2. Cas particuliers

- **Anniversaire aujourd'hui** : `daysUntil === 0`
- **Anniversaire demain** : `daysUntil === 1` (pas de notification pour J-1)
- **Anniversaire dans 2 jours** : `daysUntil === 2` → **Notification J-2**
- **Anniversaire hier** : `daysUntil === 364` (ou 365 si année bissextile) → Pas de notification J+1 pour ce cas
- **Anniversaire hier (si on a raté J)** : Calculé séparément dans le job (voir section 2)

## 2. Génération des notifications (Job planifié)

### 2.1. Déclenchement quotidien

- **Heure** : 8h00 (heure locale Gabon, UTC+1)
- **Fréquence** : Une fois par jour
- **Cloud Function** : `generateBirthdayNotifications` (à créer)

### 2.2. Logique de génération

```typescript
// Pseudo-code complet
export async function generateBirthdayNotifications() {
  const today = new Date()
  today.setHours(8, 0, 0, 0) // 8h00 du matin
  
  // 1. Récupérer tous les membres actifs avec birthDate
  const members = await memberRepository.getAll({ 
    isActive: true,
    hasBirthDate: true // Filtrer ceux qui ont une date de naissance
  })
  
  const notificationService = ServiceFactory.getNotificationService()
  let createdCount = 0
  let skippedCount = 0
  
  // 2. Pour chaque membre
  for (const member of members) {
    try {
      const birthDate = new Date(member.birthDate)
      if (isNaN(birthDate.getTime())) {
        console.warn(`Date de naissance invalide pour membre ${member.id}`)
        continue
      }
      
      // 3. Calculer daysUntil
      const daysUntil = calculateDaysUntilBirthday(birthDate, today)
      
      // 4. Créer les notifications selon les règles
      if (daysUntil === 2) {
        // Notification J-2
        await notificationService.createBirthdayNotification(
          member.id,
          member.firstName || '',
          member.lastName || '',
          birthDate,
          2
        )
        createdCount++
      } else if (daysUntil === 0) {
        // Notification J (aujourd'hui)
        await notificationService.createBirthdayNotification(
          member.id,
          member.firstName || '',
          member.lastName || '',
          birthDate,
          0
        )
        createdCount++
      } else if (daysUntil === 364 || daysUntil === 365) {
        // Anniversaire hier (année bissextile ou non)
        // Vérifier si une notification J a été créée hier
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        const existingNotification = await notificationRepository.getNotificationsByModule('memberships', {
          type: 'birthday_reminder',
          // Filtrer par memberId dans metadata
        })
        
        const wasNotifiedYesterday = existingNotification.some(n => 
          n.metadata?.memberId === member.id &&
          n.metadata?.daysUntil === 0 &&
          n.metadata?.notificationDate === yesterdayStr
        )
        
        if (!wasNotifiedYesterday) {
          // Créer notification J+1 (rattrapage)
          await notificationService.createBirthdayNotification(
            member.id,
            member.firstName || '',
            member.lastName || '',
            birthDate,
            -1
          )
          createdCount++
        } else {
          skippedCount++
        }
      }
    } catch (error) {
      console.error(`Erreur lors de la génération de notification pour membre ${member.id}:`, error)
    }
  }
  
  console.log(`✅ Notifications d'anniversaires générées : ${createdCount} créées, ${skippedCount} ignorées (doublons)`)
  return { created: createdCount, skipped: skippedCount }
}
```

### 2.3. Prévention des doublons

- **Vérification dans `createBirthdayNotification()`** :
  - Avant de créer, vérifier qu'une notification avec :
    - `metadata.memberId === memberId`
    - `metadata.notificationDate === todayStr` (YYYY-MM-DD)
    - `metadata.daysUntil === daysUntil`
  - N'existe pas déjà dans Firestore
- **Index Firestore** : Créer un index composite sur `module`, `type`, `metadata.memberId`, `metadata.notificationDate` pour optimiser cette vérification

## 3. Affichage dans NotificationBell

### 3.1. Format spécifique pour les anniversaires

```typescript
// Dans NotificationBell.tsx
function NotificationItem({ notification }: { notification: Notification }) {
  const isBirthday = notification.type === 'birthday_reminder'
  const daysUntil = notification.metadata?.daysUntil
  
  return (
    <div className={cn(
      'p-3 rounded-lg cursor-pointer transition-colors',
      !notification.isRead && 'bg-blue-50 border-l-4 border-blue-500',
      isBirthday && 'bg-pink-50' // Fond rose pour les anniversaires
    )}>
      <div className="flex items-start gap-3">
        {/* Icône spéciale pour anniversaires */}
        {isBirthday && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
            <Cake className="h-5 w-5 text-pink-600" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn('text-sm font-semibold', !notification.isRead && 'text-blue-900')}>
              {notification.title}
            </h4>
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
            )}
          </div>
          
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {notification.message}
          </p>
          
          {/* Badge de priorité pour anniversaires */}
          {isBirthday && daysUntil !== undefined && (
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={
                daysUntil === 0 ? 'default' : // Vert pour "Aujourd'hui"
                daysUntil === 2 ? 'secondary' : // Bleu pour "Dans 2 jours"
                'outline' // Gris pour "Hier"
              }>
                {daysUntil === 0 ? 'Aujourd\'hui' :
                 daysUntil === 2 ? 'Dans 2 jours' :
                 'Hier'}
              </Badge>
              {notification.metadata?.age && (
                <span className="text-xs text-gray-500">
                  ({notification.metadata.age} ans)
                </span>
              )}
            </div>
          )}
          
          <p className="text-xs text-gray-400">
            {format(notification.createdAt, 'dd MMM yyyy à HH:mm', { locale: fr })}
          </p>
        </div>
      </div>
      
      {/* Action : cliquer pour voir la fiche membre */}
      {isBirthday && notification.metadata?.memberId && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() => {
            // Rediriger vers la fiche membre
            router.push(`/memberships/${notification.metadata.memberId}`)
          }}
        >
          Voir la fiche membre
        </Button>
      )}
    </div>
  )
}
```

### 3.2. Tri et groupement

- **Tri par priorité** :
  1. Notifications J (aujourd'hui) en premier
  2. Notifications J-2 (dans 2 jours)
  3. Notifications J+1 (hier)
  4. Autres notifications par date (plus récentes en premier)
- **Groupement optionnel** : Grouper par date (Aujourd'hui, Hier, Cette semaine, etc.)

## 4. Intégration avec la vue Anniversaires

### 4.1. Lien entre notifications et vue

- **Vue Anniversaires** (`MemberBirthdaysList.tsx`) :
  - Affiche **tous** les anniversaires (passés, présents, futurs)
  - Triés par `daysUntil` (plus proches en premier)
- **Notifications** :
  - Alertent uniquement sur J-2, J, J+1
  - Créées automatiquement par le job quotidien

### 4.2. Indicateur dans la vue Anniversaires

- Optionnel : Afficher un badge "Notifié" à côté des membres qui ont une notification active
- Lien : Cliquer sur une notification peut rediriger vers l'onglet Anniversaires avec filtre sur le membre

## 5. Tests et validation

### 5.1. Tests unitaires

- Tester `calculateDaysUntilBirthday()` avec différents cas :
  - Anniversaire aujourd'hui
  - Anniversaire demain
  - Anniversaire dans 2 jours
  - Anniversaire hier
  - Anniversaire dans 1 an
- Tester `createBirthdayNotification()` :
  - Vérification des doublons
  - Formatage des messages selon `daysUntil`
  - Calcul de l'âge

### 5.2. Tests d'intégration

- Tester le job complet avec des données de test
- Vérifier que les notifications sont créées correctement dans Firestore
- Vérifier que `NotificationBell` affiche correctement les notifications d'anniversaires

## 6. Références

- **Architecture globale** : [`ARCHITECTURE_NOTIFICATIONS.md`](./ARCHITECTURE_NOTIFICATIONS.md)
- **Analyse fonctionnelle** : [`ANALYSE_NOTIFICATIONS.md`](./ANALYSE_NOTIFICATIONS.md)
- **Module Memberships** : [`../memberships/notifications.md`](../memberships/notifications.md)
- **Vue Anniversaires** : `src/components/memberships/MemberBirthdaysList.tsx`

