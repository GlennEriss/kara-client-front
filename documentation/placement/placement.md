# Placement — Contexte

## Processus étudié : Gestion des placements (Mutuelle Kara)
1- Appeler une personne pour demander un prêt de fonds (Équipe Kara).  
2- Répondre à une personne qui souhaite placer son argent, accepter ou refuser selon le besoin (Équipe Kara).  
3- Recevoir les fonds (virement ou récupération physique) (Bienfaiteur, Équipe Kara).  
4- Convenir du taux, de la période (1 à 7 mois) et du mode de règlement :  
   - Option 1 : verser la commission chaque mois + restituer le capital à la fin.  
   - Option 2 : verser capital + commissions en une seule fois à la fin.  
   (Équipe Kara, Bienfaiteur)  
5- Enregistrer les informations (montant, période, taux, contact urgent, mode de règlement) (Équipe Kara).  
6- Générer le contrat à signer (Équipe Kara).  
7- Remettre le contrat au bienfaiteur (Équipe Kara).  
8- Signer et renvoyer le contrat (Bienfaiteur).  
9- Téléverser le contrat signé comme preuve du dépôt (Équipe Kara).  
10- Notifier le bienfaiteur à chaque échéance mensuelle (jour prévu de remise de commission) (Équipe Kara).  
11- Enregistrer la preuve de remise de commission (capture d’écran) et, en cas de paiement cash, remettre un reçu (Équipe Kara).  
12- Restituer intégralement le capital en fin de période avec une quittance (Équipe Kara).  
13- Permettre une demande de retrait anticipé (Bienfaiteur).  
14- Traiter la demande de retrait anticipé : remettre intégralement les fonds, verser une commission d’un mois si la remise intervient après un mois, sinon 0 commission (Équipe Kara).

## Difficultés du processus
1. Coût des appels et décrochage aléatoire des contacts -> A1 (Équipe Kara)  
2. Clients indisponibles ou refus faute de besoin côté Kara -> A1 (Équipe Kara)  
3. Refus ou décalage des placements faute de besoin immédiat -> A2 (Équipe Kara)  
4. Délais ou risques lors de la réception/transit de cash -> A3 (Bienfaiteur, Équipe Kara)  
5. Désaccords sur taux/période ou mauvaise compréhension des modes de règlement -> A4 (Équipe Kara, Bienfaiteur)  
6. Informations incomplètes ou erronées à la saisie (montant, taux, contact urgent) -> A5 (Équipe Kara)  
7. Retards/erreurs dans la génération du contrat -> A6 (Équipe Kara)  
8. Remise physique du contrat compliquée (distance, disponibilité) -> A7 (Équipe Kara)  
9. Retard ou refus de signature/retour du contrat -> A8 (Bienfaiteur)  
10. Échec ou oubli de téléversement du contrat signé, formats fichiers non conformes -> A9 (Équipe Kara)  
11. Notifications mensuelles non reçues ou suivies manuellement -> A10 (Équipe Kara)  
12. Preuves de commission manquantes/illisibles, reçus cash égarés -> A11 (Équipe Kara)  
13. Retard de restitution du capital ou contestation du montant final -> A12 (Équipe Kara)  
14. Demandes de retrait anticipé sans processus clair ni visibilité trésorerie -> A13 (Bienfaiteur, Équipe Kara)  
15. Calcul de commission en cas de retrait anticipé source de litige ou d’erreur, virement tardif -> A14 (Équipe Kara)

## Nouveau processus proposé
1- Mettre à disposition la liste des membres et leurs rôles (dont « Bienfaiteur ») (Système).  
2- Sélectionner le bienfaiteur depuis la liste des membres ou lui attribuer le rôle « Bienfaiteur » (Équipe Kara).  
3- Proposer une préqualification (KYC simplifié, appétence, montant max, préférences période/règlement) (Système).  
4- Valider/ajuster la préqualification (Équipe Kara).  
5- Préparer et envoyer automatiquement les sollicitations multicanales (SMS, e-mail, WhatsApp) avec scripts/gabarits (Système).  
6- Passer les appels de relance/qualification en s’appuyant sur les scripts et consigner les retours (Équipe Kara).  
7- Proposer une offre standard (taux, période 1-7 mois, mode de règlement) selon les règles internes (Système).  
8- Valider ou ajuster l’offre/acceptation et consigner la justification finale (Équipe Kara).  
9- Générer et partager un lien de virement ou un rendez-vous de collecte avec reçu provisoire (Système).  
10- Confirmer la collecte ou l’usage du lien et enregistrer la réception (Équipe Kara, Bienfaiteur).  
11- Calculer et afficher automatiquement la simulation finale (taux, période 1-7 mois, mode de règlement) (Système).  
12- Faire valider la simulation par le bienfaiteur en un clic (Bienfaiteur, Équipe Kara).  
13- Générer le contrat PDF prérempli et le signer électroniquement côté Kara (Système, Équipe Kara).  
14- Faire signer en ligne le contrat côté bienfaiteur (Bienfaiteur, Système).  
15- Déposer automatiquement le contrat signé, notifier les parties, verrouiller la version (Système).  
16- Planifier le calendrier des commissions et des rappels (push/SMS/e-mail) (Système).  
17- Notifier automatiquement avant chaque échéance de commission (Système).  
18- Encaisser les commissions (virement, mobile money, cash) et déposer les preuves (reçu, capture, PDF) dans la fiche placement (Équipe Kara, Système).  
19- Suivre et afficher le reste à payer et la date de fin (Système).  
20- Contrôler le suivi et lever les alertes si écart (Équipe Kara).  
21- Générer la quittance finale lors de la restitution du capital (Système, Équipe Kara).  
22- Calculer automatiquement la commission due en cas de retrait anticipé (0 ou 1 mois selon la règle) (Système).  
23- Générer l’avenant de retrait anticipé et le faire valider (Système, Équipe Kara, Bienfaiteur).  
24- Générer et remettre la quittance de sortie lors du retrait anticipé (Système, Équipe Kara).  
25- Archiver les documents (contrat, reçus, quittances), marquer les statuts, et consigner le feedback du bienfaiteur (Système, Équipe Kara).

## Problématique
### Objectif général
Offrir un module Placement centré sur la sélection des bienfaiteurs (à partir des membres) qui automatise offres, sollicitations, signatures et suivi des commissions, tout en laissant à l’équipe Kara la validation métier.

### Objectifs spécifiques
| Système | Équipe Kara | Bienfaiteur |
| --- | --- | --- |
| Authentifier l’utilisateur applicatif ; exposer la liste des membres/roles (« Bienfaiteur ») ; proposer préqualification (KYC simplifié, appétence, montant max, préférences) ; envoyer sollicitations multicanales (SMS/e-mail/WhatsApp) avec scripts ; proposer l’offre standard (taux, période 1-7 mois, mode) ; générer lien de virement ou RDV collecte ; calculer la simulation finale ; générer contrat PDF prérempli et gérer signature côté Kara ; déposer/notifier/verrouiller le contrat signé ; planifier rappels et notifier avant échéance ; calculer commission de retrait anticipé ; générer avenant et quittances (finale, sortie) ; archiver et notifier. | Se connecter au back-office ; sélectionner/attribuer rôle « Bienfaiteur » ; valider/ajuster préqualification et offre ; passer appels de relance/qualification et consigner retours ; confirmer collecte/réception des fonds ; faire valider la simulation avec le bienfaiteur ; signer côté Kara ; encaisser commissions et déposer preuves ; contrôler le suivi et lever alertes ; valider avenant/retrait ; participer à l’archivage et au feedback. | Se connecter/accéder à son espace ; recevoir sollicitations ; valider simulation ; signer le contrat en ligne ; utiliser le lien de virement ou participer à la collecte ; recevoir notifications d’échéance ; valider/signer l’avenant de retrait anticipé ; recevoir quittances (finale et sortie) ; fournir feedback. |

## Analyse UML
> Référence architecture : voir `documentation/architecture/ARCHITECTURE.md` (séparation Repositories → Services → Factories → Hooks/Médiateurs → UI/Pages, intégrations Firebase/Notifications/Paiement).

### Diagramme de contexte
Le module `Placement` est le système central qui met en relation :  
- **Équipe Kara** : crée et gère les placements, valide les offres, suit les commissions et les retraits anticipés.  
- **Bienfaiteur** : reçoit les sollicitations, valide la simulation, signe les contrats/avenants, suit ses placements et reçoit les quittances.  
- **Système de paiement** : gère les encaissements et les versements liés aux placements (virements, mobile money, etc.).  
- **Service de notifications** : envoie les SMS/e-mails de sollicitation et de rappel d’échéance.  

Le diagramme de contexte est défini dans `documentation/placement/placement-context.puml` et peut être rendu via PlantUML (par exemple en générant une image `placement-context.png`) puis inclus dans la documentation.  

### Diagramme de packages
Le module `Placement` est structuré en plusieurs packages :  
- **UI / API** : backoffice Kara, espace Bienfaiteur, `Placement API`.  
- **Hooks / Mediators** : orchestration UI côté client (React Query, formulaires, médiateurs).  
- **Services (Domaine Placement)** : logique métier (`PlacementService`).  
- **Factories** : création/injection des services et repositories (`ServiceFactory`, `RepositoryFactory`).  
- **Repositories** : accès Firestore/Storage pour le module placement (`PlacementRepository`) et réutilisation de `DocumentRepository`.  
- **Membres** : services liés aux membres et à leurs rôles (`MembershipService`).  
- **Paiement** : intégration avec la passerelle de paiement (`PaymentGateway`).  
- **Notifications** : intégration avec le service de notifications (`NotificationService`).  
- **Documents** : réutilisation de la gestion documentaire existante (`DocumentService`, `DocumentRepository`) pour les contrats, preuves, quittances (types `Document`/`DocumentType` déjà définis).  

Flux : UI → Hooks/Médiateurs → API → Services → Factories → Repositories → Firebase/Intégrations ; Services consomment également `Membres`, `Paiement`, `Notifications`.  
Le diagramme de packages est défini dans `documentation/placement/placement-packages.puml` et peut être rendu via PlantUML (ex. `placement-packages.png`) puis inclus dans la documentation.  

### Use cases par package
Les use cases sont regroupés par packages (UI/API, Hooks/Médiateurs, Services, Repositories, Membres, Paiement, Notifications).  
Le diagramme PlantUML est dans `documentation/placement/placement-usecases.puml` et peut être rendu via PlantUML (ex. `placement-usecases.png`) puis inclus dans la documentation.  

### Diagramme de classes
Le diagramme de classes du module Placement (users/admins via rôles, placement, commissions, retrait anticipé, documents, traçabilité createdBy/updatedBy) est défini dans `documentation/placement/placement-classes.puml` et peut être rendu via PlantUML (ex. `placement-classes.png`) puis inclus dans la documentation.  

Éléments à ajuster dans le diagramme de classes :  
- `Placement` : champs montant numérique, mode de règlement, durée (mois), statut (Brouillon/Actif/Clos/Sortie anticipée/Annulé), dates dépendantes du mode (date 1er versement OU date début), lien contrat, contact urgent (nom, téléphone, lien), bienfaiteur (membre + rôle).  
- `CommissionPaymentPlacement` : montants numériques, statut, date échéance, preuve, paiement.  
- `EarlyExitPlacement` : montant commission due, payout, quittance.  
- `Document` : réutilisation des types (contrat, preuve, quittance).  
- Traduction des statuts et liens vers membre/roles.  

### Diagrammes de séquence (use cases)
Les séquences principales (préqualification/offre, simulation/contrat, cycle de commission, retrait anticipé, archivage) respectant les packages de l’architecture sont définies dans `documentation/placement/placement-sequences.puml` et peuvent être rendues via PlantUML (ex. `placement-sequences.png`) puis incluses dans la documentation.  

### Statistiques, onglets, listes et exports (alignement Caisse Spéciale / Caisse Imprévue / Assurances)
- **Onglets de la vue liste** (mêmes patterns que `ListContracts.tsx` et `ListContractsCISection.tsx`) :  
  - `Tous les placements` (par défaut)  
  - `Mensuel (commissions mensuelles + capital fin)`  
  - `Final (capital + commissions à la fin)`  
  - `Commissions du mois` (placements avec commission due ce mois)  
  - `En retard` (commissions dues dépassées)  
  - Proposer si besoin : `Actifs`, `Brouillons`, `Clôturés`, `Retrait anticipé`  
- **Stats (même design que Caisse Imprévue / Caisse Spéciale, carrousel + cartes)** :  
  - Total placements, Montant engagé, Actifs, Brouillons, Clôturés, Retraits anticipés  
  - Commissions dues, Commissions payées, Montant commissions payées / total commissions  
  - Répartition par mode de règlement (camembert, inspiré de `VehicleInsuranceStats`)  
  - Répartition par statut (camembert) et Top bienfaiteurs (montant cumulé, nombre de placements)  
- **Filtres** : recherche (nom/prénom/matricule), statut, mode de règlement, période, date du mois en cours pour l’onglet “Commissions du mois”, retard (échéances passées non payées).  
- **Listes** : pagination et cards alignées avec les caisses :  
  - Nom + prénom du bienfaiteur, téléphone, contact urgent  
  - Montant, taux, durée (mois), mode  
  - Prochaine commission (si mensuel) ou date finale (si capital+commission fin)  
  - Bouton téléversement contrat (pas de bouton “Détails” par défaut)  
  - Traduction des statuts : Draft → Brouillon, Active → Actif, Closed → Clos, EarlyExit → Sortie anticipée, Canceled → Annulé  
  - Actions : en Brouillon, permettre modification + suppression (confirm modal) ; pas de bouton “Retrait anticipé” sur la liste  
- **Exports** : PDF/Excel pour la liste des placements filtrés et la liste des bienfaiteurs filtrés.  

### Formulaire (cohérence et données manquantes)
- **Mode de règlement dépendant des dates** :  
  - Mensuel + capital fin : champ “Date du 1er versement de commission” ; fin = date 1er versement + durée (mois)  
  - Capital + commissions fin : champ “Date de début de contrat” ; fin = date début + durée (mois)  
- **Contact urgent** : réutiliser la structure du contact d’urgence (voir `src/components/caisse-imprevue/Step3.tsx`) et l’intégrer au formulaire placement.  
- **Rôles et sélection** : recherche membre (nom, prénom, matricule), ajout rôle « Bienfaiteur » si absent.  

### Activation, verrouillage contrat et page Détails (alignée sur Caisse Imprévue)
- **Conditions d’activation** : un placement devient Actif seulement si (1) le contrat PDF signé est téléversé ET (2) la période est commencée (date 1er versement ou date début ≤ aujourd’hui).  
- **Verrou contrat** : dès qu’une commission est payée, le contrat PDF n’est plus modifiable.  
- **Page Détails (design `caisse-imprevue/contrats/[id]`)** :  
  - En-tête : badges type de placement + statut (traduit), bouton “Ouvrir” (si Actif).  
  - Bloc infos : ID contrat, montant/date prochaine commission, date fin, coordonnées (téléphone, contact urgent).  
  - Stats du contrat : montants payés/restants, commissions payées/due, répartition, gauge progression :  
    - Mode mensuel : progression sur les échéances payées vs total.  
    - Mode final : progression temporelle jusqu’à l’échéance finale (capital+commissions).  
  - Historique des versements (timeline) avec reçus/preuves PDF téléchargeables.  
  - Échéancier : liste des échéances mensuelles cliquables pour payer ; si payé, voir/télécharger le reçu.  
  - Capital (fin / retrait anticipé) : enregistrement remboursement final, génération PDF (quittance finale), et cas retrait anticipé (avenant + quittance sortie).  
  - Bouton “Contact urgent” (modal) pour afficher les infos saisies.  

### Sélection et mise à jour des bienfaiteurs
- **Recherche** : sélection du bienfaiteur via recherche (nom, prénom, matricule) avec autocomplétion, sur la base des membres existants.  
- **Rôles** : lors de la création d’un placement, si le membre n’a pas le rôle « Bienfaiteur », l’ajouter à sa liste de rôles.  
- **Uniformité UI** : conserver le look & feel des vues existantes (cards, stats, pagination) pour le module placements, cohérent avec Membres, Caisse Imprévue et Caisse Spéciale.  


