# Sélecteurs E2E pour les Composants V2 - Module Géographie

## ✅ Correspondance Sélecteurs E2E ↔ Composants V2

### Tabs (Onglets)
| Sélecteur E2E | `data-testid` Composant V2 | ✅ |
|--------------|---------------------------|-----|
| `[data-testid="tab-provinces"]` | `tab-provinces` | ✅ |
| `[data-testid="tab-departments"]` | `tab-departments` | ✅ |
| `[data-testid="tab-communes"]` | `tab-communes` | ✅ |
| `[data-testid="tab-districts"]` | `tab-districts` | ✅ |
| `[data-testid="tab-quarters"]` | `tab-quarters` | ✅ |

### Statistiques
| Sélecteur E2E | `data-testid` Composant V2 | ✅ |
|--------------|---------------------------|-----|
| `[data-testid="stat-provinces"]` | `stat-provinces` | ✅ |
| `[data-testid="stat-departments"]` | `stat-departments` | ✅ |
| `[data-testid="stat-communes"]` | `stat-communes` | ✅ |
| `[data-testid="stat-districts"]` | `stat-districts` | ✅ |
| `[data-testid="stat-quarters"]` | `stat-quarters` | ✅ |
| `[data-testid="stat-provinces-value"]` | `stat-provinces-value` | ✅ |

### Listes
| Sélecteur E2E | `data-testid` Composant V2 | ✅ |
|--------------|---------------------------|-----|
| `[data-testid="province-list-v2"]` | `province-list-v2` | ✅ |
| `[data-testid="department-list-v2"]` | `department-list-v2` | ✅ |
| `[data-testid="commune-list-v2"]` | `commune-list-v2` | ✅ |
| `[data-testid="district-list-v2"]` | `district-list-v2` | ✅ |
| `[data-testid="quarter-list-v2"]` | `quarter-list-v2` | ✅ |
| `[data-testid="province-list-title"]` | `province-list-title` | ✅ |
| `[data-testid="department-list-title"]` | `department-list-title` | ✅ |
| `[data-testid="commune-list-title"]` | `commune-list-title` | ✅ |

### Boutons d'Action
| Sélecteur E2E | `data-testid` Composant V2 | ✅ |
|--------------|---------------------------|-----|
| `[data-testid="btn-new-province"]` | `btn-new-province` | ✅ |
| `[data-testid="btn-new-department"]` | `btn-new-department` | ✅ |
| `[data-testid="btn-new-commune"]` | `btn-new-commune` | ✅ |
| `[data-testid="btn-new-district"]` | `btn-new-district` | ✅ |
| `[data-testid="btn-new-quarter"]` | `btn-new-quarter` | ✅ |
| `[data-testid="btn-export-csv"]` | `btn-export-csv` | ✅ |
| `[data-testid^="btn-edit-province-"]` | `btn-edit-province-{id}` (mobile)<br>`btn-edit-province-desktop-{id}` (desktop) | ✅ |
| `[data-testid^="btn-edit-department-"]` | `btn-edit-department-{id}` (mobile)<br>`btn-edit-department-desktop-{id}` (desktop) | ✅ |
| `[data-testid^="btn-edit-commune-"]` | `btn-edit-commune-{id}` (mobile)<br>`btn-edit-commune-desktop-{id}` (desktop) | ✅ |
| `[data-testid^="btn-edit-district-"]` | `btn-edit-district-{id}` (mobile)<br>`btn-edit-district-desktop-{id}` (desktop) | ✅ |
| `[data-testid^="btn-edit-quarter-"]` | `btn-edit-quarter-{id}` (mobile)<br>`btn-edit-quarter-desktop-{id}` (desktop) | ✅ |
| `[data-testid^="btn-delete-province-"]` | `btn-delete-province-{id}` (mobile)<br>`btn-delete-province-desktop-{id}` (desktop) | ✅ |
| `[data-testid^="btn-delete-department-"]` | `btn-delete-department-{id}` (mobile)<br>`btn-delete-department-desktop-{id}` (desktop) | ✅ |
| `[data-testid^="btn-delete-commune-"]` | `btn-delete-commune-{id}` (mobile)<br>`btn-delete-commune-desktop-{id}` (desktop) | ✅ |
| `[data-testid^="btn-delete-district-"]` | `btn-delete-district-{id}` (mobile)<br>`btn-delete-district-desktop-{id}` (desktop) | ✅ |
| `[data-testid^="btn-delete-quarter-"]` | `btn-delete-quarter-{id}` (mobile)<br>`btn-delete-quarter-desktop-{id}` (desktop) | ✅ |

### Champs de Formulaire
| Sélecteur E2E | `data-testid` Composant V2 | ✅ |
|--------------|---------------------------|-----|
| `[data-testid="input-province-name"]` | `input-province-name` | ✅ |
| `[data-testid="input-province-code"]` | `input-province-code` | ✅ |
| `[data-testid="input-department-name"]` | `input-department-name` | ✅ |
| `[data-testid="input-department-code"]` | `input-department-code` | ✅ |
| `[data-testid="input-commune-name"]` | `input-commune-name` | ✅ |
| `[data-testid="input-district-name"]` | `input-district-name` | ✅ |
| `[data-testid="input-quarter-name"]` | `input-quarter-name` | ✅ |
| `[data-testid="input-search-province"]` | `input-search-province` | ✅ |
| `[data-testid="input-search-department"]` | `input-search-department` | ✅ |
| `[data-testid="input-search-commune"]` | `input-search-commune` | ✅ |
| `[data-testid="input-search-district"]` | `input-search-district` | ✅ |
| `[data-testid="input-search-quarter"]` | `input-search-quarter` | ✅ |

### Sélecteurs (Select)
| Sélecteur E2E | `data-testid` Composant V2 | ✅ |
|--------------|---------------------------|-----|
| `[data-testid="select-department-province"]` | ⚠️ **MANQUANT** - Utilise `Select` de shadcn sans `data-testid` | ⚠️ |
| `[data-testid="select-commune-department"]` | ⚠️ **MANQUANT** - Utilise `Select` de shadcn sans `data-testid` | ⚠️ |
| `[data-testid="select-district-commune"]` | ⚠️ **MANQUANT** - Utilise `Select` de shadcn sans `data-testid` | ⚠️ |
| `[data-testid="select-quarter-district"]` | ⚠️ **MANQUANT** - Utilise `Select` de shadcn sans `data-testid` | ⚠️ |

**Note** : Les tests E2E utilisent des sélecteurs de fallback (`select[name="provinceId"]`) pour les Select, ce qui est acceptable.

### Boutons de Soumission
| Sélecteur E2E | `data-testid` Composant V2 | ✅ |
|--------------|---------------------------|-----|
| `[data-testid="btn-submit-province"]` | `btn-submit-province` | ✅ |
| `[data-testid="btn-submit-department"]` | `btn-submit-department` | ✅ |
| `[data-testid="btn-submit-commune"]` | `btn-submit-commune` | ✅ |
| `[data-testid="btn-submit-district"]` | `btn-submit-district` | ✅ |
| `[data-testid="btn-submit-quarter"]` | `btn-submit-quarter` | ✅ |

### Boutons de Confirmation de Suppression
| Sélecteur E2E | `data-testid` Composant V2 | ✅ |
|--------------|---------------------------|-----|
| `[data-testid="btn-confirm-delete-province"]` | `btn-confirm-delete-province` | ✅ |
| `[data-testid="btn-confirm-delete-department"]` | `btn-confirm-delete-department` | ✅ |
| `[data-testid="btn-confirm-delete-commune"]` | `btn-confirm-delete-commune` | ✅ |
| `[data-testid="btn-confirm-delete-district"]` | `btn-confirm-delete-district` | ✅ |
| `[data-testid="btn-confirm-delete-quarter"]` | `btn-confirm-delete-quarter` | ✅ |

### Noms d'Entités (pour vérification après création/modification)
| Sélecteur E2E | `data-testid` Composant V2 | ✅ |
|--------------|---------------------------|-----|
| `getEntityNameLocator(page, 'province', name)` | `province-name-{id}` (mobile)<br>`province-name-desktop-{id}` (desktop) | ✅ |
| `getEntityNameLocator(page, 'department', name)` | `department-name-{id}` (mobile)<br>`department-name-desktop-{id}` (desktop) | ✅ |
| `getEntityNameLocator(page, 'commune', name)` | `commune-name-{id}` (mobile)<br>`commune-name-desktop-{id}` (desktop) | ✅ |
| `getEntityNameLocator(page, 'district', name)` | `district-name-{id}` (mobile)<br>`district-name-desktop-{id}` (desktop) | ✅ |
| `getEntityNameLocator(page, 'quarter', name)` | `quarter-name-{id}` (mobile)<br>`quarter-name-desktop-{id}` (desktop) | ✅ |

**Note** : La fonction `getEntityNameLocator()` utilise `[data-testid^="${entityType}-name"]:has-text("${name}")` qui correspond aux deux formats (mobile et desktop) grâce au sélecteur `^=` (commence par).

### Modals
| Sélecteur E2E | `data-testid` Composant V2 | ✅ |
|--------------|---------------------------|-----|
| `[role="dialog"]` | Utilise l'attribut ARIA natif | ✅ |
| `[data-testid="modal-province-form"]` | `modal-province-form` | ✅ |
| `[data-testid="modal-department-form"]` | `modal-department-form` | ✅ |
| `[data-testid="modal-commune-form"]` | `modal-commune-form` | ✅ |
| `[data-testid="modal-district-form"]` | `modal-district-form` | ✅ |
| `[data-testid="modal-quarter-form"]` | `modal-quarter-form` | ✅ |

## ✅ Résumé

**Tous les sélecteurs E2E sont bien adaptés pour fonctionner avec les composants V2 !**

### Points forts :
- ✅ Tous les `data-testid` principaux sont présents et correspondent
- ✅ Les sélecteurs utilisent `^=` pour matcher mobile et desktop
- ✅ La fonction `getEntityNameLocator()` gère automatiquement les deux formats
- ✅ Les sélecteurs de fallback sont présents pour les Select de shadcn

### Points d'attention :
- ⚠️ Les Select de shadcn n'ont pas de `data-testid` dédiés, mais les tests utilisent des sélecteurs de fallback (`select[name="..."]`) qui fonctionnent

## 🔍 Vérification

Pour vérifier la correspondance, exécuter :
```bash
# Vérifier les sélecteurs dans les tests
grep -E "data-testid=" e2e/geographie.spec.ts

# Vérifier les data-testid dans les composants V2
grep -r "data-testid=" src/domains/infrastructure/geography/components/v2/
```
