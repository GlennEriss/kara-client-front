# Gestion des Identifiants de Connexion - Solution

> Solution pour stocker et envoyer temporairement les identifiants de connexion (email/mot de passe) après approbation

---

## 🎯 Problème

Après l'approbation d'une demande d'adhésion :
1. Un compte Firebase Auth est créé avec un email généré et un mot de passe aléatoire
2. L'admin doit pouvoir envoyer ces identifiants au nouveau membre
3. **Contrainte** : Ne pas stocker le mot de passe en Firestore de manière permanente (sécurité)

---

## ✅ Solution Proposée

### Option 1 : Stockage Temporaire + Modal d'Envoi (Recommandée)

#### 1.1. Stockage Temporaire

**Collection** : `membership-requests/{requestId}`

Ajouter un champ temporaire lors de l'approbation :

```typescript
{
  // ... champs existants
  approvalCredentials: {
    email: string,  // Email généré
    temporaryPassword: string,  // Mot de passe aléatoire (12+ caractères)
    expiresAt: Timestamp,  // Expiration : 24 heures après création
    sentAt: Timestamp | null,  // Timestamp quand les identifiants sont envoyés
    sentVia: 'email' | 'sms' | 'whatsapp' | 'manual' | null,  // Méthode d'envoi
  }
}
```

**Durée de vie** : 24 heures maximum
**Nettoyage** : Supprimer `approvalCredentials` après envoi ou expiration

#### 1.2. Cloud Function de Nettoyage

**Fonction** : `cleanExpiredApprovalCredentials`

```typescript
// Fonction planifiée qui s'exécute toutes les heures
export const cleanExpiredApprovalCredentials = onSchedule(
  {
    schedule: '0 * * * *', // Toutes les heures
    timeZone: 'Africa/Libreville',
  },
  async () => {
    const db = admin.firestore()
    const now = admin.firestore.Timestamp.now()
    
    // Récupérer toutes les demandes avec approvalCredentials expirés
    const snapshot = await db.collection('membership-requests')
      .where('approvalCredentials.expiresAt', '<=', now)
      .get()
    
    const batch = db.batch()
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        approvalCredentials: admin.firestore.FieldValue.delete()
      })
    })
    
    await batch.commit()
    console.log(`✅ ${snapshot.size} approvalCredentials nettoyés`)
  }
)
```

#### 1.3. Modal d'Envoi Identifiants

**Composant** : `SendCredentialsModal.tsx`

**Fonctionnalités** :
- Afficher email et mot de passe (masqué avec toggle)
- Bouton "Copier" pour copier les identifiants
- Options d'envoi :
  - **Email** : Si `membershipRequest.identity.email` existe
  - **SMS/WhatsApp** : Si `membershipRequest.identity.contacts` existe
  - **Copier dans presse-papier** : Toujours disponible
- Après envoi : Marquer `sentAt` et `sentVia`, puis nettoyer `approvalCredentials`

**Exemple de message** :
```
Bonjour {firstName},

Votre demande d'adhésion a été approuvée ! Vous êtes maintenant membre de KARA Association.

Vos identifiants de connexion :
- Email : {email}
- Mot de passe : {temporaryPassword}

Vous pouvez vous connecter sur : https://kara.ga/login

⚠️ Pour des raisons de sécurité, veuillez changer votre mot de passe après votre première connexion.

Cordialement,
KARA Association
```

#### 1.4. API d'Envoi

**Endpoint** : `POST /api/membership/send-credentials`

**Paramètres** :
```typescript
{
  requestId: string
  method: 'email' | 'sms' | 'whatsapp' | 'manual'
}
```

**Actions** :
1. Récupérer `approvalCredentials` depuis `membership-requests/{requestId}`
2. Vérifier que `expiresAt` n'est pas dépassé
3. Envoyer selon la méthode choisie
4. Mettre à jour `sentAt` et `sentVia`
5. Nettoyer `approvalCredentials` après envoi réussi

---

### Option 2 : Cloud Function d'Envoi Automatique (Alternative)

#### 2.1. Fonction Déclenchée par Approbation

**Fonction** : `sendApprovalCredentials`

```typescript
export const sendApprovalCredentials = onDocumentUpdated(
  {
    document: 'membership-requests/{requestId}',
  },
  async (event) => {
    const beforeData = event.data.before.data()
    const afterData = event.data.after.data()
    
    // Vérifier si le statut est passé à 'approved'
    if (beforeData.status !== 'approved' && afterData.status === 'approved') {
      const email = afterData.approvalCredentials?.email
      const password = afterData.approvalCredentials?.temporaryPassword
      const memberEmail = afterData.identity?.email
      const memberPhone = afterData.identity?.contacts?.[0]
      
      if (email && password) {
        // Envoyer par email si disponible
        if (memberEmail) {
          await sendEmail(memberEmail, email, password)
        }
        
        // Envoyer par SMS si disponible
        if (memberPhone) {
          await sendSMS(memberPhone, email, password)
        }
        
        // Marquer comme envoyé
        await event.data.after.ref.update({
          'approvalCredentials.sentAt': admin.firestore.FieldValue.serverTimestamp(),
          'approvalCredentials.sentVia': memberEmail ? 'email' : 'sms',
        })
        
        // Nettoyer après envoi
        await event.data.after.ref.update({
          approvalCredentials: admin.firestore.FieldValue.delete()
        })
      }
    }
  }
)
```

**Avantages** :
- Envoi automatique après approbation
- Pas besoin de modal d'envoi
- Plus sécurisé (pas de stockage temporaire visible)

**Inconvénients** :
- Moins de contrôle pour l'admin
- Dépend de la disponibilité de l'email/SMS du membre

---

## 🔒 Sécurité

### Bonnes Pratiques

1. **Mot de passe fort** :
   - Minimum 12 caractères
   - Mélange de lettres, chiffres, caractères spéciaux
   - Génération aléatoire sécurisée

2. **Durée de vie limitée** :
   - `approvalCredentials` expire après 24 heures
   - Nettoyage automatique par Cloud Function

3. **Pas de stockage permanent** :
   - Ne jamais stocker le mot de passe dans `users`
   - Firebase Auth gère le stockage sécurisé

4. **Envoi sécurisé** :
   - Email : Utiliser un service d'email sécurisé (SendGrid, etc.)
   - SMS : Utiliser un service SMS sécurisé (Twilio, etc.)
   - WhatsApp : Utiliser l'API WhatsApp Business

5. **Logging** :
   - Logger tous les accès à `approvalCredentials`
   - Logger tous les envois d'identifiants

---

## 📊 Structure de Données

### `membership-requests/{requestId}`

```typescript
{
  // ... champs existants
  status: 'approved',
  approvalCredentials?: {
    email: string,
    temporaryPassword: string,
    expiresAt: Timestamp,  // now + 24h
    sentAt: Timestamp | null,
    sentVia: 'email' | 'sms' | 'whatsapp' | 'manual' | null,
  }
}
```

### `users/{matricule}`

```typescript
{
  matricule: string,
  email: string,  // Email généré (pas le mot de passe)
  // ... autres champs
  // ⚠️ PAS de champ password
}
```

---

## 🎯 Recommandation

**Option 1 (Stockage Temporaire + Modal)** est recommandée car :
- ✅ Contrôle total pour l'admin
- ✅ Possibilité de réenvoyer si nécessaire
- ✅ Support de plusieurs méthodes d'envoi
- ✅ Nettoyage automatique après expiration
- ✅ Sécurisé (durée limitée, pas de stockage permanent)

**Option 2 (Envoi Automatique)** peut être ajoutée en complément pour :
- Envoi automatique immédiat après approbation
- Fallback si l'admin oublie d'envoyer

---

## 📝 Implémentation

### Étapes

1. **Modifier l'API d'approbation** :
   - Générer mot de passe aléatoire sécurisé
   - Stocker temporairement dans `approvalCredentials`
   - Ne pas retourner le mot de passe dans la réponse

2. **Créer le modal d'envoi** :
   - `SendCredentialsModal.tsx`
   - Afficher email/mot de passe
   - Options d'envoi (email, SMS, WhatsApp, copier)

3. **Créer l'API d'envoi** :
   - `POST /api/membership/send-credentials`
   - Gérer l'envoi par email/SMS/WhatsApp
   - Mettre à jour `sentAt` et `sentVia`
   - Nettoyer `approvalCredentials` après envoi

4. **Créer la Cloud Function de nettoyage** :
   - `cleanExpiredApprovalCredentials`
   - Fonction planifiée (toutes les heures)
   - Nettoyer les `approvalCredentials` expirés

5. **Intégrer dans le flux d'approbation** :
   - Afficher le modal d'envoi après approbation réussie
   - Permettre l'envoi depuis la notification d'approbation

---

## 🔄 Flux Complet

1. Admin approuve la demande
2. API crée utilisateur Firebase Auth (email + mot de passe aléatoire)
3. API stocke temporairement dans `approvalCredentials` (24h)
4. Toast de succès avec bouton "Envoyer identifiants"
5. Admin ouvre le modal d'envoi
6. Admin choisit la méthode d'envoi (email/SMS/WhatsApp/copier)
7. API envoie les identifiants
8. API marque `sentAt` et `sentVia`
9. API nettoie `approvalCredentials`
10. Cloud Function nettoie les `approvalCredentials` expirés (toutes les heures)

---

## 📚 Références

- **Firebase Auth** : https://firebase.google.com/docs/auth
- **Firestore Security** : https://firebase.google.com/docs/firestore/security
- **Cloud Functions** : https://firebase.google.com/docs/functions
