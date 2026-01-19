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
- Uploader et archiver le PDF d'adhésion (optionnel)
- Gérer l'entreprise et la profession
- Enregistrer l'adresse dans la structure hiérarchique

---

## 📚 Documentation Existante

### Diagrammes UML
- **Diagramme de Séquence** : `documentation/membership-requests/approbation/sequence/SEQ_Approuver.puml`
- **Diagramme d'Activité** : `documentation/membership-requests/approbation/activite/Approuver.puml`

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
   - Admin peut uploader un PDF d'adhésion (optionnel)
   - Validation : Type de membre obligatoire, PDF optionnel

2. **Upload PDF** (si fourni) :
   - Upload vers Firebase Storage (`membership-adhesion-pdfs/`)
   - Nom de fichier : `{firstName}_{lastName}_{YYYY}-{YYYY}.pdf`
   - Récupération de l'URL et des métadonnées

3. **Appel API** : `POST /api/create-firebase-user-email-pwd`
   - Paramètres :
     - `requestId` : ID de la demande
     - `adminId` : ID de l'admin qui approuve
     - `membershipType` : Type de membre (adherant, bienfaiteur, sympathisant)
     - `companyName` : Nom de l'entreprise (optionnel)
     - `professionName` : Nom de la profession (optionnel)
     - `adhesionPdfURL` : URL du PDF uploadé (optionnel)

4. **API - Création utilisateur** :
   - Récupération de la demande d'adhésion
   - Génération automatique de l'email : `{firstName}{lastName}{4premiersChiffresMatricule}@kara.ga`
   - Création utilisateur Firebase Auth :
     - `uid` = matricule de la demande
     - `email` = email généré
     - `password` = '123456' (mot de passe par défaut)
   - Création document utilisateur dans Firestore (`users/{matricule}`)
   - Création souscription par défaut (`subscriptions/{subscriptionId}`)
   - Mise à jour souscription avec URL PDF (si fournie)
   - Ajout souscription à l'utilisateur
   - Enregistrement adresse dans structure hiérarchique
   - Persistance entreprise (si fournie) via `CompanyService.findOrCreate()`
   - Persistance profession (si fournie) via `ProfessionService.findOrCreate()`
   - Mise à jour statut demande : `status = 'approved'`

5. **Archivage document** (si PDF uploadé) :
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

2. **Rollback** :
   - Pas de système de rollback si erreur après création utilisateur
   - Risque de données incohérentes (utilisateur créé mais pas de document Firestore, etc.)

3. **Transaction** :
   - Pas de transaction Firestore atomique
   - Opérations multiples non atomiques

4. **Architecture** :
   - Logique métier complexe dans le composant React
   - API route fait trop de choses (création utilisateur, souscription, entreprise, profession, etc.)

5. **Gestion d'erreurs** :
   - Erreurs silencieuses (entreprise, profession, adresse)
   - Pas de logging structuré

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

## 🎯 Prochaines Étapes

En attente des explications de l'utilisateur sur :
- Le nouveau flux d'approbation souhaité
- Les améliorations à apporter
- Les changements par rapport à l'ancienne implémentation
- Les cas d'usage spécifiques à gérer

---

## 📖 Références

- **Workflow Corrections** : `documentation/membership-requests/corrections/workflow-use-case-corrections.md` (référence pour la structure)
- **Code existant** : `src/components/memberships/MembershipRequestsList.tsx` (lignes 554-647)
- **API existante** : `src/app/api/create-firebase-user-email-pwd/route.ts`
