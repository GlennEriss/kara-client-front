# Wireframe Desktop - Simulation Credit Fixe

> Cible desktop pour la page de simulation Credit Fixe, avec adaptation fluide tablette.

## 1. Contexte

- Page : `/credit-speciale/simulation` (mode Credit Fixe)
- Viewport cible desktop : `>= 1024px`
- Transition tablette : `768px` a `1023px` (layout compact du desktop)

## 2. Direction visuelle (theme projet)

Respect strict des couleurs existantes :

- `#224D62` (KARA blue) pour titres, boutons primaires, entetes de table
- `#CBB171` (KARA gold) pour accent, highlights et focus avances
- Neutres pour fonds et separateurs (`kara-neutral-*`)

Aspect moderne attendu :

- layout aeriens, grilles claires,
- cards structurees,
- tableau propre avec zebra rows legeres,
- actions rapides visibles sans surcharger l'ecran.

## 3. Structure desktop

```text
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumbs + Header                                        │
│ "Simulation Credit Fixe" + description courte               │
├─────────────────────────────────────────────────────────────┤
│ Toolbar                                                     │
│ [Mode: Standard | Personnalisee] [Reset]                    │
├─────────────────────────────────────────────────────────────┤
│ Zone principale (2 colonnes)                                │
│ ┌──────────────────────────┬──────────────────────────────┐ │
│ │ Colonne gauche (form)    │ Colonne droite (resume)      │ │
│ │ - Montant                │ - Montant global             │ │
│ │ - Date 1er versement     │ - Interet unique             │ │
│ │ - Taux                   │ - Echeances / reste          │ │
│ │ - Mensualites custom     │ - Alertes validation         │ │
│ │ [Calculer simulation]    │                              │ │
│ └──────────────────────────┴──────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Card Echeancier (table)                                     │
│ Colonnes: Mois | Date | Montant | Cumul | Reste            │
├─────────────────────────────────────────────────────────────┤
│ Actions                                                     │
│ [Exporter PDF] [Exporter Excel] [Imprimer] [WhatsApp]      │
└─────────────────────────────────────────────────────────────┘
```

## 4. Regles responsive desktop/tablette

- Desktop large : formulaire et resume en 2 colonnes.
- Tablette : bascule en 1 colonne pour le resume sous le formulaire.
- Tableau :
  - desktop : table complete,
  - tablette : table avec scroll horizontal si necessaire.
- Actions export :
  - desktop : inline,
  - tablette : wrap automatique.

## 5. Composants UI recommandes

- `Card` pour chaque bloc fonctionnel (formulaire, resume, echeancier).
- `Table` pour l'echeancier (desktop first).
- `Button` variants :
  - primary pour "Calculer la simulation",
  - outline/secondary pour export et actions.
- `Badge` pour mode de simulation et indicateurs de statut.
- `Separator` pour clarifier les blocs.

## 6. Hierarchie visuelle

- Header :
  - titre `text-3xl`/`text-4xl`, couleur primary dark.
  - sous-titre `text-muted-foreground`.
- Formulaire :
  - labels courts et explicites.
  - aides contextuelles sous champs sensibles (taux, limite 14 mois).
- Resume :
  - chiffres principaux en gros format (montant global, reste).
  - infos secondaires en texte discret.

## 7. Etats et feedback

- Validation immediate des champs (taux, montants, max 14 mois).
- Bloc d'alerte en cas de depassement ou incoherence en personnalisee.
- Confirmation utilisateur sur generation d'exports.
- Indicateur de chargement pendant calcul et export.

## 8. Accessibilite et qualite

- Navigation clavier complete.
- Focus visible et coherent avec le theme.
- Contrastes suffisants (texte/fond).
- Texte lisible a 100% et 125% zoom sans rupture majeure.

## 9. Regles fonctionnelles visibles en UI

- Taux borne a `0-50`.
- Standard : repartition automatique sur max `14` echeances.
- Personnalisee : saisie des mensualites par mois, limite `14` lignes.
- Affichage clair des ecarts : reste a planifier ou depassement.
