/**
 * Export des composants géographie avec support de versioning
 * 
 * Par défaut, on utilise V2. Pour utiliser V1, définir NEXT_PUBLIC_GEOGRAPHY_VERSION=v1
 */

// Export des versions V1 (legacy)
export { default as GeographieManagementV1 } from './GeographieManagement'
export { default as ProvinceListV1 } from './ProvinceList'
export { default as DepartmentListV1 } from './DepartmentList'
export { default as CommuneListV1 } from './CommuneList'
export { default as DistrictListV1 } from './DistrictList'
export { default as QuarterListV1 } from './QuarterList'

// Export des versions V2 (active)
export { default as GeographieManagementV2 } from './v2/GeographieManagementV2'
export { default as ProvinceListV2 } from './v2/ProvinceListV2'
export { default as DepartmentListV2 } from './v2/DepartmentListV2'
export { default as CommuneListV2 } from './v2/CommuneListV2'
export { default as DistrictListV2 } from './v2/DistrictListV2'
export { default as QuarterListV2 } from './v2/QuarterListV2'

// Export par défaut (V2 active)
// Note: Pour basculer vers V1, modifier ces imports manuellement
export { default as GeographieManagement } from './v2/GeographieManagementV2'
export { default as ProvinceList } from './v2/ProvinceListV2'
export { default as DepartmentList } from './v2/DepartmentListV2'
export { default as CommuneList } from './v2/CommuneListV2'
export { default as DistrictList } from './v2/DistrictListV2'
export { default as QuarterList } from './v2/QuarterListV2'
