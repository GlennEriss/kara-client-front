import { extractTemplateVariables, renderTemplate } from './renderTemplate'
import { messageLinkVariables } from './message-template-links'

export const SAMPLE_VALUES: Record<string, string> = {
  prenom: 'Awa',
  nom: 'NGUEMA Awa',
  age: '34',
  produit: 'Caisse spéciale',
  typeVersement: 'mensuel',
  montant: '25 000',
  montantTotal: '75 000',
  nombre: '3',
  dateEcheance: '05/03/2026',
  joursRetard: '12 jours',
  detail: '• Versement mensuel — 25 000 FCFA (échéance du 05/03/2026)',
  matricule: 'MK-2026-0142',
  motif: 'Pièce d’identité illisible',
  corrections: '- Photo de la pièce d’identité\n- Numéro de téléphone',
  lien: 'https://kara.ga/corrections/MK-2026-0142',
  code: '482 913',
  dateExpiration: '12/03/2026 18:00',
  tempsRestant: '2 jours',
  plaque: ' (plaque GA-123-AB)',
  compagnie: ', NSIA Assurances',
  echeance: 'dans 7 jours (le 12/03/2026)',
  dateFin: '12/03/2026',
  beneficiaire: 'ONDO Alice',
  objet: 'Vente de ventilateurs',
  reference: 'ACCORD-001',
  evenement: 'Rencontre des membres',
  introduction: 'LE KARA vous invite à participer à cette rencontre.',
  description: 'Un moment d’échange entre les membres.',
  dateDebut: 'vendredi 20 novembre 2026 à 10:00',
  fin: 'Fin : samedi 21 novembre 2026',
  lieu: 'Salle LE KARA, Libreville',
  lienEvenement:
    'Voir l’événement : https://association-le-kara.com/evenements/exemple',
  contribution: 'Vous pouvez contribuer à la collecte en argent ou en nature.',
  collecte: 'Collecte solidaire',
  minimum: 'Contribution minimale indiquée : 1 000 FCFA.',
  instructions:
    'Choisissez « Je veux contribuer ». La réception du don sera vérifiée par l’association.',
  montantFinal: '110 000',
  bonus: '10 000',
  duree: '3 mois',
  date: '12/11/2026',
  interets: '15 000',
}

export function previewOf(
  body: string,
  key?: string,
  baseUrl?: string,
): string {
  const samples: Record<string, string> =
    key === 'groupAgreementReminder'
      ? {
          ...SAMPLE_VALUES,
          montant: '25 000 FCFA',
          echeance: ' Échéance : 19/11/2026, 25 000 FCFA.',
        }
      : SAMPLE_VALUES
  const variables = Object.fromEntries(
    extractTemplateVariables(body).map((name) => [
      name,
      samples[name] ?? `«${name}»`,
    ]),
  )
  try {
    return renderTemplate(body, messageLinkVariables(variables, baseUrl))
  } catch {
    return renderTemplate(body, variables)
  }
}
