import {
  STATUTS_BLOCS,
  STATUTS_ENTETE,
  STATUTS_VERSION,
  STATUTS_SIGNATURE,
  STATUTS_NOTE_ORIENTATION,
  PROCEDURE_CONFORMITE,
  PROCEDURE_CONFORMITE_ENTETE,
} from '@/constantes/statuts-kara'
import {
  REGLEMENT_BLOCS,
  REGLEMENT_ENTETE,
  REGLEMENT_VERSION,
  REGLEMENT_SIGNATURE,
  GRILLE_CONTRIBUTIONS,
  GRILLE_CONTRIBUTIONS_COLONNES,
  GRILLE_PRESTATIONS,
  GRILLE_PRESTATIONS_COLONNES,
} from '@/constantes/reglement-interieur'
export function officialDocument(id: string, saved: Record<string, any> = {}) {
  const statuts = id === 'statuts'
  return {
    id,
    title: statuts ? 'Statuts de l’association' : 'Règlement intérieur',
    lieu: statuts ? STATUTS_SIGNATURE.lieu : REGLEMENT_SIGNATURE.lieu,
    date: '',
    secretaireNom: '',
    conseillerNom: '',
    ...saved,
    version: saved.version || null,
    textVersion: statuts ? STATUTS_VERSION : REGLEMENT_VERSION,
    defaultLocation: statuts
      ? STATUTS_SIGNATURE.lieu
      : REGLEMENT_SIGNATURE.lieu,
    workContent: statuts
      ? [
          {
            type: 'orientation',
            titre: STATUTS_NOTE_ORIENTATION.intitule,
            paragraphes: [STATUTS_NOTE_ORIENTATION.texte],
          },
          {
            type: 'preambule',
            titre: PROCEDURE_CONFORMITE_ENTETE.titre,
            paragraphes: [PROCEDURE_CONFORMITE_ENTETE.introduction],
          },
          ...PROCEDURE_CONFORMITE.map((step) => ({
            type: 'article',
            titre: `${step.numero}. ${step.action}`,
            paragraphes: [step.modalites],
            puces: step.pieces || [],
          })),
        ]
      : [],
    heading: statuts ? STATUTS_ENTETE : REGLEMENT_ENTETE,
    content: statuts ? STATUTS_BLOCS : REGLEMENT_BLOCS,
    tables: statuts
      ? {}
      : {
          contributions: {
            columns: GRILLE_CONTRIBUTIONS_COLONNES,
            rows: GRILLE_CONTRIBUTIONS.map((r) => [
              r.niveau,
              r.total,
              r.fonctionnement,
              r.secours,
            ]),
          },
          prestations: {
            columns: GRILLE_PRESTATIONS_COLONNES,
            rows: GRILLE_PRESTATIONS.map((r) => Object.values(r)),
          },
        },
  }
}
