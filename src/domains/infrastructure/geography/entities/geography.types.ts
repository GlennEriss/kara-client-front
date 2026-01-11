/**
 * Types/Entités pour le domaine Geography
 * 
 * Ces types ont été extraits de src/types/types.ts pour être regroupés dans le domaine Geography.
 */

/**
 * Province - Entité géographique de niveau 1
 */
export interface Province {
  id: string
  code: string // Code unique (ex: "ESTuaire", "OGOUE_MARITIME")
  name: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Département - Entité géographique de niveau 2 (appartient à une Province)
 */
export interface Department {
  id: string
  provinceId: string
  name: string
  code?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Commune (ou Ville) - Entité géographique de niveau 3 (appartient à un Département)
 */
export interface Commune {
  id: string
  departmentId: string
  name: string
  postalCode?: string
  alias?: string // "Ville" si applicable
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Arrondissement - Entité géographique de niveau 4 (appartient à une Commune)
 */
export interface District {
  id: string
  communeId: string
  name: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

/**
 * Quartier - Entité géographique de niveau 5 (appartient à un Arrondissement)
 */
export interface Quarter {
  id: string
  districtId: string
  name: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}
