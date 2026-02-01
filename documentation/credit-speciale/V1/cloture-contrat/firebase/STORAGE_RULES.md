# Règles Storage - Clôture de contrat (Crédit spéciale)

> Règles Firebase Storage pour les quittances (remplie et signée)

## 📋 Vue d'ensemble

Le flux de clôture utilise Firebase Storage pour :

1. **Quittance remplie** : PDF généré à partir du template, uploadé temporairement puis proposé en téléchargement
2. **Quittance signée** : PDF signé par le membre, uploadé par l’admin

Les deux types de documents sont des **PDF** et passent par le chemin `contracts-ci/{memberId}/{fileName}` (DocumentRepository.uploadDocumentFile).

## 🎯 Chemins Storage concernés

### Chemin utilisé

```
contracts-ci/{memberId}/{fileName}
```

**Format du fileName** : `{timestamp}_{documentType}_{originalFileName}`

Exemples :
- `1738411200000_CREDIT_SPECIALE_QUITTANCE_quittance-remplie.pdf`
- `1738411300000_CREDIT_SPECIALE_QUITTANCE_SIGNED_quittance-signee.pdf`

### Règles actuelles (storage.rules lignes 145-156)

```javascript
match /contracts-ci/{memberId}/{fileName} {
  // Lecture : Admins uniquement (documents sensibles)
  allow read: if isAdmin();
  
  // Écriture : Admins uniquement - PDF (max 5MB) OU image (max 5MB)
  allow write: if isAdmin() && (
    (isPDF() && isContractPDFSizeValid()) ||
    (isImage() && isImageSizeValid())
  );
  
  // Suppression : Admins uniquement
  allow delete: if isAdmin();
}
```

Avec :
- `isPDF()` : `contentType == 'application/pdf'`
- `isContractPDFSizeValid()` : taille < 5 MB

## ✅ Couverture du use case

Les règles actuelles couvrent déjà le flux de clôture :

| Opération | Chemin | Règle | Statut |
|-----------|--------|-------|--------|
| Upload quittance remplie | contracts-ci/{clientId}/{fileName} | Admin + PDF + 5MB | ✅ |
| Upload quittance signée | contracts-ci/{clientId}/{fileName} | Admin + PDF + 5MB | ✅ |
| Lecture (affichage bouton "Quittance signée") | contracts-ci/{clientId}/{fileName} | Admin | ✅ |

## 🔒 Règles optionnelles plus strictes

Si on souhaite restreindre les quittances à des PDF uniquement (sans images) dans ce chemin :

```javascript
// Option : validation du préfixe du nom de fichier pour les quittances
match /contracts-ci/{memberId}/{fileName} {
  allow read: if isAdmin();
  
  allow write: if isAdmin() && 
    isPDF() && 
    isContractPDFSizeValid() &&
    // Optionnel : vérifier que c'est une quittance
    (fileName.matches('.*_CREDIT_SPECIALE_QUITTANCE.*\\.pdf') ||
     fileName.matches('.*_CREDIT_SPECIALE_QUITTANCE_SIGNED.*\\.pdf') ||
     fileName.matches('.*_CREDIT_SPECIALE_CONTRACT.*\\.pdf') ||
     fileName.matches('.*_CREDIT_SPECIALE_CONTRACT_SIGNED.*\\.pdf'));
  
  allow delete: if isAdmin();
}
```

**Note** : Cette restriction peut compliquer d’autres usages du même chemin. La règle actuelle (PDF ou image, 5MB) est recommandée.

## 📊 Contraintes de validation

| Critère | Valeur | Raison |
|---------|--------|--------|
| Type MIME | `application/pdf` | Quittances en PDF |
| Taille max | 5 MB | Aligné avec les contrats CI |
| Authentification | Admin | Documents sensibles |

## 🚀 Déploiement

Les règles Storage actuelles ne nécessitent pas de modification pour le use case de clôture.

Pour déployer les règles Storage :

```bash
firebase deploy --only storage
```

Pour tester localement :

```bash
firebase emulators:start --only storage
```

---

## 📚 Références

- **DocumentRepository** : `src/repositories/documents/DocumentRepository.ts` (uploadDocumentFile, chemin `contracts-ci/{memberId}/{fileName}`)
- **storage.rules** : Règles actuelles du projet
- **Sequence** : [UC_ClotureContrat_sequence.puml](../sequence/UC_ClotureContrat_sequence.puml) (phases 2 et 3)
