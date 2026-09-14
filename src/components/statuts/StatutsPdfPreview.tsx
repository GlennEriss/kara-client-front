'use client'

import { AlertTriangle } from 'lucide-react'
import React, { useCallback, useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { STATUTS_SIGNATURE, STATUTS_VERSION } from '@/constantes/statuts-kara'
import { cn } from '@/lib/utils'
import DocumentSignableWorkspace from './DocumentSignableWorkspace'
import StatutsKaraPDF from './StatutsKaraPDF'
import type { SignataireFillData } from './documentFill'

type Variante = 'officielle' | 'travail'

const VARIANTES: { valeur: Variante; libelle: string; description: string }[] = [
  {
    valeur: 'officielle',
    libelle: 'Version officielle',
    description:
      "Le seul texte adopté en Assemblée Générale : Préambule à Article 26. C'est cette version que consultent les membres et qu'on dépose auprès de l'administration.",
  },
  {
    valeur: 'travail',
    libelle: 'Version de travail (interne)',
    description:
      "La même, augmentée de la note d'orientation juridique et de la procédure de mise en conformité. Réservée au Comité Exécutif : ne pas déposer ni diffuser aux membres.",
  },
]

/** Statuts révisés, en version officielle ou en version de travail. */
const StatutsPdfPreview: React.FC = () => {
  const [variante, setVariante] = useState<Variante>('officielle')
  const avecAnnexes = variante === 'travail'
  const varianteActive = VARIANTES.find((v) => v.valeur === variante)!

  const construireDocument = useCallback(
    (fillData: SignataireFillData) => (
      <StatutsKaraPDF avecAnnexes={avecAnnexes} fillData={fillData} />
    ),
    [avecAnnexes],
  )

  return (
    <DocumentSignableWorkspace
      titre={varianteActive.libelle}
      construireDocument={construireDocument}
      nomFichier={avecAnnexes ? 'STATUTS_KARA_VERSION_TRAVAIL' : 'STATUTS_ASSOCIATION_KARA'}
      lieuParDefaut={STATUTS_SIGNATURE.lieu}
      // Seule la version officielle est publiée : la version de travail ne
      // doit jamais parvenir aux membres.
      publication={
        avecAnnexes ? undefined : { documentId: 'statuts', version: STATUTS_VERSION }
      }
      enTete={
        <div className="space-y-2">
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {VARIANTES.map((v) => (
              <button
                key={v.valeur}
                type="button"
                onClick={() => setVariante(v.valeur)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  variante === v.valeur
                    ? 'bg-[#234D65] text-white shadow-sm'
                    : 'text-gray-600 hover:text-[#234D65]',
                )}
              >
                {v.libelle}
              </button>
            ))}
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-gray-600">
            {varianteActive.description}
          </p>
        </div>
      }
      avertissement={
        avecAnnexes ? (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="flex gap-3 p-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-900">
                Cette version contient des documents de travail du Comité Exécutif. Elle ne doit
                être ni déposée auprès de l&apos;administration, ni remise aux membres.
              </p>
            </CardContent>
          </Card>
        ) : null
      }
    />
  )
}

export default StatutsPdfPreview
