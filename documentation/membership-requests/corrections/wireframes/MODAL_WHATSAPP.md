# Modal "Envoyer via WhatsApp" - Action Post-Création

## 📋 Vue d'ensemble

Ce document détaille le modal de sélection du numéro WhatsApp qui s'ouvre **après** la création de la demande de correction, via l'action "Envoyer via WhatsApp" du dropdown.

---

## 🎯 Contexte

**Quand s'ouvre ce modal :**
- Admin clique sur "Envoyer via WhatsApp" dans le dropdown "⋮" (si `status === 'under_review'`)
- OU Admin clique sur "Envoyer WhatsApp" dans le bloc "Corrections demandées"

**Condition :**
- Au moins un numéro de téléphone disponible dans `request.identity.contacts`

---

## 🎨 Design

### Si un seul numéro disponible

```
┌─────────────────────────────────────────────────────────────┐
│ ╔═════════════════════════════════════════════════════════╗ │
│ ║ Envoyer via WhatsApp                                     ║ │
│ ╠═════════════════════════════════════════════════════════╣ │
│ ║                                                           ║ │
│ ║ Un message WhatsApp sera envoyé au demandeur avec :     ║ │
│ ║                                                           ║ │
│ ║ • Le lien de correction                                  ║ │
│ ║ • Le code de sécurité                                   ║ │
│ ║ • La date d'expiration                                  ║ │
│ ║                                                           ║ │
│ ║ Numéro: +241 65 67 17 34                                ║ │
│ ║                                                           ║ │
│ ║ [Annuler]              [💬 Envoyer via WhatsApp]        ║ │
│ ║                                                           ║ │
│ ╚═════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────┘
```

**Comportement :**
- Affiche le numéro unique
- Bouton "Envoyer via WhatsApp" directement actif
- Au clic : Génère l'URL WhatsApp et ouvre dans un nouvel onglet

---

### Si plusieurs numéros disponibles

```
┌─────────────────────────────────────────────────────────────┐
│ ╔═════════════════════════════════════════════════════════╗ │
│ ║ Envoyer via WhatsApp                                     ║ │
│ ╠═════════════════════════════════════════════════════════╣ │
│ ║                                                           ║ │
│ ║ Un message WhatsApp sera envoyé au demandeur avec :     ║ │
│ ║                                                           ║ │
│ ║ • Le lien de correction                                  ║ │
│ ║ • Le code de sécurité                                   ║ │
│ ║ • La date d'expiration                                  ║ │
│ ║                                                           ║ │
│ ║ ┌─────────────────────────────────────────────────────┐ ║ │
│ ║ │ Sélectionner le numéro WhatsApp *                    │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ [Dropdown: +241 65 67 17 34 ▼]                     │ ║ │
│ ║ │   - +241 65 67 17 34 (par défaut)                  │ ║ │
│ ║ │   - +241 07 12 34 56                                │ ║ │
│ ║ │   - +241 06 78 90 12                                │ ║ │
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
- Bouton "Envoyer via WhatsApp" actif après sélection

---

## 🎯 Spécifications

### Composant : `SendWhatsAppModalV2`

**Props :**
```typescript
interface SendWhatsAppModalV2Props {
  isOpen: boolean
  onClose: () => void
  phoneNumbers: string[]
  correctionLink: string // /register?requestId=XXX
  securityCode: string // Code formaté (AB12-CD34)
  expiryDate: Date
  memberName: string
}
```

**Comportement :**
1. Si `phoneNumbers.length === 1` :
   - Afficher le numéro unique
   - Bouton actif directement
   - Au clic : Générer URL et ouvrir WhatsApp

2. Si `phoneNumbers.length > 1` :
   - Afficher Select avec tous les numéros
   - Par défaut : Premier numéro (index 0)
   - Admin peut changer
   - Bouton actif après sélection

**Génération du message WhatsApp :**
```typescript
const message = `Bonjour ${memberName},

Votre demande d'adhésion nécessite des corrections.

Lien de correction: ${window.location.origin}${correctionLink}

Code de sécurité: ${securityCode}
Expire le: ${formatDate(expiryDate)} (reste ${getTimeRemaining(expiryDate)})

Merci de suivre le lien et de saisir le code pour accéder aux corrections.`
```

**Génération de l'URL :**
```typescript
const whatsAppUrl = generateWhatsAppUrl(selectedPhoneNumber, message)
window.open(whatsAppUrl, '_blank')
```

---

## 🎬 Animations

- **Ouverture** : Fade in + scale (0.95 → 1.0)
- **Fermeture** : Fade out + scale (1.0 → 0.95)
- **Sélection numéro** : Dropdown slide-down
- **Envoi** : Toast de confirmation après ouverture WhatsApp

---

## ✅ Checklist

- [ ] Créer composant `SendWhatsAppModalV2`
- [ ] Gérer cas 1 numéro vs plusieurs numéros
- [ ] Implémenter Select pour choix du numéro
- [ ] Générer message WhatsApp avec toutes les infos
- [ ] Générer URL WhatsApp et ouvrir dans nouvel onglet
- [ ] Toast de confirmation
- [ ] Animations d'ouverture/fermeture
- [ ] Responsive (desktop + mobile)
