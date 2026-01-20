# Documentation - Use Case "Approuver une Demande d'Adhésion"

> Documentation pour la fonctionnalité d'approbation des demandes d'adhésion

---

## 📋 Vue d'ensemble

**Use Case** : UC-MEM-XXX - Approuver une demande d'adhésion

**Acteurs** :
- **Admin KARA** : Approuve une demande d'adhésion et crée le compte membre

**Scope** :
- Approuver une demande d'adhésion (Admin)
- Créer un compte utilisateur Firebase Auth
- Créer un document utilisateur dans Firestore
- Créer une souscription par défaut
- Uploader et archiver le PDF d'adhésion (obligatoire - fiche d'adhésion)
- Gérer l'entreprise et la profession
- Enregistrer l'adresse dans la structure hiérarchique

---

## 📚 Documentation

### Documents Détaillés
- **[FLUX_APPROBATION.md](./FLUX_APPROBATION.md)** : Flux complet détaillé de l'approbation
- **[GESTION_IDENTIFIANTS.md](./GESTION_IDENTIFIANTS.md)** : Solution pour stocker et envoyer temporairement les identifiants de connexion
- **[ENVOI_IDENTIFIANTS.md](./ENVOI_IDENTIFIANTS.md)** : Guide d'implémentation détaillé pour l'envoi des identifiants dans l'interface

### Diagrammes UML
- **Diagramme d'Activité** : `documentation/membership-requests/approbation/activite/Approuver.puml` (mis à jour)
- **Diagramme de Séquence** : `documentation/membership-requests/approbation/sequence/SEQ_Approuver.puml` (à mettre à jour)

### Code Existant
- **Composant UI** : `src/components/memberships/MembershipRequestsList.tsx` (fonction `handleApprove`)
- **API Route** : `src/app/api/create-firebase-user-email-pwd/route.ts`

---

## 🔍 Analyse de l'Ancienne Implémentation

### Flux Actuel (Ancien Code)

1. **UI - Modal d'approbation** :
   - Admin sélectionne le type de membre (Adhérent, Bienfaiteur, Sympathisant)
   - Admin peut renseigner/modifier le nom de l'entreprise
   - Admin peut renseigner/modifier le nom de la profession
   - Admin doit uploader un PDF d'adhésion (obligatoire - fiche d'adhésion)
   - Validation : Type de membre obligatoire, PDF obligatoire

2. **Upload PDF** (obligatoire) :
   - Upload de la fiche d'adhésion en PDF vers Firebase Storage (`membership-adhesion-pdfs/`)
   - Nom de fichier : `{firstName}_{lastName}_{YYYY}-{YYYY}.pdf`
   - Récupération de l'URL et des métadonnées
   - Validation : Le PDF doit être fourni avant de pouvoir approuver

3. **Appel API** : `POST /api/create-firebase-user-email-pwd`
   - Paramètres :
     - `requestId` : ID de la demande
     - `adminId` : ID de l'admin qui approuve
     - `membershipType` : Type de membre (adherant, bienfaiteur, sympathisant)
     - `companyName` : Nom de l'entreprise (optionnel)
     - `professionName` : Nom de la profession (optionnel)
     - `adhesionPdfURL` : URL du PDF uploadé (obligatoire - fiche d'adhésion)

4. **API - Création utilisateur** :
   - Récupération de la demande d'adhésion
   - Génération automatique de l'email : `{firstName}{lastName}{4premiersChiffresMatricule}@kara.ga`
   - Création utilisateur Firebase Auth :
     - `uid` = matricule de la demande
     - `email` = email généré
     - `password` = '123456' (mot de passe par défaut)
   - Création document utilisateur dans Firestore (`users/{matricule}`)
   - Création souscription par défaut (`subscriptions/{subscriptionId}`)
   - Mise à jour souscription avec URL PDF (obligatoire)
   - Ajout souscription à l'utilisateur
   - Enregistrement adresse dans structure hiérarchique
   - Persistance entreprise (si fournie) via `CompanyService.findOrCreate()`
   - Persistance profession (si fournie) via `ProfessionService.findOrCreate()`
   - Mise à jour statut demande avec traçabilité :
     - `status = 'approved'`
     - `approvedBy = adminId` (ID de l'admin qui a approuvé - obligatoire)
     - `approvedAt = serverTimestamp()` (Date d'approbation - obligatoire)

5. **Archivage document** (obligatoire - PDF fiche d'adhésion) :
   - Création document dans `DocumentRepository`
   - Type : `'ADHESION'`
   - Format : `'pdf'`
   - Libellé : `'Fiche d'adhésion - {matricule}'`
   - Lien avec `memberId` = matricule

6. **Notification** :
   - Toast de succès avec matricule, email, mot de passe
   - ⚠️ **Problème sécurité** : Mot de passe exposé dans le toast

---

## ⚠️ Problèmes Identifiés dans l'Ancienne Implémentation

1. **Sécurité** :
   - Mot de passe par défaut `'123456'` exposé dans le toast
   - Pas d'envoi par email du mot de passe
   - **Solution** : Voir [GESTION_IDENTIFIANTS.md](./GESTION_IDENTIFIANTS.md)

2. **Vérification Entreprise/Profession** :
   - Pas de vérification d'existence avant création
   - Pas de demande à l'admin pour créer si n'existent pas
   - **Solution** : Vérifier existence dans `companies` et `professions`, demander création à l'admin si n'existent pas

3. **Rollback** :
   - Pas de système de rollback si erreur après création utilisateur
   - Risque de données incohérentes (utilisateur créé mais pas de document Firestore, etc.)
   - **Solution** : Système de rollback avec `rollbackActions[]`

4. **Transaction** :
   - Pas de transaction Firestore atomique
   - Opérations multiples non atomiques
   - **Solution** : Utiliser Firestore batch pour garantir la cohérence

5. **Architecture** :
   - Logique métier complexe dans le composant React
   - API route fait trop de choses (création utilisateur, souscription, entreprise, profession, etc.)
   - **Solution** : Créer un service `MembershipApprovalService`

6. **Gestion d'erreurs** :
   - Erreurs silencieuses (entreprise, profession, adresse)
   - Pas de logging structuré
   - **Solution** : Gestion d'erreurs structurée avec logging

---

## 📝 Structure de Documentation

```
documentation/membership-requests/approbation/
├── README.md                    # Ce fichier
├── activite/                    # Diagrammes d'activité
│   └── Approuver.puml          # (existant)
├── sequence/                    # Diagrammes de séquence
│   └── SEQ_Approuver.puml      # (existant)
├── test/                        # Documentation tests
│   ├── README.md
│   ├── DATA_TESTID.md
│   ├── TESTS_UNITAIRES.md
│   ├── TESTS_INTEGRATION.md
│   └── TESTS_E2E.md
├── firebase/                    # Documentation Firebase
│   ├── README.md
│   ├── FIRESTORE_RULES.md
│   ├── STORAGE_RULES.md
│   └── FIRESTORE_INDEXES.md
├── functions/                   # Documentation Cloud Functions
│   └── README.md
├── notification/                # Documentation notifications
│   └── README.md
└── wireframes/                  # Wireframes UI/UX
    └── README.md
```

---

## 🎯 Améliorations Apportées

### 1. Vérification Entreprise/Profession
- Affichage de l'entreprise et de la profession depuis le dossier du client
- Vérification d'existence dans les collections `companies` et `professions`
- Demande à l'admin de créer si n'existent pas
- Création conditionnelle selon le choix de l'admin

### 2. Sécurité - Gestion des Mots de Passe
- Mot de passe géré uniquement par Firebase Auth (pas de stockage en Firestore)
- Stockage temporaire (24h) dans `membership-requests.approvalCredentials`
- Modal d'envoi pour que l'admin puisse envoyer les identifiants
- Nettoyage automatique après envoi ou expiration
- Voir [GESTION_IDENTIFIANTS.md](./GESTION_IDENTIFIANTS.md) pour les détails

### 3. Système de Rollback
- Rollback automatique en cas d'erreur
- Suppression de l'utilisateur Firebase Auth, document `users`, abonnement, PDF uploadé
- Logging structuré pour intervention manuelle

### 4. Transaction Atomique
- Utilisation de Firestore batch pour garantir la cohérence
- Toutes les opérations dans une seule transaction

## 🎯 Prochaines Étapes

1. Créer le workflow d'implémentation détaillé (similaire à `workflow-use-case-corrections.md`)
2. Implémenter la vérification entreprise/profession
3. Implémenter le stockage temporaire des identifiants
4. Créer le modal d'envoi identifiants
5. Implémenter le système de rollback
6. Créer les Cloud Functions nécessaires (nettoyage `approvalCredentials`)

---

## 📖 Références

- **Workflow Corrections** : `documentation/membership-requests/corrections/workflow-use-case-corrections.md` (référence pour la structure)
- **Code existant** : `src/components/memberships/MembershipRequestsList.tsx` (lignes 554-647)
- **API existante** : `src/app/api/create-firebase-user-email-pwd/route.ts`
