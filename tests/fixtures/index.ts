/**
 * Export centralisé des fixtures de test
 */
import provincesData from './geography/provinces.json'
import departmentsData from './geography/departments.json'

// Types
export interface ProvinceFixture {
  id: string
  code: string
  name: string
  searchableText: string
}

export interface DepartmentFixture {
  id: string
  provinceId: string
  name: string
  searchableText: string
}

// Données
export const provinceFixtures = provincesData.provinces as ProvinceFixture[]
export const departmentFixtures = departmentsData.departments as DepartmentFixture[]

// Pagination fixtures
export const provincePaginationFixtures = provincesData.pagination
export const provinceSearchFixtures = provincesData.search
export const departmentsByProvince = departmentsData.byProvince

// Helpers
export function getProvinceById(id: string): ProvinceFixture | undefined {
  return provinceFixtures.find(p => p.id === id)
}

export function getDepartmentById(id: string): DepartmentFixture | undefined {
  return departmentFixtures.find(d => d.id === id)
}

export function getDepartmentsByProvince(provinceId: string): DepartmentFixture[] {
  return departmentFixtures.filter(d => d.provinceId === provinceId)
}

export function searchProvinces(query: string): ProvinceFixture[] {
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return provinceFixtures.filter(p => 
    p.searchableText.includes(normalizedQuery) || p.name.toLowerCase().includes(normalizedQuery)
  )
}

export function searchDepartments(query: string): DepartmentFixture[] {
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return departmentFixtures.filter(d => 
    d.searchableText.includes(normalizedQuery) || d.name.toLowerCase().includes(normalizedQuery)
  )
}

// Export par défaut
export default {
  provinces: provinceFixtures,
  departments: departmentFixtures,
  provincePagination: provincePaginationFixtures,
  provinceSearch: provinceSearchFixtures,
  departmentsByProvince,
}
