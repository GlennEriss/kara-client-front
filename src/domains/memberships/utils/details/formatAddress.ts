/**
 * Formate une adresse complète à partir des champs individuels
 * 
 * @param address - Objet contenant les champs d'adresse (province, city, district, arrondissement, additionalInfo)
 * @returns Adresse formatée (ex: "Quartier, Arrondissement, Ville, Province") ou "Non renseignée" si tous champs vides
 */
export interface AddressFields {
  district?: string
  arrondissement?: string
  city?: string
  province?: string
  additionalInfo?: string
}

export function formatAddress(address: AddressFields): string {
  if (!address) return 'Non renseignée'

  const parts = [
    address.district,
    address.arrondissement,
    address.city,
    address.province
  ].filter(Boolean) // Retire les valeurs null/undefined/vides

  if (parts.length === 0) {
    return 'Non renseignée'
  }

  return parts.join(', ')
}
