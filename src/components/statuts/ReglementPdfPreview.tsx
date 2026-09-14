'use client'

import React, { useCallback } from 'react'

import { REGLEMENT_SIGNATURE, REGLEMENT_VERSION } from '@/constantes/reglement-interieur'
import DocumentSignableWorkspace from './DocumentSignableWorkspace'
import ReglementInterieurPDF from './ReglementInterieurPDF'
import type { SignataireFillData } from './documentFill'

/** Règlement Intérieur : un seul document, pas de variante. */
const ReglementPdfPreview: React.FC = () => {
  const construireDocument = useCallback(
    (fillData: SignataireFillData) => <ReglementInterieurPDF fillData={fillData} />,
    [],
  )

  return (
    <DocumentSignableWorkspace
      titre="Règlement Intérieur"
      construireDocument={construireDocument}
      nomFichier="REGLEMENT_INTERIEUR_KARA"
      lieuParDefaut={REGLEMENT_SIGNATURE.lieu}
      publication={{ documentId: 'reglement-interieur', version: REGLEMENT_VERSION }}
      enTete={
        <p className="max-w-2xl text-xs leading-relaxed text-gray-600">
          Adopté en Assemblée Générale en application de l&apos;Article 24 des Statuts. Il fixe la
          grille des cotisations (Niveaux A à E), le barème des prestations sociales, le régime des
          accompagnements et la discipline applicable.
        </p>
      }
    />
  )
}

export default ReglementPdfPreview
