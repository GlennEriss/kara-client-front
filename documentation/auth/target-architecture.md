# Architecture cible recommandée

Objectif: une auth **session-based**, vérifiée côté serveur, avec rotation/refresh gérés proprement.

## Principes
1. **Ne plus stocker d’ID token en cookie lisible par JS**
2. **Utiliser des session cookies HttpOnly** (gérés côté serveur) pour la protection des routes
3. **Vérifier la session dans le middleware** (et les roles/claims)
4. **Centraliser login/logout/refresh** dans un module auth unique

## Proposition (Firebase Auth + Next.js)

### A) Login
1. Client se connecte via Firebase (email/mdp ou autres) → récupère un ID token (en mémoire uniquement)
2. Client appelle `POST /api/auth/session` avec l’ID token
3. Server (Firebase Admin) vérifie l’ID token, crée un **session cookie** (ex: `__session`) et le set en `HttpOnly; Secure; SameSite=Lax/Strict; Path=/`

### B) Middleware / Guard
- Le middleware ne check plus “présence” mais:
  - lit le session cookie
  - le vérifie via Firebase Admin (ou via une stratégie optimisée)
  - applique règles (auth route, admin route, role)

### C) Refresh
Deux options:
- **Option 1 (simple)**: session cookie avec TTL raisonnable (ex 7 jours), pas de refresh côté client.
- **Option 2 (stricte)**: session cookie court + endpoint de refresh conditionnel.

### D) Logout
1. Client appelle `POST /api/auth/logout`
2. Server supprime session cookie (et éventuellement révoque refresh tokens via Admin SDK si nécessaire)
3. Client fait `signOut(auth)` (optionnel selon le modèle)

## Structure de code suggérée

```
src/domains/auth/
  client/
    firebaseClient.ts        // init + wrappers signIn/signOut
    AuthContext.tsx          // état auth UI (user, loading)
  server/
    session.ts               // create/verify/clear session cookies
    guards.ts                // rules routes/roles
  hooks/
    useAuth.ts
    useLogin.ts
    useLogout.ts
  api/
    session/route.ts         // POST create session
    logout/route.ts          // POST clear session
```

## Changements attendus
- Supprimer la dépendance du middleware à `auth-token`
- Supprimer le timer `startTokenRefreshTimer` (ou le rendre inutile)
- Unifier les chemins de login (admin + membre) via le même mécanisme de session

