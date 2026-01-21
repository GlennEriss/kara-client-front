/**
 * Utilitaires pour la génération d'URLs WhatsApp
 * 
 * Permet de générer des liens WhatsApp pour envoyer des messages
 * aux demandeurs d'adhésion (corrections, notifications, etc.)
 */

import { MEMBERSHIP_REQUEST_VALIDATION } from '@/constantes/membership-requests'

const PHONE_PREFIX = '+241'

/**
 * Normalise un numéro de téléphone gabonais
 * @param phoneNum Numéro de téléphone (format libre)
 * @returns Numéro normalisé avec préfixe +241 (ex: "+24165671734")
 * @throws Error si le numéro est invalide
 */
export function normalizePhoneNumber(phoneNum: string): string {
  if (!phoneNum || typeof phoneNum !== 'string') {
    throw new Error('Numéro de téléphone invalide')
  }

  // Supprimer tous les caractères non numériques (sauf + au début)
  let cleaned = phoneNum.trim().replace(/[\s\-().]/g, '')

  // Gérer les différents formats de préfixe
  if (cleaned.startsWith('+241')) {
    cleaned = cleaned.substring(4) // Retirer +241
  } else if (cleaned.startsWith('00241')) {
    cleaned = cleaned.substring(5) // Retirer 00241
  } else if (cleaned.startsWith('241')) {
    cleaned = cleaned.substring(3) // Retirer 241
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1) // Retirer le 0 initial
  }

  // Vérifier que le reste est uniquement numérique
  if (!/^\d+$/.test(cleaned)) {
    throw new Error('Le numéro de téléphone contient des caractères invalides')
  }

  // Valider la longueur
  const minLength = MEMBERSHIP_REQUEST_VALIDATION.MIN_PHONE_LENGTH
  const maxLength = MEMBERSHIP_REQUEST_VALIDATION.MAX_PHONE_LENGTH
  
  if (cleaned.length < minLength || cleaned.length > maxLength) {
    throw new Error(`Le numéro de téléphone doit contenir entre ${minLength} et ${maxLength} chiffres`)
  }

  // Retourner le numéro avec le préfixe
  return `${PHONE_PREFIX}${cleaned}`
}

/**
 * Génère une URL WhatsApp pour envoyer un message
 * @param phoneNum Numéro de téléphone (sera normalisé)
 * @param message Message à envoyer (optionnel)
 * @returns URL WhatsApp (ex: "https://wa.me/24165671734?text=Bonjour")
 */
export function generateWhatsAppUrl(phoneNum: string, message: string = ''): string {
  const normalized = normalizePhoneNumber(phoneNum)
  
  // Retirer le + pour l'URL WhatsApp
  const phoneForUrl = normalized.replace('+', '')
  
  // URL de base
  let url = `https://wa.me/${phoneForUrl}`
  
  // Ajouter le message si fourni
  if (message && message.trim()) {
    const encodedMessage = encodeURIComponent(message.trim())
    url += `?text=${encodedMessage}`
  }
  
  return url
}

/**
 * Génère une URL WhatsApp avec un message template de rejet
 * @param phoneNumber Numéro de téléphone (sera normalisé)
 * @param firstName Prénom du demandeur
 * @param matricule Matricule de la demande
 * @param motifReject Motif de rejet
 * @returns URL WhatsApp avec message template prérempli
 */
export function generateRejectionWhatsAppUrl(
  phoneNumber: string,
  firstName: string,
  matricule: string,
  motifReject: string
): string {
  // Générer le message template
  const message = `Bonjour ${firstName},

Votre demande d'adhésion KARA (matricule: ${matricule}) a été rejetée.

Motif de rejet:
${motifReject}

Pour toute question, veuillez contacter notre service client.

Cordialement,
KARA Mutuelle`

  // Utiliser la fonction existante pour générer l'URL
  return generateWhatsAppUrl(phoneNumber, message)
}
