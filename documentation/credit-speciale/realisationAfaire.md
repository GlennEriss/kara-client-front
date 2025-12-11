# Réalisation à faire – Module Crédit spéciale / fixe / aide

Ce fichier liste les fonctionnalités à implémenter pour le module Crédit spéciale et fait le lien entre :
- L’architecture globale : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- L’analyse fonctionnelle : [`./ANALYSE_CREDIT_SPECIALE.md`](./ANALYSE_CREDIT_SPECIALE.md)

## 1. Rappels module / périmètre
- Types de crédits : spéciale (≤7 mois), aide (≤3 mois), fixe (illimité).
- Acteurs : Client (lecture/suivi), Admin (saisie/validation/simulation/versements), Garant (parrain membre ou admin, rémunération si membre).
- Éligibilité : client ou garant à jour à la caisse imprévue, dérogation possible admin.
- Rémunération garant : 2% du montant versé mensuel, uniquement garant membre/parrain, historique consultable par le garant.
- Scoring fiabilité (admin-only) : score 0–10, mis à jour aux paiements, affiché dans listes/onglets/fiches admin.

## 2. Backlog de fonctionnalités à implémenter

### 2.1 Demandes (workflow + UI)
- [ ] Onglets et stats demandes : pending / approved / rejected ; tri par échéance proche.  
  - Use case : UC_TabsDemandes / UC_Validation (admin)  
  - Diagrammes : activité [`diagrams/UC_TabsDemandes_activity.puml`](./diagrams/UC_TabsDemandes_activity.puml), séquence [`diagrams/UC_TabsDemandes_sequence.puml`](./diagrams/UC_TabsDemandes_sequence.puml), activité [`diagrams/UC_Validation_activity.puml`](./diagrams/UC_Validation_activity.puml), séquence [`diagrams/UC_Validation_sequence.puml`](./diagrams/UC_Validation_sequence.puml)
- [ ] Filtres/recherche : statut, type (spéciale/fixe/aide), membre, garant, date, retard, texte.  
  - Use case : UC_Filtre (UI), UC_Filtre (services/repos)  
  - Diagrammes : activité [`diagrams/UC_Filtre_activity.puml`](./diagrams/UC_Filtre_activity.puml), séquence [`diagrams/UC_Filtre_sequence.puml`](./diagrams/UC_Filtre_sequence.puml)
- [ ] Création demande par admin (client peut saisir mais pas simuler ni payer).  
  - Use case : `credit-speciale-usecases-nouveau-client.puml` (UC_Demande) / `credit-speciale-usecases-nouveau-admin.puml` (UC_CreateDemande)  
  - Diagrammes : activité [`diagrams/UC_Demande_activity.puml`](./diagrams/UC_Demande_activity.puml), séquence [`diagrams/UC_Demande_sequence.puml`](./diagrams/UC_Demande_sequence.puml), activité [`diagrams/UC_CreateDemande_activity.puml`](./diagrams/UC_CreateDemande_activity.puml), séquence [`diagrams/UC_CreateDemande_sequence.puml`](./diagrams/UC_CreateDemande_sequence.puml)
- [ ] Export listes demandes (PDF / Excel).  
  - Use case : UC_ExportDemandes (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_ExportDemandes_activity.puml`](./diagrams/UC_ExportDemandes_activity.puml), séquence [`diagrams/UC_ExportDemandes_sequence.puml`](./diagrams/UC_ExportDemandes_sequence.puml)
- [ ] Affichage scoring (badge admin) et visibilité garant (infos + statut CI).  
  - Use case : UC_Score (UI), UC_Scoring/UC_ShowScore (services/système), UC_Elig (CI), UC_Garant (Services)  
  - Diagrammes : activité [`diagrams/UC_Scoring_activity.puml`](./diagrams/UC_Scoring_activity.puml), séquence [`diagrams/UC_Scoring_sequence.puml`](./diagrams/UC_Scoring_sequence.puml), activité [`diagrams/UC_Elig_activity.puml`](./diagrams/UC_Elig_activity.puml), séquence [`diagrams/UC_Elig_sequence.puml`](./diagrams/UC_Elig_sequence.puml), activité [`diagrams/UC_ShowScore_activity.puml`](./diagrams/UC_ShowScore_activity.puml), séquence [`diagrams/UC_ShowScore_sequence.puml`](./diagrams/UC_ShowScore_sequence.puml), activité [`diagrams/UC_Garant_activity.puml`](./diagrams/UC_Garant_activity.puml), séquence [`diagrams/UC_Garant_sequence.puml`](./diagrams/UC_Garant_sequence.puml)

### 2.2 Simulations (admin only)
- [ ] Simulation standard (montant, taux, mensualité, 1er versement, durée calculée).  
  - Use case : UC_SimuStd (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_SimuStd_activity.puml`](./diagrams/UC_SimuStd_activity.puml), séquence [`diagrams/UC_SimuStd_sequence.puml`](./diagrams/UC_SimuStd_sequence.puml)
- [ ] Simulation personnalisée (montants par mois) + 2 tableaux récap (limite 7/3 mois vs personnalisé).  
  - Use case : UC_SimuPerso (UI/Services), UC_Tableaux (Hooks/Services)  
  - Diagrammes : activité [`diagrams/UC_SimuPerso_activity.puml`](./diagrams/UC_SimuPerso_activity.puml), séquence [`diagrams/UC_SimuPerso_sequence.puml`](./diagrams/UC_SimuPerso_sequence.puml), activité [`diagrams/UC_Tableaux_activity.puml`](./diagrams/UC_Tableaux_activity.puml), séquence [`diagrams/UC_Tableaux_sequence.puml`](./diagrams/UC_Tableaux_sequence.puml)
- [ ] Validation limites : spéciale ≤7 mois, aide ≤3 mois, fixe illimité ; suggestion montant minimum si dépassement.  
  - Use case : UC_SimuValidation (Système)  
  - Diagrammes : intégré dans UC_SimuStd et UC_SimuPerso

### 2.3 Contrats
- [ ] Onglets contrats + stats : actifs, retard, pénalités, à jour ; tri par échéance proche.  
  - Use case : UC_TabsContrats (UI/Services), UC_SortDue (UI/Hooks/Services)  
  - Diagrammes : activité [`diagrams/UC_TabsContrats_activity.puml`](./diagrams/UC_TabsContrats_activity.puml), séquence [`diagrams/UC_TabsContrats_sequence.puml`](./diagrams/UC_TabsContrats_sequence.puml), activité [`diagrams/UC_SortDue_activity.puml`](./diagrams/UC_SortDue_activity.puml), séquence [`diagrams/UC_SortDue_sequence.puml`](./diagrams/UC_SortDue_sequence.puml)
- [ ] Statut actif seulement après upload du PDF signé ; contrat vierge générable pour signature.  
  - Use case : UC_Contrat (UI/Services/Documents), UC_UploadContrat (UI/Services/Documents), UC_ContratVierge (Services/Documents), UC_Signature (Services), UC_Activate (Système), UC_DlContrat (UI/Services/Documents), UC_ContratSigne (UI/Services/Documents)  
  - Diagrammes : activité [`diagrams/UC_Contrat_activity.puml`](./diagrams/UC_Contrat_activity.puml), séquence [`diagrams/UC_Contrat_sequence.puml`](./diagrams/UC_Contrat_sequence.puml), activité [`diagrams/UC_UploadContrat_activity.puml`](./diagrams/UC_UploadContrat_activity.puml), séquence [`diagrams/UC_UploadContrat_sequence.puml`](./diagrams/UC_UploadContrat_sequence.puml), activité [`diagrams/UC_Signature_activity.puml`](./diagrams/UC_Signature_activity.puml), séquence [`diagrams/UC_Signature_sequence.puml`](./diagrams/UC_Signature_sequence.puml), activité [`diagrams/UC_Activate_activity.puml`](./diagrams/UC_Activate_activity.puml), séquence [`diagrams/UC_Activate_sequence.puml`](./diagrams/UC_Activate_sequence.puml), activité [`diagrams/UC_DlContrat_activity.puml`](./diagrams/UC_DlContrat_activity.puml), séquence [`diagrams/UC_DlContrat_sequence.puml`](./diagrams/UC_DlContrat_sequence.puml), activité [`diagrams/UC_ContratSigne_activity.puml`](./diagrams/UC_ContratSigne_activity.puml), séquence [`diagrams/UC_ContratSigne_sequence.puml`](./diagrams/UC_ContratSigne_sequence.puml)
- [ ] Export listes contrats (PDF / Excel).  
  - Use case : UC_ExportContrats (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_ExportContrats_activity.puml`](./diagrams/UC_ExportContrats_activity.puml), séquence [`diagrams/UC_ExportContrats_sequence.puml`](./diagrams/UC_ExportContrats_sequence.puml)
- [ ] Fiche contrat : stats (montant, durée, versé, reste), pénalités, scoring, garant/parrain, documents (contrat, signé, décharge), reçus.  
  - Use case : UC_StatsContrat (UI), UC_HistoPay (UI/Services), UC_Decharge (Services/Documents), UC_Fiche (UI), UC_Dashboard (UI), UC_Recus (UI/Services), UC_Histo (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_HistoPay_activity.puml`](./diagrams/UC_HistoPay_activity.puml), séquence [`diagrams/UC_HistoPay_sequence.puml`](./diagrams/UC_HistoPay_sequence.puml), activité [`diagrams/UC_Decharge_activity.puml`](./diagrams/UC_Decharge_activity.puml), séquence [`diagrams/UC_Decharge_sequence.puml`](./diagrams/UC_Decharge_sequence.puml), activité [`diagrams/UC_StatsContrat_activity.puml`](./diagrams/UC_StatsContrat_activity.puml), séquence [`diagrams/UC_StatsContrat_sequence.puml`](./diagrams/UC_StatsContrat_sequence.puml), activité [`diagrams/UC_Fiche_activity.puml`](./diagrams/UC_Fiche_activity.puml), séquence [`diagrams/UC_Fiche_sequence.puml`](./diagrams/UC_Fiche_sequence.puml), activité [`diagrams/UC_Dashboard_activity.puml`](./diagrams/UC_Dashboard_activity.puml), séquence [`diagrams/UC_Dashboard_sequence.puml`](./diagrams/UC_Dashboard_sequence.puml), activité [`diagrams/UC_Recus_activity.puml`](./diagrams/UC_Recus_activity.puml), séquence [`diagrams/UC_Recus_sequence.puml`](./diagrams/UC_Recus_sequence.puml), activité [`diagrams/UC_Histo_activity.puml`](./diagrams/UC_Histo_activity.puml), séquence [`diagrams/UC_Histo_sequence.puml`](./diagrams/UC_Histo_sequence.puml)

### 2.4 Versements / pénalités / reçus
- [ ] Saisie paiement (admin) : date/heure, moyen, montant, preuve, commentaire, note.  
  - Use case : UC_Payment (UI/Services), UC_Recu (Services/Documents), UC_UploadPreuve (Documents), UC_Mode (Payments), UC_Proof (Payments), UC_ValidateAmount (Payments), UC_Log (Payments)  
  - Diagrammes : activité [`diagrams/UC_Payment_activity.puml`](./diagrams/UC_Payment_activity.puml), séquence [`diagrams/UC_Payment_sequence.puml`](./diagrams/UC_Payment_sequence.puml), activité [`diagrams/UC_Recu_activity.puml`](./diagrams/UC_Recu_activity.puml), séquence [`diagrams/UC_Recu_sequence.puml`](./diagrams/UC_Recu_sequence.puml), activité [`diagrams/UC_UploadPreuve_activity.puml`](./diagrams/UC_UploadPreuve_activity.puml), séquence [`diagrams/UC_UploadPreuve_sequence.puml`](./diagrams/UC_UploadPreuve_sequence.puml), activité [`diagrams/UC_Mode_activity.puml`](./diagrams/UC_Mode_activity.puml), séquence [`diagrams/UC_Mode_sequence.puml`](./diagrams/UC_Mode_sequence.puml), activité [`diagrams/UC_Proof_activity.puml`](./diagrams/UC_Proof_activity.puml), séquence [`diagrams/UC_Proof_sequence.puml`](./diagrams/UC_Proof_sequence.puml), activité [`diagrams/UC_ValidateAmount_activity.puml`](./diagrams/UC_ValidateAmount_activity.puml), séquence [`diagrams/UC_ValidateAmount_sequence.puml`](./diagrams/UC_ValidateAmount_sequence.puml), activité [`diagrams/UC_Log_activity.puml`](./diagrams/UC_Log_activity.puml), séquence [`diagrams/UC_Log_sequence.puml`](./diagrams/UC_Log_sequence.puml)
- [ ] Calcul pénalités (règle de 3) + choix du client (payer ou non) + report si impayées.  
  - Use case : UC_Penalites (UI/Services), UC_Retard (Système/Services)  
  - Diagrammes : activité [`diagrams/UC_Penalites_activity.puml`](./diagrams/UC_Penalites_activity.puml), séquence [`diagrams/UC_Penalites_sequence.puml`](./diagrams/UC_Penalites_sequence.puml), activité [`diagrams/UC_Retard_activity.puml`](./diagrams/UC_Retard_activity.puml), séquence [`diagrams/UC_Retard_sequence.puml`](./diagrams/UC_Retard_sequence.puml)
- [ ] Génération reçu PDF par versement, lien/stockage Document.  
  - Use case : UC_Recu (Services/Documents)  
  - Diagrammes : intégré dans UC_Payment et UC_Recu
- [ ] Historique des versements (dates, montants, preuves, pénalités) consultable côté admin et client (lecture).  
  - Use case : UC_HistoPay (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_HistoPay_activity.puml`](./diagrams/UC_HistoPay_activity.puml), séquence [`diagrams/UC_HistoPay_sequence.puml`](./diagrams/UC_HistoPay_sequence.puml)

### 2.5 Transformation / blocage
- [ ] Job/logiciel : transformer en crédit fixe après 7 mois non remboursé (suppression intérêts, statut TRANSFORMED).  
  - Use case : UC_Transform (Système/Services)  
  - Diagrammes : activité [`diagrams/UC_Transform_activity.puml`](./diagrams/UC_Transform_activity.puml), séquence [`diagrams/UC_Transform_sequence.puml`](./diagrams/UC_Transform_sequence.puml)
- [ ] Blocage nouvelle demande si pénalités impayées en fin de contrat (sauf dérogation admin).  
  - Use case : UC_Blocage (Système/Services)  
  - Diagrammes : activité [`diagrams/UC_Blocage_activity.puml`](./diagrams/UC_Blocage_activity.puml), séquence [`diagrams/UC_Blocage_sequence.puml`](./diagrams/UC_Blocage_sequence.puml)

### 2.6 Rémunération garant (parrain)
- [ ] Calcul 2% du montant versé mensuel si garant membre/parrain, à chaque versement.  
  - Use case : UC_RemunGarant (Système/Services)  
  - Diagrammes : activité [`diagrams/UC_RemunGarant_activity.puml`](./diagrams/UC_RemunGarant_activity.puml), séquence [`diagrams/UC_RemunGarant_sequence.puml`](./diagrams/UC_RemunGarant_sequence.puml)
- [ ] Notifications rémunération garant ; historique consultable par le garant et l'admin.  
  - Use case : UC_RemunNotif (Notifications), UC_RemunGarant (UI/Hooks)  
  - Diagrammes : intégré dans UC_RemunGarant
- [ ] Pas de rémunération si garant admin.  
  - Use case : UC_RemunGarant (Services)  
  - Diagrammes : intégré dans UC_RemunGarant

### 2.7 Notifications
- [ ] Échéances J-1 / J / J+1.  
  - Use case : UC_NotifDue (Système/Notifications)  
  - Diagrammes : activité [`diagrams/UC_NotifDue_activity.puml`](./diagrams/UC_NotifDue_activity.puml), séquence [`diagrams/UC_NotifDue_sequence.puml`](./diagrams/UC_NotifDue_sequence.puml)
- [ ] Pénalités, transformation, blocage, contrat signé/activé, décharge, reçus paiement, rémunération garant.  
  - Use case : UC_Penalites, UC_Transform, UC_Blocage, UC_Activate, UC_Decharge, UC_Recu, UC_RemunNotif (Notifications), UC_New (Notifications), UC_Decision (Notifications), UC_Doc (Notifications)  
  - Diagrammes : activité [`diagrams/UC_New_activity.puml`](./diagrams/UC_New_activity.puml), séquence [`diagrams/UC_New_sequence.puml`](./diagrams/UC_New_sequence.puml), activité [`diagrams/UC_Decision_activity.puml`](./diagrams/UC_Decision_activity.puml), séquence [`diagrams/UC_Decision_sequence.puml`](./diagrams/UC_Decision_sequence.puml), activité [`diagrams/UC_Doc_activity.puml`](./diagrams/UC_Doc_activity.puml), séquence [`diagrams/UC_Doc_sequence.puml`](./diagrams/UC_Doc_sequence.puml)
- [ ] Alerte score (variation forte) côté admin.  
  - Use case : UC_ScoreAlert (Notifications)  
  - Diagrammes : activité [`diagrams/UC_ScoreAlert_activity.puml`](./diagrams/UC_ScoreAlert_activity.puml), séquence [`diagrams/UC_ScoreAlert_sequence.puml`](./diagrams/UC_ScoreAlert_sequence.puml)

### 2.8 Scoring fiabilité (admin-only)
- [ ] Stockage score 0–10, bornes, base 5/10, règles (+1 J, +0.5 J+1, +0.5 avant J, -0.25/j >J+1, pénalités -0.5 fin impayée, -0.25 pénalité courante, recence 6 mois facteur 0.5).  
  - Use case : UC_Scoring, UC_UpdateScore (Services/Repositories)  
  - Diagrammes : activité [`diagrams/UC_Scoring_activity.puml`](./diagrams/UC_Scoring_activity.puml), séquence [`diagrams/UC_Scoring_sequence.puml`](./diagrams/UC_Scoring_sequence.puml)
- [ ] Mise à jour à chaque paiement et en fin de contrat ; affichage dans listes/onglets/fiches admin ; filtres/tri possibles.  
  - Use case : UC_UpdateScore (Services), UC_ShowScore (Services/UI)  
  - Diagrammes : intégré dans UC_Scoring et UC_Payment

## 3. Impacts architecturaux
- Repositories / Services : filtres onglets (demandes, contrats), tri nextDueAt, scoring, pénalités, rémunération garant, exports, reçus, documents (contrat vierge/signé/décharge/reçu), createdBy/updatedBy.  
  - Diagrammes : activité [`diagrams/UC_Query_activity.puml`](./diagrams/UC_Query_activity.puml), séquence [`diagrams/UC_Query_sequence.puml`](./diagrams/UC_Query_sequence.puml), activité [`diagrams/UC_Stats_activity.puml`](./diagrams/UC_Stats_activity.puml), séquence [`diagrams/UC_Stats_sequence.puml`](./diagrams/UC_Stats_sequence.puml)
- Hooks : pagination/filtres/sync URL, orchestration formulaires, cache invalidation après mutations, préfetch membre/garant/statut CI, vues rémunération garant, scoring.  
  - Diagrammes : activité [`diagrams/UC_InitForms_activity.puml`](./diagrams/UC_InitForms_activity.puml), séquence [`diagrams/UC_InitForms_sequence.puml`](./diagrams/UC_InitForms_sequence.puml), activité [`diagrams/UC_Pagination_activity.puml`](./diagrams/UC_Pagination_activity.puml), séquence [`diagrams/UC_Pagination_sequence.puml`](./diagrams/UC_Pagination_sequence.puml), activité [`diagrams/UC_Cache_activity.puml`](./diagrams/UC_Cache_activity.puml), séquence [`diagrams/UC_Cache_sequence.puml`](./diagrams/UC_Cache_sequence.puml), activité [`diagrams/UC_Validate_activity.puml`](./diagrams/UC_Validate_activity.puml), séquence [`diagrams/UC_Validate_sequence.puml`](./diagrams/UC_Validate_sequence.puml), activité [`diagrams/UC_Prefetch_activity.puml`](./diagrams/UC_Prefetch_activity.puml), séquence [`diagrams/UC_Prefetch_sequence.puml`](./diagrams/UC_Prefetch_sequence.puml), activité [`diagrams/UC_ContractFlow_activity.puml`](./diagrams/UC_ContractFlow_activity.puml), séquence [`diagrams/UC_ContractFlow_sequence.puml`](./diagrams/UC_ContractFlow_sequence.puml)
- UI : tabs + stats, badges retard/pénalités/score, actions export, contrats PDF (vierge, signé), reçus, historique versements/rémunérations, lecture côté client.
- Notifications : ajouter types manquants (échéances, pénalités, transformation, blocage, contrat activé, reçu, rémunération garant, score alert).
- Types : compléter `DocumentType` (contrat CS, contrat signé, reçu CS, décharge CS), filtres (overdue, pénalités), scoring, rémunération garant.
- Documents/Storage : génération, téléversement, téléchargement, indexation métadonnées.  
  - Diagrammes : activité [`diagrams/UC_UploadPreuve_activity.puml`](./diagrams/UC_UploadPreuve_activity.puml), séquence [`diagrams/UC_UploadPreuve_sequence.puml`](./diagrams/UC_UploadPreuve_sequence.puml), activité [`diagrams/UC_Download_activity.puml`](./diagrams/UC_Download_activity.puml), séquence [`diagrams/UC_Download_sequence.puml`](./diagrams/UC_Download_sequence.puml), activité [`diagrams/UC_Meta_activity.puml`](./diagrams/UC_Meta_activity.puml), séquence [`diagrams/UC_Meta_sequence.puml`](./diagrams/UC_Meta_sequence.puml)
- CI/Membership : vérification statut à jour pour éligibilité, récupération info membre/garant, dérogation, historique fiabilité.  
  - Diagrammes : activité [`diagrams/UC_CheckStatus_activity.puml`](./diagrams/UC_CheckStatus_activity.puml), séquence [`diagrams/UC_CheckStatus_sequence.puml`](./diagrams/UC_CheckStatus_sequence.puml), activité [`diagrams/UC_GetMember_activity.puml`](./diagrams/UC_GetMember_activity.puml), séquence [`diagrams/UC_GetMember_sequence.puml`](./diagrams/UC_GetMember_sequence.puml), activité [`diagrams/UC_Override_activity.puml`](./diagrams/UC_Override_activity.puml), séquence [`diagrams/UC_Override_sequence.puml`](./diagrams/UC_Override_sequence.puml), activité [`diagrams/UC_ScoreHistory_activity.puml`](./diagrams/UC_ScoreHistory_activity.puml), séquence [`diagrams/UC_ScoreHistory_sequence.puml`](./diagrams/UC_ScoreHistory_sequence.puml)

## 4. Design / UI

**⚠️ Contrainte importante :** Tous les composants UI du module Crédit spéciale doivent conserver le même design et la même expérience utilisateur que les modules existants de la caisse spéciale et de la caisse imprévue.

### 4.1 Références de design
- **Liste des contrats** : Référence [`src/components/caisse-speciale/ListContracts.tsx`](../../src/components/caisse-speciale/ListContracts.tsx)
  - Carrousel de statistiques avec drag/swipe
  - Cards avec badges de statut, animations hover
  - Filtres modernes avec recherche
  - Onglets (Tous les contrats / Retard)
  - Pagination
  - Export Excel
  - Modals pour PDF (téléchargement, téléversement, consultation)
  
- **Fiche contrat détaillée** : Référence [`src/components/caisse-imprevue/MonthlyCIContract.tsx`](../../src/components/caisse-imprevue/MonthlyCIContract.tsx)
  - Carrousel de statistiques de paiement
  - Barre de progression
  - Échéancier avec cards cliquables
  - Modals pour paiements, reçus, supports
  - Section remboursements
  - Badges de statut avec icônes
  - Design responsive avec gradients

### 4.2 Éléments de design à réutiliser
- **Couleurs principales** : `#234D65` / `#2c5a73` (gradients)
- **Composants** : Cards avec `border-0 shadow-xl`, badges avec bordures, animations `hover:shadow-lg hover:-translate-y-1`
- **Carrousel de stats** : Hook `useCarousel` avec drag/swipe, navigation avec chevrons
- **Filtres** : Cards avec icônes, inputs arrondis, boutons de reset
- **Modals** : Design cohérent avec headers colorés, boutons d'action
- **Badges de statut** : Couleurs conditionnelles (vert=actif, orange=retard, rouge=bloqué)
- **Skeletons** : Animations de chargement avec gradients
- **Responsive** : Grid adaptatif, flex-wrap, breakpoints (sm, md, lg, xl)

### 4.3 Composants à créer avec le même design
- Liste des demandes de crédit (équivalent à `ListContracts.tsx`)
- Fiche crédit détaillée (équivalent à `MonthlyCIContract.tsx`)
- Modals pour simulations, contrats, versements, pénalités
- Tableaux récapitulatifs (simulation standard vs personnalisée)
- Historique des versements
- Suivi de rémunération garant

## 5. Références
- Analyse détaillée : [`./ANALYSE_CREDIT_SPECIALE.md`](./ANALYSE_CREDIT_SPECIALE.md)
- Architecture : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- Types : `src/types/types.ts` (User/Admin/Member, DocumentType, crédits/paiements)

