# Firebase Cloud Functions - Notifications

Ce dossier contient les Cloud Functions Firebase pour le système de notifications.

## Structure

```
functions/
├── src/
│   ├── scheduled/
│   │   ├── birthdayNotifications.ts          # Job quotidien pour les anniversaires
│   │   └── scheduledNotifications.ts    # Job horaire pour notifications programmées
│   └── index.ts               # Point d'entrée des Cloud Functions
├── lib/                      # Fichiers compilés (générés)
├── package.json
└── tsconfig.json
```

## Jobs planifiés

### 1. Notifications d'anniversaires (`dailyBirthdayNotifications`)

- **Fréquence** : Quotidien à 8h00 (heure locale Gabon, UTC+1)
- **Fichier** : `src/scheduled/birthdayNotifications.ts`
- **Fonction** : Génère automatiquement les notifications d'anniversaires :
  - **J-2** : Notification 2 jours avant l'anniversaire
  - **J** : Notification le jour de l'anniversaire
  - **J+1** : Notification 1 jour après (pour rattrapage si la notification J n'a pas été créée)

### 2. Notifications programmées (`hourlyScheduledNotifications`)

- **Fréquence** : Toutes les heures
- **Fichier** : `src/scheduled/scheduledNotifications.ts`
- **Fonction** : Traite les notifications programmées qui doivent être envoyées (marque `sentAt`)

## Installation

```bash
cd functions
npm install
```

## Développement

### Compiler le TypeScript

```bash
npm run build
```

### Compiler en mode watch

```bash
npm run build:watch
```

### Tester localement avec les émulateurs

```bash
npm run serve
```

Cela démarre les émulateurs Firebase avec les fonctions.

## Déploiement

### Déployer toutes les fonctions

```bash
npm run deploy
```

### Déployer une fonction spécifique

```bash
firebase deploy --only functions:dailyBirthdayNotifications
```

## Logs

Pour voir les logs des fonctions :

```bash
npm run logs
```

Ou pour une fonction spécifique :

```bash
firebase functions:log --only dailyBirthdayNotifications
```

## Configuration

Les fonctions sont configurées dans `firebase.json` :

```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
    }
  ]
}
```

## Notes importantes

- Les fonctions utilisent Firebase Admin SDK pour accéder à Firestore avec les privilèges admin
- Les fonctions sont exécutées dans le fuseau horaire `Africa/Libreville` (UTC+1)
- Les notifications d'anniversaires)
- Les fonctions évitent les doublons en vérifiant l'existence de notifications similaires avant de créer

