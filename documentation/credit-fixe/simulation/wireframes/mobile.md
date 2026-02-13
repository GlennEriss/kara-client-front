# Wireframe Mobile - Simulation Credit Fixe

> Cible mobile prioritaire pour la page de simulation Credit Fixe.

## 1. Contexte

- Page : `/credit-fixe/simulation`
- Viewport cible : `320px` a `767px`
- Objectif UX : saisie rapide, lecture claire des resultats, actions principales toujours accessibles.

## 2. Direction visuelle (theme projet)

Utiliser les tokens existants dans `src/app/globals.css` :

- Primary dark : `--color-kara-primary-dark` (`#224D62`)
- Primary light / accent : `--color-kara-primary-light` (`#CBB171`)
- Neutres : `--color-kara-neutral-*`
- Etats : `--color-kara-success`, `--color-kara-warning`, `--color-kara-error`, `--color-kara-info`

Style moderne attendu :

- cards avec coins arrondis (`rounded-xl`),
- ombres douces (`shadow-sm` / `shadow-md`),
- hierarchie nette (titre fort, sous-texte discret),
- micro-interactions simples (hover/pressed/focus visibles).

## 3. Structure mobile

```text
┌─────────────────────────────────────┐
│ Breadcrumbs                         │
│ Credit > Simulation > Fixe          │
├─────────────────────────────────────┤
│ Header compact                      │
│ "Simulation Credit Fixe"            │
│ "Taux 0-50%, max 14 echeances"      │
├─────────────────────────────────────┤
│ [Segmented control]                 │
│ [Standard] [Personnalisee]          │
├─────────────────────────────────────┤
│ Card Formulaire                     │
│ - Montant emprunte                  │
│ - Date 1er versement                │
│ - Taux (%)                          │
│ - (si personnalisee) lignes mois    │
│ [Calculer la simulation]            │
├─────────────────────────────────────┤
│ Card Resultat (si simulation lancee)│
│ - Montant global                    │
│ - Mensualite reference / Reste      │
│ - Nombre d'echeances                │
├─────────────────────────────────────┤
│ Echeancier (cards verticales)       │
│ M1 / Date / Montant / Cumul / Reste │
│ M2 / ...                            │
├─────────────────────────────────────┤
│ Action bar sticky bas               │
│ [PDF] [Excel] [Imprimer] [WhatsApp] │
└─────────────────────────────────────┘
```

## 4. Comportement responsive mobile

- Tous les champs et boutons en pleine largeur (`w-full`).
- Zone d'echeancier en cartes (pas de table large).
- Barre d'actions export en bas, sticky, pour eviter le scroll retour.
- Espace tactile minimum : `44px` de hauteur pour boutons/champs.

## 5. Composants UI recommandes

- `Card` pour formulaire, resume et blocs d'echeances.
- `Tabs` ou `ToggleGroup` pour Standard/Personnalisee.
- `Input` / `Input type=date` / `Button`.
- `Alert` pour erreurs de validation.
- `Badge` pour etiquettes (Mois, statut, type simulation).

## 6. Etats d'ecran

- Initial : formulaire visible, aucun resultat.
- Loading : bouton "Calculer" desactive + indicateur de chargement.
- Erreur validation : message sous champs concernes + alerte globale.
- Succes : resume + echeancier + actions export/print/whatsapp.

## 7. Accessibilite

- Contraste conforme en utilisant primary dark sur fond clair.
- Focus clavier visible (outline coherent avec le theme KARA).
- Labels explicites sur tous les champs.
- Boutons d'action export avec texte, pas icones seules.

## 8. Regles fonctionnelles visibles en UI

- Taux borne a `0-50`.
- Maximum `14` mois.
- Standard : repartition automatique.
- Personnalisee : saisie manuelle des mensualites et affichage du reste/depasssement.
