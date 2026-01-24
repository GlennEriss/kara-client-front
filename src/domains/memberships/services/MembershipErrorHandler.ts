/**
 * Service centralisé de gestion des erreurs pour le domaine memberships
 * 
 * Normalise et formate les erreurs de différentes sources (Firebase, Firestore, Storage, etc.)
 * pour fournir des messages utilisateur-friendly et cohérents.
 */

export enum MembershipErrorCode {
  // Erreurs de validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_FORM_DATA = 'INVALID_FORM_DATA',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Erreurs Firebase Functions
  FUNCTION_NOT_FOUND = 'FUNCTION_NOT_FOUND',
  FUNCTION_UNAUTHENTICATED = 'FUNCTION_UNAUTHENTICATED',
  FUNCTION_PERMISSION_DENIED = 'FUNCTION_PERMISSION_DENIED',
  FUNCTION_ERROR = 'FUNCTION_ERROR',

  // Erreurs Firestore
  FIRESTORE_PERMISSION_DENIED = 'FIRESTORE_PERMISSION_DENIED',
  FIRESTORE_NOT_FOUND = 'FIRESTORE_NOT_FOUND',
  FIRESTORE_ERROR = 'FIRESTORE_ERROR',

  // Erreurs Storage
  STORAGE_UNAUTHORIZED = 'STORAGE_UNAUTHORIZED',
  STORAGE_PERMISSION_DENIED = 'STORAGE_PERMISSION_DENIED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_ERROR = 'STORAGE_ERROR',

  // Erreurs réseau
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Erreurs génériques
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_FAILED = 'OPERATION_FAILED',
}

export interface MembershipError {
  code: MembershipErrorCode
  message: string
  originalError?: any
  details?: string
  userMessage: string // Message formaté pour l'utilisateur
}

export class MembershipErrorHandler {
  private static instance: MembershipErrorHandler

  private constructor() { }

  static getInstance(): MembershipErrorHandler {
    if (!MembershipErrorHandler.instance) {
      MembershipErrorHandler.instance = new MembershipErrorHandler()
    }
    return MembershipErrorHandler.instance
  }

  /**
   * Normalise une erreur en MembershipError
   */
  normalizeError(error: any, context?: string): MembershipError {
    // Log l'erreur originale
    this.logError(error, context)

    // Extraire le code d'erreur
    const code = this.extractErrorCode(error)

    // Extraire le message d'erreur
    const message = this.extractErrorMessage(error)

    // Log détaillé pour les erreurs de validation
    if (code === MembershipErrorCode.VALIDATION_ERROR || code === MembershipErrorCode.INVALID_FORM_DATA) {
      console.error('🔍 [MembershipErrorHandler] Erreur de validation détectée:', {
        code,
        message,
        errorName: error?.name,
        hasErrors: !!error?.errors,
        errorsCount: error?.errors?.length,
        firstError: error?.errors?.[0],
        originalError: error
      })
    }

    // Générer un message utilisateur-friendly
    const userMessage = this.generateUserMessage(code, message, error)

    return {
      code,
      message,
      originalError: error,
      details: this.extractErrorDetails(error),
      userMessage,
    }
  }

  /**
   * Extrait le code d'erreur depuis l'erreur originale
   */
  private extractErrorCode(error: any): MembershipErrorCode {
    // Erreurs Firebase Functions
    if (error?.code === 'functions/not-found') {
      // Si le message indique que la demande est introuvable, c'est une erreur métier (404 document)
      // et non une erreur d'infrastructure (404 endpoint)
      if (error?.message === "La demande d'adhésion est introuvable." || error?.message?.includes("introuvable")) {
        return MembershipErrorCode.FIRESTORE_NOT_FOUND
      }
      return MembershipErrorCode.FUNCTION_NOT_FOUND
    }
    if (error?.code === 'functions/unauthenticated') {
      return MembershipErrorCode.FUNCTION_UNAUTHENTICATED
    }
    if (error?.code === 'functions/permission-denied') {
      return MembershipErrorCode.FUNCTION_PERMISSION_DENIED
    }
    if (error?.code?.startsWith('functions/')) {
      return MembershipErrorCode.FUNCTION_ERROR
    }

    // Erreurs Storage (vérifier AVANT Firestore pour éviter les conflits)
    if (error?.code === 'storage/unauthorized' || error?.code === 'storage/permission-denied' || error?.code === 'storage/authorization') {
      return MembershipErrorCode.STORAGE_PERMISSION_DENIED
    }
    if (error?.code === 'storage/quota-exceeded') {
      return MembershipErrorCode.STORAGE_QUOTA_EXCEEDED
    }
    if (error?.code?.startsWith('storage/')) {
      return MembershipErrorCode.STORAGE_ERROR
    }

    // Erreurs Firestore
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      return MembershipErrorCode.FIRESTORE_PERMISSION_DENIED
    }
    if (error?.code === 'not-found') {
      return MembershipErrorCode.FIRESTORE_NOT_FOUND
    }
    if (error?.code?.startsWith('firestore/')) {
      return MembershipErrorCode.FIRESTORE_ERROR
    }

    // Erreurs réseau
    if (error?.code === 'network-error' || error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return MembershipErrorCode.NETWORK_ERROR
    }
    if (error?.code === 'timeout' || error?.message?.includes('timeout')) {
      return MembershipErrorCode.TIMEOUT_ERROR
    }

    // Erreurs de validation
    if (error?.name === 'ZodError' || (error?.errors && Array.isArray(error.errors))) {
      return MembershipErrorCode.VALIDATION_ERROR
    }
    // Erreurs Firestore qui peuvent indiquer des données invalides
    if (error?.code === 'invalid-argument' || error?.message?.includes('invalid') || error?.message?.includes('Invalid')) {
      return MembershipErrorCode.INVALID_FORM_DATA
    }

    // Erreur inconnue
    return MembershipErrorCode.UNKNOWN_ERROR
  }

  /**
   * Extrait le message d'erreur depuis l'erreur originale
   */
  private extractErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    if (error?.message) {
      return error.message
    }
    if (error?.details) {
      return error.details
    }
    return 'Une erreur inattendue s\'est produite'
  }

  /**
   * Extrait les détails supplémentaires de l'erreur
   */
  private extractErrorDetails(error: any): string | undefined {
    if (error?.stack) {
      return error.stack
    }
    if (error?.details && typeof error.details === 'string') {
      return error.details
    }
    return undefined
  }

  /**
   * Génère un message utilisateur-friendly basé sur le code d'erreur
   */
  private generateUserMessage(
    code: MembershipErrorCode,
    message: string,
    originalError?: any
  ): string {
    switch (code) {
      // Erreurs de validation
      case MembershipErrorCode.VALIDATION_ERROR:
      case MembershipErrorCode.INVALID_FORM_DATA:
        // Si c'est une erreur Zod, extraire les détails spécifiques
        if (originalError?.errors && Array.isArray(originalError.errors)) {
          const zodErrors = originalError.errors
          const firstError = zodErrors[0]
          if (firstError?.path && firstError?.message) {
            const fieldPath = firstError.path.join('.')
            return `Le champ "${fieldPath}" est invalide : ${firstError.message}`
          }
        }
        // Si le message original contient des détails, l'utiliser
        if (message && message !== 'Une erreur inattendue s\'est produite') {
          return message
        }
        return 'Les données du formulaire sont invalides. Veuillez vérifier les champs remplis.'
      case MembershipErrorCode.MISSING_REQUIRED_FIELD:
        return 'Certains champs obligatoires sont manquants. Veuillez compléter le formulaire.'

      // Erreurs Firebase Functions
      case MembershipErrorCode.FUNCTION_NOT_FOUND:
        return 'La fonction demandée n\'est pas disponible. Veuillez contacter l\'administrateur.'
      case MembershipErrorCode.FUNCTION_UNAUTHENTICATED:
        return 'Vous devez être authentifié pour effectuer cette action.'
      case MembershipErrorCode.FUNCTION_PERMISSION_DENIED:
        return 'Vous n\'avez pas la permission d\'effectuer cette action.'
      case MembershipErrorCode.FUNCTION_ERROR:
        return message || 'Une erreur s\'est produite lors de l\'exécution de la fonction.'

      // Erreurs Firestore
      case MembershipErrorCode.FIRESTORE_PERMISSION_DENIED:
        return 'Vous n\'avez pas la permission d\'accéder à ces données. Veuillez contacter l\'administrateur.'
      case MembershipErrorCode.FIRESTORE_NOT_FOUND:
        return 'Les données demandées n\'ont pas été trouvées.'
      case MembershipErrorCode.FIRESTORE_ERROR:
        return 'Une erreur s\'est produite lors de l\'accès aux données. Veuillez réessayer.'

      // Erreurs Storage
      case MembershipErrorCode.STORAGE_PERMISSION_DENIED:
        return 'Vous n\'avez pas la permission d\'uploader des fichiers. Veuillez contacter l\'administrateur.'
      case MembershipErrorCode.STORAGE_QUOTA_EXCEEDED:
        return 'L\'espace de stockage est insuffisant. Veuillez contacter l\'administrateur.'
      case MembershipErrorCode.STORAGE_ERROR:
        return 'Une erreur s\'est produite lors de l\'upload du fichier. Veuillez réessayer.'

      // Erreurs réseau
      case MembershipErrorCode.NETWORK_ERROR:
        return 'Une erreur réseau s\'est produite. Vérifiez votre connexion internet et réessayez.'
      case MembershipErrorCode.TIMEOUT_ERROR:
        return 'L\'opération a pris trop de temps. Veuillez réessayer.'

      // Erreurs génériques
      case MembershipErrorCode.OPERATION_FAILED:
        return message || 'L\'opération a échoué. Veuillez réessayer.'
      case MembershipErrorCode.UNKNOWN_ERROR:
      default:
        return message || 'Une erreur inattendue s\'est produite. Veuillez réessayer ou contacter l\'administrateur.'
    }
  }

  /**
   * Log l'erreur de manière cohérente
   */
  private logError(error: any, context?: string): void {
    const prefix = context ? `[MembershipErrorHandler:${context}]` : '[MembershipErrorHandler]'

    console.error(`${prefix} Erreur détectée:`, {
      error,
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
      details: error?.details,
    })
  }

  /**
   * Crée une erreur de validation
   */
  createValidationError(message: string, details?: string): MembershipError {
    return {
      code: MembershipErrorCode.VALIDATION_ERROR,
      message,
      details,
      userMessage: this.generateUserMessage(MembershipErrorCode.VALIDATION_ERROR, message),
    }
  }

  /**
   * Crée une erreur d'opération échouée
   */
  createOperationError(operation: string, details?: string): MembershipError {
    const message = `L'opération ${operation} a échoué`
    return {
      code: MembershipErrorCode.OPERATION_FAILED,
      message,
      details,
      userMessage: this.generateUserMessage(MembershipErrorCode.OPERATION_FAILED, message),
    }
  }

  /**
   * Formate une erreur pour l'affichage dans l'UI
   */
  formatForUI(error: MembershipError): string {
    return error.userMessage
  }
}
