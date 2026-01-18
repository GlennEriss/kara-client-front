# Règles Firestore - Fonctionnalité Corrections (Design Patterns)

## 📋 Vue d'ensemble

Ce document présente une **réorganisation professionnelle** des règles Firestore pour la fonctionnalité de corrections, en utilisant des **design patterns** pour éviter le code répétitif et améliorer la maintenabilité.

## 🎯 Problème identifié

Le code suivant est répétitif et difficile à maintenir :

```javascript
// ❌ Code de débutant - Répétitif et verbeux
allow update: if request.resource.data.status == 'pending'
  && request.resource.data.securityCodeUsed == true
  && (!('securityCode' in request.resource.data) 
      || request.resource.data.securityCode == null)
  && (!('reviewNote' in request.resource.data) 
      || request.resource.data.reviewNote == null)
  && resource.data.status == 'under_review'
  && resource.data.securityCodeUsed == false;
```

## ✅ Solution : Design Patterns

### Pattern 1 : Helper Functions (Fonctions Utilitaires)

**Principe** : Extraire la logique répétitive dans des fonctions réutilisables.

```javascript
// ==========================================
// FONCTIONS UTILITAIRES - CORRECTIONS
// ==========================================

/**
 * Vérifie si un champ est absent ou null dans les données
 * Pattern: Helper Function pour éviter la répétition
 */
function isFieldAbsentOrNull(data, fieldName) {
  return !(fieldName in data) || data[fieldName] == null;
}

/**
 * Vérifie si plusieurs champs sont absents ou null
 * Pattern: Composition de fonctions utilitaires
 */
function areFieldsAbsentOrNull(data, fieldNames) {
  return fieldNames.hasAll(fieldNames.map(field => isFieldAbsentOrNull(data, field)));
}

/**
 * Vérifie si un champ a une valeur spécifique
 * Pattern: Helper Function avec valeur par défaut
 */
function hasFieldValue(data, fieldName, expectedValue, defaultValue = null) {
  return data.get(fieldName, defaultValue) == expectedValue;
}

/**
 * Vérifie si le statut de la demande correspond
 * Pattern: Helper Function métier
 */
function hasStatus(data, expectedStatus) {
  return data.status == expectedStatus;
}

/**
 * Vérifie si le code de sécurité est valide (non utilisé, non expiré)
 * Pattern: Helper Function métier améliorée
 */
function hasValidSecurityCode(requestData) {
  return requestData.securityCode != null
    && requestData.securityCodeExpiry != null
    && requestData.get('securityCodeUsed', false) == false
    && request.time < requestData.securityCodeExpiry;
}

/**
 * Vérifie si le code de sécurité est formaté correctement (6 chiffres)
 * Pattern: Helper Function de validation
 */
function isSecurityCodeFormatValid(code) {
  return code is string && code.matches('^[0-9]{6}$');
}

/**
 * Vérifie si seuls les champs autorisés ont été modifiés
 * Pattern: Helper Function de sécurité
 */
function onlyAllowedFieldsChanged(allowedFields) {
  return request.resource.data.diff(resource.data).affectedKeys().hasOnly(allowedFields);
}
```

### Pattern 2 : Rule Builder Conceptuel (Construction de Règles)

**Principe** : Construire des règles complexes en composant des conditions via des fonctions.  
**Note** : Firestore Rules ne supporte pas un Builder Pattern classique (pas de classes/chaînage), mais on peut créer un "builder conceptuel" avec des fonctions composables.

```javascript
// ==========================================
// RULE BUILDERS - CORRECTIONS
// Pattern: Builder Conceptuel (fonctions composables)
// ==========================================

/**
 * Vérifie les conditions de statut pour la soumission de corrections
 * Pattern: Helper de composition (partie 1 du builder)
 */
function validateCorrectionStatusTransition() {
  return 
    // Statut final doit être 'pending'
    hasStatus(request.resource.data, 'pending')
    // Statut initial était 'under_review'
    && hasStatus(resource.data, 'under_review');
}

/**
 * Vérifie les conditions de code de sécurité pour la soumission
 * Pattern: Helper de composition (partie 2 du builder)
 */
function validateSecurityCodeUsage() {
  return 
    // Code marqué comme utilisé dans la nouvelle version
    && hasFieldValue(request.resource.data, 'securityCodeUsed', true, false)
    // Code n'était pas encore utilisé dans l'ancienne version
    && hasFieldValue(resource.data, 'securityCodeUsed', false, false);
}

/**
 * Vérifie que les champs de correction sont nettoyés
 * Pattern: Helper de composition (partie 3 du builder)
 */
function validateCorrectionFieldsCleaned() {
  return 
    // Champs de correction absents ou null
    && isFieldAbsentOrNull(request.resource.data, 'securityCode')
    && isFieldAbsentOrNull(request.resource.data, 'reviewNote');
}

/**
 * Builder complet pour les règles de correction par demandeur
 * Pattern: Builder Conceptuel (composition de helpers)
 * 
 * Note: Dans Firestore, on ne peut pas faire de chaînage comme:
 *   builder.status('pending').codeUsed(true).build()
 * Mais on peut composer les fonctions pour obtenir le même résultat
 */
function canApplicantSubmitCorrections() {
  return 
    validateCorrectionStatusTransition()
    && validateSecurityCodeUsage()
    && validateCorrectionFieldsCleaned();
}

/**
 * Vérifie les conditions d'authentification et de statut pour admin
 * Pattern: Helper de composition (partie 1 du builder admin)
 */
function validateAdminCorrectionRequestAuth() {
  return 
    isAdmin()
    && hasStatus(request.resource.data, 'under_review')
    && !hasStatus(resource.data, 'under_review');
}

/**
 * Vérifie les champs modifiables pour la demande de corrections
 * Pattern: Helper de composition (partie 2 du builder admin)
 */
function validateAdminCorrectionRequestFields() {
  return 
    onlyAllowedFieldsChanged([
      'status', 'reviewNote', 'securityCode', 
      'securityCodeExpiry', 'securityCodeUsed', 
      'processedBy', 'updatedAt'
    ])
    && isSecurityCodeFormatValid(request.resource.data.securityCode)
    && hasFieldValue(request.resource.data, 'securityCodeUsed', false, false)
    && request.resource.data.processedBy == request.auth.uid;
}

/**
 * Builder complet pour les règles de demande de corrections par admin
 * Pattern: Builder Conceptuel (composition de helpers)
 */
function canAdminRequestCorrections() {
  return 
    validateAdminCorrectionRequestAuth()
    && validateAdminCorrectionRequestFields();
}

/**
 * Builder pour les règles de renouvellement de code par admin
 * Pattern: Builder Conceptuel (composition simple)
 */
function canAdminRenewSecurityCode() {
  return 
    isAdmin()
    && onlyAllowedFieldsChanged([
      'securityCode', 'securityCodeExpiry', 
      'securityCodeUsed', 'updatedAt'
    ])
    && isSecurityCodeFormatValid(request.resource.data.securityCode)
    && hasFieldValue(request.resource.data, 'securityCodeUsed', false, false);
}
```

### Pattern 3 : Strategy Pattern (Stratégies de Validation)

**Principe** : Définir différentes stratégies de validation selon le contexte.

```javascript
// ==========================================
// VALIDATION STRATEGIES - CORRECTIONS
// ==========================================

/**
 * Stratégie de validation pour la soumission de corrections
 * Pattern: Strategy Pattern pour différentes validations
 */
function validateCorrectionSubmission() {
  return canApplicantSubmitCorrections();
}

/**
 * Stratégie de validation pour la demande de corrections
 * Pattern: Strategy Pattern avec validation admin
 */
function validateCorrectionRequest() {
  return canAdminRequestCorrections();
}

/**
 * Stratégie de validation pour le renouvellement de code
 * Pattern: Strategy Pattern pour opérations admin
 */
function validateCodeRenewal() {
  return canAdminRenewSecurityCode();
}
```

### Pattern 4 : Composition Pattern (Composition de Règles)

**Principe** : Composer des règles simples pour créer des règles complexes.

```javascript
// ==========================================
// RULE COMPOSITION - CORRECTIONS
// ==========================================

/**
 * Compose les règles de mise à jour pour membership-requests
 * Pattern: Composition Pattern pour règles multiples
 */
function canUpdateMembershipRequest() {
  return 
    // Admin peut toujours mettre à jour
    isAdmin() 
    // OU demandeur avec code valide (règles existantes)
    || (
      isAuthenticated() &&
      resource.data.identity.email == request.auth.token.email &&
      hasValidSecurityCode(resource.data) &&
      // Champs protégés non modifiables
      request.resource.data.matricule == resource.data.matricule &&
      request.resource.data.status == resource.data.status &&
      request.resource.data.get('isPaid', false) == resource.data.get('isPaid', false) &&
      request.resource.data.securityCodeUsed == true
    )
    // OU soumission de corrections (nouvelle règle)
    || validateCorrectionSubmission();
}
```

## 🔒 Règles Complètes Réorganisées

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ==========================================
    // FONCTIONS UTILITAIRES GÉNÉRALES
    // ==========================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.role in ['Admin', 'SuperAdmin', 'Secretary'];
    }
    
    // ==========================================
    // FONCTIONS UTILITAIRES - CORRECTIONS
    // ==========================================
    
    /**
     * Vérifie si un champ est absent ou null
     * Pattern: Helper Function
     */
    function isFieldAbsentOrNull(data, fieldName) {
      return !(fieldName in data) || data[fieldName] == null;
    }
    
    /**
     * Vérifie si le statut correspond
     * Pattern: Helper Function métier
     */
    function hasStatus(data, expectedStatus) {
      return data.status == expectedStatus;
    }
    
    /**
     * Vérifie si un champ a une valeur spécifique
     * Pattern: Helper Function avec valeur par défaut
     */
    function hasFieldValue(data, fieldName, expectedValue, defaultValue = null) {
      return data.get(fieldName, defaultValue) == expectedValue;
    }
    
    /**
     * Vérifie si le code de sécurité est valide
     * Pattern: Helper Function métier
     */
    function hasValidSecurityCode(requestData) {
      return requestData.securityCode != null
        && requestData.securityCodeExpiry != null
        && requestData.get('securityCodeUsed', false) == false
        && request.time < requestData.securityCodeExpiry;
    }
    
    /**
     * Vérifie si le code de sécurité est formaté correctement
     * Pattern: Helper Function de validation
     */
    function isSecurityCodeFormatValid(code) {
      return code is string && code.matches('^[0-9]{6}$');
    }
    
    /**
     * Vérifie si seuls les champs autorisés ont été modifiés
     * Pattern: Helper Function de sécurité
     */
    function onlyAllowedFieldsChanged(allowedFields) {
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(allowedFields);
    }
    
    // ==========================================
    // RULE BUILDERS - CORRECTIONS
    // ==========================================
    
    // ==========================================
    // RULE BUILDERS - CORRECTIONS (Builder Conceptuel)
    // ==========================================
    // Note: Firestore ne supporte pas un Builder Pattern classique (pas de classes/chaînage)
    // On utilise un "Builder Conceptuel" via composition de fonctions
    
    /**
     * Vérifie les conditions de statut pour la soumission de corrections
     * Pattern: Helper de composition (partie 1 du builder)
     */
    function validateCorrectionStatusTransition() {
      return 
        hasStatus(request.resource.data, 'pending')
        && hasStatus(resource.data, 'under_review');
    }
    
    /**
     * Vérifie les conditions de code de sécurité pour la soumission
     * Pattern: Helper de composition (partie 2 du builder)
     */
    function validateSecurityCodeUsage() {
      return 
        hasFieldValue(request.resource.data, 'securityCodeUsed', true, false)
        && hasFieldValue(resource.data, 'securityCodeUsed', false, false);
    }
    
    /**
     * Vérifie que les champs de correction sont nettoyés
     * Pattern: Helper de composition (partie 3 du builder)
     */
    function validateCorrectionFieldsCleaned() {
      return 
        isFieldAbsentOrNull(request.resource.data, 'securityCode')
        && isFieldAbsentOrNull(request.resource.data, 'reviewNote');
    }
    
    /**
     * Builder complet pour les règles de correction par demandeur
     * Pattern: Builder Conceptuel (composition de helpers)
     */
    function canApplicantSubmitCorrections() {
      return 
        validateCorrectionStatusTransition()
        && validateSecurityCodeUsage()
        && validateCorrectionFieldsCleaned();
    }
    
    /**
     * Vérifie les conditions d'authentification et de statut pour admin
     * Pattern: Helper de composition (partie 1 du builder admin)
     */
    function validateAdminCorrectionRequestAuth() {
      return 
        isAdmin()
        && hasStatus(request.resource.data, 'under_review')
        && !hasStatus(resource.data, 'under_review');
    }
    
    /**
     * Vérifie les champs modifiables pour la demande de corrections
     * Pattern: Helper de composition (partie 2 du builder admin)
     */
    function validateAdminCorrectionRequestFields() {
      return 
        onlyAllowedFieldsChanged([
          'status', 'reviewNote', 'securityCode', 
          'securityCodeExpiry', 'securityCodeUsed', 
          'processedBy', 'updatedAt'
        ])
        && isSecurityCodeFormatValid(request.resource.data.securityCode)
        && hasFieldValue(request.resource.data, 'securityCodeUsed', false, false)
        && request.resource.data.processedBy == request.auth.uid;
    }
    
    /**
     * Builder complet pour les règles de demande de corrections par admin
     * Pattern: Builder Conceptuel (composition de helpers)
     */
    function canAdminRequestCorrections() {
      return 
        validateAdminCorrectionRequestAuth()
        && validateAdminCorrectionRequestFields();
    }
    
    /**
     * Builder pour les règles de renouvellement de code par admin
     * Pattern: Builder Conceptuel (composition simple)
     */
    function canAdminRenewSecurityCode() {
      return 
        isAdmin()
        && onlyAllowedFieldsChanged([
          'securityCode', 'securityCodeExpiry', 
          'securityCodeUsed', 'updatedAt'
        ])
        && isSecurityCodeFormatValid(request.resource.data.securityCode)
        && hasFieldValue(request.resource.data, 'securityCodeUsed', false, false);
    }
    
    // ==========================================
    // VALIDATION STRATEGIES - CORRECTIONS
    // ==========================================
    
    /**
     * Stratégie de validation pour la soumission de corrections
     * Pattern: Strategy Pattern
     */
    function validateCorrectionSubmission() {
      return canApplicantSubmitCorrections();
    }
    
    /**
     * Stratégie de validation pour la demande de corrections
     * Pattern: Strategy Pattern
     */
    function validateCorrectionRequest() {
      return canAdminRequestCorrections();
    }
    
    /**
     * Stratégie de validation pour le renouvellement de code
     * Pattern: Strategy Pattern
     */
    function validateCodeRenewal() {
      return canAdminRenewSecurityCode();
    }
    
    // ==========================================
    // DEMANDES D'ADHÉSION (MEMBERSHIP REQUESTS)
    // ==========================================
    
    match /membership-requests/{requestId} {
      
      // LECTURE : Admins ou propriétaire (via email)
      allow read: if isAdmin() || 
                     (isAuthenticated() && resource.data.identity.email == request.auth.token.email);
      
      // CRÉATION : Publique avec validation des champs requis
      allow create: if 
        request.resource.data.keys().hasAll([
          'matricule', 'status', 'identity', 
          'address', 'documents', 'createdAt'
        ]) &&
        hasStatus(request.resource.data, 'pending') &&
        request.resource.data.identity.keys().hasAll([
          'firstName', 'lastName', 'birthDate', 'nationality'
        ]) &&
        hasFieldValue(request.resource.data, 'isPaid', false, false) &&
        hasFieldValue(request.resource.data, 'processedBy', null, null);
      
      // MISE À JOUR : Composition de toutes les stratégies
      // Pattern: Composition Pattern
      allow update: if 
        // Admin peut toujours mettre à jour
        isAdmin() 
        // OU demandeur avec code valide (règles existantes)
        || (
          isAuthenticated() &&
          resource.data.identity.email == request.auth.token.email &&
          hasValidSecurityCode(resource.data) &&
          request.resource.data.matricule == resource.data.matricule &&
          request.resource.data.status == resource.data.status &&
          hasFieldValue(request.resource.data, 'isPaid', false) == hasFieldValue(resource.data, 'isPaid', false) &&
          hasFieldValue(request.resource.data, 'securityCodeUsed', true, false)
        )
        // OU soumission de corrections (nouvelle règle)
        || validateCorrectionSubmission()
        // OU demande de corrections par admin
        || validateCorrectionRequest()
        // OU renouvellement de code par admin
        || validateCodeRenewal();
      
      // SUPPRESSION : Admin uniquement
      allow delete: if isAdmin();
    }
  }
}
```

## 📊 Comparaison Avant/Après

### ❌ Avant (Code de débutant)

```javascript
// Répétitif, difficile à lire et maintenir
allow update: if request.resource.data.status == 'pending'
  && request.resource.data.securityCodeUsed == true
  && (!('securityCode' in request.resource.data) 
      || request.resource.data.securityCode == null)
  && (!('reviewNote' in request.resource.data) 
      || request.resource.data.reviewNote == null)
  && resource.data.status == 'under_review'
  && resource.data.securityCodeUsed == false;
```

### ✅ Après (Code professionnel)

```javascript
// Lisible, maintenable, réutilisable
allow update: if validateCorrectionSubmission();
```

## 🎯 Avantages des Design Patterns

### 1. **Réutilisabilité**
- Les fonctions utilitaires peuvent être réutilisées dans d'autres règles
- Évite la duplication de code

### 2. **Lisibilité**
- Les noms de fonctions sont explicites (`canApplicantSubmitCorrections`)
- Le code est auto-documenté

### 3. **Maintenabilité**
- Modifications centralisées dans les fonctions utilitaires
- Facile à tester et déboguer

### 4. **Extensibilité**
- Facile d'ajouter de nouvelles stratégies de validation
- Composition flexible des règles

### 5. **Séparation des responsabilités**
- Chaque fonction a une responsabilité unique
- Logique métier séparée de la logique technique

## 📚 Patterns Utilisés

| Pattern | Usage | Bénéfice | Limitation Firestore |
|---------|-------|----------|---------------------|
| **Helper Functions** | `isFieldAbsentOrNull()`, `hasStatus()` | Réduction de la répétition | ✅ Supporté |
| **Builder Conceptuel** | `canApplicantSubmitCorrections()` | Construction de règles complexes | ⚠️ Pas de chaînage, mais composition possible |
| **Strategy Pattern** | `validateCorrectionSubmission()` | Différentes stratégies de validation | ✅ Supporté |
| **Composition Pattern** | `allow update: if ... \|\| ...` | Composition de règles multiples | ✅ Supporté |

## 🔄 Migration Progressive

Pour migrer progressivement vers cette architecture :

1. **Étape 1** : Créer les fonctions utilitaires de base
2. **Étape 2** : Extraire les règles répétitives dans des builders
3. **Étape 3** : Créer les stratégies de validation
4. **Étape 4** : Composer les règles finales

## ⚠️ Limitations de Firestore Rules

### Pourquoi pas un Builder Pattern classique ?

Firestore Security Rules a des limitations qui empêchent un Builder Pattern classique :

1. **Pas de classes** : Le langage ne supporte pas les classes ou objets
2. **Pas de chaînage de méthodes** : Impossible de faire `builder.status('pending').codeUsed(true).build()`
3. **Pas de variables mutables** : Pas de state à modifier progressivement
4. **Syntaxe limitée** : Expressions booléennes simples, pas de structures complexes

### Solution : Builder Conceptuel

Au lieu d'un builder classique, on utilise un **Builder Conceptuel** :

```javascript
// ❌ IMPOSSIBLE en Firestore (Builder classique)
class RuleBuilder {
  status(expected) { this.status = expected; return this; }
  codeUsed(value) { this.codeUsed = value; return this; }
  build() { return this.status && this.codeUsed; }
}

// ✅ POSSIBLE en Firestore (Builder conceptuel)
function validateStatus() { return hasStatus(...); }
function validateCode() { return hasFieldValue(...); }
function buildRule() { return validateStatus() && validateCode(); }
```

### Avantages du Builder Conceptuel

- ✅ **Composition** : On compose les fonctions comme des briques
- ✅ **Réutilisabilité** : Chaque helper peut être réutilisé
- ✅ **Lisibilité** : Le code reste clair et expressif
- ✅ **Testabilité** : Chaque fonction peut être testée indépendamment

### Notes Importantes

1. **Limites Firestore** : Les fonctions Firestore ont des limitations (pas de boucles complexes, pas de récursion)
2. **Performance** : Les fonctions utilitaires sont évaluées à chaque requête, mais le coût est négligeable
3. **Documentation** : Toujours documenter les fonctions utilitaires avec leur pattern utilisé
4. **Composition** : Préférer la composition de petites fonctions plutôt que de grandes fonctions monolithiques

## 📖 Références

- [Firestore Security Rules - Functions](https://firebase.google.com/docs/firestore/security/rules-conditions#functions)
- [Design Patterns - Gang of Four](https://en.wikipedia.org/wiki/Design_Patterns)
- [Clean Code - Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
