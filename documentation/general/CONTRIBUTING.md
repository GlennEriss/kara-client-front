# Guide de Contribution

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Firebase CLI (pour les emulators locaux)

### Installation

```bash
# Installer les dépendances
npm install

# Copier les fichiers d'environnement
cp .env.local.example .env.local
# (Modifier .env.local avec vos valeurs)

# Démarrer les emulators Firebase
npm run emulator

# Dans un autre terminal, démarrer le serveur de développement
npm run dev
```

## 📝 Standards de Code

### TypeScript
- Utiliser TypeScript strict (activé progressivement)
- Éviter `any` autant que possible, utiliser `unknown` si nécessaire
- Typer explicitement les fonctions publiques

### React
- Utiliser des composants fonctionnels avec hooks
- Préférer les composants de `src/components/ui` pour l'UI
- Séparer la logique métier des composants (hooks, services)

### Architecture
Respecter les couches définies dans `documentation/architecture/ARCHITECTURE.md` :
- **Firebase** → **Repositories** → **Services** → **Hooks/Mediators** → **Components**

**Règle d'or** : Jamais de saut direct entre couches (ex: un composant ne doit pas appeler directement un repository).

### Nommage
- **Composants** : PascalCase (`UserProfile.tsx`)
- **Hooks** : camelCase avec préfixe `use` (`useMemberships.ts`)
- **Services** : PascalCase avec suffixe `Service` (`MembershipService.ts`)
- **Repositories** : PascalCase avec suffixe `Repository` (`MemberRepository.ts`)
- **Types/Interfaces** : PascalCase (`Member`, `MembershipRequest`)

### Gestion d'erreurs
- Utiliser le système de gestion d'erreurs centralisé (`src/utils/error-handler.ts`)
- Ne pas utiliser `console.error` directement en production
- Fournir des messages d'erreur clairs pour les utilisateurs

```typescript
// ✅ Bon
try {
  await someOperation()
} catch (error) {
  const appError = handleError(error, 'ComponentName')
  toast.error(appError.userMessage || 'Une erreur est survenue')
}

// ❌ Mauvais
try {
  await someOperation()
} catch (error) {
  console.error('Erreur', error) // Pas de gestion utilisateur
}
```

## ✅ Checklist avant commit

- [ ] Le code compile sans erreur TypeScript
- [ ] ESLint passe sans erreur (`npm run lint`)
- [ ] Pas de `console.log` laissé dans le code
- [ ] Les erreurs sont gérées proprement
- [ ] Les modifications respectent l'architecture du projet
- [ ] La documentation est mise à jour si nécessaire
- [ ] Les tests manuels ont été effectués (si applicable)

## 🔍 Processus de développement

### 1. Créer une branche
```bash
git checkout -b feature/nom-de-la-fonctionnalite
# ou
git checkout -b fix/nom-du-bug
```

### 2. Développer
- Faire des commits fréquents et descriptifs
- Suivre les conventions de commit (voir section ci-dessous)

### 3. Tester localement
- Vérifier que l'application fonctionne avec `npm run dev`
- Tester les fonctionnalités modifiées manuellement
- Vérifier les erreurs dans la console

### 4. Créer une Pull Request
- Remplir le template de PR
- Décrire les changements
- Mentionner les tests effectués
- Demander une revue de code

### 5. Répondre aux commentaires
- Adresser tous les commentaires de revue
- Faire les modifications demandées
- Répondre aux questions

## 📦 Structure des commits

Format recommandé :
```
type(scope): description courte

Description détaillée si nécessaire
```

Types :
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage, point-virgule manquant, etc.
- `refactor` : Refactoring de code
- `test` : Ajout/modification de tests
- `chore` : Tâches de maintenance (dépendances, config, etc.)

Exemples :
```
feat(memberships): ajouter le filtrage par statut
fix(register): corriger la validation du formulaire Step3
docs(architecture): mettre à jour la documentation des services
refactor(geographie): simplifier la logique de création en cascade
```

## 🧪 Tests

### Tests unitaires (à venir)
Les tests seront écrits avec Vitest. Voir `documentation/QUALITE_ET_STABILISATION.md` pour la stratégie de tests.

### Tests manuels
Avant de soumettre une PR, tester :
1. Le cas d'usage principal (happy path)
2. Les cas d'erreur (validation, API errors, etc.)
3. Les cas limites (valeurs vides, très longues, etc.)
4. Le responsive (mobile, tablette, desktop)

## 📚 Documentation

### Documentation du code
- Ajouter des JSDoc pour les fonctions complexes
- Documenter les paramètres et valeurs de retour
- Expliquer la logique métier non évidente

```typescript
/**
 * Crée une demande d'adhésion et envoie une notification aux admins
 * @param data - Données de la demande d'adhésion
 * @param userId - ID de l'utilisateur créant la demande
 * @returns La demande créée avec son ID
 * @throws AppError si la création échoue
 */
async createMembershipRequest(data: MembershipRequestData, userId: string): Promise<MembershipRequest> {
  // ...
}
```

### Documentation des fonctionnalités
- Mettre à jour `documentation/` si une fonctionnalité est ajoutée/modifiée
- Suivre la structure existante dans `documentation/`
- Créer des fichiers `realisationAfaire.md` pour les fonctionnalités en cours

## 🐛 Signaler un bug

1. Vérifier que le bug n'a pas déjà été signalé
2. Créer une issue avec :
   - Description claire du problème
   - Étapes pour reproduire
   - Comportement attendu vs comportement actuel
   - Capture d'écran si applicable
   - Informations sur l'environnement (navigateur, OS, etc.)

## 💡 Proposer une amélioration

1. Vérifier que l'amélioration n'a pas déjà été proposée
2. Créer une issue avec :
   - Description de l'amélioration
   - Justification (pourquoi c'est utile)
   - Proposition d'implémentation si possible
   - Impact sur l'existant

## 🔗 Ressources

- [Architecture du projet](./architecture/ARCHITECTURE.md)
- [Stratégie de qualité](./QUALITE_ET_STABILISATION.md)
- [Workflow d'implémentation](./WORKFLOW.md)
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation React Query](https://tanstack.com/query/latest)
- [Documentation Firebase](https://firebase.google.com/docs)

---

**Note** : Ce guide est en constante évolution. N'hésitez pas à proposer des améliorations !
