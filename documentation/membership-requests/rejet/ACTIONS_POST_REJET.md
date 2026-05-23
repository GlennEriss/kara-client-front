# Actions Post-Rejet - Documentation

> Documentation des actions disponibles après le rejet d'une demande d'adhésion

---

## 📋 Vue d'ensemble

Une fois qu'une demande d'adhésion est rejetée (`status = 'rejected'`), plusieurs actions sont disponibles pour les administrateurs :

1. **Réouvrir** : Remettre le dossier à l'état "En attente"
2. **Voir détails** : Consulter toutes les informations du dossier
3. **Envoyer WhatsApp** : Envoyer le motif de rejet au demandeur via WhatsApp (manuel)
4. **Supprimer** : Supprimer définitivement le dossier (irréversible)
5. **Dropdown actions** : Accéder aux documents (Fiche d'adhésion, Pièce d'identité)

---

## 🔄 1. Réouverture du Dossier

### Objectif

Permettre à un administrateur de réouvrir un dossier rejeté pour le remettre en examen, notamment si :
- Une nouvelle information est disponible
- Une erreur dans le rejet initial a été identifiée
- Le dossier nécessite un réexamen

### Flux

#### 1.1. Déclencheur

**Bouton** : "Réouvrir" (visible uniquement si `status = 'rejected'`)

**Icône** : `RotateCcw` (lucide-react)

**Action** : Ouvre le modal `ReopenModalV2`

#### 1.2. Modal de Réouverture (`ReopenModalV2`)

**Titre** : "Réouvrir la demande d'adhésion"

**Description** : "Vous êtes sur le point de réouvrir cette demande qui a été rejetée. Veuillez indiquer le motif de réouverture."

**Informations affichées** :
- Nom et prénom du demandeur
- Matricule
- Motif de rejet initial

**Champ obligatoire** :
- **Motif de réouverture** (textarea)
  - Obligatoire
  - Minimum : 10 caractères
  - Maximum : 500 caractères
  - Placeholder : "Indiquez le motif de réouverture de cette demande..."

**Validation côté client** :
- Champ non vide
- Longueur >= 10 caractères
- Longueur <= 500 caractères
- Affichage d'un compteur : `{length} / 500 caractères`
- Message d'erreur si < 10 caractères : "Minimum 10 caractères requis"
- Bouton "Réouvrir" désactivé si validation échoue

**Boutons** :
- **"Annuler"** : Ferme le modal sans action
- **"Réouvrir"** : Confirme la réouverture (désactivé si validation échoue)

**État de chargement** :
- Pendant le traitement : Bouton affiche "Réouverture..." avec spinner
- Le modal ne peut pas être fermé pendant le chargement

#### 1.3. Appel du Service

**Méthode** : `MembershipServiceV2.reopenMembershipRequest(params)`

**Paramètres** :
```typescript
{
  requestId: string        // ID de la demande d'adhésion
  adminId: string          // ID de l'admin qui réouvre
  reason: string           // Motif de réouverture (10-500 caractères)
}
```

#### 1.4. Validations Service

**Étape 1 : Vérification du statut**
```typescript
const request = await this.repository.getById(requestId)
if (!request) {
  throw new Error(`Demande d'adhésion ${requestId} introuvable`)
}

if (request.status !== 'rejected') {
  throw new Error('Seules les demandes rejetées peuvent être réouvertes')
}
```

**Étape 2 : Validation du motif**
```typescript
if (!reason || reason.trim().length === 0) {
  throw new Error('Un motif de réouverture est requis')
}

const minLength = 10
if (reason.trim().length < minLength) {
  throw new Error(`Le motif de réouverture doit contenir au moins ${minLength} caractères`)
}

const maxLength = 500
if (reason.length > maxLength) {
  throw new Error(`Le motif de réouverture ne peut pas dépasser ${maxLength} caractères`)
}
```

#### 1.5. Mise à Jour Firestore

**Collection** : `membership-requests/{requestId}`

**Données mises à jour** :
```typescript
{
  status: 'under_review',              // Nouveau statut
  reopenedBy: adminId,                  // ID de l'admin qui a réouvert
  reopenedAt: new Date(),               // Date de réouverture
  reopenReason: reason.trim(),          // Motif de réouverture (obligatoire)
  updatedAt: serverTimestamp(),        // Date de mise à jour
  // Conserver le motif de rejet initial (ne pas le supprimer)
  motifReject: request.motifReject,    // Conservé pour historique
}
```

**Champs de traçabilité** :
- `reopenedBy` : ID de l'admin qui a réouvert (obligatoire pour audit)
- `reopenedAt` : Date et heure de la réouverture (obligatoire pour audit)
- `reopenReason` : Motif de la réouverture (obligatoire, 10-500 caractères)

#### 1.6. Invalidation du Cache

**Queries invalidées** :
```typescript
queryClient.invalidateQueries({ 
  queryKey: ['membershipRequests'] 
})

queryClient.invalidateQueries({ 
  queryKey: ['membershipRequest', requestId] 
})

queryClient.invalidateQueries({ 
  queryKey: ['notifications'] 
})
```

#### 1.7. Affichage du Résultat

**Toast de succès** :
- Type : `success`
- Titre : "Dossier réouvert avec succès"
- Description : `Le dossier de ${firstName} ${lastName} a été réouvert.`
- Durée : 4000ms

**Actions post-réouverture** :
- Fermeture automatique du modal
- Mise à jour de l'interface (statut, badge, etc.)
- Le dossier est maintenant accessible avec les actions "En cours d'examen"

---

## 🗑️ 2. Suppression du Dossier

### Objectif

Permettre à un administrateur de supprimer définitivement un dossier rejeté, notamment si :
- Le dossier est dupliqué
- Le dossier n'est plus nécessaire
- Une suppression administrative est requise

**⚠️ IMPORTANT** : La suppression est **définitive et irréversible**.

### Flux

#### 2.1. Déclencheur

**Bouton** : "Supprimer" (visible uniquement si `status = 'rejected'`)

**Icône** : `Trash2` (lucide-react)

**Action** : Ouvre le modal `DeleteModalV2`

#### 2.2. Modal de Suppression (`DeleteModalV2`)

**Titre** : "Supprimer définitivement le dossier"

**Description** : "⚠️ La suppression sera définitive et non réversible. Cette action ne peut pas être annulée."

**Avertissement** :
- Affichage d'un alert rouge avec icône `AlertTriangle`
- Message : "La suppression de ce dossier est définitive. Toutes les données associées seront supprimées de manière irréversible."

**Informations affichées** :
- Nom et prénom du demandeur
- Matricule : `{matricule}` (affiché en évidence)

**Confirmation obligatoire** :
- **Champ de saisie** : "Saisissez le matricule pour confirmer"
  - Obligatoire
  - Placeholder : "Ex: MK-2024-001234"
  - Format texte
  - Validation : Le matricule saisi doit correspondre exactement au matricule du dossier

**Validation côté client** :
- Champ non vide
- Matricule saisi = matricule du dossier
- Message d'erreur si non correspondant : "Le matricule saisi ne correspond pas au matricule du dossier"
- Bouton "Supprimer" désactivé si validation échoue

**Boutons** :
- **"Annuler"** : Ferme le modal sans action
- **"Supprimer définitivement"** : Confirme la suppression (désactivé si validation échoue)
  - Style : Variant `destructive` (rouge)
  - Icône : `Trash2`

**État de chargement** :
- Pendant le traitement : Bouton affiche "Suppression..." avec spinner
- Le modal ne peut pas être fermé pendant le chargement

#### 2.3. Appel du Service

**⚠️ IMPORTANT** : La suppression passe par une Cloud Function (obligatoire pour Storage)

**Appel** : Cloud Function `deleteMembershipRequest` via `httpsCallable`

**Paramètres** :
```typescript
{
  requestId: string                // ID de la demande d'adhésion
  confirmedMatricule: string       // Matricule saisi pour confirmation
}
```

#### 2.4. Appel Cloud Function

**⚠️ IMPORTANT** : La suppression DOIT passer par une Cloud Function car :
- La suppression Storage nécessite des privilèges admin (impossible côté client)
- Garantie d'atomicité entre Firestore et Storage
- Logging d'audit côté serveur

**Méthode** : Appel de la Cloud Function `deleteMembershipRequest` via `httpsCallable`

**Paramètres** :
```typescript
{
  requestId: string                // ID de la demande d'adhésion
  confirmedMatricule: string       // Matricule saisi pour confirmation
}
```

**Appel** :
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions'

const functions = getFunctions()
const deleteMembershipRequest = httpsCallable(functions, 'deleteMembershipRequest')

const result = await deleteMembershipRequest({
  requestId,
  confirmedMatricule
})
```

#### 2.5. Validations Cloud Function

**La Cloud Function valide** :
- **Étape 1** : Permissions admin (l'utilisateur doit être admin)
- **Étape 2** : Existence de la demande
- **Étape 3** : Vérification du statut (`status === 'rejected'`)
- **Étape 4** : Vérification du matricule (`confirmedMatricule === request.matricule`)

#### 2.6. Suppression par Cloud Function

**La Cloud Function effectue** :

1. **Création du log d'audit** (avant suppression) :
```typescript
await db.collection('audit-logs').add({
  action: 'membership_request_deleted',
  requestId,
  matricule: request.matricule,
  memberName: `${request.identity.firstName} ${request.identity.lastName}`,
  deletedBy: adminId,
  deletedAt: serverTimestamp(),
  reason: 'Suppression définitive d\'une demande rejetée',
  metadata: {
    status: request.status,
    motifReject: request.motifReject,
    processedAt: request.processedAt,
    processedBy: request.processedBy,
  }
})
```

2. **Suppression des documents Storage** (photos, pièces d'identité) :
```typescript
// Supprimer la photo si elle existe
if (request.identity.photo) {
  await storage.bucket().file(request.identity.photo).delete()
}

// Supprimer les pièces d'identité si elles existent
if (request.documents.documentPhotoFront) {
  await storage.bucket().file(request.documents.documentPhotoFront).delete()
}

if (request.documents.documentPhotoBack) {
  await storage.bucket().file(request.documents.documentPhotoBack).delete()
}
```

3. **Suppression du document Firestore** :
```typescript
await db.collection('membership-requests').doc(requestId).delete()
```

**Réponse de la Cloud Function** :
```typescript
{
  success: true,
  requestId: string,
  filesDeleted: number,      // Nombre de fichiers Storage supprimés
  deletedAt: string          // Date de suppression (ISO string)
}
```

**Note** : Voir `functions/deleteMembershipRequest.md` pour les détails complets de la Cloud Function

#### 2.7. Invalidation du Cache

**Queries invalidées** :
```typescript
queryClient.invalidateQueries({ 
  queryKey: ['membershipRequests'] 
})

queryClient.invalidateQueries({ 
  queryKey: ['membershipRequest', requestId] 
})

queryClient.invalidateQueries({ 
  queryKey: ['notifications'] 
})
```

#### 2.8. Affichage du Résultat

**Toast de succès** :
- Type : `success` (ou `error` selon le design)
- Titre : "Dossier supprimé avec succès"
- Description : `Le dossier de ${firstName} ${lastName} a été supprimé définitivement.`
- Durée : 4000ms

**Actions post-suppression** :
- Fermeture automatique du modal
- Retrait du dossier de la liste
- Mise à jour des statistiques

---

## 👁️ 3. Voir Détails

### Objectif

Consulter toutes les informations détaillées d'un dossier rejeté.

### Flux

#### 3.1. Déclencheur

**Bouton** : "Voir détails" (toujours visible)

**Icône** : `Eye` (lucide-react)

**Action** : Ouvre le modal `MemberDetailsModal`

#### 3.2. Modal de Détails (`MemberDetailsModal`)

**Informations affichées** :
- **Identité** : Nom, prénom, date de naissance, nationalité, email, contacts
- **Adresse** : Adresse complète
- **Entreprise** : Si applicable
- **Profession** : Si applicable
- **Documents** : Photos, pièces d'identité
- **Statut** : `'rejected'` avec badge rouge
- **Motif de rejet** : Affiché en évidence
- **Historique** :
  - Date de rejet
  - Admin qui a rejeté
  - Date de réouverture (si réouvert)
  - Admin qui a réouvert (si réouvert)
  - Motif de réouverture (si réouvert)

**Actions disponibles dans le modal** :
- Réouvrir (si statut = 'rejected')
- Envoyer WhatsApp (si statut = 'rejected')
- Supprimer (si statut = 'rejected')
- Fermer

---

## 💬 4. Envoi WhatsApp du Motif de Rejet

### Objectif

Permettre à un administrateur d'informer manuellement le demandeur du rejet de sa demande via WhatsApp, avec le motif de rejet.

### Flux

#### 4.1. Déclencheur

**Bouton** : "Envoyer WhatsApp" (visible uniquement si `status = 'rejected'`)

**Icône** : `MessageCircle` (lucide-react)

**Action** : Ouvre le modal `RejectWhatsAppModalV2`

**Condition** : Au moins un numéro de téléphone disponible dans `request.identity.contacts`

#### 4.2. Modal WhatsApp (`RejectWhatsAppModalV2`)

**Titre** : "💬 Envoyer le motif de rejet via WhatsApp"

**Description** : "Un message WhatsApp sera envoyé au demandeur avec le motif de rejet de la demande d'adhésion."

**Champs** :

1. **Sélection du numéro WhatsApp** (si plusieurs numéros) :
   - Select/Dropdown avec tous les numéros disponibles
   - Label : "Sélectionner le numéro WhatsApp *"
   - Par défaut : Premier numéro sélectionné (index 0)
   - Admin peut changer de numéro

2. **Message (modifiable)** :
   - Textarea avec message template prérempli
   - Label : "Message (modifiable) *"
   - Rows : 8-10 lignes
   - **Message template prérempli** :
     ```
     Bonjour {firstName},

     Votre demande d'adhésion KARA (matricule: {matricule}) a été rejetée.

     Motif de rejet:
     {motifReject}

     Pour toute question, veuillez contacter notre service client.

     Cordialement,
     KARA Association
     ```
   - **Modifiable** : L'admin peut modifier le message avant envoi

**Boutons** :
- **"Annuler"** : Ferme le modal sans action
- **"Envoyer via WhatsApp"** : Génère l'URL WhatsApp et ouvre dans un nouvel onglet

#### 4.3. Génération URL WhatsApp

**Format** :
```typescript
const generateWhatsAppUrl = (phoneNumber: string, message: string): string => {
  // Nettoyer le numéro (supprimer espaces, tirets, etc.)
  const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '')
  
  // Encoder le message pour URL
  const encodedMessage = encodeURIComponent(message)
  
  // Générer l'URL WhatsApp Web
  return `https://wa.me/${cleanedPhone}?text=${encodedMessage}`
}
```

**Action** : Ouvrir WhatsApp Web dans un nouvel onglet avec le message prérempli

#### 4.4. Affichage Résultat

**Toast de confirmation** :
- Type : `success`
- Titre : "WhatsApp ouvert"
- Description : "Le message a été préparé dans WhatsApp"
- Durée : 3000ms

**Actions post-envoi** :
- Fermeture automatique du modal
- WhatsApp Web ouvert dans nouvel onglet avec message prérempli

---

## 📄 5. Dropdown Actions

### 5.1. Fiche d'adhésion

**Option** : "Fiche d'adhésion" (dans le dropdown)

**Action** :
- Si PDF d'adhésion existe (`adhesionPdfURL`) : Ouvrir/visualiser le PDF dans un nouvel onglet
- Si PDF n'existe pas : Afficher toast "Aucune fiche d'adhésion disponible"

**Note** : La fiche d'adhésion n'existe que si la demande a été approuvée. Pour une demande rejetée, cette option peut ne pas être disponible ou afficher un message d'information.

### 5.2. Pièce d'identité

**Option** : "Pièce d'identité" (dans le dropdown)

**Action** :
- Si pièces d'identité existent :
  - Ouvrir modal avec visualisation des photos
  - Afficher recto et verso (si disponibles)
  - Possibilité de zoom
- Si pièces d'identité n'existent pas : Afficher toast "Aucune pièce d'identité disponible"

---

## 🔒 Sécurité

### Permissions

- **Seuls les admins** peuvent :
  - Réouvrir un dossier rejeté
  - Supprimer un dossier rejeté
  - Accéder aux détails et documents

### Traçabilité

- **Réouverture** :
  - Enregistrement obligatoire de :
    - Qui a réouvert (`reopenedBy`)
    - Quand (`reopenedAt`)
    - Pourquoi (`reopenReason`)
  
- **Suppression** :
  - Validation par matricule (double confirmation)
  - Logging de l'action pour audit (si système de logs disponible)

### Validation des Données

- **Côté client** : Validation en temps réel dans les modals
- **Côté serveur** : Validation stricte dans le service
- **Double validation** : Empêche les actions non autorisées

---

## 📊 Collections Firestore Utilisées

- `membership-requests` : Demande d'adhésion (mise à jour pour réouverture, suppression pour suppression)

---

## 🎯 Points d'Attention

1. **Suppression définitive** :
   - ⚠️ La suppression est irréversible
   - Validation par matricule obligatoire
   - Avertissement clair affiché

2. **Réouverture** :
   - Le motif de réouverture est obligatoire
   - Le motif de rejet initial est conservé (pour historique)
   - Le statut passe à `'under_review'` (pas directement à `'pending'`)

3. **Documents** :
   - Les documents uploadés peuvent être conservés même après suppression (selon règles métier)
   - Ou supprimés définitivement pour libérer l'espace storage

---

## 📝 Prochaines Étapes

1. ⏳ Implémenter `ReopenModalV2`
2. ⏳ Implémenter `DeleteModalV2`
3. ⏳ Implémenter `MembershipServiceV2.reopenMembershipRequest()`
4. ⏳ Implémenter Cloud Function `deleteMembershipRequest` (obligatoire)
5. ⏳ Créer wrapper client pour appeler Cloud Function `deleteMembershipRequest`
5. ⏳ Ajouter les tests unitaires
6. ⏳ Ajouter les tests d'intégration
7. ⏳ Ajouter les tests E2E

---

## 📖 Références

- **Diagramme d'activité** : `activite/Rejeter.puml`
- **Flux de rejet** : `FLUX_REJET.md`
- **Code modal réouverture (Caisse Spéciale)** : `src/components/caisse-speciale/ReopenDemandModal.tsx` (référence)
- **Types** : `src/types/types.ts` (MembershipRequest)
