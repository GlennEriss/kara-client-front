/**
 * Script de test pour vérifier le flux de correction
 * Ce fichier peut être utilisé pour tester manuellement le comportement
 */

export const testCorrectionFlow = {
  // URL de test pour une correction
  getTestCorrectionUrl: (requestId: string) => {
    return `http://localhost:3000/register?requestId=${requestId}`
  },

  // Simuler l'accès à une URL de correction
  simulateCorrectionAccess: (requestId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('requestId', requestId)
    window.history.pushState({}, '', url.toString())
    
    // Recharger la page pour tester le comportement
    window.location.reload()
  },

  // Vérifier si le cache de soumission existe
  checkSubmissionCache: () => {
    const membershipId = localStorage.getItem('register-membership-id')
    const submissionTimestamp = localStorage.getItem('register-submission-timestamp')
    const userData = localStorage.getItem('register-user-data')
    
    return {
      hasMembershipId: !!membershipId,
      hasTimestamp: !!submissionTimestamp,
      hasUserData: !!userData,
      membershipId,
      timestamp: submissionTimestamp,
      userData: userData ? JSON.parse(userData) : null
    }
  },

  // Nettoyer le cache de soumission
  clearSubmissionCache: () => {
    localStorage.removeItem('register-membership-id')
    localStorage.removeItem('register-submission-timestamp')
    localStorage.removeItem('register-user-data')
    console.log('🧹 Cache de soumission nettoyé')
  },

  // Afficher les informations de debug
  debugCache: () => {
    const cacheInfo = testCorrectionFlow.checkSubmissionCache()
    console.log('🔍 Informations du cache:', cacheInfo)
    
    const urlParams = new URLSearchParams(window.location.search)
    const requestId = urlParams.get('requestId')
    console.log('🔗 RequestId dans l\'URL:', requestId)
    
    return {
      cache: cacheInfo,
      requestId
    }
  },

  // Simuler l'utilisation d'un code de sécurité
  simulateCodeUsage: async (requestId: string) => {
    try {
      // Cette fonction simule l'utilisation d'un code de sécurité
      // En réalité, cela se fait automatiquement lors de la soumission des corrections
      console.log('🔐 Simulation de l\'utilisation du code de sécurité pour:', requestId)
      console.log('ℹ️ En réalité, le code est invalidé automatiquement lors de la soumission des corrections')
      
      return {
        success: true,
        message: 'Code de sécurité marqué comme utilisé (simulation)'
      }
    } catch (error) {
      console.error('Erreur lors de la simulation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }
  }
}

// Exposer pour les tests dans la console
if (typeof window !== 'undefined') {
  (window as any).testCorrectionFlow = testCorrectionFlow
} 