# Extensions Firebase — fichiers manifestes

Ce projet utilise le **manifeste d’extensions** Firebase :
- `firebase.json` → section `extensions` (instances à déployer)
- `extensions/<INSTANCE_ID>.env` → paramètres par instance (⚠️ peut contenir des secrets)

## Important (sécurité)

Les fichiers `extensions/*.env` sont **ignorés par git** (voir `.gitignore`), car ils contiennent des clés (ex: Algolia).

## Déploiement (DEV)

```bash
firebase use dev
firebase deploy --only extensions
```

