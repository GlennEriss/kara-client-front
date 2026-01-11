# Notes Techniques — Migration Geography

## Points d'Attention

### 1. Imports relatifs vs absolus
- Le projet utilise des imports absolus avec `@/`
- Ne pas changer vers des imports relatifs
- S'assurer que `tsconfig.json` supporte les nouveaux chemins

### 2. Factories
- Les factories (`RepositoryFactory`, `ServiceFactory`) doivent être mises à jour
- Vérifier que les singletons fonctionnent toujours correctement après migration

### 3. Types partagés
- Les types `Province`, `Department`, `Commune`, `District`, `Quarter` sont utilisés ailleurs (notamment dans User.address)
- Après extraction, vérifier que les imports dans `types/types.ts` ou autres fichiers pointent vers le bon endroit
- **Solution** : Réexporter depuis `types/types.ts` pour compatibilité temporaire si nécessaire

### 4. Routes/pages Next.js
- Vérifier `src/app/(admin)/geographie/page.tsx`
- Les imports des components devront être mis à jour

### 5. Tests
- Pas de tests automatiques identifiés
- Tests manuels complets nécessaires :
  - Lister provinces/départements/communes/districts/quartiers
  - Créer une province
  - Créer un département (avec province)
  - Créer une commune (avec département)
  - Créer un district (avec commune)
  - Créer un quartier (avec district)
  - Modifier une entité
  - Supprimer une entité (si possible)

## Commandes Utiles

### Vérifier les imports à remplacer
```bash
# Chercher tous les imports de repositories/geographie
grep -r "@/repositories/geographie" src/

# Chercher tous les imports de services/geographie
grep -r "@/services/geographie" src/

# Chercher tous les imports de hooks/useGeographie
grep -r "@/hooks/useGeographie" src/

# Chercher tous les imports de components/geographie
grep -r "@/components/geographie" src/

# Chercher les imports de types (plus délicat)
grep -r "from '@/types/types'" src/ | grep -E "(Province|Department|Commune|District|Quarter)"
```

### Vérifier la compilation
```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Checklist de Vérification

- [ ] Tous les fichiers migrés
- [ ] Tous les imports mis à jour
- [ ] Factories mises à jour
- [ ] TypeScript compile sans erreurs
- [ ] Linting passe
- [ ] Build réussit
- [ ] Page `/geographie` s'affiche
- [ ] Formulaires de création fonctionnent
- [ ] Formulaires d'édition fonctionnent
- [ ] Listes s'affichent correctement
- [ ] Aucune régression fonctionnelle
