# Modal "Envoyer via WhatsApp" - Notification de Rejet

## 📋 Vue d'ensemble

Ce document détaille le modal de sélection du numéro WhatsApp et d'envoi du message de rejet au demandeur, similaire à celui de la fonctionnalité de corrections.

---

## 🎯 Contexte

**Quand s'ouvre ce modal :**
- Admin clique sur bouton "Envoyer WhatsApp" dans les actions disponibles sur une demande rejetée (`status = 'rejected'`)
- Bouton visible uniquement si la demande est rejetée

**Condition :**
- Au moins un numéro de téléphone disponible dans `request.identity.contacts`

**Objectif** :
- Permettre à l'admin d'informer manuellement le demandeur du rejet via WhatsApp
- Message template avec motif de rejet (modifiable)
- Sélection du numéro WhatsApp (si plusieurs numéros disponibles)

---

## 🎨 Design

### Si un seul numéro disponible

```
┌─────────────────────────────────────────────────────────────┐
│ ╔═════════════════════════════════════════════════════════╗ │
│ ║ 💬 Envoyer le motif de rejet via WhatsApp               ║ │
│ ╠═════════════════════════════════════════════════════════╣ │
│ ║                                                           ║ │
│ ║ Un message WhatsApp sera envoyé au demandeur avec le    ║ │
│ ║ motif de rejet de la demande d'adhésion.                ║ │
│ ║                                                           ║ │
│ ║ Numéro WhatsApp:                                         ║ │
│ ║ +241 65 67 17 34                                         ║ │
│ ║                                                           ║ │
│ ║ ┌─────────────────────────────────────────────────────┐ ║ │
│ ║ │ Message (modifiable) *                              │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Bonjour Jean Dupont,                               │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Votre demande d'adhésion KARA                      │ ║ │
│ ║ │ (matricule: MK-2024-001234) a été rejetée.         │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Motif de rejet:                                    │ ║ │
│ ║ │ Documents incomplets. Veuillez fournir             │ ║ │
│ ║ │ tous les documents requis.                         │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Pour toute question, veuillez contacter notre      │ ║ │
│ ║ │ service client.                                    │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Cordialement,                                      │ ║ │
│ ║ │ KARA Mutuelle                                       │ ║ │
│ ║ │                                                     │ ║ │
│ ║ └─────────────────────────────────────────────────────┘ ║ │
│ ║                                                           ║ │
│ ║ [Annuler]              [💬 Envoyer via WhatsApp]        ║ │
│ ║                                                           ║ │
│ ╚═════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────┘
```

**Comportement :**
- Affiche le numéro unique
- Message template prérempli avec le motif de rejet (modifiable)
- Bouton "Envoyer via WhatsApp" actif
- Au clic : Génère l'URL WhatsApp et ouvre dans un nouvel onglet

---

### Si plusieurs numéros disponibles

```
┌─────────────────────────────────────────────────────────────┐
│ ╔═════════════════════════════════════════════════════════╗ │
│ ║ 💬 Envoyer le motif de rejet via WhatsApp               ║ │
│ ╠═════════════════════════════════════════════════════════╣ │
│ ║                                                           ║ │
│ ║ Un message WhatsApp sera envoyé au demandeur avec le    ║ │
│ ║ motif de rejet de la demande d'adhésion.                ║ │
│ ║                                                           ║ │
│ ║ ┌─────────────────────────────────────────────────────┐ ║ │
│ ║ │ Sélectionner le numéro WhatsApp *                   │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ [Dropdown: +241 65 67 17 34 ▼]                     │ ║ │
│ ║ │   - +241 65 67 17 34 (par défaut)                  │ ║ │
│ ║ │   - +241 07 12 34 56                                │ ║ │
│ ║ │   - +241 06 78 90 12                                │ ║ │
│ ║ └─────────────────────────────────────────────────────┘ ║ │
│ ║                                                           ║ │
│ ║ ┌─────────────────────────────────────────────────────┐ ║ │
│ ║ │ Message (modifiable) *                              │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Bonjour Jean Dupont,                               │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Votre demande d'adhésion KARA                      │ ║ │
│ ║ │ (matricule: MK-2024-001234) a été rejetée.         │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Motif de rejet:                                    │ ║ │
│ ║ │ Documents incomplets. Veuillez fournir             │ ║ │
│ ║ │ tous les documents requis.                         │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Pour toute question, veuillez contacter notre      │ ║ │
│ ║ │ service client.                                    │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Cordialement,                                      │ ║ │
│ ║ │ KARA Mutuelle                                       │ ║ │
│ ║ │                                                     │ ║ │
│ ║ └─────────────────────────────────────────────────────┘ ║ │
│ ║                                                           ║ │
│ ║ [Annuler]              [💬 Envoyer via WhatsApp]        ║ │
│ ║                                                           ║ │
│ ╚═════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────┘
```

**Comportement :**
- Affiche un Select/Dropdown avec tous les numéros
- Par défaut : Premier numéro sélectionné (index 0)
- Admin peut changer de numéro
- Message template prérempli avec le motif de rejet (modifiable)
- Bouton "Envoyer via WhatsApp" actif après sélection

---

## 🎯 Spécifications

### Composant : `RejectWhatsAppModalV2`

**Props :**
```typescript
interface RejectWhatsAppModalV2Props {
  isOpen: boolean
  onClose: () => void
  phoneNumbers: string[]              // Liste des numéros disponibles
  memberName: string                  // Nom complet du demandeur
  firstName: string                   // Prénom du demandeur
  matricule: string                   // Matricule de la demande
  motifReject: string                 // Motif de rejet (prérempli dans le template)
  requestId: string                   // ID de la demande
}
```

**État interne :**
```typescript
const [selectedPhoneNumber, setSelectedPhoneNumber] = useState(phoneNumbers[0] || '')
const [message, setMessage] = useState(generateTemplateMessage()) // Template initial
```

**Template de message initial :**
```typescript
const generateTemplateMessage = () => {
  return `Bonjour ${firstName},

Votre demande d'adhésion KARA (matricule: ${matricule}) a été rejetée.

Motif de rejet:
${motifReject}

Pour toute question, veuillez contacter notre service client.

Cordialement,
KARA Mutuelle`
}
```

---

## 🔄 Flux d'Utilisation

### 1. Ouverture du Modal

**Déclencheur** : Admin clique sur bouton "Envoyer WhatsApp" dans les actions disponibles

**Conditions** :
- `status === 'rejected'`
- Au moins un numéro de téléphone disponible (`identity.contacts.length > 0`)

**Action** : Ouvrir `RejectWhatsAppModalV2`

### 2. Sélection du Numéro

**Si plusieurs numéros** :
- Afficher Select/Dropdown avec tous les numéros
- Par défaut : Premier numéro sélectionné
- Admin peut changer de numéro

**Si un seul numéro** :
- Afficher le numéro directement (en lecture seule)
- Pas de Select

### 3. Message Template

**Affichage** : Textarea avec message template prérempli

**Contenu initial** :
```
Bonjour {firstName},

Votre demande d'adhésion KARA (matricule: {matricule}) a été rejetée.

Motif de rejet:
{motifReject}

Pour toute question, veuillez contacter notre service client.

Cordialement,
KARA Mutuelle
```

**Caractéristiques** :
- Message **modifiable** par l'admin
- Textarea avec 8-10 lignes visibles
- Scroll si message plus long
- Compteur de caractères optionnel

### 4. Envoi via WhatsApp

**Action** : Clic sur bouton "Envoyer via WhatsApp"

**Génération de l'URL WhatsApp :**
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

**Comportement** :
- Ouvrir WhatsApp Web dans un nouvel onglet
- URL préremplie avec numéro et message
- Admin peut envoyer ou modifier le message dans WhatsApp

**Feedback** :
- Toast de confirmation : "WhatsApp ouvert avec le message de rejet"
- Fermeture du modal après ouverture WhatsApp

---

## 🎨 Éléments UI

### Bouton "Envoyer via WhatsApp" (dans les actions)

**Emplacement** : Dans les actions disponibles sur demande rejetée

**Visibilité** :
- Visible si `status === 'rejected'`
- Visible uniquement si au moins un numéro de téléphone disponible

**Style** :
- Icône : `MessageCircle` (lucide-react) en vert
- Variant : `outline` ou `ghost`
- Couleur : Vert (WhatsApp)
- Label : "Envoyer WhatsApp" ou icône seule en mobile

**Tooltip** : "Envoyer le motif de rejet via WhatsApp"

### Modal

**Titre** : "💬 Envoyer le motif de rejet via WhatsApp"

**Champs** :
1. **Select Numéro** (si plusieurs numéros) :
   - Label : "Sélectionner le numéro WhatsApp *"
   - Format : `+241 XX XX XX XX`
   - Par défaut : Premier numéro

2. **Textarea Message** :
   - Label : "Message (modifiable) *"
   - Rows : 8-10
   - Placeholder : Template de message
   - Modifiable : Oui

**Boutons** :
- **Annuler** : Ferme le modal sans action
- **Envoyer via WhatsApp** : Génère URL et ouvre WhatsApp
  - Icône : `MessageCircle` en vert
  - Style : Bouton principal (vert)

---

## 📋 Checklist Implémentation

- [ ] Créer composant `RejectWhatsAppModalV2`
- [ ] Gérer cas 1 numéro vs plusieurs numéros
- [ ] Implémenter Select pour choix du numéro
- [ ] Générer message template avec motif de rejet
- [ ] Rendre le message modifiable (textarea)
- [ ] Générer URL WhatsApp et ouvrir dans nouvel onglet
- [ ] Toast de confirmation
- [ ] Ajouter bouton "Envoyer WhatsApp" dans actions disponible sur demande rejetée
- [ ] Responsive (desktop + mobile)
- [ ] Gestion d'erreur si aucun numéro disponible

---

## 🔒 Validation

### Avant Envoi

- **Numéro sélectionné** : Obligatoire (au moins un numéro doit être sélectionné)
- **Message** : Non vide (minimum quelques caractères)
- **Format numéro** : Doit être un numéro valide (peut être nettoyé automatiquement)

---

## 📱 Exemple de Message WhatsApp

**Message final (modifiable)** :
```
Bonjour Jean,

Votre demande d'adhésion KARA (matricule: MK-2024-001234) a été rejetée.

Motif de rejet:
Documents incomplets. Veuillez fournir tous les documents requis (carte d'identité recto/verso, photo d'identité).

Pour toute question, veuillez contacter notre service client.

Cordialement,
KARA Mutuelle
```

---

## 🔄 Comparaison avec Modal Corrections

**Similarités** :
- Même structure de modal
- Sélection du numéro (si plusieurs)
- Génération URL WhatsApp
- Ouverture dans nouvel onglet

**Différences** :
- **Corrections** : Message avec lien de correction + code de sécurité
- **Rejet** : Message avec motif de rejet uniquement (pas de lien ni code)

---

## 📚 Références

- **Modal Corrections** : `../corrections/wireframes/MODAL_WHATSAPP.md` (référence pour la structure)
- **Composant Corrections** : `src/components/memberships/.../SendWhatsAppModalV2.tsx` (si existe)
- **Actions Post-Rejet** : `../ACTIONS_POST_REJET.md`
- **Flux de rejet** : `../FLUX_REJET.md`

---

**Note** : Ce modal est similaire à celui des corrections, mais adapté pour l'envoi du motif de rejet.
