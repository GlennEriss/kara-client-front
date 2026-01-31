# Demandes Caisse Spéciale V2 – Nouvelle architecture domaine

Ce dossier documente la nouvelle structure et les diagrammes pour la partie **Demandes** du module Caisse Spéciale, en vue de l'intégration dans l'architecture domaine (comme Caisse Imprévue).

## Structure

```
V2/demandes/
├── activite/           # Diagrammes d'activité (workflows) .puml
│   ├── ListerDemandes.puml
│   ├── FiltrerDemandes.puml
│   ├── RechercherDemandes.puml
│   ├── CreerDemande.puml
│   ├── AccepterDemande.puml
│   ├── RefuserDemande.puml
│   ├── ReouvrirDemande.puml
│   ├── ConvertirContrat.puml
│   ├── VoirDetails.puml
│   └── README.md
├── sequence/           # Diagrammes de séquence .puml
│   ├── SEQ_ListerDemandes.puml
│   ├── SEQ_FiltrerDemandes.puml
│   ├── SEQ_CreerDemande.puml
│   ├── SEQ_AccepterDemande.puml
│   ├── SEQ_RefuserDemande.puml
│   ├── SEQ_ReouvrirDemande.puml
│   ├── SEQ_ConvertirContrat.puml
│   ├── SEQ_VoirDetails.puml
│   └── README.md
├── points-problematiques/   # Points à corriger
│   ├── POINTS_PROBLEMATIQUES.md
│   └── README.md
├── firebase/                # Règles et index Firebase
│   └── FIREBASE.md
├── workflow/                # Plan d'implémentation par séquence
│   └── WORKFLOW.md
└── README.md (ce fichier)
```

## Points critiques intégrés dans les diagrammes

| Point | Problème | Solution dans les diagrammes |
|-------|----------|-----------------------------|
| **C.0** | Formulaire sans contact d'urgence | Ajouter section contact d'urgence (EmergencyContactMemberSelector, comme Caisse Imprévue) |
| **C.1** | Stats après Tabs, rechargement à chaque changement | Stats EN PREMIER, chargées UNE SEULE FOIS |
| **C.2** | Absence de filtres | Barre de filtres (statut, type caisse, dates) |
| **C.3** | Absence de recherche | Recherche par nom, prénom, matricule |
| **C.4** | Absence de filtres par date | Filtres date création, date souhaitée |
| **C.5** | Vue Liste = cards en longueur | Vue Liste = vrai tableau (colonnes dont Contact d'urgence) |
| **2.1, 2.2, 2.3** | Infos membre et contact d'urgence manquants | useMember + emergencyContact sur détails et modals |

## Prochaines étapes

1. **Implémentation** : Suivre le [WORKFLOW.md](./workflow/WORKFLOW.md) – tâches organisées par diagrammes de séquence
2. **Architecture domaine** : Migrer vers `src/domains/financial/caisse-speciale/` (comme caisse-imprevue)
3. **Tests** : Tests unitaires, composants et E2E (voir WORKFLOW.md section 9)

## Références

- [WORKFLOW.md](./workflow/WORKFLOW.md) – Plan d'implémentation (référence [documentation/general/WORKFLOW.md](../../../general/WORKFLOW.md))
- [FIREBASE.md](./firebase/FIREBASE.md) – Règles Firestore, Storage et index
- [POINTS_PROBLEMATIQUES.md](./points-problematiques/POINTS_PROBLEMATIQUES.md)
- [DEMANDES_CAISSE_SPECIALE.md](../V1/DEMANDES_CAISSE_SPECIALE.md) – Spécification V1
- [Caisse Imprévue V2](../../caisse-imprevue/V2/demande/) – Structure de référence
