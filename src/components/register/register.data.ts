export const CIVILITY_OPTIONS = [
    { value: 'Monsieur', label: 'Monsieur' },
    { value: 'Madame', label: 'Madame' },
    { value: 'Mademoiselle', label: 'Mademoiselle' }
]

export const MARITAL_STATUS_OPTIONS = [
    { value: 'Célibataire', label: 'Célibataire' },
    { value: 'Veuf/Veuve', label: 'Veuf/Veuve' },
    { value: 'Marié(e)', label: 'Marié(e)' },
    { value: 'Concubinage', label: 'Concubinage' }
]

// Aligné sur le formulaire d'adhésion membre : les confessions chrétiennes sont
// regroupées sous « Chrétien ». Liste volontairement resserrée sur le contexte
// gabonais (Chrétien / Musulman / Animiste / Sans religion / Autre).
export const RELIGION_OPTIONS = [
    { value: 'Chrétien', label: 'Chrétien' },
    { value: 'Musulman', label: 'Musulman' },
    { value: 'Animiste', label: 'Animiste' },
    { value: 'Sans religion', label: 'Sans religion' },
    { value: 'Autre', label: 'Autre' }
]