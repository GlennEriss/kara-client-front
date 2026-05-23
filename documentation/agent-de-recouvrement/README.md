# Agent de recouvrement

## 📋 Vue d'ensemble

Ce document décrit le concept d'**agent de recouvrement** dans le contexte de KARA Association, ses objectifs, son utilisation et les modalités de création. Cette documentation sert de base pour l'analyse et l'implémentation de cette fonctionnalité.

---

## 🤔 Qu'est-ce qu'un agent de recouvrement ?

Un **agent de recouvrement** est une personne chargée d'aller récupérer l'argent auprès des membres lors de l'enregistrement d'un versement. Il s'agit d'un acteur terrain qui collecte physiquement les paiements (espèces, mobile money, etc.) auprès des adhérents et rapporte ces fonds à l'association.

### Caractéristiques principales

- **Rôle opérationnel** : L'agent se déplace pour collecter les paiements auprès des membres
- **Traçabilité** : Chaque versement enregistré doit pouvoir être associé à l'agent qui a effectué la collecte
- **Responsabilité** : L'agent est responsable des fonds collectés jusqu'à leur remise à l'association

---

## 🎯 Objectifs

### 1. Traçabilité des collectes

Permettre de savoir **qui** a collecté chaque versement, pour :
- Assurer la responsabilisation des agents
- Faciliter le suivi des performances par agent
- Résoudre les litiges éventuels sur l'origine des fonds

### 2. Gestion des contrats concernés

L'agent de recouvrement intervient sur **trois types de contrats** :

| Type de contrat | Description | Point d'enregistrement |
|-----------------|-------------|-------------------------|
| **Crédit spéciale** | Prêts accordés aux membres | Enregistrement d'un paiement d'échéance |
| **Caisse spéciale** | Épargne avec objectifs (standard, journalière, libre) | Enregistrement d'une contribution |
| **Caisse imprévue** | Couverture des imprévus | Enregistrement d'un versement mensuel |

### 3. Reporting et statistiques

À terme, permettre des analyses telles que :
- Volume collecté par agent
- Performance par période
- Répartition géographique des collectes

---

## 📍 Où renseigner l'agent de recouvrement ?

L'agent de recouvrement doit être **sélectionné au moment de l'enregistrement d'un versement**. Concrètement :

### Crédit spéciale

- **Interface** : Modal d'enregistrement de paiement (`CreditPaymentModal`)
- **Moment** : Lors de la saisie des informations du paiement (date, montant, mode, preuve)
- **Données** : Le champ `agentRecouvrementId` (ou équivalent) sera ajouté au paiement

### Caisse spéciale

- **Interface** : Formulaire/modal de paiement des contributions
- **Moment** : Lors de l'enregistrement d'une contribution (`pay()` dans `caisse/mutations.ts`)
- **Données** : Le champ sera ajouté à chaque `IndividualPaymentContribution` ou `GroupPaymentContribution`

### Caisse imprévue

- **Interface** : Formulaire de versement (`DailyCIContract`, modal de versement)
- **Moment** : Lors de la création d'un versement (`createVersement` dans `CaisseImprevueService`)
- **Données** : Le champ sera ajouté à chaque `VersementCI`

---

## ➕ Comment créer un agent de recouvrement ?

### Prérequis

- Un agent de recouvrement est typiquement un **employé** ou **collaborateur** de l'association
- Il peut s'agir d'un admin existant ou d'une entité dédiée

### Options de modélisation

#### Option A : Entité dédiée `AgentRecouvrement`

Créer une collection Firestore `agentsRecouvrement` avec :

```
- id: string
- nom: string
- prenom: string
- sexe: 'M' | 'F'           // Homme | Femme
- pieceIdentite: {
    type: 'CNI' | 'Passport' | 'Carte scolaire' | 'Carte étrangère' | 'Carte consulaire'
    numero: string
    dateDelivrance: Date
    dateExpiration: Date
  }
- dateNaissance: Date
- birthMonth?: number   // 1-12, dérivé de dateNaissance (tab Anniversaires du mois)
- birthDay?: number    // 1-31, dérivé de dateNaissance (tab Anniversaires du mois)
- lieuNaissance: string
- tel1: string
- tel2?: string
- photoUrl?: string      // URL Storage (optionnel)
- photoPath?: string     // Chemin Storage pour suppression (optionnel)
- actif: boolean
- searchableTextLastNameFirst: string   // nom prénom numéro tel (recherche par nom)
- searchableTextFirstNameFirst: string  // prénom nom numéro tel (recherche par prénom)
- searchableTextNumeroFirst: string     // numéro tel1 tel2 nom prénom (recherche par numéro pièce ou téléphone)
- createdBy: string      // ID de l'admin créateur (traçabilité)
- createdAt: Date         // Date/heure de création
- updatedBy?: string     // ID de l'admin modificateur (traçabilité)
- updatedAt: Date         // Date/heure de mise à jour
```

**Avantages** : Séparation claire, gestion indépendante, pas de mélange avec les admins  
**Inconvénients** : Nouvelle entité à maintenir, possible doublon avec les admins

#### Option B : Réutiliser les admins existants

Utiliser la collection `admins` existante et ajouter un champ `isAgentRecouvrement: boolean`.

**Avantages** : Pas de nouvelle collection, réutilisation des comptes existants  
**Inconvénients** : Tous les admins ne sont pas des agents, nécessite un filtre

#### Option C : Table de référence simple

Créer une collection `agentsRecouvrement` légère qui référence un `userId` (admin ou membre du personnel).

### Notifications (Cloud Function)

Une **Cloud Function planifiée** (`agentRecouvrementNotifications`) notifie les admins via le centre de notifications :

| Événement | Jours | Description |
|-----------|-------|-------------|
| **Anniversaire** | J-2, J, J+1 | 2 jours avant, jour même, rattrapage lendemain |
| **Pièce d'identité** | J-30, J-7, J, J+1 | 30 jours avant, 7 jours avant, jour même, expirée hier |

Voir [`activity/CloudFunctionNotificationsAgent.puml`](./activity/CloudFunctionNotificationsAgent.puml) et [`sequence/SEQ_CloudFunctionNotificationsAgent.puml`](./sequence/SEQ_CloudFunctionNotificationsAgent.puml).

### Interface de gestion

Une section **Administration** permettra de :

1. **Lister** les agents de recouvrement (onglets : Actifs, Tous, Inactifs, **Anniversaires du mois**)
2. **Créer** un nouvel agent (nom, prénom, contact, etc.)
3. **Modifier** les informations d'un agent
4. **Désactiver** un agent (sans supprimer l'historique)
5. **Supprimer** un agent (irréversible, modal confirmation)

### Emplacement suggéré dans l'application

- **Menu admin** : `Paramètres` ou `Administration` → `Agents de recouvrement`
- **Route** : `/admin/agents-recouvrement` ou `/settings/agents-recouvrement`

---

## 🔧 Impact technique (à implémenter)

### Modifications des types de données

| Entité | Fichier | Champ à ajouter |
|--------|---------|-----------------|
| `AgentRecouvrement` | (nouveau) | `photoUrl?: string`, `photoPath?: string`, `birthMonth?: number`, `birthDay?: number` (optionnel) |
| `CreditPayment` | `src/types/types.ts` | `agentRecouvrementId?: string` |
| `VersementCI` | `src/types/types.ts` | `agentRecouvrementId?: string` |
| `IndividualPaymentContribution` | `src/services/caisse/types.ts` | `agentRecouvrementId?: string` |
| `GroupPaymentContribution` | `src/services/caisse/types.ts` | `agentRecouvrementId?: string` |

### Modifications des formulaires

| Composant | Fichier | Modification |
|-----------|---------|--------------|
| CreateAgentModal / EditAgentModal | (nouveau) | Ajouter champ photo (upload Storage agents-recouvrement/{agentId}) |
| Modal paiement crédit | `CreditPaymentModal.tsx` | Ajouter un select pour l'agent |
| Formulaire versement CI | `DailyCIContract.tsx` / formulaire versement | Ajouter un select pour l'agent |
| Paiement caisse spéciale | `caisse/mutations.ts` + composant UI | Ajouter le paramètre agent |

### Attributs de recherche (obligatoires)

À chaque création/modification d'agent, calculer et stocker :
- `searchableTextLastNameFirst` = nom + prénom + numéro pièce + tel1 + tel2 (lowercase)
- `searchableTextFirstNameFirst` = prénom + nom + numéro pièce + tel1 + tel2 (lowercase)
- `searchableTextNumeroFirst` = numéro pièce + tel1 + tel2 + nom + prénom (lowercase)

Permet la recherche par nom, prénom, numéro pièce ou téléphone (Firestore préfixe). Voir `ANALYSE_ALGOLIA_VS_FIRESTORE.md`.

### Firebase (firebase/)

- **Index Firestore** : Voir [`firebase/INDEXES.md`](./firebase/INDEXES.md) – index composites agentsRecouvrement
- **Règles Firestore** : Voir [`firebase/FIRESTORE_RULES.md`](./firebase/FIRESTORE_RULES.md) – collection agentsRecouvrement
- **Règles Storage** : Voir [`firebase/STORAGE_RULES.md`](./firebase/STORAGE_RULES.md) – photos agents-recouvrement/{agentId}

### Nouveaux éléments à créer

- **Repository** : `AgentRecouvrementRepository` (ou réutilisation `AdminRepository`)
- **Service** : `AgentRecouvrementService` (CRUD des agents)
- **Hook** : `useAgentsRecouvrement` (liste des agents actifs)
- **Page admin** : Gestion des agents de recouvrement
- **Composant** : `AgentRecouvrementSelect` (select réutilisable dans les formulaires de paiement)

---

## 📚 Fichiers de référence

### Workflow d'implémentation

- **[WORKFLOW.md](./WORKFLOW.md)** — Workflow d'implémentation spécifique au module (format adapté de `documentation/general/WORKFLOW.md`)

### Diagrammes UML

- **Use cases** : [`use-case/UC_AgentRecouvrement.puml`](./use-case/UC_AgentRecouvrement.puml)
- **Activité** : [`activity/`](./activity/) – un diagramme par use case + gestion des erreurs
- **Séquence** : [`sequence/`](./sequence/) – diagrammes de séquence par activité
- **Firebase** : [`firebase/`](./firebase/) – index Firestore, règles Firestore et Storage
- **Wireframes** : [`ui/`](./ui/) – wireframes responsive (Mobile, Tablette, Desktop)

| Use case | Description |
|---------|-------------|
| UC-AR-001 | Lister les agents (pagination, filtres Actifs/Tous/Inactifs/Anniversaires, vue cards/liste) |
| UC-AR-008 | Voir les détails d'un agent |
| UC-AR-009 | Consulter les stats (actifs, inactifs, total, hommes, femmes) |
| UC-AR-002 | Créer un agent de recouvrement |
| UC-AR-003 | Modifier un agent de recouvrement |
| UC-AR-004 | Désactiver un agent de recouvrement |
| UC-AR-005 | Sélectionner l'agent lors d'un paiement Crédit spéciale |
| UC-AR-006 | Sélectionner l'agent lors d'une contribution Caisse spéciale |
| UC-AR-007 | Sélectionner l'agent lors d'un versement Caisse imprévue |

### Enregistrement des versements actuels

- **Crédit spéciale** : `src/services/credit-speciale/CreditSpecialeService.ts` → `createPayment()`
- **Caisse spéciale** : `src/services/caisse/mutations.ts` → `pay()`
- **Caisse imprévue** : `src/services/caisse-imprevue/CaisseImprevueService.ts` → `createVersement()`

### Types concernés

- `src/types/types.ts` : `CreditPayment`, `VersementCI`
- `src/services/caisse/types.ts` : `IndividualPaymentContribution`, `GroupPaymentContribution`

---

## 🔍 Liste, filtres et recherche : Algolia ou Firestore ?

Voir **[ANALYSE_ALGOLIA_VS_FIRESTORE.md](./ANALYSE_ALGOLIA_VS_FIRESTORE.md)** pour l’analyse détaillée.

**Recommandation** : **Firestore uniquement** (pas d’Algolia InstantSearch). Le volume d’agents (10–100) ne justifie pas Algolia. Firestore avec `searchableText` et debounce suffit.

---

## 📖 Prochaines étapes

1. **Valider** le modèle de données (Option A, B ou C)
2. **Définir** l'interface de gestion des agents (wireframes) ✅ Voir [`ui/`](./ui/)
3. **Implémenter** la collection/entité AgentRecouvrement
4. **Modifier** les formulaires de paiement pour inclure la sélection de l'agent
5. **Mettre à jour** les types et schémas de validation
6. **Tester** le flux complet sur les trois types de contrats

---

**Date de création** : 2 février 2025  
**Statut** : Analyse / Documentation
