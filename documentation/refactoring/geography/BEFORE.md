# État Actuel — Module Geography

## Problèmes Identifiés

### Organisation
- ❌ Code dispersé dans plusieurs dossiers (`repositories/`, `services/`, `hooks/`, `components/`, `schemas/`)
- ❌ Pas de cohésion visible du domaine métier
- ❌ Types mélangés avec les autres types dans `types/types.ts`

### Maintenabilité
- ⚠️ Difficile de trouver tous les fichiers liés au module Geography
- ⚠️ Pas de frontière claire entre domaines
- ⚠️ Risque de dépendances circulaires accru

### Scalabilité
- ⚠️ Structure actuelle ne scale pas bien avec de nombreux modules
- ⚠️ Difficulté à isoler un domaine pour tests/refactoring

---

## Structure Actuelle Détaillée

Voir `README.md` section "État Actuel (BEFORE)".

---

## Métriques

- **Repositories** : 5 fichiers
- **Services** : 1 fichier
- **Hooks** : 1 fichier
- **Components** : 9 fichiers (incluant modals)
- **Schemas** : 1 fichier
- **Types** : 5 interfaces (dans types/types.ts)

**Total** : ~22 fichiers à migrer
