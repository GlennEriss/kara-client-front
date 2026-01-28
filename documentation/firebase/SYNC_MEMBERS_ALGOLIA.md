# Synchronisation Automatique Members → Algolia

## 🔄 Comment ça fonctionne

La Cloud Function `syncMembersToAlgolia` se déclenche **automatiquement** à chaque modification de la collection `users` dans Firestore.

### Trigger Firestore

```typescript
export const syncMembersToAlgolia = onDocumentWritten({
  document: 'users/{userId}',
  // ...
})
```

**Déclenchement automatique sur :**
- ✅ **Création** (`onCreate`) : Nouveau document dans `users/{userId}`
- ✅ **Mise à jour** (`onUpdate`) : Modification d'un document existant
- ✅ **Suppression** (`onDelete`) : Suppression d'un document

## ⚠️ Conditions Importantes

### 1. Seuls les Membres sont Synchronisés

La fonction **ignore automatiquement** les admins. Seuls les documents avec un rôle de **membre** sont indexés :

```typescript
const MEMBER_ROLES = ['Adherant', 'Bienfaiteur', 'Sympathisant']
```

**Comportement :**
- ✅ **Membre** (rôle: `Adherant`, `Bienfaiteur`, ou `Sympathisant`) → **Synchronisé**
- ❌ **Admin** (rôle: `Admin`, `SuperAdmin`, `Secretary`) → **Ignoré**
- ❌ **Pas de rôle** ou `roles` vide → **Ignoré**

### 2. Détection des Changements

La fonction compare les champs pertinents avant/après pour éviter les synchronisations inutiles :

```typescript
// Champs comparés :
- matricule, firstName, lastName, email, contacts
- companyName, profession, address
- membershipType, roles, isActive
- gender, hasCar
- birthDate, birthMonth, birthDay, birthDayOfYear
```

**Si aucun de ces champs n'a changé** → La fonction ignore la mise à jour (log: `⏭️ Membre {id} inchangé, ignoré`)

### 3. Cas Spéciaux

#### Document Supprimé
- Si un membre est supprimé → **Supprimé d'Algolia**

#### Membre devenu Admin
- Si un membre change de rôle vers admin → **Supprimé d'Algolia**

#### Admin devenu Membre
- Si un admin change de rôle vers membre → **Indexé dans Algolia**

## 📊 Exemples de Scénarios

### ✅ Scénario 1 : Création d'un nouveau membre
```
1. Création document users/1234 avec roles: ['Adherant']
2. Trigger syncMembersToAlgolia
3. ✅ Document indexé dans Algolia (index: members-prod)
```

### ✅ Scénario 2 : Modification d'un membre existant
```
1. Modification de firstName dans users/1234
2. Trigger syncMembersToAlgolia
3. ✅ Document mis à jour dans Algolia
```

### ⏭️ Scénario 3 : Modification sans changement pertinent
```
1. Modification de updatedAt uniquement (sans changer les champs de recherche)
2. Trigger syncMembersToAlgolia
3. ⏭️ Ignoré (log: "Membre 1234 inchangé, ignoré")
```

### ❌ Scénario 4 : Création d'un admin
```
1. Création document users/5678 avec roles: ['Admin']
2. Trigger syncMembersToAlgolia
3. ❌ Ignoré (log: "Document 5678 n'est pas un membre, ignoré")
```

### ✅ Scénario 5 : Membre devient admin
```
1. Modification users/1234 : roles: ['Adherant'] → ['Admin']
2. Trigger syncMembersToAlgolia
3. ✅ Document supprimé d'Algolia (log: "Membre 1234 supprimé d'Algolia (devenu admin)")
```

## 🔍 Vérifier que ça fonctionne

### 1. Vérifier les Logs

```bash
# Voir les logs en temps réel
firebase functions:log --only syncMembersToAlgolia --follow

# Voir les 50 derniers logs
firebase functions:log --only syncMembersToAlgolia --limit 50
```

**Messages attendus :**
- ✅ `✅ Membre {id} synchronisé vers Algolia` → Synchronisation réussie
- ⏭️ `⏭️ Membre {id} inchangé, ignoré` → Pas de changement pertinent
- ❌ `❌ Erreur lors de la synchronisation` → Problème à investiguer

### 2. Tester Manuellement

1. **Modifier un membre** dans Firestore Console :
   - Collection : `users`
   - Modifier un champ (ex: `firstName`)

2. **Vérifier les logs** immédiatement :
   ```bash
   firebase functions:log --only syncMembersToAlgolia --limit 5
   ```

3. **Vérifier dans Algolia Dashboard** :
   - Aller sur [Algolia Dashboard](https://www.algolia.com/apps)
   - Ouvrir l'index `members-prod` (ou `members-dev` selon l'environnement)
   - Rechercher le membre modifié par son ID

## 🐛 Problèmes Courants

### La fonction ne se déclenche pas

**Causes possibles :**
1. La fonction n'est pas déployée → `firebase functions:list | grep syncMembersToAlgolia`
2. Le document n'a pas les bons rôles → Vérifier que `roles` contient `Adherant`, `Bienfaiteur`, ou `Sympathisant`
3. Problème de trigger Firestore → Vérifier les permissions

**Solution :**
```bash
# Vérifier que la fonction est déployée
firebase functions:list

# Vérifier les logs pour voir si le trigger se déclenche
firebase functions:log --only syncMembersToAlgolia
```

### La fonction se déclenche mais ignore les changements

**Cause :** Les champs modifiés ne sont pas dans la liste des champs pertinents, ou la comparaison JSON détecte qu'il n'y a pas de changement réel.

**Solution :** C'est normal si vous modifiez uniquement des champs non pertinents pour la recherche (ex: `updatedAt` seul). Modifiez un champ de recherche (ex: `firstName`, `email`) pour forcer la synchronisation.

### Erreur : "Algolia n'est pas configuré"

**Cause :** Les variables d'environnement ne sont pas définies.

**Solution :** Voir `CONFIGURATION_ENV_CLOUD_FUNCTIONS.md`

## 📝 Résumé

| Action | Déclenchement | Résultat |
|--------|---------------|----------|
| Créer un membre | ✅ Oui | Indexé dans Algolia |
| Modifier un membre | ✅ Oui | Mis à jour dans Algolia |
| Supprimer un membre | ✅ Oui | Supprimé d'Algolia |
| Créer un admin | ✅ Oui | Ignoré (pas indexé) |
| Modifier un admin | ✅ Oui | Ignoré (pas indexé) |
| Membre → Admin | ✅ Oui | Supprimé d'Algolia |
| Admin → Membre | ✅ Oui | Indexé dans Algolia |
| Modification sans changement pertinent | ✅ Oui | Ignoré (pas de sync) |

## 🔗 Documentation Complète

- `CONFIGURATION_ENV_CLOUD_FUNCTIONS.md` : Configuration des variables d'environnement
- `../memberships/V2/algolia/README.md` : Documentation complète Algolia pour les membres
- `functions/README.md` : Documentation générale des Cloud Functions
