# Plan de migration (incrémental)

## Étape 0 — Observation
- Ajouter des logs ciblés (temporaire) pour mesurer:
  - fréquence des redirections middleware
  - cas “cookie présent mais Firebase null”

## Étape 1 — Introduire la session server-side (sans casser)
- Ajouter `POST /api/auth/session` (création session cookie HttpOnly)
- Ajouter `POST /api/auth/logout` (suppression)
- Conserver `auth-token` temporairement (fallback)

## Étape 2 — Migrer login admin + membre
- Après `signInWithEmailAndPassword`, appeler `/api/auth/session` puis supprimer l’écriture de `auth-token`.

## Étape 3 — Migrer middleware vers session cookie
- Vérification réelle (token/session) + checks de rôle.
- Désactiver définitivement la logique “présence cookie”.

## Étape 4 — Nettoyage
- Supprimer `src/lib/auth-utils.ts` (timer refresh) ou le garder uniquement pour compat legacy.
- Supprimer toutes écritures directes de cookie dans les composants/hooks.

