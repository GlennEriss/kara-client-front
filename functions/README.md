# Cloud Functions - Documentation Technique

> Documentation complète des Firebase Cloud Functions pour le projet KARA.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure du projet](#structure-du-projet)
3. [Fonctions Callable](#fonctions-callable)
4. [Fonctions Scheduled](#fonctions-scheduled)
5. [Installation et développement](#installation-et-développement)
6. [Déploiement](#déploiement)
7. [Monitoring et logs](#monitoring-et-logs)

---

## Vue d'ensemble

### Architecture

Les Cloud Functions Firebase de KARA sont divisées en deux catégories :

1. **Fonctions Callable** : Appelées depuis le frontend pour des opérations atomiques
2. **Fonctions Scheduled** : Exécutées automatiquement selon un planning (cron)

### Stack technique

| Composant | Version |
|-----------|---------|
| Node.js | 20 |
| Firebase Functions | 6.1.0 |
| Firebase Admin | 13.4.0 |
| TypeScript | 5.x |
| Algoliasearch | 5.46.3 |

### Configuration

- **Fuseau horaire** : `Africa/Libreville` (UTC+1)
- **Mémoire par défaut** : 512 MiB
- **Timeout par défaut** : 540 secondes (9 min)

---

## Structure du projet

```
functions/
├── src/
│   ├── index.ts                           # Point d'entrée - Export de toutes les fonctions
│   │
│   ├── membership-requests/               # Fonctions pour les demandes d'adhésion
│   │   ├── approveMembershipRequest.ts    # Approbation (transaction atomique)
│   │   ├── deleteMembershipRequest.ts     # Suppression définitive
│   │   ├── renewSecurityCode.ts           # Régénération code sécurité
│   │   ├── submitCorrections.ts           # Soumission des corrections
│   │   ├── syncToAlgolia.ts               # Synchronisation vers Algolia
│   │   └── verifySecurityCode.ts          # Vérification code sécurité
│   │
│   ├── scheduled/                         # Tâches planifiées (cron)
│   │   ├── birthdayNotifications.ts       # Notifications anniversaires
│   │   ├── scheduledNotifications.ts      # Traitement notifications programmées
│   │   ├── overdueCommissions.ts          # Commissions en retard (Placement)
│   │   ├── creditPaymentDue.ts            # Échéances crédit spéciale
│   │   ├── ciPaymentDue.ts                # Échéances caisse imprévue
│   │   ├── vehicleInsuranceExpiring.ts    # Assurances expirantes
│   │   ├── transformCreditSpeciale.ts     # Transformation crédit spéciale → fixe
│   │   ├── caisseSpecialeDemandReminders.ts  # Rappels demandes CS
│   │   └── caisseImprevueDemandReminders.ts  # Rappels demandes CI
│   │
│   └── tools/                             # Outils administratifs
│       └── renameUserMatricule.ts         # Renommer matricule utilisateur
│
├── lib/                                   # Fichiers compilés (générés, gitignored)
├── package.json
├── tsconfig.json
└── README.md                              # Ce fichier
```

---

## Fonctions Callable

### `approveMembershipRequest`

**Description** : Approuve une demande d'adhésion avec transaction atomique et rollback automatique.

**Type** : `onCall` (HTTPS Callable)

**Paramètres d'entrée** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `requestId` | string | ✅ | ID de la demande d'adhésion |
| `adminId` | string | ✅ | ID de l'admin qui approuve |
| `membershipType` | string | ✅ | Type de membre (`adherant`, `bienfaiteur`, `sympathisant`) |
| `adhesionPdfURL` | string | ✅ | URL du PDF d'adhésion signé |
| `companyId` | string | ❌ | ID de l'entreprise (optionnel) |
| `professionId` | string | ❌ | ID de la profession (optionnel) |

**Opérations effectuées** :

1. Validation de la demande (payée, statut `pending` ou `under_review`)
2. Génération email et mot de passe temporaire
3. Création utilisateur Firebase Auth
4. Création document `users` dans Firestore
5. Création abonnement (`subscriptions`)
6. Mise à jour statut demande (`approved`, `approvedBy`, `approvedAt`)
7. Archivage PDF dans collection `documents`
8. Création notification d'approbation

**Réponse** :

```typescript
{
  success: boolean
  matricule: string      // Ex: "0004.MK.040825"
  email: string          // Ex: "johnsmith0004@kara.ga"
  password: string       // Mot de passe temporaire (12 chars)
  subscriptionId: string // ID de l'abonnement créé
  companyId?: string
  professionId?: string
}
```

**Rollback automatique** : En cas d'erreur, toutes les opérations sont annulées dans l'ordre inverse.

---

### `deleteMembershipRequest`

**Description** : Supprime définitivement une demande d'adhésion rejetée.

**Type** : `onCall` (HTTPS Callable)

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `requestId` | string | ✅ | ID de la demande à supprimer |
| `adminId` | string | ✅ | ID de l'admin |

**Pré-conditions** :
- Demande existante
- Statut = `rejected`
- Admin authentifié avec permissions

---

### `verifySecurityCode`

**Description** : Vérifie la validité d'un code de sécurité pour les corrections.

**Type** : `onCall` (HTTPS Callable)

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `requestId` | string | ✅ | ID de la demande |
| `securityCode` | string | ✅ | Code à 6 chiffres |

**Réponse** :

```typescript
{
  valid: boolean
  error?: string         // Message d'erreur si invalide
  request?: {            // Données de la demande si valide
    id: string
    matricule: string
    identity: {...}
    address: {...}
    // ...
  }
}
```

---

### `submitCorrections`

**Description** : Soumet les corrections effectuées par le demandeur.

**Type** : `onCall` (HTTPS Callable)

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `requestId` | string | ✅ | ID de la demande |
| `securityCode` | string | ✅ | Code de sécurité |
| `corrections` | object | ✅ | Données corrigées |

**Opérations** :
1. Validation du code de sécurité
2. Application des corrections
3. Passage du statut à `pending`
4. Marquage du code comme utilisé
5. Nettoyage de `securityCode` et `reviewNote`
6. Création notification

---

### `renewSecurityCode`

**Description** : Régénère un nouveau code de sécurité (admin uniquement).

**Type** : `onCall` (HTTPS Callable)

**Paramètres** :

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `requestId` | string | ✅ | ID de la demande |
| `adminId` | string | ✅ | ID de l'admin |

**Réponse** :

```typescript
{
  success: boolean
  securityCode: string      // Nouveau code à 6 chiffres
  expiresAt: Timestamp      // Date d'expiration (24h)
}
```

---

### `syncToAlgolia`

**Description** : Synchronise les données d'une demande vers Algolia pour la recherche.

**Type** : Firestore Trigger (`onDocumentWritten`)

**Trigger** : `membership-requests/{requestId}`

**Opérations** :
- **Création/Mise à jour** : Indexe ou met à jour le document dans Algolia
- **Suppression** : Supprime le document de l'index Algolia

---

## Fonctions Scheduled

### Planning des jobs

| Heure | Fonction | Module | Description |
|-------|----------|--------|-------------|
| 08:00 | `dailyBirthdayNotifications` | Membres | Notifications anniversaires |
| 09:00 | `dailyOverdueCommissions` | Placement | Commissions en retard |
| 09:00 | `dailyCaisseSpecialePendingReminders` | CS | Rappels demandes en attente |
| 09:30 | `dailyCreditPaymentDue` | Crédit | Échéances de paiement |
| 10:00 | `dailyCIPaymentDue` | CI | Échéances versements |
| 10:00 | `dailyCaisseSpecialeApprovedNotConvertedReminders` | CS | Rappels non converties |
| 10:30 | `dailyVehicleInsuranceExpiring` | Véhicule | Assurances expirantes |
| 11:00 | `dailyTransformCreditSpeciale` | Crédit | Transformation après 7 mois |
| 11:00 | `dailyCaisseImprevuePendingReminders` | CI | Rappels demandes en attente |
| 11:30 | `dailyCaisseImprevueApprovedNotConvertedReminders` | CI | Rappels non converties |
| */1h | `hourlyScheduledNotifications` | Global | Traitement notifications programmées |

---

### `dailyBirthdayNotifications`

**Schedule** : `0 8 * * *` (08:00 tous les jours)

**Description** : Génère les notifications d'anniversaires pour les membres.

**Notifications créées** :
- **J-2** : 2 jours avant l'anniversaire
- **J** : Le jour de l'anniversaire
- **J+1** : 1 jour après (rattrapage)

**Logique anti-doublon** : Vérifie l'existence d'une notification similaire avant création.

---

### `hourlyScheduledNotifications`

**Schedule** : `0 * * * *` (toutes les heures)

**Description** : Traite les notifications programmées (`scheduledAt`) et les marque comme envoyées (`sentAt`).

---

### `dailyOverdueCommissions`

**Schedule** : `0 9 * * *` (09:00 tous les jours)

**Module** : Placement

**Description** : Détecte les commissions en retard et crée des notifications de type `commission_overdue`.

---

### `dailyCreditPaymentDue`

**Schedule** : `30 9 * * *` (09:30 tous les jours)

**Module** : Crédit Spéciale

**Description** : Vérifie les échéances de paiement et notifie :
- **J-3** : Rappel avant échéance
- **J** : Jour de l'échéance
- **J+n** : Retard de paiement

---

### `dailyCIPaymentDue`

**Schedule** : `0 10 * * *` (10:00 tous les jours)

**Module** : Caisse Imprévue

**Description** : Vérifie les versements dus (journaliers ou mensuels) et notifie.

---

### `dailyVehicleInsuranceExpiring`

**Schedule** : `30 10 * * *` (10:30 tous les jours)

**Module** : Véhicule

**Description** : Détecte les assurances qui expirent dans les 30 prochains jours et crée des notifications.

---

### `dailyTransformCreditSpeciale`

**Schedule** : `0 11 * * *` (11:00 tous les jours)

**Module** : Crédit Spéciale

**Description** : Transforme automatiquement les crédits spéciaux en crédit fixe après 7 mois de non-remboursement complet.

---

### `dailyCaisseSpecialePendingReminders` / `dailyCaisseSpecialeApprovedNotConvertedReminders`

**Schedule** : `0 9 * * *` / `0 10 * * *`

**Module** : Caisse Spéciale

**Description** :
- Rappelle les demandes en attente depuis plus de X jours
- Rappelle les demandes acceptées mais non converties en contrats

---

### `dailyCaisseImprevuePendingReminders` / `dailyCaisseImprevueApprovedNotConvertedReminders`

**Schedule** : `0 11 * * *` / `30 11 * * *`

**Module** : Caisse Imprévue

**Description** : Même logique que Caisse Spéciale.

---

## Installation et développement

### Prérequis

- Node.js 20+
- Firebase CLI installé (`npm install -g firebase-tools`)
- Accès au projet Firebase

### Installation

```bash
cd functions
npm install
```

### Compilation

```bash
# Compilation unique
npm run build

# Compilation en mode watch
npm run build:watch
```

### Test local avec émulateurs

```bash
# Démarrer les émulateurs avec les fonctions
npm run serve

# Ou depuis la racine du projet
firebase emulators:start --only functions
```

### Shell interactif

```bash
npm run shell
```

Dans le shell, vous pouvez appeler les fonctions :

```javascript
// Appeler une fonction callable
approveMembershipRequest({ requestId: '...', adminId: '...', ... })

// Déclencher manuellement un job scheduled
dailyBirthdayNotifications()
```

---

## Déploiement

### Déployer toutes les fonctions

```bash
npm run deploy
# ou
firebase deploy --only functions
```

### Déployer une fonction spécifique

```bash
# Une fonction
firebase deploy --only functions:approveMembershipRequest

# Plusieurs fonctions
firebase deploy --only functions:approveMembershipRequest,functions:deleteMembershipRequest

# Toutes les fonctions d'un groupe
firebase deploy --only functions:dailyBirthdayNotifications,functions:hourlyScheduledNotifications
```

### Déploiement CI/CD

Les déploiements sont automatisés via GitHub Actions (voir `.github/workflows/`).

---

## Monitoring et logs

### Voir les logs

```bash
# Tous les logs
npm run logs

# Logs d'une fonction spécifique
firebase functions:log --only approveMembershipRequest

# Logs en temps réel
firebase functions:log --follow

# Avec filtre de sévérité
firebase functions:log --only dailyBirthdayNotifications --min-severity=ERROR
```

### Console Firebase

1. Accéder à [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner le projet
3. Aller dans **Functions**
4. Voir les métriques : invocations, erreurs, latence

### Alertes

Configurez des alertes dans Google Cloud Console pour :
- Erreurs de fonction (> seuil)
- Latence élevée
- Utilisation mémoire

---

## Bonnes pratiques

### 1. Gestion des erreurs

```typescript
try {
  // Opération
} catch (error: any) {
  console.error('[functionName] Erreur:', error)
  throw new Error(`Message utilisateur: ${error.message}`)
}
```

### 2. Logging structuré

```typescript
console.log('[functionName] Démarrage', { requestId, adminId })
console.log('[functionName] Étape 1 terminée', { result })
console.error('[functionName] Erreur', { error, context })
```

### 3. Transactions atomiques

Pour les opérations multi-documents, utilisez des transactions Firestore ou un système de rollback :

```typescript
const rollbackActions: Array<() => Promise<void>> = []

try {
  // Opération 1
  rollbackActions.push(async () => { /* Annuler opération 1 */ })
  
  // Opération 2
  rollbackActions.push(async () => { /* Annuler opération 2 */ })
  
} catch (error) {
  // Rollback en ordre inverse
  for (const action of rollbackActions.reverse()) {
    await action()
  }
  throw error
}
```

### 4. Configuration mémoire/timeout

| Type de fonction | Mémoire | Timeout |
|------------------|---------|---------|
| Callable simple | 256 MiB | 60s |
| Callable complexe | 512 MiB | 120s |
| Scheduled léger | 256 MiB | 300s |
| Scheduled lourd | 512 MiB | 540s |

---

## Ressources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Cloud Scheduler Syntax](https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules)
