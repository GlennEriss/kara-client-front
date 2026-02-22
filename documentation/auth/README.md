# Auth — Documentation & Refactor Plan

Ce dossier documente **l’état actuel** de l’authentification dans `kara-client-front`, met en évidence les **points faibles**, puis propose une **nouvelle architecture** plus robuste (sessions, refresh, login/logout).

## Sommaire
- `current-state.md` : cartographie du flux actuel (login, cookie, middleware, refresh, logout)
- `weaknesses.md` : faiblesses / risques (sécurité + UX + maintenance)
- `target-architecture.md` : structure cible recommandée (sessions server-side, vérification middleware, refresh)
- `migration-plan.md` : plan de migration incrémental (sans big-bang)

