/**
 * Remplissage commun aux documents institutionnels signés par le Comité
 * Exécutif (Statuts, Règlement Intérieur) : ils portent tous les deux le même
 * bloc « Fait à …, le … » et les deux mêmes signataires.
 */

export interface SignataireFillData {
  lieu: string
  date: string
  secretaireNom: string
  secretaireSignature: string | null
  conseillerNom: string
  conseillerSignature: string | null
}

export const signataireFillDataParDefaut = (lieu: string): SignataireFillData => ({
  lieu,
  date: '',
  secretaireNom: '',
  secretaireSignature: null,
  conseillerNom: '',
  conseillerSignature: null,
})

/** « 2026-01-15 » => « 15/01/2026 ». Vide => tirets à remplir à la main. */
export const formatDateDocument = (value: string): string => {
  if (!value) return '____ ______________ ______'
  const [annee, mois, jour] = value.split('-')
  if (!annee || !mois || !jour) return value
  return `${jour}/${mois}/${annee}`
}

/** Pointillés imprimés à la place d'un nom de signataire non renseigné. */
export const NOM_SIGNATAIRE_PLACEHOLDER = '.........................................'
