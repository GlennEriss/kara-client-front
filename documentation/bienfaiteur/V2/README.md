# Documentation Bienfaiteur V2

Documentation des procédures et évolutions du module Bienfaiteur (événements de charité).

> **Statut V2** : la procédure **Mettre en cours** est documentée et implémentée.

## Procédures

| Document | Statut | Résumé |
|----------|--------|--------|
| [mettre-evenement-en-cours/README.md](./mettre-evenement-en-cours/README.md) | Implémenté | Passage en `ongoing` depuis Paramètres, Modifier ou action rapide liste (grille/tableau), avec confirmation côté liste, garde métier côté service (`draft`/`upcoming` uniquement), invalidation cache liste + détail + global-stats |

## Règles clés (sans doublon)

- La source de vérité détaillée est `documentation/bienfaiteur/V2/mettre-evenement-en-cours/README.md`.
- Toute transition vers `ongoing` est validée côté service (pas seulement côté UI).
- L’action rapide liste est disponible uniquement pour les événements `draft` ou `upcoming`.
- Les vues de liste et les statistiques globales sont rafraîchies après mutation.

## Contexte par rapport à la V1

- La **V1** (voir `../V1/`) définit l’architecture, les types et les vues (liste, détail, création, onglet Paramètres avec statut).
- Elle ne détaille pas la procédure « Mettre un événement en cours ».
- Les documents V2 décrivent les **procédures utilisateur** et le **comportement actuel** de l’application pour ces cas.
