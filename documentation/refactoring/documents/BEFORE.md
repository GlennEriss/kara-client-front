# État Actuel — Module Documents

## Problèmes Identifiés

### Organisation
- ❌ Code dispersé dans plusieurs dossiers (`repositories/`, `services/`, `hooks/`, `components/`, `utils/`, `constantes/`)
- ❌ Components de documents dispersés dans plusieurs modules (`member/`, `contract/`, `placement/`, `caisse-imprevue/`, `caisse-speciale/`)
- ❌ Pas de cohésion visible du domaine métier Documents
- ❌ Types mélangés avec les autres types dans `types/types.ts`

### Maintenabilité
- ⚠️ Difficile de trouver tous les fichiers liés au module Documents
- ⚠️ Pas de frontière claire entre domaines
- ⚠️ Risque de dépendances circulaires accru
- ⚠️ Components de documents dupliqués ou similaires dans différents modules

### Scalabilité
- ⚠️ Structure actuelle ne scale pas bien avec de nombreux modules
- ⚠️ Difficulté à isoler un domaine pour tests/refactoring
- ⚠️ Réutilisation de code Documents difficile

---

## Structure Actuelle Détaillée

Voir `README.md` section "État Actuel (BEFORE)".

---

## Métriques

- **Repositories** : 2 fichiers (DocumentRepository.ts, IDocumentRepository.ts)
- **Services** : 1 fichier (DocumentService.ts)
- **Hooks** : 3 fichiers (useDocuments.ts, useDocumentList.ts, index.ts)
- **Components** : ~8 fichiers dispersés dans différents modules
- **Utils** : 1 fichier (documentTypes.ts)
- **Constants** : 1 fichier (document-types.ts)
- **Types** : Plusieurs interfaces/types (dans types/types.ts)

**Total** : ~17 fichiers à migrer

---

## Dépendances

Le module Documents est utilisé par :
- **Placement** : Upload et visualisation de documents
- **Caisse Imprévue** : Documents de contrat et remboursement
- **Caisse Spéciale** : Documents de contrat PDF
- **Member** : Liste et prévisualisation des documents d'un membre
- **Contract** : Génération et visualisation de PDF
