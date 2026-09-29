'use client'

import { Input } from '@/components/ui/input'
import React from 'react'

import {
  DEFAULT_DOCUMENT_PLACE,
  EMPTY_DOCUMENT_COMPLETION,
  missingDocumentFields,
  type DocumentCompletion,
  type DocumentField,
} from './MutuelleDocumentKit'

const cleanLabel = (label: string) => label.replace(/\s*:\s*$/, '')

/**
 * État de complétion d'une modale PDF : remis à zéro à chaque ouverture, et
 * répercuté sur l'aperçu avec un léger délai pour ne pas régénérer le PDF à
 * chaque frappe. Le téléchargement utilise `completion`, toujours à jour.
 */
export function useDocumentCompletion(isOpen: boolean, resetKey?: string) {
  const [completion, setCompletion] = React.useState<DocumentCompletion>(EMPTY_DOCUMENT_COMPLETION)
  const [previewCompletion, setPreviewCompletion] = React.useState<DocumentCompletion>(EMPTY_DOCUMENT_COMPLETION)

  React.useEffect(() => {
    if (!isOpen) return
    setCompletion(EMPTY_DOCUMENT_COMPLETION)
    setPreviewCompletion(EMPTY_DOCUMENT_COMPLETION)
  }, [isOpen, resetKey])

  React.useEffect(() => {
    const timer = window.setTimeout(() => setPreviewCompletion(completion), 300)
    return () => window.clearTimeout(timer)
  }, [completion])

  return { completion, setCompletion, previewCompletion }
}

/**
 * Saisie du lieu et des informations absentes d'un document PDF. Seuls les
 * champs vides dans les données sont proposés : un champ reste affiché tant
 * que la donnée d'origine manque, même une fois rempli.
 */
export function DocumentCompletionPanel({
  fields,
  completion,
  onChange,
  showPlace = true,
}: {
  fields: DocumentField[]
  completion: DocumentCompletion
  onChange: (next: DocumentCompletion) => void
  /** Faux quand la modale gère déjà le lieu (ex. contrat de crédit). */
  showPlace?: boolean
}) {
  const missing = missingDocumentFields(fields)

  const setValue = (key: string, value: string) =>
    onChange({ ...completion, values: { ...completion.values, [key]: value } })

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-kara-primary-dark">Compléter le document</p>

      {showPlace && (
        <div className="space-y-1">
          <p className="text-[11px] text-gray-600">Lieu (« Fait à … »)</p>
          <Input
            value={completion.place}
            placeholder={DEFAULT_DOCUMENT_PLACE}
            onChange={(event) => onChange({ ...completion, place: event.target.value })}
            className="h-9"
          />
        </div>
      )}

      {missing.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] text-amber-700">
            {missing.length} information{missing.length > 1 ? 's' : ''} absente{missing.length > 1 ? 's' : ''} des
            données. Ce qui est saisi ici apparaît sur le PDF sans modifier la fiche.
          </p>
          {missing.map((target) => (
            <div key={target.key} className="space-y-1">
              <p className="text-[11px] text-gray-600">{cleanLabel(target.label)}</p>
              <Input
                type={target.type === 'date' ? 'date' : 'text'}
                value={completion.values[target.key] ?? ''}
                onChange={(event) => setValue(target.key, event.target.value)}
                className="h-9"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-gray-500">Toutes les informations du document sont renseignées.</p>
      )}
    </div>
  )
}
