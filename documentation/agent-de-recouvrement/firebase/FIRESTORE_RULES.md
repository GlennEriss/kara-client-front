# Règles Firestore – Module Agent de recouvrement

> Règles de sécurité pour la collection `agentsRecouvrement` (déduites des diagrammes de séquence)

## 📋 Vue d'ensemble

| Opération | Acteur | Diagramme source |
|-----------|--------|------------------|
| **create** | Admin | SEQ_CreerAgent |
| **read** (getById) | Admin | SEQ_VoirDetailsAgent, SEQ_ModifierAgent |
| **read** (list) | Admin | SEQ_ListerAgents, SEQ_RechercherAgents, SEQ_SelectionnerAgent* |
| **update** | Admin | SEQ_ModifierAgent, SEQ_DesactiverAgent |
| **delete** | — | Non prévu (désactivation à la place) |

## 🔒 Règles à ajouter dans `firestore.rules`

Ajouter la section suivante **avant** la règle par défaut `match /{document=**}` :

```
// ==========================================
// AGENTS DE RECOUVREMENT (AGENTS RECOUVREMENT)
// ==========================================
// Gestion des agents de recouvrement (création, modification, désactivation)
// Utilisé par : Page /admin/agents-recouvrement, modals Créer/Modifier/Désactiver
// Sélection dans : CreditPaymentModal, Caisse spéciale pay(), Caisse imprévue createVersement()
// Cloud Function : agentRecouvrementNotifications (lecture seule)

match /agentsRecouvrement/{agentId} {
  // Lecture : Admin uniquement
  allow read: if isAdmin();
  
  // Création : Admin uniquement
  allow create: if isAdmin();
  
  // Mise à jour : Admin uniquement (modification, désactivation)
  allow update: if isAdmin();
  
  // Suppression : Admin uniquement (irréversible, préférer désactivation pour traçabilité)
  allow delete: if isAdmin();
}
```

## 📐 Structure du document

```typescript
interface AgentRecouvrement {
  id: string
  nom: string
  prenom: string
  sexe: 'M' | 'F'
  pieceIdentite: {
    type: 'CNI' | 'Passport' | 'Carte scolaire' | 'Carte étrangère' | 'Carte consulaire'
    numero: string
    dateDelivrance: Timestamp
    dateExpiration: Timestamp
  }
  dateNaissance: Timestamp
  birthMonth?: number   // 1-12, dérivé de dateNaissance (pour tab Anniversaires)
  birthDay?: number     // 1-31, dérivé de dateNaissance (pour tab Anniversaires)
  lieuNaissance: string
  tel1: string
  tel2?: string
  photoUrl?: string      // URL Storage (optionnel)
  photoPath?: string    // Chemin Storage pour suppression (optionnel)
  actif: boolean
  searchableTextLastNameFirst: string
  searchableTextFirstNameFirst: string
  searchableTextNumeroFirst: string
  createdBy: string
  createdAt: Timestamp
  updatedBy?: string
  updatedAt: Timestamp
}
```

## ⚠️ Note Cloud Function

La Cloud Function `agentRecouvrementNotifications` s'exécute avec les **credentials Admin SDK** (bypass des règles Firestore). Aucune règle spécifique n'est nécessaire pour la Cloud Function.

## 🔗 Références

- **Diagrammes** : `sequence/SEQ_CreerAgent.puml`, `SEQ_ModifierAgent.puml`, `SEQ_DesactiverAgent.puml`, `SEQ_ListerAgents.puml`
- **Fichier projet** : `firestore.rules` (racine)
