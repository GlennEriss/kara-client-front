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

### 2.0 Statistiques intégrées dans les pages (Admin)
- [x] Statistiques sur la page Demandes : total, en attente, approuvées, rejetées, par type (spéciale/fixe/aide).  
  - Use case : UC_Stats (Repositories/Services)  
  - Diagrammes : activité [`diagrams/UC_Stats_activity.puml`](./diagrams/UC_Stats_activity.puml), séquence [`diagrams/UC_Stats_sequence.puml`](./diagrams/UC_Stats_sequence.puml)
  - Implémentation : Composant `StatisticsCreditDemandes` intégré dans `ListDemandes.tsx`, stats filtrées par onglet actif (all/pending/approved)
- [x] Statistiques sur la page Contrats : total, actifs, en retard, partiels, montant restant, pénalités, transformés, déchargés.  
  - Use case : UC_Stats (Repositories/Services)  
  - Diagrammes : activité [`diagrams/UC_Stats_activity.puml`](./diagrams/UC_Stats_activity.puml), séquence [`diagrams/UC_Stats_sequence.puml`](./diagrams/UC_Stats_sequence.puml)
  - Implémentation : Composant `StatisticsCreditContrats` intégré dans `ListContrats.tsx`, stats filtrées par onglet actif (all/overdue)
- [x] Carrousel de statistiques avec drag/swipe : affichage responsive des KPI dans chaque page avec navigation.  
  - Use case : UC_Stats (UI)  
  - Implémentation : Hook `useCarousel` réutilisé depuis `StatisticsCI.tsx`, stats affichées dans un carrousel horizontal avec navigation par chevrons

### 2.1 Demandes (workflow + UI)
- [x] Onglets et stats demandes : pending / approved / rejected ; tri par échéance proche.  
  - Use case : UC_TabsDemandes / UC_Validation (admin)  
  - Diagrammes : activité [`diagrams/UC_TabsDemandes_activity.puml`](./diagrams/UC_TabsDemandes_activity.puml), séquence [`diagrams/UC_TabsDemandes_sequence.puml`](./diagrams/UC_TabsDemandes_sequence.puml), activité [`diagrams/UC_Validation_activity.puml`](./diagrams/UC_Validation_activity.puml), séquence [`diagrams/UC_Validation_sequence.puml`](./diagrams/UC_Validation_sequence.puml)
  - Implémentation : Composant `ListDemandes.tsx` avec onglets (Toutes/En attente/Approuvées/Rejetées), statistiques intégrées via `StatisticsCreditDemandes`, modals de validation/rejet/réouverture
- [x] Filtres/recherche : statut, type (spéciale/fixe/aide), membre, garant, date, retard, texte.  
  - Use case : UC_Filtre (UI), UC_Filtre (services/repos)  
  - Diagrammes : activité [`diagrams/UC_Filtre_activity.puml`](./diagrams/UC_Filtre_activity.puml), séquence [`diagrams/UC_Filtre_sequence.puml`](./diagrams/UC_Filtre_sequence.puml)
  - Implémentation : Composant `DemandFilters` avec recherche texte, filtre statut (masqué sur onglets spécifiques), filtre type crédit, sélecteurs de membres pour client et garant (`MemberSearchInput`), filtres de dates
- [x] Pagination et synchronisation URL : filtres, page, limit synchronisés avec query params.  
  - Use case : UC_Pagination (Hooks/UI)  
  - Diagrammes : activité [`diagrams/UC_Pagination_activity.puml`](./diagrams/UC_Pagination_activity.puml), séquence [`diagrams/UC_Pagination_sequence.puml`](./diagrams/UC_Pagination_sequence.puml)
  - Implémentation : Synchronisation URL avec `useSearchParams` et `useRouter`, pagination avec `currentPage` et `itemsPerPage`, reset automatique de la page lors du changement de filtres
- [x] Création demande par admin (client peut saisir mais pas simuler ni payer).  
  - Use case : `credit-speciale-usecases-nouveau-client.puml` (UC_Demande) / `credit-speciale-usecases-nouveau-admin.puml` (UC_CreateDemande)  
  - Diagrammes : activité [`diagrams/UC_Demande_activity.puml`](./diagrams/UC_Demande_activity.puml), séquence [`diagrams/UC_Demande_sequence.puml`](./diagrams/UC_Demande_sequence.puml), activité [`diagrams/UC_CreateDemande_activity.puml`](./diagrams/UC_CreateDemande_activity.puml), séquence [`diagrams/UC_CreateDemande_sequence.puml`](./diagrams/UC_CreateDemande_sequence.puml)
  - Implémentation : Composant `CreateCreditDemandModal.tsx` avec formulaire complet, sélection client/garant, vérification éligibilité, génération ID personnalisé (`MK_DEMANDE_CSP_matricule_date_heure`)
- [x] Export listes demandes (PDF / Excel).  
  - Use case : UC_ExportDemandes (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_ExportDemandes_activity.puml`](./diagrams/UC_ExportDemandes_activity.puml), séquence [`diagrams/UC_ExportDemandes_sequence.puml`](./diagrams/UC_ExportDemandes_sequence.puml)
  - Implémentation : Fonctions `exportToExcel()` et `exportToPDF()` dans `ListDemandes.tsx`, export avec en-têtes fusionnés, colonnes formatées, filtrage par onglet actif, formatage des montants (espaces au lieu de '/')
- [x] Affichage scoring (badge admin) et visibilité garant (infos + statut CI).  
  - Use case : UC_Score (UI), UC_Scoring/UC_ShowScore (services/système), UC_Elig (CI), UC_Garant (Services)  
  - Diagrammes : activité [`diagrams/UC_Scoring_activity.puml`](./diagrams/UC_Scoring_activity.puml), séquence [`diagrams/UC_Scoring_sequence.puml`](./diagrams/UC_Scoring_sequence.puml), activité [`diagrams/UC_Elig_activity.puml`](./diagrams/UC_Elig_activity.puml), séquence [`diagrams/UC_Elig_sequence.puml`](./diagrams/UC_Elig_sequence.puml), activité [`diagrams/UC_ShowScore_activity.puml`](./diagrams/UC_ShowScore_activity.puml), séquence [`diagrams/UC_ShowScore_sequence.puml`](./diagrams/UC_ShowScore_sequence.puml), activité [`diagrams/UC_Garant_activity.puml`](./diagrams/UC_Garant_activity.puml), séquence [`diagrams/UC_Garant_sequence.puml`](./diagrams/UC_Garant_sequence.puml)
  - Implémentation : Badge score toujours affiché dans `ListDemandes.tsx` et `ListContrats.tsx` avec couleurs conditionnelles (vert ≥8, jaune ≥5, rouge <5, gris N/A), composant `GuarantorInfo` avec statut CI (hook `useMemberCIStatus`), badges "À jour" / "En retard" / "Pas de contrat CI"

### 2.2 Simulations (admin only)
- [x] Simulation standard (montant, taux, mensualité, 1er versement, durée calculée).  
  - Use case : UC_SimuStd (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_SimuStd_activity.puml`](./diagrams/UC_SimuStd_activity.puml), séquence [`diagrams/UC_SimuStd_sequence.puml`](./diagrams/UC_SimuStd_sequence.puml)
  - Implémentation : Onglet "Simulation standard" dans `CreditSimulationModal.tsx`, méthode `calculateStandardSimulation` dans `CreditSpecialeService.ts`, affichage de 2 tableaux (échéancier calculé + échéancier référence 7 mois), arrondi personnalisé pour tous les montants
  - **Détails du déroulement :**
    - **Échéancier calculé** : Génération automatique basée sur la mensualité prédéfinie, avec correction automatique de la dernière mensualité si elle dépasse le montant global restant (capital + intérêts). Le tableau affiche : Mois, Date, Mensualité, Intérêts, Montant global, Reste dû.
    - **Échéancier référence (7 mois)** : Calcul du montant global avec intérêts composés sur exactement 7 mois (boucle : `lastMontant = lastMontant * taux + lastMontant` pour i de 1 à 7), division de ce montant global par 7 pour obtenir la mensualité de référence, arrondi selon la règle (≥0.5 arrondi supérieur, <0.5 arrondi inférieur). Toutes les mensualités sont identiques pour les 7 mois. Le tableau affiche uniquement : Mois, Date, Mensualité (colonnes "Montant global" et "Reste dû" supprimées).
- [x] Simulation personnalisée (montants par mois) + 2 tableaux récap (limite 7/3 mois vs personnalisé).  
  - Use case : UC_SimuPerso (UI/Services), UC_Tableaux (Hooks/Services)  
  - Diagrammes : activité [`diagrams/UC_SimuPerso_activity.puml`](./diagrams/UC_SimuPerso_activity.puml), séquence [`diagrams/UC_SimuPerso_sequence.puml`](./diagrams/UC_SimuPerso_sequence.puml), activité [`diagrams/UC_Tableaux_activity.puml`](./diagrams/UC_Tableaux_activity.puml), séquence [`diagrams/UC_Tableaux_sequence.puml`](./diagrams/UC_Tableaux_sequence.puml)
  - Implémentation : Onglet "Simulation personnalisée" dans `CreditSimulationModal.tsx`, méthode `calculateCustomSimulation` dans `CreditSpecialeService.ts`, saisie mensualités personnalisées, affichage de 2 tableaux (échéancier calculé + échéancier référence avec durée personnalisée), avertissement dynamique si total des paiements < montant global restant
  - **Détails du déroulement :**
    - **Échéancier calculé** : Génération basée sur les mensualités personnalisées saisies par l'utilisateur. Le tableau affiche : Mois, Date, Mensualité, Intérêts, Montant global, Reste dû.
    - **Échéancier référence (durée personnalisée)** : Calcul du montant global avec intérêts composés sur exactement `maxDuration` mois (boucle : `lastMontant = lastMontant * taux + lastMontant` pour i de 1 à maxDuration), division de ce montant global par `maxDuration` pour obtenir la mensualité de référence, arrondi selon la règle (≥0.5 arrondi supérieur, <0.5 arrondi inférieur). Toutes les mensualités sont identiques pour tous les mois. Le tableau affiche uniquement : Mois, Date, Mensualité (colonnes "Montant global" et "Reste dû" supprimées).
- [x] Validation limites : spéciale ≤7 mois, aide ≤3 mois, fixe illimité ; suggestion montant minimum si dépassement.  
  - Use case : UC_SimuValidation (Système)  
  - Diagrammes : intégré dans UC_SimuStd et UC_SimuPerso
  - Implémentation : Validation automatique dans `calculateStandardSimulation`, calcul de `suggestedMonthlyPayment` si dépassement, messages d'erreur spécifiques, arrondi personnalisé pour tous les montants affichés, simulation proposée avec calcul de mensualité optimale

### 2.3 Contrats
- [x] Onglets contrats + stats : actifs, retard, pénalités, à jour ; tri par échéance proche.  
  - Use case : UC_TabsContrats (UI/Services), UC_SortDue (UI/Hooks/Services)  
  - Diagrammes : activité [`diagrams/UC_TabsContrats_activity.puml`](./diagrams/UC_TabsContrats_activity.puml), séquence [`diagrams/UC_TabsContrats_sequence.puml`](./diagrams/UC_TabsContrats_sequence.puml), activité [`diagrams/UC_SortDue_activity.puml`](./diagrams/UC_SortDue_activity.puml), séquence [`diagrams/UC_SortDue_sequence.puml`](./diagrams/UC_SortDue_sequence.puml)
  - Implémentation : Composant `ListContrats.tsx` avec onglets (Tous/En retard), statistiques intégrées via `StatisticsCreditContrats`, tri par échéance pour l'onglet "En retard", synchronisation URL pour pagination et filtres
- [x] Statut actif seulement après upload du PDF signé ; contrat vierge générable pour signature ; remise d'argent au client après activation.  
  - Use case : UC_Contrat (UI/Services/Documents), UC_UploadContrat (UI/Services/Documents), UC_ContratVierge (Services/Documents), UC_Signature (Services), UC_Activate (Système), UC_DlContrat (UI/Services/Documents), UC_ContratSigne (UI/Services/Documents)  
  - Diagrammes : activité [`diagrams/UC_Contrat_activity.puml`](./diagrams/UC_Contrat_activity.puml), séquence [`diagrams/UC_Contrat_sequence.puml`](./diagrams/UC_Contrat_sequence.puml), activité [`diagrams/UC_UploadContrat_activity.puml`](./diagrams/UC_UploadContrat_activity.puml), séquence [`diagrams/UC_UploadContrat_sequence.puml`](./diagrams/UC_UploadContrat_sequence.puml), activité [`diagrams/UC_Signature_activity.puml`](./diagrams/UC_Signature_activity.puml), séquence [`diagrams/UC_Signature_sequence.puml`](./diagrams/UC_Signature_sequence.puml), activité [`diagrams/UC_Activate_activity.puml`](./diagrams/UC_Activate_activity.puml), séquence [`diagrams/UC_Activate_sequence.puml`](./diagrams/UC_Activate_sequence.puml), activité [`diagrams/UC_DlContrat_activity.puml`](./diagrams/UC_DlContrat_activity.puml), séquence [`diagrams/UC_DlContrat_sequence.puml`](./diagrams/UC_DlContrat_sequence.puml), activité [`diagrams/UC_ContratSigne_activity.puml`](./diagrams/UC_ContratSigne_activity.puml), séquence [`diagrams/UC_ContratSigne_sequence.puml`](./diagrams/UC_ContratSigne_sequence.puml)
  - Implémentation : Méthode `generateContractPDF` pour générer contrat vierge, méthode `uploadSignedContract` qui change automatiquement le statut à `ACTIVE` et enregistre `activatedAt` et `fundsReleasedAt`, modal d'upload dans `CreditContractDetail.tsx`, notifications de contrat activé
- [x] Export listes contrats (PDF / Excel).  
  - Use case : UC_ExportContrats (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_ExportContrats_activity.puml`](./diagrams/UC_ExportContrats_activity.puml), séquence [`diagrams/UC_ExportContrats_sequence.puml`](./diagrams/UC_ExportContrats_sequence.puml)
  - Implémentation : Fonctions `exportToExcel()` et `exportToPDF()` dans `ListContrats.tsx`, export avec en-têtes fusionnés, colonnes formatées, filtrage par onglet actif
- [x] Fiche contrat : stats (montant, durée, versé, reste), pénalités, scoring, garant/parrain, documents (contrat, signé, décharge), reçus.  
  - Use case : UC_StatsContrat (UI), UC_HistoPay (UI/Services), UC_Decharge (Services/Documents), UC_Fiche (UI), UC_Dashboard (UI), UC_Recus (UI/Services), UC_Histo (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_HistoPay_activity.puml`](./diagrams/UC_HistoPay_activity.puml), séquence [`diagrams/UC_HistoPay_sequence.puml`](./diagrams/UC_HistoPay_sequence.puml), activité [`diagrams/UC_Decharge_activity.puml`](./diagrams/UC_Decharge_activity.puml), séquence [`diagrams/UC_Decharge_sequence.puml`](./diagrams/UC_Decharge_sequence.puml), activité [`diagrams/UC_StatsContrat_activity.puml`](./diagrams/UC_StatsContrat_activity.puml), séquence [`diagrams/UC_StatsContrat_sequence.puml`](./diagrams/UC_StatsContrat_sequence.puml), activité [`diagrams/UC_Fiche_activity.puml`](./diagrams/UC_Fiche_activity.puml), séquence [`diagrams/UC_Fiche_sequence.puml`](./diagrams/UC_Fiche_sequence.puml), activité [`diagrams/UC_Dashboard_activity.puml`](./diagrams/UC_Dashboard_activity.puml), séquence [`diagrams/UC_Dashboard_sequence.puml`](./diagrams/UC_Dashboard_sequence.puml), activité [`diagrams/UC_Recus_activity.puml`](./diagrams/UC_Recus_activity.puml), séquence [`diagrams/UC_Recus_sequence.puml`](./diagrams/UC_Recus_sequence.puml), activité [`diagrams/UC_Histo_activity.puml`](./diagrams/UC_Histo_activity.puml), séquence [`diagrams/UC_Histo_sequence.puml`](./diagrams/UC_Histo_sequence.puml)
  - Implémentation : Composant `CreditContractDetail.tsx` avec affichage des stats, historique des paiements, pénalités, scoring, informations garant, modals pour paiements et reçus

### 2.4 Versements / pénalités / reçus
- [x] Saisie paiement (admin) : date/heure, moyen, montant, preuve, commentaire, note.  
  - Use case : UC_Payment (UI/Services), UC_Recu (Services/Documents), UC_UploadPreuve (Documents), UC_Mode (Payments), UC_Proof (Payments), UC_ValidateAmount (Payments), UC_Log (Payments)  
  - Diagrammes : activité [`diagrams/UC_Payment_activity.puml`](./diagrams/UC_Payment_activity.puml), séquence [`diagrams/UC_Payment_sequence.puml`](./diagrams/UC_Payment_sequence.puml), activité [`diagrams/UC_Recu_activity.puml`](./diagrams/UC_Recu_activity.puml), séquence [`diagrams/UC_Recu_sequence.puml`](./diagrams/UC_Recu_sequence.puml), activité [`diagrams/UC_UploadPreuve_activity.puml`](./diagrams/UC_UploadPreuve_activity.puml), séquence [`diagrams/UC_UploadPreuve_sequence.puml`](./diagrams/UC_UploadPreuve_sequence.puml), activité [`diagrams/UC_Mode_activity.puml`](./diagrams/UC_Mode_activity.puml), séquence [`diagrams/UC_Mode_sequence.puml`](./diagrams/UC_Mode_sequence.puml), activité [`diagrams/UC_Proof_activity.puml`](./diagrams/UC_Proof_activity.puml), séquence [`diagrams/UC_Proof_sequence.puml`](./diagrams/UC_Proof_sequence.puml), activité [`diagrams/UC_ValidateAmount_activity.puml`](./diagrams/UC_ValidateAmount_activity.puml), séquence [`diagrams/UC_ValidateAmount_sequence.puml`](./diagrams/UC_ValidateAmount_sequence.puml), activité [`diagrams/UC_Log_activity.puml`](./diagrams/UC_Log_activity.puml), séquence [`diagrams/UC_Log_sequence.puml`](./diagrams/UC_Log_sequence.puml)
  - Implémentation : Composant `CreditPaymentModal.tsx` avec formulaire complet (date, heure, moyen de paiement, montant, preuve upload, commentaire), intégration des pénalités impayées avec sélection, méthode `createPayment` dans `CreditSpecialeService.ts`
- [x] Génération référence unique de paiement : traçabilité date/heure remise et référence unique.  
  - Use case : UC_Log (Payments)  
  - Diagrammes : activité [`diagrams/UC_Log_activity.puml`](./diagrams/UC_Log_activity.puml), séquence [`diagrams/UC_Log_sequence.puml`](./diagrams/UC_Log_sequence.puml)
  - Implémentation : Génération automatique de référence unique dans `createPayment` au format `MK_PAIEMENT_CSP_matricule_date_heure`, stockage dans `CreditPayment.reference`
- [x] Calcul pénalités (règle de 3) + choix du client (payer ou non) + report si impayées.  
  - Use case : UC_Penalites (UI/Services), UC_Retard (Système/Services)  
  - Diagrammes : activité [`diagrams/UC_Penalites_activity.puml`](./diagrams/UC_Penalites_activity.puml), séquence [`diagrams/UC_Penalites_sequence.puml`](./diagrams/UC_Penalites_sequence.puml), activité [`diagrams/UC_Retard_activity.puml`](./diagrams/UC_Retard_activity.puml), séquence [`diagrams/UC_Retard_sequence.puml`](./diagrams/UC_Retard_sequence.puml)
  - Implémentation : Méthode `checkAndCreatePenalties` qui calcule automatiquement les pénalités selon la règle de 3 (montant mensuel / 30 × jours de retard), méthode `calculatePenalties`, affichage des pénalités impayées dans `CreditPaymentModal` avec sélection, marquage des pénalités payées lors du paiement
- [x] Génération reçu PDF par versement, lien/stockage Document.  
  - Use case : UC_Recu (Services/Documents)  
  - Diagrammes : intégré dans UC_Payment et UC_Recu
  - Implémentation : Méthode `generatePaymentReceiptPDF` dans `CreditSpecialeService.ts`, génération automatique après chaque paiement, stockage dans Firebase Storage, création de document dans la collection `documents`, modal `PaymentReceiptModal.tsx` pour affichage
- [x] Historique des versements (dates, montants, preuves, pénalités) consultable côté admin et client (lecture).  
  - Use case : UC_HistoPay (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_HistoPay_activity.puml`](./diagrams/UC_HistoPay_activity.puml), séquence [`diagrams/UC_HistoPay_sequence.puml`](./diagrams/UC_HistoPay_sequence.puml)
  - Implémentation : Section "Historique des paiements" dans `CreditContractDetail.tsx`, affichage de tous les paiements avec dates, montants, références, preuves, pénalités payées, modal pour voir les détails et le reçu PDF
- [x] Historique général (demandes, statuts, notifications, versements) consultable côté admin et client (lecture).  
  - Use case : UC_Histo (UI/Services)  
  - Diagrammes : activité [`diagrams/UC_Histo_activity.puml`](./diagrams/UC_Histo_activity.puml), séquence [`diagrams/UC_Histo_sequence.puml`](./diagrams/UC_Histo_sequence.puml)
  - Implémentation : Composant `CreditHistoryTimeline.tsx` avec timeline chronologique affichant tous les événements (création demande, validation/rejet, création contrat, activation, paiements, pénalités, notifications), méthode `getCreditHistory` dans `CreditSpecialeService.ts` qui récupère demande, contrat, paiements, pénalités et notifications filtrées, hook `useCreditHistory` pour React Query, intégré dans `CreditContractDetail.tsx`, affichage avec icônes colorées et badges de statut, tri chronologique (plus récent en premier)

### 2.5 Transformation / blocage
- [x] Job planifié (quotidien) : transformer automatiquement en crédit fixe après 7 mois non remboursé (suppression intérêts, statut TRANSFORMED).  
  - Use case : UC_Transform (Système/Services)  
  - Diagrammes : activité [`diagrams/UC_Transform_activity.puml`](./diagrams/UC_Transform_activity.puml), séquence [`diagrams/UC_Transform_sequence.puml`](./diagrams/UC_Transform_sequence.puml)
  - Implémentation : Cloud Function `dailyTransformCreditSpeciale` déployée, s'exécute quotidiennement à 11h00, détecte les crédits spéciaux actifs non remboursés après 7 mois (basé sur `activatedAt` > `firstPaymentDate` > `createdAt`), supprime les intérêts (recalcule `totalAmount = amount`), recalcule `amountRemaining` sans intérêts, change le statut à `TRANSFORMED`, enregistre `transformedAt`, et envoie une notification au client
- [x] Blocage nouvelle demande si pénalités impayées en fin de contrat (sauf dérogation admin).  
  - Use case : UC_Blocage (Système/Services)  
  - Diagrammes : activité [`diagrams/UC_Blocage_activity.puml`](./diagrams/UC_Blocage_activity.puml), séquence [`diagrams/UC_Blocage_sequence.puml`](./diagrams/UC_Blocage_sequence.puml)
  - Implémentation : Méthode `checkEligibility` dans `CreditSpecialeService.ts` qui vérifie les pénalités impayées sur les contrats terminés du client et du garant, retourne `eligible: false` avec raison si pénalités trouvées, appelée dans `CreateCreditDemandModal.tsx` avant création de demande, possibilité de dérogation via `eligibilityOverride` dans `CreditDemand`

### 2.6 Rémunération garant (parrain)
- [x] Calcul 2% du montant versé mensuel si garant membre/parrain, à chaque versement.  
  - Use case : UC_RemunGarant (Système/Services)  
  - Diagrammes : activité [`diagrams/UC_RemunGarant_activity.puml`](./diagrams/UC_RemunGarant_activity.puml), séquence [`diagrams/UC_RemunGarant_sequence.puml`](./diagrams/UC_RemunGarant_sequence.puml)
  - Implémentation : Calcul automatique dans `createPayment` si `guarantorIsParrain && guarantorRemunerationPercentage > 0`, création d'entrée `GuarantorRemuneration` avec montant calculé, pourcentage modifiable (0-2%) dans `ContractCreationModal.tsx`
- [x] Notifications rémunération garant ; historique consultable par le garant et l'admin.  
  - Use case : UC_RemunNotif (Notifications), UC_RemunGarant (UI/Hooks)  
  - Diagrammes : intégré dans UC_RemunGarant
  - Implémentation : Notification automatique créée dans `createPayment` avec type `guarantor_remuneration`, hooks `useGuarantorRemunerationsByCreditId` et `useGuarantorRemunerationsByGuarantorId` pour récupérer l'historique
- [x] Pas de rémunération si garant admin.  
  - Use case : UC_RemunGarant (Services)  
  - Diagrammes : intégré dans UC_RemunGarant
  - Implémentation : Vérification `guarantorIsParrain` dans `createPayment`, si garant admin alors `guarantorIsParrain = false` donc pas de rémunération
- [x] Vue rémunération garant : interface pour le garant (membre) pour consulter ses rémunérations (historique, montants, périodes).  
  - Use case : UC_RemunGarant (UI/Hooks)  
  - Diagrammes : activité [`diagrams/UC_RemunGarant_activity.puml`](./diagrams/UC_RemunGarant_activity.puml), séquence [`diagrams/UC_RemunGarant_sequence.puml`](./diagrams/UC_RemunGarant_sequence.puml)
  - Implémentation : Composant `GuarantorRemunerationsList.tsx` avec statistiques (total, montant total, moyenne), tableau paginé avec historique, page `/memberships/[id]/remunerations` pour afficher les rémunérations d'un membre, affichage dans `CreditContractDetail.tsx` et `CreditDemandDetail.tsx`

### 2.7 Notifications
- [x] Échéances J-1 / J / J+1 : job planifié (quotidien) pour détecter les échéances proches et notifier automatiquement le client.  
  - Use case : UC_NotifDue (Système/Notifications)  
  - Diagrammes : activité [`diagrams/UC_NotifDue_activity.puml`](./diagrams/UC_NotifDue_activity.puml), séquence [`diagrams/UC_NotifDue_sequence.puml`](./diagrams/UC_NotifDue_sequence.puml)
  - Implémentation : Cloud Function `dailyCreditPaymentDue` déployée, s'exécute quotidiennement à 9h30, détecte les échéances dans les 3 prochains jours (J, J+1, J+2, J+3), crée des notifications avec métadonnées (daysUntil, contractId, monthlyPaymentAmount)
- [x] Pénalités, transformation, blocage, contrat signé/activé, décharge, reçus paiement, rémunération garant.  
  - Use case : UC_Penalites, UC_Transform, UC_Blocage, UC_Activate, UC_Decharge, UC_Recu, UC_RemunNotif (Notifications), UC_New (Notifications), UC_Decision (Notifications), UC_Doc (Notifications)  
  - Diagrammes : activité [`diagrams/UC_New_activity.puml`](./diagrams/UC_New_activity.puml), séquence [`diagrams/UC_New_sequence.puml`](./diagrams/UC_New_sequence.puml), activité [`diagrams/UC_Decision_activity.puml`](./diagrams/UC_Decision_activity.puml), séquence [`diagrams/UC_Decision_sequence.puml`](./diagrams/UC_Decision_sequence.puml), activité [`diagrams/UC_Doc_activity.puml`](./diagrams/UC_Doc_activity.puml), séquence [`diagrams/UC_Doc_sequence.puml`](./diagrams/UC_Doc_sequence.puml)
  - Implémentation : Notifications intégrées dans `CreditSpecialeService.ts` pour création de demande (`new_request`), validation/rejet (`status_update`), création de contrat (`contract_created`), activation de contrat (`contract_activated`), contrat terminé (`contract_finished`), contrat transformé (`contract_transformed`), pénalité créée (`penalty_created`), rémunération garant (`guarantor_remuneration`)
- [x] Alerte score (variation forte) côté admin.  
  - Use case : UC_ScoreAlert (Notifications)  
  - Diagrammes : activité [`diagrams/UC_ScoreAlert_activity.puml`](./diagrams/UC_ScoreAlert_activity.puml), séquence [`diagrams/UC_ScoreAlert_sequence.puml`](./diagrams/UC_ScoreAlert_sequence.puml)
  - Implémentation : Détection automatique dans `createPayment` après calcul du score, seuil de variation ≥ 2 points (hausse ou baisse), notification avec emoji (📈 augmentation, 📉 baisse), affichage ancien score → nouveau score avec variation, métadonnées complètes pour traçabilité

### 2.8 Scoring fiabilité (admin-only)
- [x] Stockage score 0–10, bornes, base 5/10, règles (+1 J, +0.5 J+1, +0.5 avant J, -0.25/j >J+1, pénalités -0.5 fin impayée, -0.25 pénalité courante, recence 6 mois facteur 0.5).  
  - Use case : UC_Scoring, UC_UpdateScore (Services/Repositories)  
  - Diagrammes : activité [`diagrams/UC_Scoring_activity.puml`](./diagrams/UC_Scoring_activity.puml), séquence [`diagrams/UC_Scoring_sequence.puml`](./diagrams/UC_Scoring_sequence.puml)
  - Implémentation : Méthode `calculateScore` dans `CreditSpecialeService.ts` avec toutes les règles de scoring, stockage dans `CreditContract.score` et `CreditDemand.score`, bornes 0-10 appliquées, facteur de récence pour paiements > 6 mois
- [x] Mise à jour à chaque paiement et en fin de contrat ; affichage dans listes/onglets/fiches admin ; filtres/tri possibles.  
  - Use case : UC_UpdateScore (Services), UC_ShowScore (Services/UI)  
  - Diagrammes : intégré dans UC_Scoring et UC_Payment
  - Implémentation : Mise à jour automatique dans `createPayment` après chaque paiement, affichage dans `ListDemandes.tsx` et `ListContrats.tsx` avec badge coloré, affichage dans `CreditContractDetail.tsx` et `CreditDemandDetail.tsx`, score toujours visible même si `undefined` (affiche "N/A")
- [x] Remonter historique de fiabilité : calcul historique crédits précédents pour score initial.  
  - Use case : UC_ScoreHistory (CI/Membership)  
  - Diagrammes : activité [`diagrams/UC_ScoreHistory_activity.puml`](./diagrams/UC_ScoreHistory_activity.puml), séquence [`diagrams/UC_ScoreHistory_sequence.puml`](./diagrams/UC_ScoreHistory_sequence.puml)
  - Implémentation : Méthode `calculateInitialScore` dans `CreditSpecialeService.ts` qui récupère tous les contrats précédents du client avec score, calcule une moyenne pondérée selon la récence (poids 1.0 pour <12 mois, 0.7 pour 12-24 mois, 0.5 pour >24 mois), retourne 5 par défaut si aucun historique, appelée lors de la création d'une demande (`createDemand`) et d'un contrat (`createContractFromDemand`), le score initial est stocké dans `CreditDemand.score` et `CreditContract.score` avec `scoreUpdatedAt`

### 2.9 Espace client (lecture seule)
- [ ] Saisir une demande de prêt (client connecté) : montant, type, mensualité souhaitée.  
  - Use case : UC_SelfDemande (UI/Client)  
  - Diagrammes : activité [`diagrams/UC_Demande_activity.puml`](./diagrams/UC_Demande_activity.puml), séquence [`diagrams/UC_Demande_sequence.puml`](./diagrams/UC_Demande_sequence.puml)
- [ ] Consulter sa fiche crédit (lecture seule) : stats, versements, pénalités, documents.  
  - Use case : UC_Fiche (UI/Client)  
  - Diagrammes : activité [`diagrams/UC_Fiche_activity.puml`](./diagrams/UC_Fiche_activity.puml), séquence [`diagrams/UC_Fiche_sequence.puml`](./diagrams/UC_Fiche_sequence.puml)
- [ ] Consulter historique des versements (lecture seule).  
  - Use case : UC_HistoPay (UI/Client)  
  - Diagrammes : intégré dans UC_HistoPay
- [ ] Consulter pénalités et retard (lecture seule, indicateurs, badges).  
  - Use case : UC_Penalites (UI/Client)  
  - Diagrammes : intégré dans UC_Penalites
- [ ] Télécharger/consulter contrat et reçus (lecture seule).  
  - Use case : UC_DlContrat, UC_ContratSigne, UC_Recus (UI/Client)  
  - Diagrammes : intégré dans UC_DlContrat, UC_ContratSigne, UC_Recus

### 2.10 Archivage et traçabilité
- [ ] Archivage automatique de tous les documents : contrat, contrat signé, preuves de versement, décharge.  
  - Use case : UC_Archive (Système/Documents)  
  - Diagrammes : intégré dans les use cases de documents
- [ ] Conservation historique complet : demandes, statuts, notifications, versements, pénalités, rémunérations.  
  - Use case : UC_Histo (Système/Repositories)  
  - Diagrammes : intégré dans UC_Histo
- [ ] Indexation métadonnées documents : type, version, createdBy, timestamps pour recherche et traçabilité.  
  - Use case : UC_Meta (Documents/Storage)  
  - Diagrammes : activité [`diagrams/UC_Meta_activity.puml`](./diagrams/UC_Meta_activity.puml), séquence [`diagrams/UC_Meta_sequence.puml`](./diagrams/UC_Meta_sequence.puml)

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

