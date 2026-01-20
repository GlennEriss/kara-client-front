# Flux d'Approbation - Détails Complets

> Documentation détaillée du flux d'approbation d'une demande d'adhésion

---

## 📋 Vue d'ensemble

**Objectif** : Approuver une demande d'adhésion et créer un compte membre officiel de KARA.

**Acteurs** :
- **Admin KARA** : Approuve la demande et crée le compte
- **Système** : Gère la création automatique (Firebase Auth, Firestore, etc.)

---

## 🔄 Flux Complet

### 1. Prérequis

- La demande doit avoir le statut `'pending'`
- La demande doit être payée (`isPaid === true`)
- Si non payée, le bouton "Approuver" est désactivé avec message "Paiement requis"
- **Le PDF de la fiche d'adhésion est obligatoire** (validation avant approbation)

### 2. Ouverture du Modal d'Approbation

**Données affichées depuis le dossier** :
- Entreprise du client (seulement si `company.isEmployed === true` ET `company.companyName` existe)
- Profession du client (seulement si `company.isEmployed === true` ET `company.profession` existe)

**Note** : Si `company.isEmployed === false` ou si les champs sont vides, c'est normal (le membre est au chômage), aucune vérification/création nécessaire.

**Champs à remplir** :
- **Type de membre** (obligatoire) :
  - Adhérent
  - Bienfaiteur
  - Sympathisant
- **Upload PDF d'adhésion** (obligatoire) : Fiche d'adhésion en PDF

### 3. Vérification Entreprise/Profession

**Important** : La vérification et la création d'entreprise/profession ne s'appliquent **QUE** si :
- `company.isEmployed === true` ET
- Les champs correspondants (`companyName` ou `profession`) sont renseignés

Si les champs sont vides, c'est normal (le membre est au chômage), aucune action nécessaire.

#### 3.1. Vérification Entreprise

Si `company.isEmployed === true` ET `company.companyName` existe :

1. **Rechercher l'entreprise** dans la collection `companies` :
   - Utiliser `CompanyService.findByName(companyName)`
   - Vérifier si l'entreprise existe

2. **Si l'entreprise n'existe pas** :
   - Afficher un message à l'admin : "L'entreprise '{companyName}' n'existe pas. Voulez-vous la créer ?"
   - Boutons : "Créer" / "Ignorer"
   
   **Si admin choisit "Créer"** :
   - Créer l'entreprise via `CompanyService.findOrCreate()`
   - L'entreprise sera ajoutée dans la collection `companies`
   - Récupérer l'ID de l'entreprise créée
   
   **Si admin choisit "Ignorer"** :
   - Ne pas créer l'entreprise
   - Passer à l'étape suivante

3. **Si l'entreprise existe** :
   - Récupérer l'ID de l'entreprise existante
   - Passer à l'étape suivante

**Si `company.isEmployed === false` ou `company.companyName` est vide** :
- Aucune vérification/création nécessaire (membre au chômage)
- Passer directement à l'étape suivante

#### 3.2. Vérification Profession

Si `company.isEmployed === true` ET `company.profession` existe :

1. **Rechercher la profession** dans la collection `professions` :
   - Utiliser `ProfessionService.findByName(professionName)`
   - Vérifier si la profession existe

2. **Si la profession n'existe pas** :
   - Afficher un message à l'admin : "La profession '{professionName}' n'existe pas. Voulez-vous la créer ?"
   - Boutons : "Créer" / "Ignorer"
   
   **Si admin choisit "Créer"** :
   - Créer la profession via `ProfessionService.findOrCreate()`
   - La profession sera ajoutée dans la collection `professions`
   - Récupérer l'ID de la profession créée
   
   **Si admin choisit "Ignorer"** :
   - Ne pas créer la profession
   - Passer à l'étape suivante

3. **Si la profession existe** :
   - Récupérer l'ID de la profession existante
   - Passer à l'étape suivante

**Si `company.isEmployed === false` ou `company.profession` est vide** :
- Aucune vérification/création nécessaire (membre au chômage)
- Passer directement à l'étape suivante

### 4. Upload PDF (Obligatoire)

**Le PDF de la fiche d'adhésion est obligatoire.**

**Validation** :
- Le PDF doit être fourni avant de pouvoir approuver
- Si le PDF n'est pas fourni : Afficher erreur "PDF d'adhésion requis" et désactiver le bouton "Approuver"

**Processus** :
- Upload vers Firebase Storage (`membership-adhesion-pdfs/`)
- Nom de fichier : `{firstName}_{lastName}_{YYYY}-{YYYY}.pdf`
- Récupérer URL et métadonnées (path, size)

### 5. Appel API d'Approbation

**Endpoint** : `POST /api/membership/approve`

**Paramètres** :
```typescript
{
  requestId: string
  adminId: string
  membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant'
  companyId?: string | null  // ID de l'entreprise (si créée/sélectionnée)
  professionId?: string | null  // ID de la profession (si créée/sélectionnée)
  adhesionPdfURL: string  // URL du PDF uploadé (obligatoire)
}
```

### 6. Traitement API (Cloud Function ou API Route)

#### 6.1. Validation

- Vérifier que la demande existe
- Vérifier que la demande est payée
- Vérifier que la demande a le statut `'pending'`
- Vérifier les permissions admin

#### 6.2. Génération Email

- Format : `{firstName}{lastName}{4premiersChiffresMatricule}@kara.ga`
- Exemple : `jeandupont1234@kara.ga`

#### 6.3. Génération Mot de Passe

- Générer un mot de passe aléatoire sécurisé (12+ caractères)
- **IMPORTANT** : Ne pas stocker en Firestore
- Utiliser uniquement Firebase Auth pour la gestion

#### 6.4. Création Utilisateur Firebase Auth

```typescript
await adminAuth.createUser({
  uid: matricule,  // Utiliser le matricule comme UID
  email: generatedEmail,
  password: generatedPassword,  // Mot de passe aléatoire
  disabled: false
})
```

#### 6.5. Création Document Utilisateur (Firestore)

**Collection** : `users/{matricule}`

```typescript
{
  matricule: string,
  firstName: string,
  lastName: string,
  email: generatedEmail,  // Email généré automatiquement
  // ... autres champs depuis membershipRequest
  roles: [membershipType],
  membershipType: membershipType,
  isActive: true,
  companyId?: string,  // Si entreprise créée/sélectionnée
  professionId?: string,  // Si profession créée/sélectionnée
  dossier: requestId,  // Référence vers la demande
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

**⚠️ IMPORTANT** : Ne pas stocker le mot de passe dans ce document.

#### 6.6. Création Abonnement

**Collection** : `subscriptions/{subscriptionId}`

```typescript
{
  memberId: matricule,
  membershipType: membershipType,
  startDate: serverTimestamp(),
  endDate: serverTimestamp() + 1 an,  // Valide 1 an
  status: 'active',
  adhesionPdfURL?: string,  // Si PDF fourni
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

#### 6.7. Génération et Téléchargement du PDF des Identifiants

**Principe** : Les identifiants sont retournés dans la réponse API et utilisés immédiatement pour générer un PDF côté client.

**Réponse API** :
```typescript
{
  success: true,
  matricule: string,
  email: generatedEmail,
  password: generatedPassword,  // Retourné UNIQUEMENT dans la réponse (HTTPS)
  subscriptionId: string,
  companyId?: string,
  professionId?: string,
}
```

**Génération PDF côté client** :
- Utiliser `jsPDF` ou `react-pdf` pour générer le PDF
- Le PDF contient : logo KARA, informations du membre, identifiants, instructions
- Nom du fichier : `Identifiants_Connexion_{matricule}_{date}.pdf`
- Téléchargement automatique dans le navigateur

**⚠️ IMPORTANT** : Le mot de passe n'est **PAS** stocké en Firestore. Il est retourné uniquement dans la réponse API (HTTPS) et utilisé immédiatement pour générer le PDF, puis oublié.

#### 6.8. Mise à Jour Statut avec Traçabilité

**Collection** : `membership-requests/{requestId}`

```typescript
await requestRef.update({
  status: 'approved',
  approvedBy: adminId,  // ID de l'admin qui a approuvé (obligatoire pour traçabilité)
  approvedAt: serverTimestamp(),  // Date d'approbation (obligatoire pour traçabilité)
  updatedAt: serverTimestamp()
})
```

**Champs obligatoires lors de l'approbation** :
- `approvedBy` : ID de l'admin qui a approuvé la demande (récupéré depuis `request.auth.uid` dans la Cloud Function)
- `approvedAt` : Date et heure d'approbation (timestamp serveur)

**Traçabilité** :
- Ces champs permettent d'auditer les approbations (qui a approuvé et quand)
- Utile pour les rapports et la conformité
- Index recommandé sur `approvedBy` et `approvedAt` pour les requêtes de filtrage

### 7. Archivage Document PDF (Obligatoire)

Le PDF de la fiche d'adhésion est obligatoire et doit être archivé :
- Créer document dans `DocumentRepository`
- Type : `'ADHESION'`
- Format : `'pdf'`
- Libellé : `'Fiche d'adhésion - {matricule}'`
- Lien avec `memberId` = matricule

### 8. Création Notification

**Collection** : `notifications/{notificationId}`

```typescript
{
  type: 'membership_approved',
  entityId: requestId,
  memberId: matricule,
  title: 'Demande d\'adhésion approuvée',
  message: `La demande de ${firstName} ${lastName} a été approuvée. Matricule: ${matricule}`,
  metadata: {
    requestId: requestId,
    matricule: matricule,
    email: generatedEmail,
    hasCredentials: true,  // Indique que les identifiants sont disponibles
  },
  read: false,
  createdAt: serverTimestamp()
}
```

### 9. Génération et Téléchargement du PDF

**Après réception de la réponse API** :
- Générer un PDF contenant les identifiants (email + mot de passe)
- Télécharger automatiquement le PDF dans le navigateur
- Nom du fichier : `Identifiants_Connexion_{matricule}_{date}.pdf`

**Contenu du PDF** :
- Logo KARA Mutuelle
- Informations du membre (nom, prénom, matricule)
- Identifiants de connexion (email, mot de passe)
- Instructions de connexion
- Avertissement de sécurité

### 10. Affichage Résultat

**Toast de succès** :
- Matricule
- Email généré
- Message "PDF des identifiants téléchargé automatiquement"

**Utilisation du PDF par l'admin** :
- L'admin peut ouvrir le PDF pour vérifier les identifiants
- L'admin peut envoyer le PDF au membre par :
  - Email (joindre le PDF)
  - WhatsApp (envoyer le PDF)
  - SMS (envoyer un lien si stocké en ligne)
  - En personne (remettre le PDF directement)

---

## 🔒 Sécurité - Gestion des Mots de Passe

### Principe

**Ne jamais stocker les mots de passe en Firestore.**

### Solution Implémentée

1. **Firebase Auth** :
   - Création utilisateur avec mot de passe aléatoire
   - Firebase Auth gère le stockage sécurisé (hachage, etc.)

2. **Stockage Temporaire** :
   - Stocker temporairement dans `membership-requests.approvalCredentials`
   - Durée : 24 heures maximum
   - Nettoyage automatique après envoi ou expiration

3. **Envoi Identifiants** :
   - Modal dédié pour l'admin
   - Options : Email, SMS/WhatsApp, Copier
   - Après envoi : Marquer comme envoyé et nettoyer

4. **Alternative (Recommandée)** :
   - Cloud Function qui envoie directement par email
   - Pas de stockage temporaire nécessaire
   - Plus sécurisé

---

## 🔄 Système de Rollback

En cas d'erreur à n'importe quelle étape :

1. **Supprimer utilisateur Firebase Auth** (si créé)
2. **Supprimer document users** (si créé)
3. **Supprimer abonnement** (si créé)
4. **Supprimer PDF uploadé** (si uploadé)
5. **Nettoyer approvalCredentials** (si créé)
6. **Logger l'erreur** pour intervention manuelle

---

## 📊 Collections Firestore Utilisées

- `membership-requests` : Demande d'adhésion
- `users` : Utilisateurs membres
- `subscriptions` : Abonnements
- `companies` : Entreprises (si créée)
- `professions` : Professions (si créée)
- `documents` : Documents archivés (PDF adhésion)
- `notifications` : Notifications

---

## 🎯 Points d'Attention

1. **Transaction Atomique** : Utiliser Firestore batch pour garantir la cohérence
2. **Rollback** : Système de rollback en cas d'erreur
3. **Sécurité** : Ne jamais stocker le mot de passe en Firestore de manière permanente
4. **Nettoyage** : Nettoyer `approvalCredentials` après envoi ou expiration (24h)
5. **Validation** : Vérifier que la demande est payée avant approbation

---

## 📝 Prochaines Étapes

1. Créer le workflow d'implémentation détaillé
2. Implémenter la vérification entreprise/profession
3. Implémenter le stockage temporaire des identifiants
4. Créer le modal d'envoi identifiants
5. Implémenter le système de rollback
6. Créer les Cloud Functions nécessaires
