/**
 * Utilitaires pour la gestion des codes de sécurité
 * 
 * Les codes de sécurité sont utilisés pour permettre aux demandeurs
 * de corriger leurs demandes d'adhésion.
 */

import { MEMBERSHIP_REQUEST_SECURITY_CODE } from '@/constantes/membership-requests'

export interface SecurityCodeInfo {
  code: string | null | undefined
  used: boolean
  expiry: Date | null
}

/**
 * Génère un code de sécurité à 6 chiffres aléatoire
 * @returns Code de sécurité de 6 chiffres (ex: "123456")
 */
export function generateSecurityCode(): string {
  const min = MEMBERSHIP_REQUEST_SECURITY_CODE.MIN_VALUE
  const max = MEMBERSHIP_REQUEST_SECURITY_CODE.MAX_VALUE
  
  // Générer un nombre aléatoire dans la plage
  const code = Math.floor(Math.random() * (max - min + 1)) + min
  
  return code.toString()
}

/**
 * Vérifie si un code de sécurité est valide (non utilisé et non expiré)
 * @param info Informations du code de sécurité
 * @returns true si le code est valide, false sinon
 */
export function isSecurityCodeValid(info: SecurityCodeInfo): boolean {
  // Code manquant
  if (!info.code) {
    return false
  }
  
  // Code déjà utilisé
  if (info.used) {
    return false
  }
  
  // Date d'expiration manquante
  if (!info.expiry) {
    return false
  }
  
  // Code expiré
  const now = new Date()
  if (info.expiry.getTime() <= now.getTime()) {
    return false
  }
  
  return true
}

/**
 * Calcule la date d'expiration d'un code de sécurité
 * @param hoursFromNow Nombre d'heures à partir de maintenant (défaut: 48h)
 * @returns Date d'expiration
 */
export function calculateCodeExpiry(hoursFromNow: number = MEMBERSHIP_REQUEST_SECURITY_CODE.EXPIRY_HOURS): Date {
  const now = new Date()
  const expiry = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000)
  return expiry
}
