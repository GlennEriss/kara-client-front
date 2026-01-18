# Refactorisation Flow d'Authentification V2

## 🔴 Problème Identifié

### Erreur en Production
```
Erreur lors de la vérification de l'existence de l'utilisateur: FirebaseError: Missing or insufficient permissions.
Erreur de connexion: Error: USER_NOT_FOUND
Toast: "Ce matricule n'existe pas dans notre base de données."
```

### Cause Racine

Il existe **deux services de login différents** qui vérifient l'existence de l'utilisateur de manière différente :

1. **Ancien service** (`src/services/login/LoginService.ts`) :
   - Utilise l'API route `/api/firebase/auth/get-user/by-uid`
   - Vérifie dans **Firebase Auth** (pas Firestore)
   - ✅ Fonctionne car utilise Admin SDK côté serveur

2. **Nouveau service** (`src/domains/auth/services/LoginService.ts`) :
   - Utilise `UserRepository.userExists()`
   - Vérifie dans **Firestore** (collections `users` et `admins`)
   - ❌ Échoue car les règles Firestore peuvent bloquer la lecture côté client

### Problème de Permissions

Même si les règles Firestore permettent `allow read: if true` pour `users` et `admins`, il peut y avoir :
- Des problèmes de cache des règles
- Des problèmes d'environnement (prod vs dev)
- Des erreurs réseau qui sont catchées et retournent `false`

---

## ✅ Solution : Flow d'Authentification V2 Unifié

### Architecture Proposée

```
┌─────────────────────────────────────────────────────────────┐
│                    LoginMembership.tsx                       │
│                    (Composant UI)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    useLogin Hook                             │
│                    (Hook React)                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              LoginService (domains/auth/services)            │
│              - signIn(matricule, email, password)            │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────────┐
│ API Route        │          │ Firebase Auth        │
│ /api/auth/       │          │ signInWithEmailAnd   │
│ check-user       │          │ Password             │
│                  │          │                      │
│ Vérifie dans:    │          │                      │
│ - Firebase Auth  │          │                      │
│ - Firestore      │          │                      │
│   (users + admins)│          │                      │
└──────────────────┘          └──────────────────────┘
```

### Changements à Apporter

#### 1. Créer une API Route Unifiée pour Vérifier l'Utilisateur

**Fichier** : `src/app/api/auth/check-user/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/firebase/adminAuth";
import { adminFirestore } from "@/firebase/adminFirestore";

/**
 * API Route pour vérifier l'existence d'un utilisateur
 * 
 * Vérifie dans :
 * 1. Firebase Auth (par UID/matricule)
 * 2. Firestore collection 'users' (par UID/matricule)
 * 3. Firestore collection 'admins' (par UID/matricule) - compatibilité ancienne version
 * 
 * Body: { uid: string }
 * Returns: { found: boolean, inAuth: boolean, inUsers: boolean, inAdmins: boolean }
 */
export async function POST(req: NextRequest) {
  if (!adminAuth || !adminFirestore) {
    return NextResponse.json(
      { error: "Firebase Admin non configuré" },
      { status: 503 }
    );
  }

  try {
    const { uid } = await req.json();
    if (!uid || typeof uid !== "string") {
      return NextResponse.json({ error: "uid requis" }, { status: 400 });
    }

    const trimmedUid = uid.trim();
    const results = {
      found: false,
      inAuth: false,
      inUsers: false,
      inAdmins: false,
    };

    // 1) Vérifier dans Firebase Auth
    try {
      const userRecord = await adminAuth.getUser(trimmedUid);
      results.inAuth = true;
      results.found = true;
    } catch (err: any) {
      if (err?.code !== "auth/user-not-found") {
        console.error("[check-user] Erreur Firebase Auth:", err);
      }
    }

    // 2) Vérifier dans Firestore collection 'users'
    try {
      const userDoc = await adminFirestore.collection('users').doc(trimmedUid).get();
      if (userDoc.exists) {
        results.inUsers = true;
        results.found = true;
      }
    } catch (err: any) {
      console.error("[check-user] Erreur Firestore users:", err);
    }

    // 3) Vérifier dans Firestore collection 'admins' (compatibilité)
    if (!results.found) {
      try {
        const adminDoc = await adminFirestore.collection('admins').doc(trimmedUid).get();
        if (adminDoc.exists) {
          results.inAdmins = true;
          results.found = true;
        }
      } catch (err: any) {
        console.error("[check-user] Erreur Firestore admins:", err);
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error("[check-user] Erreur inattendue:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification", details: error?.message },
      { status: 500 }
    );
  }
}
```

#### 2. Modifier UserRepository pour Utiliser l'API Route

**Fichier** : `src/domains/auth/repositories/UserRepository.ts`

```typescript
/**
 * Vérifie si un utilisateur existe par son UID
 * 
 * Utilise l'API route pour vérifier dans Firebase Auth et Firestore
 * (users + admins) pour éviter les problèmes de permissions côté client.
 * 
 * @param uid - L'UID de l'utilisateur
 * @returns true si l'utilisateur existe, false sinon
 */
async userExists(uid: string): Promise<boolean> {
  try {
    // Utiliser l'API route pour éviter les problèmes de permissions Firestore
    const response = await fetch('/api/auth/check-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid.trim() }),
    });

    if (!response.ok) {
      console.error('[UserRepository.userExists] Erreur API:', response.status);
      return false;
    }

    const result = await response.json();
    
    // Log pour déboguer
    if (typeof window !== 'undefined') {
      console.log('[UserRepository.userExists] Résultat:', {
        uid: uid.trim(),
        found: result.found,
        inAuth: result.inAuth,
        inUsers: result.inUsers,
        inAdmins: result.inAdmins,
      });
    }

    return result.found === true;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'existence de l\'utilisateur:', error);
    return false;
  }
}
```

#### 3. S'assurer que LoginService Utilise le Bon Repository

**Fichier** : `src/domains/auth/services/LoginService.ts`

Le service est déjà correct, il utilise `this.userRepository.userExists()` qui appellera maintenant l'API route.

#### 4. Vérifier que l'API Route Admin Firestore Existe

**Fichier** : `src/firebase/adminFirestore.ts` (à créer si n'existe pas)

```typescript
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from './adminApp';

export const adminFirestore = adminApp ? getFirestore(adminApp) : null;
```

---

## 🔧 Implémentation

### Étape 1 : Créer l'API Route

1. Créer `src/app/api/auth/check-user/route.ts`
2. Vérifier que `adminFirestore` est disponible dans `src/firebase/adminFirestore.ts`

### Étape 2 : Modifier UserRepository

1. Modifier `userExists()` pour utiliser l'API route au lieu de Firestore directement
2. Garder les logs de débogage

### Étape 3 : Tester

1. Tester en local
2. Tester en production
3. Vérifier les logs dans la console

---

## 📊 Avantages de cette Solution

1. ✅ **Pas de problèmes de permissions** : L'API route utilise Admin SDK (pas de restrictions)
2. ✅ **Vérification complète** : Vérifie dans Firebase Auth ET Firestore (users + admins)
3. ✅ **Compatibilité** : Supporte les anciens comptes dans `admins`
4. ✅ **Traçabilité** : Logs détaillés pour le débogage
5. ✅ **Sécurité** : Vérification côté serveur (pas exposée au client)

---

## 🚨 Points d'Attention

1. **Admin Firestore** : S'assurer que `adminFirestore` est correctement initialisé
2. **Performance** : L'API route fait 3 vérifications (Auth + users + admins), mais c'est acceptable pour la connexion
3. **Cache** : Pas de cache pour éviter les problèmes de synchronisation

---

## 📝 Checklist d'Implémentation

- [ ] Créer `src/app/api/auth/check-user/route.ts`
- [ ] Vérifier/Créer `src/firebase/adminFirestore.ts`
- [ ] Modifier `UserRepository.userExists()` pour utiliser l'API route
- [ ] Tester en local
- [ ] Tester en production
- [ ] Vérifier les logs
- [ ] Documenter les changements
