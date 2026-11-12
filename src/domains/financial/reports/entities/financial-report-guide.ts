/** Guide de lecture du bilan, repris sur la page et dans les exports. */
export const FINANCIAL_REPORT_GUIDE: Array<{ title: string; text: string }> = [
  { title: 'Accords entre membres', text: 'Les règlements directs entre membres restent hors trésorerie de KARA. Lorsqu’un versement transite par KARA, il entre en trésorerie et reste dans les fonds à reverser jusqu’à sa remise effective au bénéficiaire. Aucun de ces mouvements ne constitue un revenu de l’association. Les détails et les annexes identifient l’accord, le membre qui paie, le bénéficiaire et le groupe.' },
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
    text: 'La synthèse additionne tous les modules. Chaque onglet détaille un module, ligne par ligne, avec ses bases de calcul en bas de page. Les annexes par contrat expliquent ces mêmes chiffres : ne pas additionner la synthèse à ses modules ou à ses annexes.',
  },
  {
    title: 'Transferts internes',
    text: 'Une cotisation affectée par crédit fixe figure en sortie du crédit et en entrée de la caisse collective. Les totaux bruts comprennent ces deux mouvements, sans créer de bénéfice supplémentaire. Les sous-totaux, totaux et lignes pour information ne doivent pas être ajoutés une seconde fois aux lignes qu’ils reprennent.',
  },
  {
    title: 'Caisses collectives',
    text: 'Les cotisations sont des fonds à remettre, pas des recettes. Seule la redevance retenue à la remise effective est un produit. Le net remis constitue la sortie de trésorerie ; la retenue ne crée pas une seconde entrée. Une prise en charge par crédit fixe est une affectation interne compensant le décaissement du crédit.',
  },
  {
    title: 'Lire une ligne',
    text: 'En gras : sous-totaux et totaux. En italique : lignes données pour information, jamais additionnées. En rouge : montants négatifs. « — » : aucun mouvement dans le mois.',
  },
  {
    title: 'Assurances véhicules',
    text: 'Une commission attendue reste une prévision. À sa réception, seule la part de KARA entre dans le résultat ; la part du parrain reste à reverser. Une sortie est comptée uniquement à la date de remise enregistrée par l’administration, sans seconde charge. La prime d’assurance reste informative.',
  },
  {
    title: 'Contrats et dossiers',
    text: 'La vue Contrats et dossiers permet de retrouver chaque membre, référence et chiffre mensuel. L’export détaillé ajoute un inventaire et les annexes contractuelles. Les informations et statuts du dossier sont actuels ; les montants portent sur la période du bilan.',
  },
  {
    title: 'D’où viennent les chiffres',
    text: 'Le bilan est recalculé à chaque génération à partir de tous les contrats, versements, remboursements et pénalités enregistrés dans l’application.',
  },
]
