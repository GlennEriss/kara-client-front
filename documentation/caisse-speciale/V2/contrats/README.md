# Contrats Caisse Spéciale V2 – Nouvelle architecture domaine

Ce dossier documente la nouvelle structure et les diagrammes pour la partie **Contrats** du module Caisse Spéciale, en vue de l'intégration dans l'architecture domaine (comme Caisse Imprévue / Crédit Spéciale).

## Structure

```
V2/contrats/
├── activite/                 # Diagrammes d'activité (workflows) .puml
│   ├── ListerContrats.puml
│   ├── FiltrerContrats.puml
│   ├── RechercherContrats.puml
│   ├── VoirDetailsContrat.puml
│   ├── CreerContrat.puml
│   ├── TeleverserContratPDF.puml
│   ├── ConsulterVersements.puml
│   ├── ExporterListeContrats.puml
│   ├── ExporterVersements.puml
│   └── README.md
├── sequence/                 # Diagrammes de séquence .puml
│   ├── SEQ_ListerContrats.puml
│   ├── SEQ_FiltrerContrats.puml
│   ├── SEQ_RechercherContrats.puml
│   ├── SEQ_VoirDetailsContrat.puml
│   ├── SEQ_CreerContrat.puml
│   ├── SEQ_TeleverserContratPDF.puml
│   ├── SEQ_ConsulterVersements.puml
│   ├── SEQ_ExporterListeContrats.puml
│   ├── SEQ_ExporterVersements.puml
│   └── README.md
├── points-problematiques/    # Points à corriger
│   ├── POINTS_PROBLEMATIQUES.md
│   └── README.md
├── firebase/                 # Règles et index Firebase
│   └── FIREBASE.md
├── workflow/                 # Plan d'implémentation par séquence
│   └── WORKFLOW.md
└── README.md (ce fichier)
```

## Points critiques intégrés dans les diagrammes

| Point | Problème | Solution dans les diagrammes |
|-------|----------|-----------------------------|
| **C.0** | Chargement de tous les contrats sans pagination | Pagination Firestore + total count (liste paginée) |
| **C.1** | Statistiques calculées côté client et dépendantes des tabs | Stats dédiées côté service + cache React Query |
| **C.2** | Recherche limitée (ID / memberId / groupeId) | Recherche Firestore via champs dénormalisés |
| **C.3** | Données membres/groupes incomplètes sur la liste | useMember / useGroup + jointure optimisée |
| **C.4** | Filtres manquants (dates, retard, type de caisse, statut) | Barre de filtres complète + onglet Retard |
| **C.5** | Détails bloqués si PDF manquant | Détails accessibles + CTA upload PDF |
| **C.6** | Versements et exports non standardisés | Workflow Versements + export PDF/Excel |

## Prochaines étapes

1. **Validation documentation** : confirmer diagrammes + points problématiques
2. **Implémentation** : suivre le [WORKFLOW.md](./workflow/WORKFLOW.md) – tâches organisées par diagrammes de séquence
3. **Architecture domaine** : migrer vers `src/domains/financial/caisse-speciale/contrats/`
4. **Tests** : unitaires, composants, E2E (voir WORKFLOW.md section Tests)

## Références

- [WORKFLOW.md](./workflow/WORKFLOW.md) – Plan d'implémentation
- [FIREBASE.md](./firebase/FIREBASE.md) – Règles Firestore, Storage et index
- [POINTS_PROBLEMATIQUES.md](./points-problematiques/POINTS_PROBLEMATIQUES.md)
- [ANALYSE_CAISSE_SPECIALE.md](../V1/ANALYSE_CAISSE_SPECIALE.md) – Analyse V1 (UC1–UC6)
- [UC6_FILTRAGE_RETARD.md](../V1/UC6_FILTRAGE_RETARD.md) – Filtrage contrats en retard
- [Contrats Caisse Imprévue](../../caisse-imprevue/V2/demande/) – Référence de structure
