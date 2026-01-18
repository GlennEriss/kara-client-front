# Modal "Régénérer le code" - Action Post-Création

## 📋 Vue d'ensemble

Ce document détaille le modal de confirmation pour régénérer le code de sécurité, accessible via l'action "Régénérer le code" du dropdown.

---

## 🎯 Contexte

**Quand s'ouvre ce modal :**
- Admin clique sur "Régénérer le code" dans le dropdown "⋮" (si `status === 'under_review'`)

**Avertissement :**
- Le nouveau code invalide l'ancien
- Le demandeur ne pourra plus utiliser l'ancien code

---

## 🎨 Design

```
┌─────────────────────────────────────────────────────────────┐
│ ╔═════════════════════════════════════════════════════════╗ │
│ ║ Régénérer le code de sécurité                           ║ │
│ ╠═════════════════════════════════════════════════════════╣ │
│ ║                                                           ║ │
│ ║ ⚠️ Attention                                             ║ │
│ ║                                                           ║ │
│ ║ Un nouveau code de sécurité invalidera l'ancien code.  ║ │
│ ║ Le demandeur ne pourra plus utiliser l'ancien code      ║ │
│ ║ pour accéder aux corrections.                            ║ │
│ ║                                                           ║ │
│ ║ Code actuel: AB12-CD34                                   ║ │
│ ║ Expire le: 18/01/2026 22:10 (reste 2j 13h)             ║ │
│ ║                                                           ║ │
│ ║ ┌─────────────────────────────────────────────────────┐ ║ │
│ ║ │ ☑ Je comprends que l'ancien code sera invalidé     │ ║ │
│ ║ └─────────────────────────────────────────────────────┘ ║ │
│ ║                                                           ║ │
│ ║ [Annuler]              [🔄 Régénérer le code]           ║ │
│ ║                                                           ║ │
│ ╚═════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Spécifications

### Composant : `RenewSecurityCodeModalV2`

**Props :**
```typescript
interface RenewSecurityCodeModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<{ newCode: string, newExpiry: Date }>
  currentCode: string // Code actuel formaté
  currentExpiry: Date
  isLoading?: boolean
}
```

**Comportement :**
1. Afficher le code actuel et son expiration
2. Checkbox de confirmation obligatoire
3. Bouton "Régénérer" désactivé tant que checkbox non cochée
4. Au clic : Appel API pour régénérer
5. Afficher le nouveau code dans un toast
6. Mettre à jour l'UI (bloc "Corrections demandées")

**Code :**
```tsx
const [isConfirmed, setIsConfirmed] = useState(false)

const handleRenew = async () => {
  if (!isConfirmed) return
  
  const result = await onConfirm()
  
  toast.success("Code régénéré", {
    description: `Nouveau code: ${formatSecurityCode(result.newCode)}. Expire le ${formatDate(result.newExpiry)}.`,
    duration: 5000,
  })
  
  onClose()
}
```

---

## 🎬 Animations

- **Ouverture** : Fade in + scale
- **Checkbox** : Transition douce au clic
- **Bouton** : Enable/disable avec transition
- **Succès** : Toast avec animation slide-in

---

## ✅ Checklist

- [ ] Créer composant `RenewSecurityCodeModalV2`
- [ ] Afficher code actuel et expiration
- [ ] Checkbox de confirmation obligatoire
- [ ] Implémenter appel API de régénération
- [ ] Toast avec nouveau code
- [ ] Mise à jour UI après régénération
- [ ] Animations
- [ ] Responsive
