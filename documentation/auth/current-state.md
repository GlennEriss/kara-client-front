# État actuel de l’authentification (kara-client-front)

## 1) Source d’identité
- Firebase Auth côté client (SDK `firebase/auth`).
- État React via `onAuthStateChanged`.

Fichiers clés:
- `src/firebase/auth.ts`
- `src/domains/auth/hooks/useAuth.ts` (et `src/hooks/useAuth.ts` re-export)

## 2) Stockage “session”

### Cookie `auth-token`
L’app écrit un cookie `auth-token` **depuis le navigateur** (donc non `HttpOnly`) contenant un **Firebase ID token**.

Écrit à plusieurs endroits:
- `src/domains/auth/hooks/useLogin.ts`
- `src/components/login/AdminLogin.tsx`
- `src/lib/auth-utils.ts` (refresh forcé)
- `src/providers/AuthFirebaseProvider.tsx` (refresh + suppression)

Caractéristiques actuelles du cookie:
- `max-age=3600` (aligné sur l’expiration ID token ~1h)
- `samesite=strict`
- `secure` uniquement si `window.location.protocol === 'https:'`
- **pas HttpOnly**

## 3) Guard côté serveur (middleware Next)

Le middleware ne valide pas le token: il vérifie uniquement **la présence** du cookie `auth-token`.

- Si route “admin” et pas de cookie => redirect `/login`
- Si route d’auth et cookie présent => redirect `/dashboard`

Fichier:
- `src/middleware.ts`

## 4) Refresh

Le refresh du token est géré côté client:
- `refreshAuthToken()` appelle `auth.currentUser.getIdToken(true)` puis réécrit le cookie.
- Un timer (`setInterval`) rafraîchit toutes les 50 minutes.
- Ce timer est lancé/arrêté via `AuthFirebaseProvider` sur `onAuthStateChanged`.

Fichiers:
- `src/lib/auth-utils.ts`
- `src/providers/AuthFirebaseProvider.tsx`

## 5) Logout

La déconnexion:
- `signOut(auth)` côté Firebase
- suppression du cookie `auth-token`

Fichiers:
- `src/domains/auth/services/LogoutService.ts`
- `src/lib/auth-utils.ts` (deprecated)

## 6) Vérification token (API)

Une route API permet de vérifier un ID token via Firebase Admin:
- `POST /api/auth/verify` avec `{ token }`

Fichier:
- `src/app/api/auth/verify/route.ts`

