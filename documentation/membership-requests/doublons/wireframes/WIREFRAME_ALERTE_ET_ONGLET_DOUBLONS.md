# Wireframe – Alerte doublons et onglet Doublons

Spécifications UI pour l'**alerte administrateur**, l'**onglet Doublons** et la **résolution des groupes**.

---

## 1. Contexte

- **Page** : liste des demandes d'adhésion (membership-requests), avec système d'onglets existant.
- **Source de données** : collection `duplicate-groups` (groupes non résolus, `resolvedAt == null`).
- **Objectif** : alerter l'admin, afficher les groupes pré-listés, permettre la résolution.

---

## 2. Alerte doublons

### 2.1 Emplacement

- **Position** : en haut de la zone de contenu principal (sous le titre, au-dessus des onglets).
- **Visibilité** : affichée uniquement si `hasDuplicates === true` (au moins un groupe non résolu).

### 2.2 Contenu

- **Type** : bannière `Alert` (variante `warning` ou `destructive` selon le design system).
- **Icône** : `AlertTriangle` ou `Users`.
- **Titre** : « Dossiers en doublon détectés »
- **Message** : « Des dossiers partagent le même numéro de téléphone, adresse email ou numéro de pièce d'identité. »
- **Action** : bouton ou lien « Voir les doublons » qui active l'onglet « Doublons ».

### 2.3 Esquisse (ASCII)

```
+------------------------------------------------------------------------+
| ⚠️  Dossiers en doublon détectés                                        |
|     Des dossiers partagent le même numéro de téléphone, adresse email  |
|     ou numéro de pièce d'identité.                    [Voir les doublons] |
+------------------------------------------------------------------------+
```

### 2.4 Comportement

- Au clic : bascule vers l'onglet « Doublons » (scroll si nécessaire).
- L'alerte se rafraîchit automatiquement (invalidation cache après résolution d'un groupe).

---

## 3. Onglets (Tabs)

### 3.1 Liste des onglets

```
[ Tous ]  [ En attente ]  [ Approuvées ]  [ Rejetées ]  [ Doublons (N) ]
                                                              ^^^^^^^^
                                                        badge avec le nombre
                                                        de groupes non résolus
```

- **Badge** : afficher le nombre de groupes non résolus sur l'onglet « Doublons » (optionnel).

---

## 4. Contenu de l'onglet « Doublons »

### 4.1 Structure : sections par type d'attribut

L'onglet affiche **trois sections** (ou sous-onglets) :

1. **Par téléphone** : groupes où `type === 'phone'`
2. **Par email** : groupes où `type === 'email'`
3. **Par pièce d'identité** : groupes où `type === 'identityDocument'`

Chaque section contient une liste de **groupes**.

### 4.2 Affichage d'un groupe

Pour chaque groupe :

```
+------------------------------------------------------------------------+
| 📞 Téléphone : +241 77 12 34 56                           2 dossiers   |
|------------------------------------------------------------------------|
| Matricule       | Nom             | Prénom    | Statut       | Actions |
|-----------------|-----------------|-----------|--------------|---------|
| 1234.MK.250101  | Dupont          | Jean      | En attente   | [Voir]  |
| 5678.MK.250201  | Dupont          | Jean      | Rejetée      | [Voir]  |
|------------------------------------------------------------------------|
|                                        [Marquer comme traité]          |
+------------------------------------------------------------------------+
```

### 4.3 Éléments d'un groupe

| Élément | Description |
|---------|-------------|
| **Icône** | 📞 (téléphone), 📧 (email), 🪪 (pièce d'identité) |
| **Type + Valeur** | Ex. « Téléphone : +241 77 12 34 56 » |
| **Nombre de dossiers** | Ex. « 2 dossiers » |
| **Liste des dossiers** | Tableau ou liste de cartes avec matricule, nom, prénom, statut |
| **Action « Voir »** | Lien vers la fiche détail de la demande |
| **Action « Marquer comme traité »** | Bouton pour résoudre le groupe |

### 4.4 Modal de confirmation (résolution)

Au clic sur « Marquer comme traité » :

```
+------------------------------------------+
|  Confirmer la résolution                  |
|------------------------------------------|
|  Ce groupe de doublons sera marqué comme |
|  traité et ne s'affichera plus.          |
|                                          |
|  Avez-vous fusionné, rejeté ou vérifié   |
|  ces dossiers ?                          |
|                                          |
|        [Annuler]    [Confirmer]          |
+------------------------------------------+
```

### 4.5 État vide

Si aucun groupe non résolu :

```
+------------------------------------------------------------------------+
|                                                                        |
|    ✓  Aucun dossier en doublon                                         |
|       Tous les doublons ont été traités.                               |
|                                                                        |
+------------------------------------------------------------------------+
```

### 4.6 Esquisse complète (ASCII)

```
Onglet actif : [ Doublons (3) ]

=== Par téléphone (2 groupes) ===

┌─────────────────────────────────────────────────────────────────┐
│ 📞 +241 77 12 34 56                                  2 dossiers │
├─────────────────────────────────────────────────────────────────┤
│ 1234.MK.250101  │ Dupont Jean      │ En attente    │ [Voir]    │
│ 5678.MK.250201  │ Dupont Jean      │ Rejetée       │ [Voir]    │
├─────────────────────────────────────────────────────────────────┤
│                                      [Marquer comme traité]     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📞 +241 66 98 76 54                                  2 dossiers │
├─────────────────────────────────────────────────────────────────┤
│ 9012.MK.250301  │ Martin Marie     │ En attente    │ [Voir]    │
│ 3456.MK.250401  │ Martin Marie     │ En attente    │ [Voir]    │
├─────────────────────────────────────────────────────────────────┤
│                                      [Marquer comme traité]     │
└─────────────────────────────────────────────────────────────────┘

=== Par email (1 groupe) ===

┌─────────────────────────────────────────────────────────────────┐
│ 📧 jean.dupont@email.com                             2 dossiers │
├─────────────────────────────────────────────────────────────────┤
│ 1234.MK.250101  │ Dupont Jean      │ En attente    │ [Voir]    │
│ 5678.MK.250201  │ Dupont Jean      │ Rejetée       │ [Voir]    │
├─────────────────────────────────────────────────────────────────┤
│                                      [Marquer comme traité]     │
└─────────────────────────────────────────────────────────────────┘

=== Par pièce d'identité (0 groupe) ===

(Aucun doublon par numéro de pièce d'identité)
```

---

## 5. Composants UI suggérés

| Composant | Usage |
|-----------|-------|
| `Alert` | Bannière d'alerte en haut de page |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Onglets de la page |
| `Badge` | Nombre de groupes sur l'onglet « Doublons » |
| `Card` ou `Collapsible` | Conteneur d'un groupe |
| `Table` | Liste des dossiers dans un groupe |
| `Button` | Actions (« Voir », « Marquer comme traité ») |
| `Dialog` | Modal de confirmation de résolution |
| `Toast` | Feedback après résolution |

---

## 6. Responsive

| Écran | Adaptation |
|-------|------------|
| **Desktop** | Alerte pleine largeur, onglets horizontaux, groupes en cartes, tableau pour les dossiers |
| **Tablette** | Idem desktop, colonnes du tableau réduites si nécessaire |
| **Mobile** | Alerte empilée, onglets en scroll horizontal, groupes en accordéon, dossiers en cartes empilées |

---

## 7. Accessibilité et tests

### data-testid

| Élément | data-testid |
|---------|-------------|
| Alerte | `duplicates-alert` |
| Lien « Voir les doublons » | `duplicates-alert-link` |
| Onglet Doublons | `tab-duplicates` |
| Contenu onglet | `duplicates-content` |
| Section par téléphone | `duplicates-section-phone` |
| Section par email | `duplicates-section-email` |
| Section par pièce | `duplicates-section-identity` |
| Groupe | `duplicate-group-{groupId}` |
| Bouton « Marquer comme traité » | `resolve-group-{groupId}` |
| Lien « Voir » | `view-request-{requestId}` |

### ARIA

- `role="alert"` sur l'alerte.
- `aria-selected` sur l'onglet actif.
- Labels explicites sur les boutons d'action.

---

## 8. Références

- [README principal](../README.md)
- [Cloud Function](../functions/README.md)
- [Firebase](../firebase/README.md)
- [Séquence](../sequence/)
- [Workflow](../workflow/README.md)
