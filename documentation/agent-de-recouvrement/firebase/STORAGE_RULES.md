# Règles Storage – Module Agent de recouvrement

> Règles pour les photos des agents de recouvrement (champ optionnel)

## 📋 Vue d'ensemble

| Opération | Acteur | Diagramme source |
|-----------|--------|------------------|
| **upload** | Admin | SEQ_CreerAgent, SEQ_ModifierAgent |
| **read** | Admin | Page détails, liste (cards), selects |
| **delete** | Admin | Modifier (remplacement photo) |

## 📁 Chemin Storage

```
agents-recouvrement/{agentId}/{fileName}
```

- `agentId` : ID du document Firestore `agentsRecouvrement`
- `fileName` : Nom du fichier (ex: `photo.jpg`, `photo_1234567890.webp`)

**Exemple** : `agents-recouvrement/abc123/photo.jpg`

## 🔒 Règles à ajouter dans `storage.rules`

Ajouter la section suivante **avant** la règle par défaut `match /{allPaths=**}` :

```
// ==========================================
// PHOTOS AGENTS DE RECOUVREMENT
// ==========================================
// Photos des agents (champ optionnel)
// Utilisé par : CreateAgentModal, EditAgentModal
// Chemin : agents-recouvrement/{agentId}/{fileName}

match /agents-recouvrement/{agentId}/{fileName} {
  // Lecture : Admins uniquement (affichage liste, détails, selects)
  allow read: if isAdmin();
  
  // Écriture : Admins uniquement avec validation
  // - Type : image (jpeg, jpg, png, webp)
  // - Taille max : 5 MB
  allow write: if isAdmin() && 
    request.resource.contentType.matches('image/(jpeg|jpg|png|webp)') &&
    request.resource.size < 5 * 1024 * 1024;
  
  // Suppression : Admins uniquement
  allow delete: if isAdmin();
}
```

## 📐 Contraintes

| Contrainte | Valeur |
|------------|--------|
| Types autorisés | image/jpeg, image/jpg, image/png, image/webp |
| Taille max | 5 MB |
| Format recommandé | WebP (compression) ou JPEG |

## 🔗 Références

- **Diagrammes** : `sequence/SEQ_CreerAgent.puml`, `SEQ_ModifierAgent.puml`
- **Fichier projet** : `storage.rules` (racine)
- **Pattern similaire** : `emergency-contacts`, `payment-proofs`
