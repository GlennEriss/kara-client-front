# Configuration E2E - Instructions d'installation

## 📦 Installation de Playwright

Pour installer Playwright et ses navigateurs, exécutez :

```bash
pnpm add -D @playwright/test playwright
npx playwright install
```

Cette commande va :
- Installer `@playwright/test` et `playwright` dans les devDependencies
- Télécharger les navigateurs (Chromium, Firefox, WebKit)

## ✅ Vérification

Après l'installation, vous pouvez vérifier que tout fonctionne :

```bash
# Lister les tests disponibles
pnpm test:e2e --list

# Exécuter les tests (nécessite que le serveur dev soit lancé)
pnpm test:e2e
```

## 🔧 Configuration des identifiants de test

Par défaut, les tests utilisent :
- Email: `admin@kara.test`
- Password: `admin123`

Pour changer ces identifiants, créez un fichier `.env.local` (ou utilisez des variables d'environnement) :

```bash
E2E_AUTH_EMAIL=votre@email.com
E2E_AUTH_PASSWORD=votre_password
```

## 📝 Prochaines étapes

1. Installer Playwright (voir commande ci-dessus)
2. Créer un utilisateur de test dans Firebase avec les identifiants configurés
3. Lancer le serveur de développement : `pnpm dev`
4. Dans un autre terminal, lancer les tests : `pnpm test:e2e`
