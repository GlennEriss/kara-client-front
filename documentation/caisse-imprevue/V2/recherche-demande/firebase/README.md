# Firebase - Recherche des Demandes

> Index Firestore pour la recherche paginée avec `searchableText`.

## 📁 Contenu

| Fichier | Description |
|---------|-------------|
| `INDEXES.md` | Documentation des index (matrice des combinaisons, requêtes) |
| `indexes.recherche.json` | 16 index composites prêts à fusionner dans `firestore.indexes.json` |
| `README.md` | Ce fichier |

## 🎯 Index définis

Les index couvrent toutes les combinaisons issues des diagrammes d'activité et de séquence :

1. **Recherche seule** (tab Toutes) : 4 index (tri date asc/desc, A-Z, Z-A)
2. **Recherche + statut** (tab En attente, Acceptées, etc.) : 4 index
3. **Recherche + statut + fréquence** : 4 index
4. **Recherche + fréquence** (tab Toutes avec filtre fréquence) : 4 index

**Total** : 16 index composites.

## 🔗 Intégration dans le projet

Pour ajouter ces index au fichier racine `firestore.indexes.json` :

```bash
# Depuis la racine du projet
cd documentation/caisse-imprevue/V2/recherche-demande/firebase

# Option 1 : Fusion manuelle
# Copier le contenu de indexes.recherche.json dans firestore.indexes.json (tableau "indexes")

# Option 2 : Script Node (exemple)
node -e "
const main = require('./firestore.indexes.json');
const search = require('./documentation/caisse-imprevue/V2/recherche-demande/firebase/indexes.recherche.json');
main.indexes = [...main.indexes, ...search];
require('fs').writeFileSync('firestore.indexes.json', JSON.stringify(main, null, 2));
"
```

Puis déployer :

```bash
firebase deploy --only firestore:indexes
```

## ⚠️ Prérequis

- Les documents `caisseImprevueDemands` doivent avoir le champ `searchableText` (voir script de migration dans `RECHERCHE_ANALYSE.md`)
- La construction des index peut prendre quelques minutes (vérifier dans la console Firebase)

## 📚 Références

- [INDEXES.md](./INDEXES.md) - Documentation détaillée
- [RECHERCHE_ANALYSE.md](../RECHERCHE_ANALYSE.md) - Analyse complète
- [activite/RechercherDemandes.puml](../activite/RechercherDemandes.puml) - Diagramme d'activité
- [sequence/SEQ_RechercherDemandes.puml](../sequence/SEQ_RechercherDemandes.puml) - Diagramme de séquence
