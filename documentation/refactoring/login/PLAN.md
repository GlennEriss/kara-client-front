# Plan de Refactoring du Module Login

## 📋 Étapes selon le Workflow

### Étape 1 : Analyse et Documentation UML

#### 1.1 Diagramme de Use Case
- [ ] Créer `documentation/uml/use-cases/USE_CASE_LOGIN.puml`
- [ ] Documenter les acteurs (Membre, Admin, Système)
- [ ] Documenter les use cases :
  - UC-LOGIN-001 : Connexion membre avec matricule/email/password
  - UC-LOGIN-002 : Connexion admin avec email/password
  - UC-LOGIN-003 : Déconnexion
  - UC-LOGIN-004 : Vérification de l'état d'authentification
  - UC-LOGIN-005 : Récupération des informations utilisateur

#### 1.2 Diagramme de Classes
- [ ] Créer `documentation/uml/classes/CLASSES_AUTH.puml`
- [ ] Documenter les entités :
  - `User` (entité)
  - `UserRepository` (repository)
  - `LoginService` (service)
  - `LoginFormData` (schema)
- [ ] Documenter les relations

### Étape 2 : Plan de Refactoring

#### 2.1 Création des Repositories
- [ ] Créer `src/domains/auth/repositories/IUserRepository.ts`
- [ ] Créer `src/domains/auth/repositories/UserRepository.ts`
- [ ] Implémenter les méthodes :
  - `getUserByUid(uid: string): Promise<User | null>`
  - `getUserByEmail(email: string): Promise<User | null>`

#### 2.2 Refactoring du Service
- [ ] Créer `src/domains/auth/services/ILoginService.ts`
- [ ] Refactoriser `src/domains/auth/services/LoginService.ts` :
  - Utiliser `UserRepository` au lieu de l'API directe
  - Supprimer le singleton, utiliser `ServiceFactory`
  - Améliorer la gestion d'erreurs
- [ ] Intégrer dans `ServiceFactory`

#### 2.3 Refactoring des Hooks
- [ ] Unifier `useAuth` (supprimer la duplication)
- [ ] Refactoriser `useLogin` :
  - Utiliser `ServiceFactory` pour obtenir `LoginService`
  - Améliorer la gestion d'erreurs
  - Utiliser `useAuth` unifié

#### 2.4 Refactoring des Composants
- [ ] Créer `src/domains/auth/components/LoginForm.tsx` (composant unifié)
- [ ] Refactoriser selon le design system :
  - Utiliser les couleurs KARA
  - Utiliser les composants shadcn UI
  - Améliorer le responsive
- [ ] Créer `src/domains/auth/components/LoginPage.tsx` (page unifiée)

#### 2.5 Migration vers Domains
- [ ] Créer la structure `src/domains/auth/`
- [ ] Déplacer les fichiers selon la nouvelle structure
- [ ] Mettre à jour les imports

### Étape 3 : Tests

#### 3.1 Tests Unitaires
- [ ] `src/domains/auth/__tests__/services/LoginService.test.ts`
- [ ] `src/domains/auth/__tests__/hooks/useLogin.test.tsx`
- [ ] `src/domains/auth/__tests__/repositories/UserRepository.test.ts`

#### 3.2 Tests d'Intégration
- [ ] `src/domains/auth/__tests__/integration/login.integration.test.tsx`

#### 3.3 Tests E2E
- [ ] Améliorer `e2e/auth.setup.ts`
- [ ] Créer `e2e/login.spec.ts` avec tests complets

### Étape 4 : Validation

- [ ] Tous les tests passent
- [ ] Build réussi
- [ ] Test manuel (smoke test)
- [ ] Diagrammes UML à jour
- [ ] Documentation à jour

## 🎯 Priorités

1. **Haute** : Créer les repositories et refactoriser le service
2. **Haute** : Créer les tests unitaires
3. **Moyenne** : Refactoriser les composants selon le design system
4. **Moyenne** : Créer les tests d'intégration
5. **Basse** : Améliorer les tests E2E

## 📅 Estimation

- Analyse et documentation UML : 1 jour
- Refactoring architecture : 2-3 jours
- Refactoring design : 1-2 jours
- Tests : 2-3 jours
- Validation : 1 jour

**Total estimé : 7-10 jours**
