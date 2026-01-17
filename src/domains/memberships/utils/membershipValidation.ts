/**
 * Utilitaires pour la validation des données de demande d'adhésion
 * 
 * Valide les champs d'une demande d'adhésion selon les règles métier
 */

import { MEMBERSHIP_REQUEST_VALIDATION } from '@/constantes/membership-requests'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Valide un email
 * @param email Email à valider
 * @returns true si l'email est valide, false sinon
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  const trimmed = email.trim()

  // Longueur minimale
  if (trimmed.length < MEMBERSHIP_REQUEST_VALIDATION.MIN_EMAIL_LENGTH) {
    return false
  }

  // Longueur maximale
  if (trimmed.length > MEMBERSHIP_REQUEST_VALIDATION.MAX_EMAIL_LENGTH) {
    return false
  }

  // Format email
  return EMAIL_REGEX.test(trimmed)
}

/**
 * Valide un numéro de téléphone (format brut, sera normalisé après)
 * @param phoneNum Numéro de téléphone à valider
 * @returns true si le numéro est valide, false sinon
 */
export function validatePhoneNumber(phoneNum: string): boolean {
  if (!phoneNum || typeof phoneNum !== 'string') {
    return false
  }

  // Supprimer les caractères non numériques (sauf + au début)
  let cleaned = phoneNum.trim().replace(/[\s\-().]/g, '')

  // Gérer les préfixes
  if (cleaned.startsWith('+241')) {
    cleaned = cleaned.substring(4)
  } else if (cleaned.startsWith('00241')) {
    cleaned = cleaned.substring(5)
  } else if (cleaned.startsWith('241')) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // Vérifier que c'est uniquement numérique
  if (!/^\d+$/.test(cleaned)) {
    return false
  }

  // Vérifier la longueur
  const minLength = MEMBERSHIP_REQUEST_VALIDATION.MIN_PHONE_LENGTH
  const maxLength = MEMBERSHIP_REQUEST_VALIDATION.MAX_PHONE_LENGTH

  return cleaned.length >= minLength && cleaned.length <= maxLength
}

/**
 * Valide un nom ou prénom
 * @param name Nom à valider
 * @returns true si le nom est valide, false sinon
 */
export function validateName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false
  }

  const trimmed = name.trim()

  // Longueur minimale
  if (trimmed.length < MEMBERSHIP_REQUEST_VALIDATION.MIN_NAME_LENGTH) {
    return false
  }

  // Longueur maximale
  if (trimmed.length > MEMBERSHIP_REQUEST_VALIDATION.MAX_NAME_LENGTH) {
    return false
  }

  // Ne doit pas être uniquement numérique
  if (/^\d+$/.test(trimmed)) {
    return false
  }

  return true
}

/**
 * Valide une adresse
 * @param address Adresse à valider
 * @returns true si l'adresse est valide, false sinon
 */
export function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false
  }

  const trimmed = address.trim()

  // Longueur minimale
  if (trimmed.length < MEMBERSHIP_REQUEST_VALIDATION.MIN_ADDRESS_LENGTH) {
    return false
  }

  // Longueur maximale
  if (trimmed.length > MEMBERSHIP_REQUEST_VALIDATION.MAX_ADDRESS_LENGTH) {
    return false
  }

  return true
}
