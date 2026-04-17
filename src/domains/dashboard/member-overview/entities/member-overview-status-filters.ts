export const MEMBER_OVERVIEW_STATUS_FILTERS = {
  caisseSpeciale: {
    demandesIncluded: ['PENDING', 'APPROVED'],
    contratsExcluded: ['CLOSED'],
  },
  caisseImprevue: {
    demandesIncluded: ['PENDING', 'APPROVED'],
    contratsIncluded: ['ACTIVE'],
  },
  creditSpeciale: {
    demandesIncluded: ['PENDING', 'APPROVED'],
    contratsExcluded: ['CLOSED', 'DISCHARGED'],
  },
  creditFixe: {
    demandesIncluded: ['PENDING', 'APPROVED'],
    contratsExcluded: ['CLOSED', 'DISCHARGED'],
  },
  creditAide: {
    demandesIncluded: ['PENDING', 'APPROVED'],
    contratsExcluded: ['CLOSED', 'DISCHARGED'],
  },
  placement: {
    demandesIncluded: ['PENDING', 'APPROVED'],
    contratsIncluded: ['Draft', 'Active'],
  },
} as const

