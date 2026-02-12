'use client'

import ListContractsCISection from '@/components/caisse-imprevue/ListContractsCISection'

/**
 * Point d'entrée domains pour la liste des contrats CI.
 * Le rendu est délégué au composant existant pendant la migration progressive.
 */
export default function ListContractsCIV2() {
  return <ListContractsCISection />
}
