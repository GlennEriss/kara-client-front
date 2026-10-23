/** Guide de lecture du bilan, repris sur la page et dans les exports. */
export const FINANCIAL_REPORT_GUIDE: Array<{ title: string; text: string }> = [
  {
    title: 'Quatre parties',
    text: 'Chaque onglet présente la trésorerie (l’argent entré et sorti), le résultat (ce que l’association gagne ou perd), les encours (ce qui reste dû ou à rendre en fin de mois) et les pertes et risques.',
  },
  {
    title: 'Les colonnes',
    text: 'Une colonne par mois. La dernière colonne « Total / fin » additionne les mois pour les montants du mois ; pour les montants marqués « fin de mois », elle donne la valeur à la fin de la période.',
  },
  {
    title: 'Trésorerie n’est pas résultat',
    text: 'Un versement d’épargne fait entrer de l’argent sans être un gain, car il devra être rendu. À l’inverse, des intérêts produits mais pas encore payés sont un gain attendu, pas de l’argent reçu.',
  },
  {
    title: 'Synthèse et onglets',
    text: 'La synthèse additionne tous les modules. Chaque onglet détaille un module, ligne par ligne, avec ses bases de calcul en bas de page.',
  },
  {
    title: 'Lire une ligne',
    text: 'En gras : sous-totaux et totaux. En italique : lignes données pour information, jamais additionnées. En rouge : montants négatifs. « — » : aucun mouvement dans le mois.',
  },
  {
    title: 'D’où viennent les chiffres',
    text: 'Le bilan est recalculé à chaque génération à partir de tous les contrats, versements, remboursements et pénalités enregistrés dans l’application.',
  },
]
