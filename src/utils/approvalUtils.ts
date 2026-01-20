/**
 * Utilitaires pour l'approbation d'une demande d'adhésion
 */

import type { UserRole } from '@/types/types'

/**
 * Génère un email à partir du prénom, nom et matricule
 * Format: {firstName}{lastName}{4premiersChiffresMatricule}@kara.ga
 * 
 * @param firstName - Prénom du membre
 * @param lastName - Nom du membre
 * @param matricule - Matricule du membre (ex: "1234.MK.567890")
 * @returns Email généré (ex: "jeandupont1234@kara.ga")
 * 
 * @example
 * generateEmail('Jean', 'Dupont', '1234.MK.567890') // Returns: "jeandupont1234@kara.ga"
 * generateEmail('José', 'González', '5678.MK.901234') // Returns: "josegonzalez5678@kara.ga"
 */
export function generateEmail(firstName: string, lastName: string, matricule: string): string {
  // Normaliser les noms : minuscules, supprimer caractères spéciaux et accents
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9]/g, '') // Supprimer tout sauf lettres et chiffres
  }

  // Normaliser prénom et nom
  const normalizedFirstName = normalizeName(firstName || '')
  const normalizedLastName = normalizeName(lastName || '')

  // Extraire les 4 premiers chiffres du matricule
  const matriculeDigits = matricule.replace(/\D/g, '').slice(0, 4)

  // Construire la partie nom
  const namePart = (normalizedFirstName + normalizedLastName) || 'member'

  // Générer l'email
  return `${namePart}${matriculeDigits}@kara.ga`
}

/**
 * Génère un mot de passe sécurisé
 * 
 * @param length - Longueur du mot de passe (par défaut: 12)
 * @returns Mot de passe sécurisé contenant majuscules, minuscules, chiffres et caractères spéciaux
 * 
 * @example
 * generateSecurePassword() // Returns: "A1b@C2d#E3f$"
 * generateSecurePassword(16) // Returns: "A1b@C2d#E3f$G4h%"
 */
export function generateSecurePassword(length: number = 12): string {
  // Caractères disponibles
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  
  // Assurer au moins un caractère de chaque type
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Remplir le reste avec des caractères aléatoires
  const allChars = uppercase + lowercase + numbers + special
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Mélanger les caractères pour éviter que les 4 premiers soient toujours dans le même ordre
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Convertit un membershipType en UserRole
 * 
 * @param membershipType - Type de membre ('adherant', 'bienfaiteur', 'sympathisant')
 * @returns Rôle utilisateur correspondant
 * 
 * @example
 * membershipTypeToRole('adherant') // Returns: "Adherant"
 * membershipTypeToRole('bienfaiteur') // Returns: "Bienfaiteur"
 */
export function membershipTypeToRole(membershipType: string): UserRole {
  switch (membershipType) {
    case 'adherant':
      return 'Adherant'
    case 'bienfaiteur':
      return 'Bienfaiteur'
    case 'sympathisant':
      return 'Sympathisant'
    default:
      return 'Adherant' // Par défaut
  }
}
