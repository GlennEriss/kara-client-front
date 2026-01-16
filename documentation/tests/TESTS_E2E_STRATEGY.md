# Stratégie des Tests E2E

## Problématique

Les tests E2E nécessitent un environnement complet avec :
- ✅ Firebase configuré (Auth, Firestore, Storage)
- ✅ Données de test dans Firestore
- ✅ Variables d'environnement complètes
- ✅ Émulateurs Firebase (pour isolation) ou Firebase Cloud (pour réalisme)

Dans GitHub Actions, cela pose plusieurs défis :
- ❌ Pas d'émulateurs Firebase par défaut
- ❌ Nécessite Docker pour isoler l'environnement
- ❌ Complexité de configuration
- ❌ Temps d'exécution long
- ❌ Coût potentiel avec Firebase Cloud

## Solution Actuelle

### ✅ Tests E2E désactivés dans CI/CD

**Pourquoi ?**
- Les tests unitaires et d'intégration couvrent déjà la majorité des cas
- Les tests E2E sont plus fragiles et nécessitent un environnement complet
- Le ROI n'est pas optimal pour chaque PR

**Où sont-ils lancés ?**
- ✅ **Localement** avant de créer une PR
- ✅ **Manuellement** sur demande dans un environnement dédié
- ✅ **Sur preprod** après déploiement (tests de smoke)

## Alternatives pour Activer les Tests E2E dans CI

### Option 1 : Docker avec Émulateurs Firebase (Recommandé pour plus tard)

**Avantages :**
- ✅ Environnement isolé et reproductible
- ✅ Pas de coût Firebase Cloud
- ✅ Tests rapides et fiables

**Inconvénients :**
- ❌ Complexité de configuration
- ❌ Maintenance du Dockerfile
- ❌ Temps de build plus long

**Exemple de workflow :**
```yaml
test-e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Setup Docker Compose
      run: docker-compose up -d
    - name: Wait for emulators
      run: sleep 30
    - name: Run E2E tests
      run: pnpm test:e2e:all
      env:
        NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true'
```

### Option 2 : Firebase Cloud avec Secrets GitHub

**Avantages :**
- ✅ Environnement réaliste
- ✅ Pas de Docker nécessaire

**Inconvénients :**
- ❌ Coût potentiel Firebase
- ❌ Nécessite toutes les variables d'environnement
- ❌ Risque de pollution des données de test
- ❌ Tests plus lents

**Configuration nécessaire :**
- Tous les secrets Firebase configurés dans GitHub
- Projet Firebase dédié pour les tests
- Nettoyage des données après chaque test

### Option 3 : Tests E2E sur Preprod uniquement

**Avantages :**
- ✅ Environnement réel
- ✅ Pas de configuration supplémentaire
- ✅ Tests après déploiement

**Inconvénients :**
- ❌ Tests après merge (pas avant)
- ❌ Nécessite rollback si échec

**Workflow :**
```yaml
test-e2e-preprod:
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/develop'
  needs: deploy-preprod
  steps:
    - name: Run E2E tests on preprod
      run: pnpm test:e2e:all
      env:
        NEXT_PUBLIC_APP_ENV: preprod
        # Variables preprod...
```

## Recommandation

### Court terme (Maintenant)
- ✅ **Désactiver les tests E2E dans CI** (fait)
- ✅ **Lancer les tests E2E localement** avant chaque PR
- ✅ **Documenter la procédure** de test local

### Moyen terme (Quand nécessaire)
- 🔄 **Activer les tests E2E sur preprod** après déploiement
- 🔄 **Créer un workflow manuel** pour lancer les tests E2E sur demande

### Long terme (Si besoin critique)
- 🔄 **Docker avec émulateurs Firebase** pour isolation complète
- 🔄 **Tests E2E sur chaque PR** avec environnement Docker

## Commandes Utiles

### Lancer les tests E2E localement

```bash
# Avec émulateurs Firebase
pnpm emulator &  # Dans un terminal
pnpm test:e2e:all  # Dans un autre terminal

# Avec Firebase Cloud (dev)
cp .env.dev .env.local
pnpm test:e2e:all
```

### Lancer les tests E2E manuellement dans GitHub Actions

1. Aller dans **Actions** > **Workflow runs**
2. Sélectionner le workflow
3. Cliquer sur **Run workflow**
4. Choisir la branche
5. Exécuter

## Conclusion

**Pour l'instant, désactiver les tests E2E dans CI est la bonne décision** car :
- ✅ Les tests unitaires et d'intégration couvrent déjà beaucoup
- ✅ Les tests E2E sont plus fragiles et coûteux
- ✅ Le ROI n'est pas optimal pour chaque PR
- ✅ On peut les lancer localement avant merge

**Quand réactiver ?**
- Quand on aura Docker configuré avec émulateurs
- Quand les tests E2E seront plus stables
- Quand on aura besoin de tests E2E sur chaque PR
