/**
 * Utilitaire pour formater l'affichage d'un membre dans la recherche du code entremetteur
 * 
 * Format : "Nom Prénom (Code Entremetteur)"
 * Exemple : "Dupont Jean (1228.MK.0058)"
 */

import type { User } from '@/types/types'

/**
 * Formate un membre pour l'affichage dans la liste de recherche
 * 
 * @param member - Membre à formater
 * @returns Chaîne formatée : "Nom Prénom (Code)" ou "Nom Prénom" si code manquant
 * 
 * @example
 * ```ts
 * formatIntermediaryDisplay({
 *   lastName: 'Dupont',
 *   firstName: 'Jean',
 *   matricule: '1228.MK.0058'
 * })
 * // Retourne : "Dupont Jean (1228.MK.0058)"
 * ```
 */
export function formatIntermediaryDisplay(member: User): string {
  const { lastName, firstName, matricule } = member
  
  // Construire le nom complet
  const fullName = [lastName, firstName].filter(Boolean).join(' ')
  
  // Ajouter le code entre parenthèses si présent
  if (matricule && matricule.trim()) {
    return `${fullName} (${matricule})`
  }
  
  // Retourner seulement le nom si pas de code
  return fullName
}

/**
 * Extrait le code entremetteur d'un membre
 * 
 * @param member - Membre
 * @returns Le matricule (code entremetteur) ou une chaîne vide
 */
export function extractIntermediaryCode(member: User): string {
  return member.matricule || ''
}
