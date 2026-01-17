# Points à Corriger - Module de Gestion des Demandes d'Inscription

## Priorité 1 - Critique 🔴

### 1.1 Décomposer les Composants Monolithiques

**Fichier :** `src/components/memberships/MembershipRequestsList.tsx` (1751 lignes)

**Problème :**
- Composant trop volumineux et complexe
- Logique métier mélangée avec présentation
- Impossible à maintenir et tester

**Solution :**
```
MembershipRequestsList.tsx (composant conteneur ~200 lignes)
├── MembershipRequestsFilters.tsx (barre de filtres)
├── MembershipRequestsStats.tsx (cartes de statistiques)
├── MembershipRequestsTable.tsx (liste/grid des demandes)
├── MembershipRequestCard.tsx (carte individuelle ~300 lignes)
│   ├── MembershipRequestActions.tsx (boutons d'action)
│   ├── MembershipRequestPaymentModal.tsx (modal paiement)
│   ├── MembershipRequestApprovalModal.tsx (modal approbation)
│   └── MembershipRequestRejectionModal.tsx (modal rejet)
└── MembershipRequestsPagination.tsx (pagination)
```

**Actions :**
- [ ] Extraire les composants utilitaires (`StatsCard`, etc.)
- [ ] Créer des composants séparés pour chaque modal
- [ ] Extraire la logique métier dans des hooks personnalisés
- [ ] Créer des composants réutilisables pour les actions

---

### 1.2 Implémenter des Tests

**Problème :**
- Aucun test pour le module
- Risque élevé de régression
- Refactoring impossible sans assurance

**Solution :**
```
tests/
├── components/
│   ├── MembershipRequestsList.test.tsx
│   ├── MembershipRequestCard.test.tsx
│   └── MembershipRequestDetails.test.tsx
├── hooks/
│   ├── useMembershipRequests.test.ts
│   └── usePayMembershipRequest.test.ts
├── services/
│   └── MembershipService.test.ts
├── db/
│   └── membership.db.test.ts
└── integration/
    └── membership-request-workflow.test.ts
```

**Actions :**
- [ ] Configurer Vitest/Jest pour les tests
- [ ] Créer des mocks pour Firebase/Firestore
- [ ] Tests unitaires pour les hooks
- [ ] Tests unitaires pour les composants (React Testing Library)
- [ ] Tests d'intégration pour les workflows critiques
- [ ] Tests E2E pour les parcours utilisateur (Playwright)

---

### 1.3 Sécuriser les Routes API et Actions

**Fichiers :** 
- `src/app/api/create-firebase-user-email-pwd/route.ts`
- `src/app/api/create-firebase-user/route.ts`
- `src/components/memberships/MembershipRequestsList.tsx`

**Problèmes :**
- Pas de vérification des permissions admin
- Pas de validation des données d'entrée
- Exposition de données sensibles (mot de passe dans toasts)

**Solution :**
```typescript
// middleware.ts ou vérification dans chaque route
export async function POST(req: NextRequest) {
  // 1. Vérifier l'authentification
  const session = await getServerSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  
  // 2. Vérifier les permissions (rôle admin)
  const user = await getAdminById(session.user.id);
  if (!user || !user.roles.includes('admin')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  
  // 3. Valider les données avec Zod
  const schema = z.object({
    requestId: z.string().min(1),
    membershipType: z.enum(['Adherant', 'Bienfaiteur', 'Sympathisant']),
    // ...
  });
  
  const validatedData = schema.parse(await req.json());
  
  // 4. Ne pas retourner le mot de passe dans la réponse
  return NextResponse.json({ 
    success: true,
    uid: userRecord.uid,
    // Pas de password ici !
  });
}
```

**Actions :**
- [ ] Ajouter vérification de rôle admin dans toutes les routes API
- [ ] Valider toutes les données d'entrée avec Zod
- [ ] Ne pas exposer les mots de passe dans les réponses API
- [ ] Envoyer le mot de passe par email/SMS au lieu de toast
- [ ] Logging des actions administratives pour audit

---

### 1.4 Implémenter un Système de Rollback/Transaction

**Problème :**
- Si l'approbation échoue après création de l'utilisateur, pas de rollback
- Risque de données incohérentes

**Solution :**
```typescript
async function approveMembershipRequest(params: ApprovalParams) {
  const rollbackActions: (() => Promise<void>)[] = [];
  
  try {
    // 1. Créer utilisateur Firebase
    const userRecord = await adminAuth.createUser(...);
    rollbackActions.push(() => adminAuth.deleteUser(userRecord.uid));
    
    // 2. Créer document users
    await createUserDocument(...);
    rollbackActions.push(() => deleteUserDocument(userRecord.uid));
    
    // 3. Créer subscription
    const subscription = await createSubscription(...);
    rollbackActions.push(() => deleteSubscription(subscription.id));
    
    // 4. Mettre à jour statut demande
    await updateMembershipRequestStatus(...);
    
    // Si on arrive ici, tout est OK
    rollbackActions = []; // Nettoyer les rollbacks
  } catch (error) {
    // Rollback en ordre inverse
    for (const rollback of rollbackActions.reverse()) {
      try {
        await rollback();
      } catch (rollbackError) {
        console.error('Erreur lors du rollback:', rollbackError);
        // Log pour intervention manuelle
      }
    }
    throw error;
  }
}
```

**Actions :**
- [ ] Implémenter un système de rollback pour l'approbation
- [ ] Créer des fonctions de nettoyage pour chaque étape
- [ ] Logger les erreurs de rollback pour intervention manuelle
- [ ] Documenter les étapes critiques nécessitant rollback

---

### 1.5 Optimiser la Recherche et les Requêtes

**Fichier :** `src/db/membership.db.ts`

**Problème :**
- Recherche textuelle effectuée côté client
- Pas d'index Firestore pour la recherche
- Performance dégradée avec beaucoup de données

**Solution :**

**Option A : Index Firestore (recherche exacte)**
```typescript
// Créer des index composés pour la recherche
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "identity.email", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "matricule", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Option B : Full-Text Search avec Algolia/Meilisearch**
```typescript
// Indexation automatique lors de la création
await algoliaIndex.saveObject({
  objectID: request.id,
  firstName: request.identity.firstName,
  lastName: request.identity.lastName,
  email: request.identity.email,
  matricule: request.matricule,
  // ... autres champs recherchables
});

// Recherche
const results = await algoliaIndex.search(searchQuery, {
  filters: `status:${status}`,
  hitsPerPage: limit,
});
```

**Actions :**
- [ ] Créer des index Firestore pour les recherches courantes
- [ ] Implémenter la recherche côté serveur (Firestore query)
- [ ] Évaluer l'utilisation d'un service de full-text search (Algolia, Meilisearch)
- [ ] Limiter les résultats à ce qui est nécessaire (pas de `limit: 1000`)

---

## Priorité 2 - Important 🟠

### 2.1 Extraire la Logique Métier des Composants

**Fichier :** `src/components/memberships/MembershipRequestsList.tsx`

**Problème :**
- Fonction `handleApprove` de 90+ lignes dans un composant React
- Logique de vérification entreprise/profession dans le composant
- Impossible à tester isolément

**Solution :**
```typescript
// src/services/memberships/MembershipApprovalService.ts
export class MembershipApprovalService {
  async approveRequest(params: ApprovalParams): Promise<ApprovalResult> {
    // 1. Valider la demande
    await this.validateRequest(params.requestId);
    
    // 2. Vérifier l'existence entreprise/profession
    await this.checkCompanyAndProfession(params);
    
    // 3. Upload PDF si fourni
    const pdfUrl = await this.uploadApprovalPdf(params);
    
    // 4. Créer l'utilisateur Firebase
    const userResult = await this.createFirebaseUser(params);
    
    // 5. Archiver le document
    await this.archiveDocument(params, pdfUrl);
    
    // 6. Mettre à jour le statut
    await this.updateStatus(params);
    
    return { success: true, userResult };
  }
  
  private async validateRequest(requestId: string) {
    // Validation centralisée
  }
  
  private async checkCompanyAndProfession(params: ApprovalParams) {
    // Vérification centralisée
  }
  
  // ... autres méthodes privées
}
```

**Actions :**
- [ ] Créer `MembershipApprovalService` pour l'approbation
- [ ] Créer `MembershipRejectionService` pour le rejet
- [ ] Créer `MembershipCorrectionService` pour les corrections
- [ ] Extraire toutes les logiques métier des composants
- [ ] Tester les services unitairement

---

### 2.2 Centraliser les Utilitaires

**Problème :**
- Fonctions `formatDate`, `getStatusBadge` dupliquées
- Pas de réutilisation
- Maintenance difficile

**Solution :**
```typescript
// src/utils/membership-requests.ts
export function formatMembershipRequestDate(timestamp: any): string {
  // Implémentation unique
}

export function getMembershipStatusBadge(status: MembershipRequestStatus): React.ReactNode {
  // Implémentation unique avec composant réutilisable
}

export function getIdentityDisplayName(request: MembershipRequest): string {
  // Implémentation unique
}
```

**Actions :**
- [ ] Créer fichier `src/utils/membership-requests.ts`
- [ ] Déplacer toutes les fonctions utilitaires
- [ ] Importer dans les composants au lieu de dupliquer
- [ ] Tester les fonctions utilitaires

---

### 2.3 Améliorer la Gestion des Erreurs

**Problème :**
- Erreurs silencieuses
- Pas de notification utilisateur cohérente
- Pas de logging centralisé

**Solution :**
```typescript
// src/utils/error-handler.ts
export class MembershipRequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public severity: 'error' | 'warning' | 'info' = 'error'
  ) {
    super(message);
  }
}

export function handleMembershipRequestError(
  error: unknown,
  context: string
): void {
  // 1. Logger l'erreur
  console.error(`[${context}]`, error);
  
  // 2. Notifier l'utilisateur
  if (error instanceof MembershipRequestError) {
    toast[error.severity](error.userMessage, {
      description: error.message,
      duration: 5000,
    });
  } else {
    toast.error('Une erreur est survenue', {
      description: 'Veuillez réessayer ou contacter le support.',
      duration: 5000,
    });
  }
  
  // 3. Envoyer à un service de tracking (optionnel)
  // trackError(error, context);
}
```

**Actions :**
- [ ] Créer des classes d'erreur spécifiques
- [ ] Implémenter un gestionnaire d'erreurs centralisé
- [ ] Remplacer tous les `catch` silencieux
- [ ] Ajouter des notifications utilisateur cohérentes
- [ ] Configurer un service de tracking d'erreurs (Sentry, etc.)

---

### 2.4 Optimiser les Requêtes de Statistiques

**Fichier :** `src/hooks/useMembershipRequests.ts`

**Problème :**
- `useMembershipRequestsStats` charge 1000 items pour chaque statut
- Calcul des statistiques côté client
- Coûteux et lent

**Solution :**

**Option A : Requête Agregée Firestore (Cloud Functions)**
```typescript
// functions/src/membership-stats.ts
export async function calculateMembershipStats(): Promise<MembershipStats> {
  const stats = await admin.firestore()
    .collection('membership-requests')
    .aggregate({
      total: count(),
      byStatus: {
        pending: count(status == 'pending'),
        approved: count(status == 'approved'),
        // ...
      },
      todayCount: count(createdAt >= startOfDay),
    });
    
  return stats;
}

// Hook mis à jour
export function useMembershipRequestsStats() {
  return useQuery({
    queryKey: ['membershipRequestsStats'],
    queryFn: async () => {
      const response = await fetch('/api/membership-stats');
      return response.json();
    },
  });
}
```

**Option B : Cache des Statistiques**
```typescript
// Calculer une fois par heure et mettre en cache
export function useMembershipRequestsStats() {
  return useQuery({
    queryKey: ['membershipRequestsStats'],
    queryFn: async () => {
      // Utiliser une route API qui cache les résultats
      const response = await fetch('/api/membership-stats');
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 heure
    gcTime: 1000 * 60 * 60 * 2, // 2 heures
  });
}
```

**Actions :**
- [ ] Créer une Cloud Function pour calculer les stats
- [ ] Utiliser les agrégations Firestore au lieu de charger tous les documents
- [ ] Mettre en cache les statistiques (1 heure minimum)
- [ ] Calculer seulement les stats nécessaires

---

### 2.5 Améliorer la Sécurité des Codes de Sécurité

**Fichier :** `src/db/membership.db.ts`

**Problème :**
- Code à 6 chiffres (bruteforce possible)
- Pas de limite de tentatives
- Pas de logging des tentatives

**Solution :**
```typescript
// Améliorer la génération
function generateSecurityCode(): string {
  // Utiliser crypto.randomInt pour plus de sécurité
  const crypto = require('crypto');
  return crypto.randomInt(100000, 999999).toString().padStart(6, '0');
}

// Ajouter un système de tentatives
interface SecurityCodeAttempt {
  requestId: string;
  code: string;
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
}

// Limiter les tentatives (ex: 5 tentatives max par heure)
async function validateSecurityCode(
  requestId: string,
  code: string,
  ipAddress?: string
): Promise<{ valid: boolean; attemptsRemaining: number }> {
  // 1. Vérifier le nombre de tentatives récentes
  const recentAttempts = await getRecentAttempts(requestId, ipAddress);
  if (recentAttempts.length >= 5) {
    return { valid: false, attemptsRemaining: 0 };
  }
  
  // 2. Vérifier le code
  const request = await getMembershipRequestById(requestId);
  const valid = request?.securityCode === code && 
                !request.securityCodeUsed &&
                new Date(request.securityCodeExpiry!) > new Date();
  
  // 3. Logger la tentative
  await logSecurityCodeAttempt({
    requestId,
    code,
    timestamp: new Date(),
    success: valid,
    ipAddress,
  });
  
  return {
    valid,
    attemptsRemaining: 5 - recentAttempts.length - 1,
  };
}
```

**Actions :**
- [ ] Utiliser `crypto.randomInt` pour génération plus sécurisée
- [ ] Implémenter un système de tentatives avec limite
- [ ] Logger toutes les tentatives (succès et échecs)
- [ ] Ajouter un délai entre les tentatives (rate limiting)
- [ ] Considérer l'augmentation à 8 chiffres pour plus de sécurité

---

### 2.6 Documenter le Code

**Problème :**
- Pas de JSDoc pour les fonctions complexes
- Types `any` utilisés partout
- Pas de documentation des workflows

**Solution :**
```typescript
/**
 * Crée une nouvelle demande d'adhésion avec validation et upload des fichiers
 * 
 * @param formData - Données du formulaire d'inscription validées par Zod
 * @returns Promise<string> - Le matricule de la demande créée (utilisé comme ID)
 * @throws {Error} - Si la validation échoue ou si l'upload des fichiers échoue
 * 
 * @example
 * ```typescript
 * const requestId = await createMembershipRequest({
 *   identity: { firstName: 'John', lastName: 'Doe', ... },
 *   address: { ... },
 *   documents: { ... }
 * });
 * console.log('Demande créée:', requestId);
 * ```
 */
export async function createMembershipRequest(
  formData: RegisterFormData
): Promise<string> {
  // Implémentation
}
```

**Actions :**
- [ ] Ajouter JSDoc à toutes les fonctions publiques
- [ ] Documenter les workflows complexes (approbation, correction, etc.)
- [ ] Créer un README pour le module
- [ ] Ajouter des exemples d'utilisation
- [ ] Documenter les types complexes

---

## Priorité 3 - Améliorations 🟡

### 3.1 Refactoriser la Transformation de Données

**Fichier :** `src/db/membership.db.ts`

**Problème :**
- Fonction `transformDBToMembershipRequest` opaque
- Gestion des timestamps Firebase non documentée
- Utilisation de `as any` pour contourner les types

**Solution :**
```typescript
// Créer des helpers typés pour les conversions
export function firebaseTimestampToDate(timestamp: any): Date {
  if (!timestamp) throw new Error('Timestamp is required');
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  throw new Error('Invalid timestamp format');
}

// Utiliser dans la transformation
function transformDBToMembershipRequest(dbData: MembershipRequestDB): MembershipRequest {
  return {
    ...baseData,
    createdAt: firebaseTimestampToDate(dbData.createdAt),
    updatedAt: firebaseTimestampToDate(dbData.updatedAt),
    // ...
  };
}
```

**Actions :**
- [ ] Créer des helpers typés pour les conversions Firebase
- [ ] Éliminer tous les `as any`
- [ ] Typer correctement `MembershipRequestDB`
- [ ] Documenter les transformations

---

### 3.2 Extraire les Constantes

**Problème :**
- Magic numbers partout (48 heures, 6 chiffres, 1000 items, etc.)
- Pas de configuration centralisée

**Solution :**
```typescript
// src/constantes/membership-requests.ts
export const MEMBERSHIP_REQUEST_CONFIG = {
  SECURITY_CODE: {
    LENGTH: 6,
    EXPIRY_HOURS: 48,
    MAX_ATTEMPTS: 5,
    ATTEMPT_WINDOW_HOURS: 1,
  },
  PAGINATION: {
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
    STATS_LIMIT: 1000, // Pour les statistiques uniquement
  },
  CACHE: {
    STALE_TIME_MS: 1000 * 60 * 5, // 5 minutes
    GC_TIME_MS: 1000 * 60 * 10, // 10 minutes
    STATS_STALE_TIME_MS: 1000 * 60 * 60, // 1 heure
  },
  VALIDATION: {
    MIN_PHONE_LENGTH: 8,
    MAX_PHONE_LENGTH: 15,
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 100,
  },
} as const;
```

**Actions :**
- [ ] Créer fichier de configuration centralisé
- [ ] Remplacer tous les magic numbers
- [ ] Rendre la configuration modifiable via variables d'environnement

---

### 3.3 Améliorer la Gestion d'État

**Problème :**
- États locaux dupliqués avec cache React Query
- Pas de synchronisation entre pages

**Solution :**
```typescript
// Créer un contexte pour l'état des demandes
export const MembershipRequestsContext = createContext<{
  filters: MembershipRequestFilters;
  setFilters: (filters: MembershipRequestFilters) => void;
  refresh: () => void;
}>();

// Utiliser dans les composants
export function MembershipRequestsProvider({ children }) {
  const [filters, setFilters] = useState(defaultFilters);
  const queryClient = useQueryClient();
  
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['membershipRequests'] });
  }, [queryClient]);
  
  return (
    <MembershipRequestsContext.Provider value={{ filters, setFilters, refresh }}>
      {children}
    </MembershipRequestsContext.Provider>
  );
}
```

**Actions :**
- [ ] Créer un contexte pour l'état global
- [ ] Éliminer les états locaux redondants
- [ ] Synchroniser l'état entre liste et détails

---

### 3.4 Améliorer les Types TypeScript

**Problème :**
- Utilisation excessive de `any`
- Types incomplets
- Assertions de type non sûres

**Solution :**
```typescript
// Typer correctement les données Firestore
interface MembershipRequestDBSnapshot {
  id: string;
  data: () => MembershipRequestDB;
}

// Utiliser dans les fonctions
export async function getMembershipRequestById(
  requestId: string
): Promise<MembershipRequest | null> {
  const doc = await getDoc(docRef) as DocumentSnapshot<MembershipRequestDB>;
  
  if (!doc.exists()) {
    return null;
  }
  
  return transformDBToMembershipRequest({
    id: doc.id,
    ...doc.data()!,
  });
}
```

**Actions :**
- [ ] Éliminer tous les `any`
- [ ] Créer des types précis pour Firestore
- [ ] Utiliser les types génériques de Firebase
- [ ] Ajouter des guards de type là où nécessaire

---

### 3.5 Implémenter le Lazy Loading

**Problème :**
- Toutes les images chargées immédiatement
- Pas de virtualisation pour les longues listes

**Solution :**
```typescript
// Utiliser next/image avec lazy loading
<Image
  src={request.identity.photoURL}
  alt={`Photo de ${name}`}
  width={64}
  height={64}
  loading="lazy" // Lazy loading par défaut
  placeholder="blur" // Avec blur placeholder
/>

// Virtualisation pour les longues listes
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: requests.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200, // Hauteur estimée par item
});
```

**Actions :**
- [ ] Activer le lazy loading pour toutes les images
- [ ] Implémenter la virtualisation pour les listes > 100 items
- [ ] Ajouter des placeholders de chargement

---

### 3.6 Créer un Système d'Archivage

**Problème :**
- Pas de stratégie pour les anciennes demandes
- Accumulation infinie de données

**Solution :**
```typescript
// Cloud Function pour archiver les anciennes demandes
export async function archiveOldMembershipRequests() {
  const archiveDate = new Date();
  archiveDate.setFullYear(archiveDate.getFullYear() - 2); // 2 ans
  
  const oldRequests = await admin.firestore()
    .collection('membership-requests')
    .where('createdAt', '<', archiveDate)
    .where('status', 'in', ['approved', 'rejected'])
    .limit(100)
    .get();
  
  for (const doc of oldRequests.docs) {
    // Déplacer vers collection archivée
    await admin.firestore()
      .collection('membership-requests-archived')
      .doc(doc.id)
      .set(doc.data());
    
    // Supprimer de la collection active
    await doc.ref.delete();
  }
}

// Planifier l'exécution mensuelle
export const archiveOldRequests = functions.pubsub
  .schedule('0 0 1 * *') // Le 1er de chaque mois à minuit
  .onRun(archiveOldMembershipRequests);
```

**Actions :**
- [ ] Créer une Cloud Function d'archivage
- [ ] Définir une politique d'archivage (ex: 2 ans après traitement)
- [ ] Planifier l'exécution automatique
- [ ] Créer une interface pour consulter les archives

---

## Plan d'Action Recommandé

### Phase 1 : Stabilisation (Semaine 1-2)
1. ✅ Ajouter vérification des permissions dans les routes API
2. ✅ Implémenter le système de rollback pour l'approbation
3. ✅ Améliorer la sécurité des codes de sécurité
4. ✅ Centraliser la gestion des erreurs

### Phase 2 : Refactoring (Semaine 3-4)
5. ✅ Décomposer `MembershipRequestsList.tsx`
6. ✅ Extraire la logique métier dans des services
7. ✅ Centraliser les utilitaires
8. ✅ Améliorer les types TypeScript

### Phase 3 : Tests (Semaine 5-6)
9. ✅ Implémenter les tests unitaires
10. ✅ Implémenter les tests d'intégration
11. ✅ Implémenter les tests E2E

### Phase 4 : Optimisations (Semaine 7-8)
12. ✅ Optimiser la recherche (index Firestore)
13. ✅ Optimiser les statistiques (agrégations)
14. ✅ Implémenter le lazy loading
15. ✅ Améliorer la documentation

---

## Checklist de Vérification

Avant de considérer le module comme "production-ready" :

### Sécurité
- [ ] Toutes les routes API vérifient les permissions
- [ ] Toutes les données d'entrée sont validées
- [ ] Pas d'exposition de données sensibles
- [ ] Codes de sécurité avec limite de tentatives
- [ ] Logging des actions administratives

### Tests
- [ ] Tests unitaires pour tous les services
- [ ] Tests unitaires pour tous les hooks
- [ ] Tests unitaires pour les composants principaux
- [ ] Tests d'intégration pour les workflows
- [ ] Tests E2E pour les parcours utilisateur
- [ ] Couverture de code > 80%

### Performance
- [ ] Recherche optimisée (index Firestore ou service dédié)
- [ ] Statistiques calculées efficacement
- [ ] Lazy loading des images
- [ ] Virtualisation pour les longues listes
- [ ] Cache optimisé

### Maintenabilité
- [ ] Composants < 300 lignes
- [ ] Pas de duplication de code
- [ ] Documentation complète (JSDoc, README)
- [ ] Types TypeScript complets (pas de `any`)
- [ ] Constantes centralisées

### Qualité
- [ ] Pas de warnings ESLint
- [ ] Code conforme aux standards du projet
- [ ] Gestion d'erreurs cohérente
- [ ] Logs structurés
- [ ] Rollback pour les opérations critiques
