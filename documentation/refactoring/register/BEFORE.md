# État Actuel du Module Register (AVANT)

## Structure des Fichiers

### Composants Principaux

#### `src/components/register/Register.tsx` (596 lignes)
- Composant principal qui orchestre les 4 étapes
- Gère l'affichage conditionnel (formulaire, code de sécurité, confirmation)
- Utilise `useRegister()` hook du provider
- Lazy loading des composants Step

**Problèmes identifiés :**
- Trop de responsabilités dans un seul composant
- Logique de navigation mélangée avec la présentation
- Gestion du scroll qui peut échouer

#### `src/providers/RegisterProvider.tsx` (982 lignes)
- Provider React qui contient TOUTE la logique métier
- Gestion du formulaire avec `react-hook-form`
- Gestion du cache localStorage
- Validation des étapes
- Soumission du formulaire
- Gestion des corrections avec code de sécurité

**Problèmes identifiés :**
- Fichier trop volumineux (982 lignes)
- Trop de responsabilités (SRP violé)
- Logique métier difficile à tester isolément
- Gestion du cache complexe et fragile
- Validation qui peut échouer silencieusement

### Étapes du Formulaire

#### Step1.tsx - Identité
- Champs : civilité, prénom, nom, date de naissance, lieu de naissance, genre, nationalité, téléphone, email, matricule
- Validation avec Zod

#### Step2.tsx - Adresse
- Champs : province, département, commune, district, quartier, arrondissement, adresse complète
- Utilise les composants V2 de géographie

#### Step3.tsx - Entreprise
- Champs : statut professionnel, entreprise, profession, adresse entreprise
- Utilise les composants V2 de références (entreprises/métiers)

#### Step4.tsx - Documents
- Champs : type de pièce d'identité, numéro, photos (recto/verso), dates, lieu de délivrance, acceptation des conditions

#### Step5.tsx - Confirmation
- Affichage de confirmation après soumission réussie

## Flux de Données Actuel

```
RegisterPage
  └── RegisterProvider (Context)
      ├── useForm (react-hook-form)
      ├── Cache localStorage
      ├── Validation Zod
      └── Register Component
          ├── Step1
          ├── Step2
          ├── Step3
          └── Step4
```

## Bugs Connus

### 1. Validation
- La validation des étapes peut échouer sans afficher d'erreur
- Les messages d'erreur ne s'affichent pas toujours correctement
- La validation croisée entre champs peut échouer

### 2. Cache
- La sauvegarde automatique peut ne pas fonctionner
- La restauration du cache peut échouer silencieusement
- L'expiration du cache n'est pas toujours respectée

### 3. Navigation
- La navigation entre étapes peut être bloquée
- Le scroll automatique ne fonctionne pas toujours
- L'état des étapes complétées n'est pas toujours persisté

### 4. Soumission
- La soumission peut échouer sans message d'erreur clair
- Le code de sécurité pour les corrections ne fonctionne pas toujours
- La gestion des erreurs réseau est insuffisante

### 5. Performance
- Le lazy loading peut causer des problèmes de rendu
- Le debounce de la sauvegarde peut être amélioré
- Les re-renders peuvent être optimisés

## Dépendances Actuelles

- `react-hook-form` : Gestion du formulaire
- `zod` : Validation
- `sonner` : Notifications toast
- `@/db/membership.db` : Accès direct à Firestore
- `@/mediators/CompanyFormMediator` : Médiateur pour le formulaire entreprise
- `@/factories/CompanyFormMediatorFactory` : Factory pour le médiateur
- `localStorage` : Cache côté client

## Points d'Amélioration

1. **Séparation des responsabilités** : Extraire la logique métier du provider
2. **Testabilité** : Rendre le code plus facile à tester
3. **Gestion d'erreurs** : Améliorer la gestion et l'affichage des erreurs
4. **Performance** : Optimiser les re-renders et le chargement
5. **Maintenabilité** : Réduire la complexité et améliorer la lisibilité
