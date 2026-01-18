# Design Patterns - Application à la Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document identifie les cas dans le code de la fonctionnalité "corrections" qui nécessitent l'utilisation de **design patterns** pour améliorer la qualité, la maintenabilité et éviter le code de débutant.

---

## 🎯 Cas Identifiés Nécessitant des Design Patterns

### 1. **Service Layer - Validation et Orchestration**

**Fichier** : `src/domains/memberships/services/MembershipServiceV2.ts`  
**Méthode** : `requestCorrections()`

#### ❌ Problème Actuel (Code de débutant)

```typescript
async requestCorrections(params: RequestCorrectionsParams): Promise<{
  securityCode: string
  whatsAppUrl?: string
}> {
  // Validations répétitives et dispersées
  if (!corrections || corrections.length === 0) {
    throw new Error('Au moins une correction est requise')
  }
  
  for (const correction of corrections) {
    if (!correction || correction.trim().length === 0) {
      throw new Error('Chaque correction doit contenir au moins un caractère')
    }
  }
  
  // Logique métier mélangée avec la génération
  const securityCode = generateSecurityCode()
  const expiryDate = calculateCodeExpiry(48)
  const correctionsText = corrections.join('\n')
  
  // Mise à jour directe
  await this.repository.updateStatus(requestId, 'under_review', {
    reviewNote: correctionsText,
    securityCode,
    securityCodeExpiry: expiryDate,
    securityCodeUsed: false,
    processedBy: adminId,
  })
  
  // Génération WhatsApp conditionnelle
  let whatsAppUrl: string | undefined
  if (sendWhatsApp && request.identity.contacts && request.identity.contacts[0]) {
    const phoneNumber = request.identity.contacts[0]
    const message = `Bonjour ${request.identity.firstName},...`
    whatsAppUrl = generateWhatsAppUrl(phoneNumber, message)
  }
  
  return { securityCode, whatsAppUrl }
}
```

#### ✅ Solution : **Strategy Pattern + Builder Pattern**

**Pattern 1 : Strategy Pattern pour les Validations**

```typescript
// src/domains/memberships/services/validators/CorrectionValidator.ts
export class CorrectionValidator {
  static validateCorrections(corrections: string[]): void {
    if (!corrections || corrections.length === 0) {
      throw new Error('Au moins une correction est requise')
    }
    
    for (const correction of corrections) {
      if (!correction || correction.trim().length === 0) {
        throw new Error('Chaque correction doit contenir au moins un caractère')
      }
    }
  }
  
  static validateRequest(request: MembershipRequest | null): void {
    if (!request) {
      throw new Error(`Demande d'adhésion introuvable`)
    }
  }
}

// src/domains/memberships/services/validators/SecurityCodeValidator.ts
export class SecurityCodeValidator {
  static validateCodeFormat(code: string): void {
    if (!/^\d{6}$/.test(code)) {
      throw new Error('Le code de sécurité doit contenir 6 chiffres')
    }
  }
  
  static validateCodeExpiry(expiry: Date): void {
    if (expiry.getTime() <= Date.now()) {
      throw new Error('La date d\'expiration doit être dans le futur')
    }
  }
}
```

**Pattern 2 : Builder Pattern pour la Construction de la Demande de Corrections**

```typescript
// src/domains/memberships/services/builders/CorrectionRequestBuilder.ts
export class CorrectionRequestBuilder {
  private corrections: string[] = []
  private adminId: string = ''
  private requestId: string = ''
  private sendWhatsApp: boolean = false
  
  withCorrections(corrections: string[]): this {
    CorrectionValidator.validateCorrections(corrections)
    this.corrections = corrections
    return this
  }
  
  withAdmin(adminId: string): this {
    if (!adminId) {
      throw new Error('ID admin requis')
    }
    this.adminId = adminId
    return this
  }
  
  withRequest(requestId: string): this {
    if (!requestId) {
      throw new Error('ID demande requis')
    }
    this.requestId = requestId
    return this
  }
  
  withWhatsApp(send: boolean): this {
    this.sendWhatsApp = send
    return this
  }
  
  async build(): Promise<CorrectionRequestData> {
    // Validation finale
    if (!this.corrections.length || !this.adminId || !this.requestId) {
      throw new Error('Tous les champs requis doivent être fournis')
    }
    
    return {
      corrections: this.corrections,
      adminId: this.adminId,
      requestId: this.requestId,
      sendWhatsApp: this.sendWhatsApp,
    }
  }
}
```

**Pattern 3 : Factory Pattern pour la Génération de Code et WhatsApp**

```typescript
// src/domains/memberships/services/factories/SecurityCodeFactory.ts
export class SecurityCodeFactory {
  static create(expiryHours: number = 48): SecurityCodeData {
    const code = generateSecurityCode()
    const expiry = calculateCodeExpiry(expiryHours)
    
    SecurityCodeValidator.validateCodeFormat(code)
    SecurityCodeValidator.validateCodeExpiry(expiry)
    
    return {
      code,
      expiry,
      used: false,
    }
  }
}

// src/domains/memberships/services/factories/WhatsAppUrlFactory.ts
export class WhatsAppUrlFactory {
  static create(
    phoneNumber: string | undefined,
    message: string
  ): string | undefined {
    if (!phoneNumber) {
      return undefined
    }
    
    try {
      return generateWhatsAppUrl(phoneNumber, message)
    } catch (error) {
      console.warn('[WhatsAppUrlFactory] Erreur génération URL:', error)
      return undefined
    }
  }
}
```

**Service Refactorisé avec Patterns**

```typescript
async requestCorrections(params: RequestCorrectionsParams): Promise<{
  securityCode: string
  whatsAppUrl?: string
}> {
  // Builder pour construire la demande
  const requestData = await new CorrectionRequestBuilder()
    .withCorrections(params.corrections)
    .withAdmin(params.adminId)
    .withRequest(params.requestId)
    .withWhatsApp(params.sendWhatsApp || false)
    .build()
  
  // Récupérer la demande
  const request = await this.repository.getById(requestData.requestId)
  CorrectionValidator.validateRequest(request)
  
  // Factory pour générer le code de sécurité
  const securityCodeData = SecurityCodeFactory.create(48)
  
  // Transformer les corrections
  const correctionsText = requestData.corrections.join('\n')
  
  // Mise à jour via repository
  await this.repository.updateStatus(requestData.requestId, 'under_review', {
    reviewNote: correctionsText,
    securityCode: securityCodeData.code,
    securityCodeExpiry: securityCodeData.expiry,
    securityCodeUsed: securityCodeData.used,
    processedBy: requestData.adminId,
  })
  
  // Factory pour générer l'URL WhatsApp
  const phoneNumber = request.identity.contacts?.[0]
  const message = this.buildWhatsAppMessage(request, correctionsText, securityCodeData.code)
  const whatsAppUrl = WhatsAppUrlFactory.create(phoneNumber, message)
  
  return {
    securityCode: securityCodeData.code,
    whatsAppUrl,
  }
}

private buildWhatsAppMessage(
  request: MembershipRequest,
  correctionsText: string,
  securityCode: string
): string {
  return `Bonjour ${request.identity.firstName},\n\nVotre demande d'adhésion nécessite des corrections:\n\n${correctionsText}\n\nUtilisez le code de sécurité suivant pour accéder aux corrections: ${securityCode}`
}
```

---

### 2. **Repository Layer - Transformation de Données**

**Fichier** : `src/domains/memberships/repositories/MembershipRepositoryV2.ts`  
**Méthode** : `updateStatus()` avec champs de correction

#### ❌ Problème Actuel

```typescript
// Transformation manuelle et répétitive
await this.repository.updateStatus(requestId, 'under_review', {
  reviewNote: correctionsText,
  securityCode,
  securityCodeExpiry: expiryDate,
  securityCodeUsed: false,
  processedBy: adminId,
})
```

#### ✅ Solution : **Mapper Pattern**

```typescript
// src/domains/memberships/repositories/mappers/CorrectionDataMapper.ts
export class CorrectionDataMapper {
  static toFirestoreUpdate(data: {
    corrections: string[]
    securityCode: string
    securityCodeExpiry: Date
    adminId: string
  }): Partial<MembershipRequest> {
    return {
      reviewNote: data.corrections.join('\n'),
      securityCode: data.securityCode,
      securityCodeExpiry: data.securityCodeExpiry,
      securityCodeUsed: false,
      processedBy: data.adminId,
      updatedAt: serverTimestamp(),
    }
  }
  
  static toDomain(data: any): CorrectionRequest | null {
    if (!data.securityCode || !data.reviewNote) {
      return null
    }
    
    return {
      requestId: data.id,
      reviewNote: data.reviewNote,
      securityCode: data.securityCode,
      isVerified: false,
    }
  }
}
```

---

### 3. **Component Layer - Gestion d'État et Actions**

**Fichier** : `src/domains/memberships/components/page/MembershipRequestsPageV2.tsx`  
**Méthode** : `handleCorrections()`

#### ❌ Problème Actuel

```typescript
const handleCorrections = async (data: {
  corrections: string[]
  sendWhatsApp?: boolean
}): Promise<{ securityCode: string; whatsAppUrl?: string }> => {
  if (!selectedRequest?.id || !user?.uid) {
    throw new Error('Demande ou utilisateur non défini')
  }

  setLoadingActions(prev => ({ ...prev, [`corrections-${selectedRequest.id}`]: true }))

  try {
    const result = await requestCorrectionsMutation.mutateAsync({
      requestId: selectedRequest.id,
      adminId: user.uid,
      corrections: data.corrections,
      sendWhatsApp: data.sendWhatsApp,
    })

    toast.success('Corrections demandées', {
      description: `Code de sécurité : ${result.securityCode}`,
    })

    setCorrectionsModalOpen(false)
    setSelectedRequest(null)

    return result
  } catch (error: any) {
    toast.error('Erreur lors de la demande de corrections', {
      description: error.message || 'Une erreur est survenue.',
    })
    throw error
  } finally {
    setLoadingActions(prev => ({ ...prev, [`corrections-${selectedRequest.id}`]: false }))
  }
}
```

#### ✅ Solution : **Command Pattern + Mediator Pattern**

**Pattern 1 : Command Pattern pour les Actions**

```typescript
// src/domains/memberships/commands/RequestCorrectionsCommand.ts
export class RequestCorrectionsCommand {
  constructor(
    private service: MembershipServiceV2,
    private requestId: string,
    private adminId: string,
    private corrections: string[],
    private sendWhatsApp: boolean
  ) {}
  
  async execute(): Promise<{ securityCode: string; whatsAppUrl?: string }> {
    return await this.service.requestCorrections({
      requestId: this.requestId,
      adminId: this.adminId,
      corrections: this.corrections,
      sendWhatsApp: this.sendWhatsApp,
    })
  }
}
```

**Pattern 2 : Mediator Pattern pour Orchestrer les Actions UI**

```typescript
// src/domains/memberships/mediators/CorrectionsMediator.ts
export class CorrectionsMediator {
  constructor(
    private command: RequestCorrectionsCommand,
    private onSuccess: (result: any) => void,
    private onError: (error: Error) => void,
    private setLoading: (loading: boolean) => void
  ) {}
  
  async execute(): Promise<void> {
    this.setLoading(true)
    
    try {
      const result = await this.command.execute()
      
      toast.success('Corrections demandées', {
        description: `Code de sécurité : ${result.securityCode}`,
      })
      
      this.onSuccess(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue.'
      
      toast.error('Erreur lors de la demande de corrections', {
        description: message,
      })
      
      this.onError(error as Error)
    } finally {
      this.setLoading(false)
    }
  }
}
```

**Component Refactorisé**

```typescript
const handleCorrections = async (data: {
  corrections: string[]
  sendWhatsApp?: boolean
}): Promise<{ securityCode: string; whatsAppUrl?: string }> => {
  if (!selectedRequest?.id || !user?.uid) {
    throw new Error('Demande ou utilisateur non défini')
  }

  const command = new RequestCorrectionsCommand(
    MembershipServiceV2.getInstance(),
    selectedRequest.id,
    user.uid,
    data.corrections,
    data.sendWhatsApp || false
  )
  
  const mediator = new CorrectionsMediator(
    command,
    (result) => {
      setCorrectionsModalOpen(false)
      setSelectedRequest(null)
    },
    (error) => {
      // Gestion d'erreur déjà faite dans le mediator
    },
    (loading) => {
      setLoadingActions(prev => ({ 
        ...prev, 
        [`corrections-${selectedRequest.id}`]: loading 
      }))
    }
  )
  
  return await mediator.execute()
}
```

---

### 4. **Utils Layer - Génération et Validation**

**Fichier** : `src/domains/memberships/utils/securityCode.ts`  
**Fichier** : `src/domains/memberships/utils/whatsappUrl.ts`

#### ❌ Problème Actuel

```typescript
// Fonctions utilitaires isolées sans organisation
export function generateSecurityCode(): string {
  const min = MEMBERSHIP_REQUEST_SECURITY_CODE.MIN_VALUE
  const max = MEMBERSHIP_REQUEST_SECURITY_CODE.MAX_VALUE
  const code = Math.floor(Math.random() * (max - min + 1)) + min
  return code.toString()
}

export function isSecurityCodeValid(info: SecurityCodeInfo): boolean {
  if (!info.code) return false
  if (info.used) return false
  if (!info.expiry) return false
  if (info.expiry.getTime() <= now.getTime()) return false
  return true
}
```

#### ✅ Solution : **Strategy Pattern + Chain of Responsibility**

**Pattern 1 : Strategy Pattern pour les Validations**

```typescript
// src/domains/memberships/utils/validators/SecurityCodeValidationStrategy.ts
export interface SecurityCodeValidationStrategy {
  validate(info: SecurityCodeInfo): ValidationResult
}

export class CodePresenceValidator implements SecurityCodeValidationStrategy {
  validate(info: SecurityCodeInfo): ValidationResult {
    if (!info.code) {
      return { isValid: false, error: 'Code de sécurité manquant' }
    }
    return { isValid: true }
  }
}

export class CodeUsageValidator implements SecurityCodeValidationStrategy {
  validate(info: SecurityCodeInfo): ValidationResult {
    if (info.used) {
      return { isValid: false, error: 'Code de sécurité déjà utilisé' }
    }
    return { isValid: true }
  }
}

export class CodeExpiryValidator implements SecurityCodeValidationStrategy {
  validate(info: SecurityCodeInfo): ValidationResult {
    if (!info.expiry) {
      return { isValid: false, error: 'Date d\'expiration manquante' }
    }
    
    const now = new Date()
    if (info.expiry.getTime() <= now.getTime()) {
      return { isValid: false, error: 'Code de sécurité expiré' }
    }
    
    return { isValid: true }
  }
}

// Chain of Responsibility pour exécuter toutes les validations
export class SecurityCodeValidationChain {
  private validators: SecurityCodeValidationStrategy[] = []
  
  addValidator(validator: SecurityCodeValidationStrategy): this {
    this.validators.push(validator)
    return this
  }
  
  validate(info: SecurityCodeInfo): ValidationResult {
    for (const validator of this.validators) {
      const result = validator.validate(info)
      if (!result.isValid) {
        return result
      }
    }
    return { isValid: true }
  }
}

// Utilisation
export function isSecurityCodeValid(info: SecurityCodeInfo): boolean {
  const chain = new SecurityCodeValidationChain()
    .addValidator(new CodePresenceValidator())
    .addValidator(new CodeUsageValidator())
    .addValidator(new CodeExpiryValidator())
  
  return chain.validate(info).isValid
}
```

---

### 5. **Hook Layer - Gestion des Mutations**

**Fichier** : `src/domains/memberships/hooks/useMembershipActionsV2.ts`

#### ❌ Problème Actuel

```typescript
// Répétition de la logique d'invalidation
const requestCorrectionsMutation = useMutation({
  mutationFn: (params: RequestCorrectionsParams) =>
    service.requestCorrections(params),
  onSuccess: () => {
    queryClient.invalidateQueries({ 
      queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
    })
    queryClient.invalidateQueries({ 
      queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
    })
  },
})

const processPaymentMutation = useMutation({
  mutationFn: (params: ProcessPaymentParams) =>
    service.processPayment(params),
  onSuccess: () => {
    queryClient.invalidateQueries({ 
      queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
    })
    queryClient.invalidateQueries({ 
      queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
    })
  },
})
```

#### ✅ Solution : **Template Method Pattern**

```typescript
// src/domains/memberships/hooks/strategies/MutationStrategy.ts
export abstract class MutationStrategy<TParams, TResult> {
  constructor(protected queryClient: QueryClient) {}
  
  abstract execute(params: TParams): Promise<TResult>
  
  // Template method pour l'invalidation
  protected invalidateCache(): void {
    this.queryClient.invalidateQueries({ 
      queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] 
    })
    this.queryClient.invalidateQueries({ 
      queryKey: [MEMBERSHIP_REQUEST_CACHE.STATS_QUERY_KEY] 
    })
  }
}

// Implémentation concrète
export class RequestCorrectionsStrategy extends MutationStrategy<
  RequestCorrectionsParams,
  { securityCode: string; whatsAppUrl?: string }
> {
  constructor(
    queryClient: QueryClient,
    private service: MembershipServiceV2
  ) {
    super(queryClient)
  }
  
  async execute(params: RequestCorrectionsParams) {
    const result = await this.service.requestCorrections(params)
    this.invalidateCache()
    return result
  }
}

// Hook refactorisé
export function useMembershipActionsV2() {
  const queryClient = useQueryClient()
  const service = MembershipServiceV2.getInstance()
  
  const requestCorrectionsStrategy = new RequestCorrectionsStrategy(queryClient, service)
  
  const requestCorrectionsMutation = useMutation({
    mutationFn: (params: RequestCorrectionsParams) =>
      requestCorrectionsStrategy.execute(params),
  })
  
  return {
    requestCorrectionsMutation,
    // ...
  }
}
```

---

### 6. **Component Layer - Parsing et Formatage**

**Fichier** : `src/domains/memberships/components/modals/CorrectionsModalV2.tsx`  
**Fichier** : `src/domains/memberships/components/shared/CorrectionBannerV2.tsx`

#### ❌ Problème Actuel

```typescript
// Parsing répétitif dans plusieurs composants
const corrections = correctionsText
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0)

// Dans CorrectionBannerV2.tsx
const corrections = reviewNote.split('\n').filter(line => line.trim().length > 0)
```

#### ✅ Solution : **Factory Pattern + Adapter Pattern**

```typescript
// src/domains/memberships/utils/parsers/CorrectionParser.ts
export class CorrectionParser {
  static parseFromText(text: string): string[] {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }
  
  static parseFromReviewNote(reviewNote: string): string[] {
    return reviewNote
      .split('\n')
      .filter(line => line.trim().length > 0)
  }
  
  static formatForDisplay(corrections: string[]): string {
    return corrections
      .map((correction, index) => `${index + 1}. ${correction}`)
      .join('\n')
  }
  
  static formatForWhatsApp(corrections: string[]): string {
    return corrections
      .map(correction => `• ${correction}`)
      .join('\n')
  }
}

// Utilisation dans les composants
const corrections = CorrectionParser.parseFromText(correctionsText)
const displayText = CorrectionParser.formatForDisplay(corrections)
```

---

### 7. **Service Layer - Gestion des Erreurs**

**Fichier** : `src/domains/auth/registration/services/RegistrationService.ts`

#### ❌ Problème Actuel

```typescript
// Gestion d'erreur répétitive et générique
async verifySecurityCode(requestId: string, code: string): Promise<boolean> {
  try {
    return await this.repository.verifySecurityCode(requestId, code)
  } catch (error) {
    console.error('[RegistrationService] Erreur lors de la vérification du code:', error)
    return false
  }
}
```

#### ✅ Solution : **Strategy Pattern + Error Handler Pattern**

```typescript
// src/domains/memberships/services/errors/ErrorHandler.ts
export interface ErrorHandler {
  handle(error: unknown, context: string): void
}

export class LoggingErrorHandler implements ErrorHandler {
  handle(error: unknown, context: string): void {
    console.error(`[${context}] Erreur:`, error)
  }
}

export class SilentErrorHandler implements ErrorHandler {
  handle(error: unknown, context: string): void {
    // Ne rien faire
  }
}

// Service avec Error Handler
export class RegistrationService {
  constructor(
    private repository: IRegistrationRepository,
    private errorHandler: ErrorHandler = new LoggingErrorHandler()
  ) {}
  
  async verifySecurityCode(requestId: string, code: string): Promise<boolean> {
    try {
      return await this.repository.verifySecurityCode(requestId, code)
    } catch (error) {
      this.errorHandler.handle(error, 'RegistrationService.verifySecurityCode')
      return false
    }
  }
}
```

---

## 📊 Résumé des Patterns à Appliquer

| Cas | Pattern | Fichier | Priorité |
|-----|---------|---------|----------|
| **1. Validation et Orchestration** | Strategy + Builder + Factory | `MembershipServiceV2.ts` | 🔴 P0 |
| **2. Transformation de Données** | Mapper | `MembershipRepositoryV2.ts` | 🟡 P1 |
| **3. Gestion d'État et Actions** | Command + Mediator | `MembershipRequestsPageV2.tsx` | 🔴 P0 |
| **4. Génération et Validation** | Strategy + Chain of Responsibility | `securityCode.ts` | 🟡 P1 |
| **5. Gestion des Mutations** | Template Method | `useMembershipActionsV2.ts` | 🟢 P2 |
| **6. Parsing et Formatage** | Factory + Adapter | `CorrectionsModalV2.tsx`, `CorrectionBannerV2.tsx` | 🟡 P1 |
| **7. Gestion des Erreurs** | Strategy (Error Handler) | `RegistrationService.ts` | 🟢 P2 |

---

## 🎯 Plan d'Implémentation Recommandé

### Phase 1 : Patterns Critiques (P0)
1. ✅ **Service Layer** : Strategy + Builder + Factory pour `requestCorrections()`
2. ✅ **Component Layer** : Command + Mediator pour `handleCorrections()`

### Phase 2 : Patterns Importants (P1)
3. ✅ **Repository Layer** : Mapper pour transformation de données
4. ✅ **Utils Layer** : Strategy + Chain of Responsibility pour validations
5. ✅ **Component Layer** : Factory + Adapter pour parsing

### Phase 3 : Patterns de Confort (P2)
6. ✅ **Hook Layer** : Template Method pour mutations
7. ✅ **Service Layer** : Error Handler Strategy

---

## 📚 Références

- [Documentation Architecture](../architecture/ARCHITECTURE.md)
- [Design Patterns - Gang of Four](https://en.wikipedia.org/wiki/Design_Patterns)
- [Clean Code - Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
