# Firestore Rules - Dashboard

> Regles recommandees pour securiser les snapshots dashboard tab-aware.

## 1. Objectif

Le dashboard agrege des donnees multi-modules.
Les documents techniques d'agregation ne doivent pas etre modifiables cote client.

## 2. Collections dashboard a proteger

- `dashboardAggregates`
- `dashboardJobLocks`

## 3. Regles recommandees

Ajouter dans `firestore.rules`:

```rules
// ==========================================
// DASHBOARD AGGREGATES (tabs-first)
// ==========================================
// Lecture admin-only.
// Ecriture interdite cote client (Cloud Functions/Admin SDK uniquement).
match /dashboardAggregates/{snapshotId} {
  allow read: if isAdmin();
  allow write: if false;
}

// ==========================================
// DASHBOARD JOB LOCKS
// ==========================================
match /dashboardJobLocks/{lockId} {
  allow read: if isAdmin();
  allow write: if false;
}
```

## 4. Regles source reutilisees

Le dashboard lit deja ces collections metier:

- `admins`
- `agentsRecouvrement`
- `groups`
- `users`
- `membership-requests`
- `caisseSpecialeDemands`
- `caisseImprevueDemands`
- `creditDemands`
- `placementDemands`

## 5. Point d'attention

Le fichier `firestore.rules` actuel autorise une lecture large de `users`.
Pour un dashboard strictement admin, durcir la politique de lecture `users` est recommande.

## 6. Validation post-deploiement

1. admin lit `dashboardAggregates` -> OK
2. non-admin lit `dashboardAggregates` -> DENY
3. client tente ecriture `dashboardAggregates` -> DENY
4. function ecrit `dashboardAggregates` -> OK

