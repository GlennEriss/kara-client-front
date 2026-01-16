# État Actuel du Module Logout - AVANT Refactoring

## 📍 Localisation du Code

### 1. `src/lib/auth-utils.ts`

```typescript
export async function logout() {
  try {
    // Déconnexion Firebase
    await signOut(auth)
    
    // Supprimer le cookie d'authentification
    const isProduction = window.location.protocol === 'https:';
    const cookieOptions = `path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict${isProduction ? '; secure' : ''}`;
    document.cookie = `auth-token=; ${cookieOptions}`;
    
    // Redirection vers la page de connexion
    window.location.href = '/login'
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
  }
}
```

**Problèmes :**
- Fonction globale, pas dans le domaine auth
- Pas de service dédié
- Pas de hook React
- Gestion d'erreur basique (juste console.error)
- Redirection avec `window.location.href` (pas optimal)

### 2. `src/components/layout/AppSidebar.tsx`

```typescript
const handleLogout = async () => {
  await signOut(auth)
  router.push(routes.public.login)
}
```

**Problèmes :**
- Logique inline dans le composant
- Ne supprime pas le cookie
- Duplication avec `auth-utils.ts`
- Pas de gestion d'erreur

## 🔍 Analyse

- **Architecture** : Logout dispersé, pas de service dédié
- **Réutilisabilité** : Code dupliqué
- **Tests** : Aucun test
- **Maintenabilité** : Difficile à maintenir (plusieurs endroits)
