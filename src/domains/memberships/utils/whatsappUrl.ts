/**
 * Utilitaires pour la génération d'URLs WhatsApp
 * 
 * Permet de générer des liens WhatsApp pour envoyer des messages
 * aux demandeurs d'adhésion (corrections, notifications, etc.)
 */

import { MEMBERSHIP_REQUEST_VALIDATION } from '@/constantes/membership-requests'
import { defaultTemplateBody } from '@/domains/messaging/constants/message-templates'
import { renderTemplate } from '@/domains/messaging/utils/renderTemplate'

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
/**
 * Numéro WhatsApp effectif d'un membre : le numéro WhatsApp saisi, sinon le 1er
 * numéro de téléphone (`contacts`). Renvoie `undefined` si aucun numéro.
 */
export function resolveWhatsappNumber(
  whatsappNumber?: string | null,
  contacts?: Array<string | null | undefined> | null,
): string | undefined {
  const wa = whatsappNumber?.trim()
  if (wa) return wa
  const first = contacts?.find((c) => c && String(c).trim())
  return first ? String(first).trim() : undefined
}

/**
 * Liste des numéros avec le numéro WhatsApp en tête (pour pré-sélection dans les
 * sélecteurs). Conserve tous les contacts ; déduplique le numéro WhatsApp.
 */
export function whatsappFirstContacts(
  whatsappNumber?: string | null,
  contacts?: Array<string | null | undefined> | null,
): string[] {
  const list = (contacts ?? [])
    .filter((c): c is string => !!c && !!String(c).trim())
    .map((c) => String(c).trim())
  const wa = whatsappNumber?.trim()
  return wa && !list.includes(wa) ? [wa, ...list] : list
}

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
 * Message de rejet d'une demande d'adhésion.
 *
 * `templateBody` provient de Système → Modèles de messages (clé
 * `membershipRejected`) ; s'il est absent, le texte livré par défaut s'applique.
 */
export function buildRejectionMessage(
  firstName: string,
  matricule: string,
  motifReject: string,
  templateBody?: string
): string {
  const body = templateBody?.trim() || defaultTemplateBody('membershipRejected')
  return renderTemplate(body, {
    prenom: firstName,
    matricule,
    motif: motifReject,
  })
}

/**
 * Génère une URL WhatsApp avec le message de rejet
 * @param phoneNumber Numéro de téléphone (sera normalisé)
 * @param firstName Prénom du demandeur
 * @param matricule Matricule de la demande
 * @param motifReject Motif de rejet
 * @param templateBody Corps personnalisé du modèle (optionnel)
 * @returns URL WhatsApp avec message prérempli
 */
export function generateRejectionWhatsAppUrl(
  phoneNumber: string,
  firstName: string,
  matricule: string,
  motifReject: string,
  templateBody?: string
): string {
  return generateWhatsAppUrl(
    phoneNumber,
    buildRejectionMessage(firstName, matricule, motifReject, templateBody)
  )
}
