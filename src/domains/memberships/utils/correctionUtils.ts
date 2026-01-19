/**
 * Utilitaires pour la fonctionnalité de corrections
 * 
 * Fonctions de formatage, génération de liens et messages pour les corrections
 * de demandes d'adhésion.
 */

import { MEMBERSHIP_REQUEST_ROUTES } from '@/constantes/membership-requests'

/**
 * Formate un code de sécurité à 6 chiffres avec des tirets
 * @param code Code de sécurité (6 chiffres)
 * @returns Code formaté (ex: "123456" -> "12-34-56") ou code original si format invalide
 */
export function formatSecurityCode(code: string): string {
  if (!code || typeof code !== 'string') {
    return code || ''
  }

  // Vérifier que le code contient exactement 6 chiffres
  if (!/^\d{6}$/.test(code)) {
    return code
  }

  // Formater avec des tirets : 12-34-56
  return `${code.slice(0, 2)}-${code.slice(2, 4)}-${code.slice(4, 6)}`
}

/**
 * Calcule le temps restant avant expiration d'un code de sécurité
 * @param expiryDate Date d'expiration
 * @returns Temps restant formaté (ex: "2j 13h" ou "0j 5h" ou "0j 0h")
 */
export function getTimeRemaining(expiryDate: Date | null | undefined): string {
  if (!expiryDate) {
    return '0j 0h'
  }

  const now = new Date()
  const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate)
  
  // Si la date est dans le passé, retourner 0j 0h
  if (expiry.getTime() <= now.getTime()) {
    return '0j 0h'
  }

  // Calculer la différence en millisecondes
  const diffMs = expiry.getTime() - now.getTime()
  
  // Convertir en jours et heures
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  return `${days}j ${hours}h`
}

/**
 * Génère le lien de correction pour une demande d'adhésion
 * @param requestId ID de la demande d'adhésion
 * @returns Lien de correction (ex: "/register?requestId=abc123")
 */
export function generateCorrectionLink(requestId: string): string {
  if (!requestId || typeof requestId !== 'string') {
    throw new Error('requestId est requis et doit être une chaîne de caractères')
  }

  return MEMBERSHIP_REQUEST_ROUTES.CORRECTION(requestId)
}

/**
 * Paramètres pour générer un message WhatsApp de correction
 */
export interface GenerateWhatsAppMessageParams {
  /** ID de la demande d'adhésion */
  requestId: string
  /** Prénom du demandeur */
  firstName: string
  /** Liste des corrections demandées (une par ligne) */
  corrections: string[]
  /** Code de sécurité à 6 chiffres */
  securityCode: string
  /** Date d'expiration du code */
  expiryDate: Date
  /** URL de base de l'application (optionnel, pour générer le lien complet) */
  baseUrl?: string
}

/**
 * Génère un message WhatsApp pour les corrections
 * @param params Paramètres du message
 * @returns Message formaté pour WhatsApp
 */
export function generateWhatsAppMessage(params: GenerateWhatsAppMessageParams): string {
  const { requestId, firstName, corrections, securityCode, expiryDate, baseUrl } = params

  if (!requestId || !firstName || !corrections || corrections.length === 0 || !securityCode || !expiryDate) {
    throw new Error('Tous les paramètres sont requis pour générer le message WhatsApp')
  }

  // Formater le code de sécurité
  const formattedCode = formatSecurityCode(securityCode)

  // Générer le lien de correction
  const link = baseUrl 
    ? `${baseUrl}${generateCorrectionLink(requestId)}`
    : generateCorrectionLink(requestId)

  // Formater la date d'expiration
  const expiryDateStr = expiryDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Calculer le temps restant
  const timeRemaining = getTimeRemaining(expiryDate)

  // Formater les corrections (une par ligne avec tiret)
  const correctionsText = corrections
    .filter(c => c && c.trim().length > 0)
    .map(c => `- ${c.trim()}`)
    .join('\n')

  // Générer le message
  const message = `Bonjour ${firstName},

Votre demande d'adhésion nécessite des corrections :

${correctionsText}

Pour effectuer les corrections, veuillez :
1. Cliquer sur ce lien : ${link}
2. Entrer le code de sécurité : ${formattedCode}

⚠️ Le code expire le ${expiryDateStr} (dans ${timeRemaining})

Cordialement,
KARA Mutuelle`

  return message
}
