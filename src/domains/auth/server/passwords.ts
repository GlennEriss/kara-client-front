import crypto from 'node:crypto'

/** Longueur minimale d'un mot de passe choisi par l'utilisateur (même règle que l'espace membre). */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Mot de passe temporaire remis par l'association : aléatoire, sans caractères
 * ambigus, avec au moins une minuscule, une majuscule et un chiffre.
 */
export function generateTemporaryPassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?'
  const pick = () => alphabet[crypto.randomInt(0, alphabet.length)]
  let pwd = Array.from({ length }, pick).join('')
  if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    pwd = `${pick()}${pick()}A1a${pwd}`.slice(0, length)
  }
  return pwd
}

/** Nouveau mot de passe valide : au moins 8 caractères, avec une lettre et un chiffre. */
export function isValidNewPassword(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.length < MIN_PASSWORD_LENGTH) return false
  return /[a-zA-Z]/.test(value) && /[0-9]/.test(value)
}
