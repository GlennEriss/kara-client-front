# Amélioration du formulaire d'assurance véhicule

## 1. Problématique actuelle

Le formulaire actuel d'ajout d'assurance véhicule présente les limitations suivantes :

1. **Chargement de tous les membres** : Le select charge tous les membres avec véhicule dans une liste déroulante, ce qui devient impraticable avec un grand nombre de membres (ex: 1 million de membres).
2. **Limitation aux membres uniquement** : Impossible d'enregistrer des assurances pour des personnes non-membres qui possèdent des véhicules.
3. **Expérience utilisateur** : Un select avec des milliers d'options est difficile à utiliser et ralentit l'interface.

## 2. Solution proposée

### 2.1 Choix du type de titulaire

Ajouter un **sélecteur de type** au début du formulaire avec deux options :
- **"Membre KARA"** : Pour les membres de la mutuelle
- **"Personne externe"** : Pour les non-membres

**Implémentation suggérée :**
- Utiliser des **Radio buttons** ou **Tabs** pour le choix
- Interface claire avec icônes (User pour membre, UserPlus pour non-membre)

### 2.2 Pour les membres : Recherche/autocomplete

Remplacer le select simple par un **composant de recherche avec autocomplete** :

**Avantages :**
- Ne charge que les résultats de recherche (limite: 10-20 résultats)
- Recherche en temps réel par nom, prénom ou matricule
- Interface moderne et performante
- Évite de charger des milliers de membres

**Implémentation :**
- Utiliser le hook `useSearchMembers` existant (déjà utilisé dans `MemberGroupSearch`)
- Composant similaire à `MemberGroupSearch` avec :
  - Input de recherche avec icône
  - Dropdown avec résultats au fur et à mesure de la saisie
  - Minimum 2-3 caractères pour déclencher la recherche
  - Debounce de 300-500ms pour éviter trop de requêtes
  - Affichage : Nom, Prénom, Matricule, Téléphone

**Exemple d'interface :**
```
[Rechercher un membre...] 🔍
┌─────────────────────────────────┐
│ Jean Dupont • 0001.MK.240101    │
│ Tél: +237 6XX XXX XXX           │
├─────────────────────────────────┤
│ Marie Martin • 0002.MK.240102   │
│ Tél: +237 6XX XXX XXX           │
└─────────────────────────────────┘
```

### 2.3 Pour les non-membres : Formulaire manuel

Afficher des champs de saisie pour :
- **Nom** (obligatoire)
- **Prénom** (obligatoire)
- **Téléphone 1** (obligatoire)
- **Téléphone 2** (optionnel)
- **Ville** (obligatoire, localisation Gabon)

**Interface :**
```
[Section Personne externe]
┌─────────────────────────────────┐
│ Nom *          │ Prénom *        │
│ [____________] │ [____________]  │
│                                │
│ Téléphone 1 *  │ Téléphone 2    │
│ [____________] │ [____________]  │
│ Ville *        │                │
│ [____________] │                │
└─────────────────────────────────┘
```

### 2.4 Respect du modèle Excel (`documentation/vehicule/exemple.xlsx`)

L’export et la saisie doivent refléter les colonnes du fichier `exemple.xlsx` :

| Colonne | Description |
| --- | --- |
| NOMS / PRENOMS | Nom et prénom du titulaire (membre ou non-membre) |
| VILLE | Ville Gabon (Libreville, Port-Gentil, etc.) |
| TEL | Numéro formaté `+241 6X XX XX XX` (même logique que `src/components/register/Step1.tsx`) |
| MARQUE VEHICULE | Marque déclarée (Peugeot, Toyota…) |
| TYPE DE VIHUCLE | Type (`Voiture`, `Moto`, `Camion`, `Bus`, `Maison`, `Autre`) |
| SOURCE D'ENERGIE | Essence, Diesel, Électrique, Hybride, Gaz, Autre |
| PUISSANCE FISCALE / ADMINISTRATIF | Valeur brute saisie |
| DATE D'EFFET | `startDate` |
| FIN DE GARANTIE - MOIS | Durée (`warrantyMonths`) |
| ASSUREUR ACTUEL | `insuranceCompany` |

Le module doit permettre l’export **Excel et PDF** reproduisant exactement cette structure (lignes introductives “FICHE D'EVALUATION…” + “DONNEES CLIENTS”, colonnes dans le même ordre, fusion des cellules d’en-tête).

## 3. Modifications techniques

### 3.1 Schéma Zod (`src/schemas/vehicule.schema.ts`)

```typescript
export const vehicleInsuranceFormSchema = z.object({
  // Type de titulaire
  holderType: z.enum(['member', 'non-member']),
  
  // Champs pour membre (conditionnel)
  memberId: z.string().optional(),
  memberFirstName: z.string().optional(),
  memberLastName: z.string().optional(),
  memberMatricule: z.string().optional(),
  memberContacts: z.array(z.string()).optional(),
  
  // Champs pour non-membre (conditionnel)
  nonMemberFirstName: z.string().optional(),
  nonMemberLastName: z.string().optional(),
  nonMemberPhone1: z.string().optional(),
  nonMemberPhone2: z.string().optional(),
  
  // Champs communs (véhicule, assurance, etc.)
  city: z.string().min(1, 'Ville requise'),
  vehicleType: z.enum(['car', 'motorcycle', 'truck', 'bus', 'maison', 'other']),
  energySource: z.enum(['essence', 'diesel', 'electrique', 'hybride', 'gaz', 'autre']),
  fiscalPower: z.string().min(1, 'Puissance requise'),
  warrantyMonths: z.coerce.number().int().min(1).max(60),
  // ... reste des champs
})
.refine(data => {
  // Validation : si membre, memberId requis
  if (data.holderType === 'member') {
    return !!data.memberId
  }
  // Si non-membre, nom, prénom et téléphone 1 requis
  if (data.holderType === 'non-member') {
    return !!(data.nonMemberFirstName && data.nonMemberLastName && data.nonMemberPhone1)
  }
  return true
}, {
  message: "Les champs requis selon le type de titulaire doivent être remplis",
  path: ['holderType']
})
```

> Les champs `city`, `energySource`, `fiscalPower`, `warrantyMonths` et les numéros `nonMemberPhone*` sont ajoutés pour refléter le fichier Excel. La mise en forme des téléphones suit exactement la logique du formulaire Step1 (`src/components/register/Step1.tsx`) : préfixe `+241`, regroupement par paires et validation stricte.

### 3.2 Type TypeScript (`src/types/types.ts`)

```typescript
export interface VehicleInsurance {
  id: string
  holderType: 'member' | 'non-member'
  
  // Si membre
  memberId?: string
  memberFirstName?: string
  memberLastName?: string
  memberMatricule?: string
  memberContacts?: string[]
  memberPhotoUrl?: string | null
  
  // Si non-membre
  nonMemberFirstName?: string
  nonMemberLastName?: string
  nonMemberPhone1?: string
  nonMemberPhone2?: string | null
  
  // ... reste des champs
}
```

Ajouts notables :

- `city` (ville déclarée) et `primaryPhone` (champ commun pour l’export) même si le titulaire est membre.
- `vehicleType` intègre la valeur `maison`, `energySource` couvre tous les carburants, `fiscalPower` et `warrantyMonths` complètent les informations véhicule/assurance.

### 3.3 Composant de recherche membre

Créer un composant réutilisable `MemberSearchInput.tsx` :

```typescript
interface MemberSearchInputProps {
  value: string
  onChange: (memberId: string, member: MemberWithSubscription) => void
  selectedMemberId?: string
  error?: string
  disabled?: boolean
}

// Utilise useSearchMembers avec debounce
// Affiche dropdown avec résultats
// Gère la sélection et remplit automatiquement les champs
```

### 3.4 Export Excel / PDF

- Utiliser `xlsx` pour générer le fichier avec les en-têtes fusionnés et les colonnes décrites en 2.4.
- Utiliser `jspdf` + `jspdf-autotable` pour produire le PDF miroir.
- Les exports doivent s’appuyer sur l’intégralité de la collection `vehicle-insurances` (et pas seulement sur la page courante).

### 3.5 Modifications du formulaire

**Structure proposée :**

```tsx
<Form>
  {/* Section Type de titulaire */}
  <Card>
    <CardHeader>
      <CardTitle>Type de titulaire</CardTitle>
    </CardHeader>
    <CardContent>
      <RadioGroup value={holderType} onValueChange={setHolderType}>
        <RadioGroupItem value="member">
          <User /> Membre KARA
        </RadioGroupItem>
        <RadioGroupItem value="non-member">
          <UserPlus /> Personne externe
        </RadioGroupItem>
      </RadioGroup>
    </CardContent>
  </Card>

  {/* Section Membre (conditionnel) */}
  {holderType === 'member' && (
    <Card>
      <CardHeader>
        <CardTitle>Rechercher un membre</CardTitle>
      </CardHeader>
      <CardContent>
        <MemberSearchInput
          value={memberId}
          onChange={handleMemberSelect}
          selectedMemberId={form.watch('memberId')}
        />
      </CardContent>
    </Card>
  )}

  {/* Section Non-membre (conditionnel) */}
  {holderType === 'non-member' && (
    <Card>
      <CardHeader>
        <CardTitle>Informations de la personne</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <FormField name="nonMemberFirstName" />
          <FormField name="nonMemberLastName" />
          <FormField name="nonMemberPhone1" />
          <FormField name="nonMemberPhone2" />
        </div>
      </CardContent>
    </Card>
  )}

  {/* Sections restantes (véhicule, assurance, etc.) */}
</Form>
```

## 4. Avantages de cette approche

### 4.1 Performance
- ✅ **Pas de chargement massif** : Seulement les résultats de recherche sont chargés
- ✅ **Recherche optimisée** : Utilise l'index Firestore pour la recherche
- ✅ **Debounce** : Évite les requêtes excessives
- ✅ **Limite de résultats** : Maximum 10-20 résultats affichés

### 4.2 Expérience utilisateur
- ✅ **Recherche intuitive** : L'utilisateur tape et voit les résultats
- ✅ **Flexibilité** : Supporte membres et non-membres
- ✅ **Interface claire** : Séparation visuelle entre les deux types
- ✅ **Validation contextuelle** : Les champs requis changent selon le type

### 4.3 Maintenabilité
- ✅ **Réutilisable** : Le composant de recherche peut être utilisé ailleurs
- ✅ **Cohérent** : Utilise les patterns existants (`useSearchMembers`)
- ✅ **Extensible** : Facile d'ajouter d'autres types de titulaires plus tard

## 5. Plan d'implémentation

### Phase 1 : Types et schémas (1h)
- [ ] Ajouter `holderType` dans les types
- [ ] Ajouter champs non-membre dans les types
- [ ] Mettre à jour le schéma Zod avec validation conditionnelle
- [ ] Mettre à jour l'interface `VehicleInsurance`

### Phase 2 : Composant de recherche (2h)
- [ ] Créer `MemberSearchInput.tsx` (inspiré de `MemberGroupSearch`)
- [ ] Intégrer `useSearchMembers` avec debounce
- [ ] Gérer l'affichage des résultats
- [ ] Gérer la sélection et le callback

### Phase 3 : Modifications du formulaire (2-3h)
- [ ] Ajouter sélecteur de type (Radio buttons)
- [ ] Intégrer `MemberSearchInput` pour les membres
- [ ] Ajouter champs non-membre
- [ ] Gérer l'affichage conditionnel
- [ ] Mettre à jour la logique de soumission

### Phase 4 : Backend et repository (1-2h)
- [ ] Mettre à jour `VehicleInsuranceRepository` pour supporter les deux types
- [ ] Adapter les requêtes Firestore
- [ ] Gérer les champs conditionnels lors de la sauvegarde

### Phase 5 : Tests et validation (1h)
- [ ] Tester avec membre existant
- [ ] Tester avec non-membre
- [ ] Tester la recherche avec beaucoup de membres
- [ ] Valider les règles de validation

**Temps total estimé : 7-9 heures**

## 6. Exemple de flux utilisateur

### Scénario 1 : Ajouter une assurance pour un membre

1. Utilisateur ouvre le formulaire
2. Sélectionne "Membre KARA"
3. Tape "Jean" dans le champ de recherche
4. Voit la liste des membres correspondants
5. Clique sur "Jean Dupont • 0001.MK.240101"
6. Les informations du membre sont pré-remplies
7. Remplit les informations du véhicule et de l'assurance
8. Soumet le formulaire

### Scénario 2 : Ajouter une assurance pour un non-membre

1. Utilisateur ouvre le formulaire
2. Sélectionne "Personne externe"
3. Remplit manuellement : Nom, Prénom, Téléphone 1, Téléphone 2
4. Remplit les informations du véhicule et de l'assurance
5. Soumet le formulaire

## 7. Considérations supplémentaires

### 7.1 Filtres et recherche
- Ajouter un filtre `holderType` dans les filtres de liste
- Permettre de rechercher par nom/prénom pour les non-membres aussi

### 7.2 Statistiques
- Compter séparément les membres et non-membres assurés
- Afficher dans le dashboard

### 7.3 Affichage dans la liste
- Badge "Membre" ou "Externe" sur chaque carte
- Afficher les informations appropriées selon le type

### 7.4 Export
- Inclure le type de titulaire dans les exports CSV/PDF
- Afficher les champs appropriés selon le type

## 8. Conclusion

Cette approche résout les problèmes de performance et de limitation fonctionnelle tout en offrant une meilleure expérience utilisateur. L'utilisation d'une recherche avec autocomplete est une pratique standard pour gérer de grandes listes, et le support des non-membres élargit les cas d'usage du module.

