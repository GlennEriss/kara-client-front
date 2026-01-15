# GabonPhoneInput - Composant de Téléphone Gabonais

Un composant React professionnel pour la saisie et la validation des numéros de téléphone gabonais.

## ✨ Fonctionnalités

- ✅ **Validation en temps réel** : Détection automatique de l'opérateur (Libertis, Moov, Airtel)
- 🎨 **Design moderne** : Interface fluide avec animations et feedback visuel
- 🔒 **Sécurisé** : Limite stricte de 8 chiffres, blocage des caractères non numériques
- 📱 **UX optimisée** : Formatage automatique, gestion intelligente du curseur
- ♿ **Accessible** : Support clavier complet, indicateurs visuels clairs
- 🎯 **TypeScript** : Entièrement typé pour une meilleure expérience développeur

## 📦 Installation

Le composant est déjà installé dans le projet :
```
src/components/shared/GabonPhoneInput.tsx
```

## 🚀 Utilisation

### Composant Simple

```tsx
import GabonPhoneInput from '@/components/shared/GabonPhoneInput'

function MyForm() {
  const [phone, setPhone] = useState('')

  return (
    <GabonPhoneInput
      value={phone}
      onChange={setPhone}
      error="Numéro invalide"
    />
  )
}
```

### Liste de Contacts (Recommandé)

```tsx
import { GabonPhoneInputList } from '@/components/shared/GabonPhoneInput'

function ContactsForm() {
  const [contacts, setContacts] = useState([''])

  return (
    <GabonPhoneInputList
      values={contacts}
      onChange={setContacts}
      maxContacts={3}
      error="Au moins un contact requis"
    />
  )
}
```

### Avec React Hook Form

```tsx
import { useFormContext } from 'react-hook-form'
import { GabonPhoneInputList } from '@/components/shared/GabonPhoneInput'

function IdentityForm() {
  const { watch, setValue, formState: { errors } } = useFormContext()
  const contacts = watch('identity.contacts') || []

  return (
    <GabonPhoneInputList
      values={contacts}
      onChange={(newContacts) => setValue('identity.contacts', newContacts, { shouldValidate: true })}
      maxContacts={3}
      error={errors.identity?.contacts?.message}
    />
  )
}
```

## 🎛️ Props

### GabonPhoneInput

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `value` | `string` | - | Numéro au format `+241XXXXXXXX` |
| `onChange` | `(value: string) => void` | - | Callback lors du changement |
| `onRemove` | `() => void` | - | Callback pour la suppression |
| `canRemove` | `boolean` | `false` | Afficher le bouton supprimer |
| `error` | `string` | - | Message d'erreur |
| `placeholder` | `string` | `"XX XX XX XX"` | Texte placeholder |
| `disabled` | `boolean` | `false` | Désactiver le champ |

### GabonPhoneInputList

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `values` | `string[]` | - | Tableau de numéros |
| `onChange` | `(values: string[]) => void` | - | Callback lors du changement |
| `maxContacts` | `number` | `3` | Nombre max de contacts |
| `error` | `string` | - | Message d'erreur global |

## 📱 Format des Numéros

Le composant gère automatiquement le format des numéros gabonais :

**Format d'entrée** : L'utilisateur saisit 8 chiffres
```
60123456
```

**Format de stockage** : Le composant stocke avec l'indicatif
```
+24160123456
```

**Format d'affichage** : Le composant affiche avec espaces
```
60 12 34 56
```

## 🎨 Opérateurs Détectés

Le composant détecte automatiquement l'opérateur basé sur les 2 premiers chiffres :

| Opérateur | Préfixes | Couleur |
|-----------|----------|---------|
| **Libertis** | 60, 62, 66 | Bleu |
| **Moov** | 65 | Violet |
| **Airtel** | 74, 76, 77 | Rouge |

## ✅ Validation

Le composant valide automatiquement :
- ✅ Exactement 8 chiffres
- ✅ Préfixe d'opérateur valide (60, 62, 65, 66, 74, 76, 77)
- ✅ Caractères numériques uniquement

## 🎯 États Visuels

Le composant affiche différents états visuels :

- **Normal** : Bordure grise
- **Focus** : Bordure bleue avec ombre
- **Opérateur détecté** : Badge coloré + bordure assortie
- **Valide** : Icône verte de validation
- **Erreur** : Bordure rouge + message
- **En cours** : Indicateur de chiffres restants
- **Disabled** : Opacité réduite

## 🔄 Gestion du Curseur

Le composant maintient intelligemment la position du curseur lors de la saisie :
- Ignore les espaces de formatage
- Repositionne le curseur correctement après chaque modification
- Permet une édition naturelle du numéro

## 🚫 Anciennes Fonctions à Supprimer

Si vous migrez depuis l'ancien composant, supprimez ces fonctions :

```tsx
// ❌ À SUPPRIMER
const addContact = () => { ... }
const removeContact = (index: number) => { ... }
const updateContact = (index: number, value: string) => { ... }
const detectOperator = (number: string) => { ... }
const formatPhoneDisplay = (number: string) => { ... }
const PhoneInput = ({ ... }) => { ... }
```

Le nouveau composant `GabonPhoneInputList` gère tout cela automatiquement.

## 🐛 Débogage

Si vous rencontrez des problèmes :

1. **Le numéro ne se valide pas** : Vérifiez que le préfixe est correct (60, 62, 65, 66, 74, 76, 77)
2. **L'opérateur n'est pas détecté** : Assurez-vous d'avoir saisi au moins 2 chiffres
3. **Le formatage ne fonctionne pas** : Vérifiez que la valeur est au format `+241XXXXXXXX`

## 📝 Notes Techniques

- Le composant utilise `requestAnimationFrame` pour la gestion du curseur
- Les animations utilisent Tailwind CSS avec les classes `animate-in`
- Le composant est totalement controllé (controlled component)
- Pas de state interne pour les valeurs (single source of truth)

## 🎓 Bonnes Pratiques

1. **Toujours valider côté serveur** : La validation côté client ne suffit pas
2. **Utiliser avec React Hook Form** : Pour une meilleure gestion d'état
3. **Gérer les erreurs** : Afficher des messages clairs pour l'utilisateur
4. **Tester sur mobile** : Le `inputMode="numeric"` améliore l'UX mobile

## 📚 Exemples Complets

Voir le fichier `IdentityStepV2.tsx` pour un exemple d'intégration complète dans un formulaire multi-étapes.

---

**Version** : 1.0.0  
**Auteur** : Équipe Kara  
**Date** : Janvier 2026
