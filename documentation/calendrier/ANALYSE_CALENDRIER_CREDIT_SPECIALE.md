# Analyse – Calendrier des versements – Crédit spéciale

## 1. Contexte et objectif

### Objectif principal
Créer une vue calendrier mensuelle permettant de visualiser et gérer tous les versements à effectuer pour les crédits spéciaux. L'admin peut voir les échéances par jour et effectuer les paiements directement depuis le calendrier.

### Périmètre
- Module : Crédit spéciale (crédits spéciaux, fixes, aide)
- Vue : Calendrier mensuel avec onglets par module
- Fonctionnalités : Visualisation des échéances, enregistrement de paiements depuis le calendrier

---

## 2. Structure des données

### 2.1 Échéances (CreditInstallment)

Les échéances représentent les dates de versement programmées pour chaque crédit :

```typescript
interface CreditInstallment {
  id: string
  creditId: string
  installmentNumber: number // Numéro de l'échéance (1, 2, 3, ...)
  dueDate: Date // Date d'échéance (clé pour le calendrier)
  principalAmount: number // Montant du capital
  interestAmount: number // Montant des intérêts
  totalAmount: number // Montant total à payer (principal + intérêts)
  paidAmount: number // Montant déjà payé
  remainingAmount: number // Montant restant à payer
  status: 'PENDING' | 'DUE' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  paidAt?: Date // Date de paiement complet
  paymentId?: string // ID du paiement qui a complété cette échéance
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}
```

### 2.2 Informations complémentaires nécessaires

Pour afficher le calendrier, il faut également récupérer les informations du crédit associé :

```typescript
interface CreditContract {
  id: string
  clientId: string // Pour afficher le nom du client
  clientName?: string // Nom complet du client
  guarantorId?: string
  guarantorName?: string
  amount: number
  monthlyPayment: number
  status: 'ACTIVE' | 'PAID' | 'OVERDUE' | 'TRANSFORMED' | 'DISCHARGED'
  // ... autres champs
}
```

### 2.3 Filtres disponibles

Le repository `CreditInstallmentRepository` propose des filtres utiles pour le calendrier :

```typescript
interface CreditInstallmentFilters {
  creditId?: string
  status?: 'PENDING' | 'DUE' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  dueDateFrom?: Date // Date de début du mois
  dueDateTo?: Date // Date de fin du mois
  page?: number
  limit?: number
  orderByField?: string
  orderByDirection?: 'asc' | 'desc'
}
```

---

## 3. Analyse fonctionnelle

### 3.1 Affichage du calendrier mensuel

#### Vue calendrier
- **Format** : Calendrier mensuel classique (grille 7 jours × ~5 semaines)
- **Navigation** : Mois précédent/suivant, sélection de mois/année
- **Affichage par jour** :
  - Nombre d'échéances à venir (badge avec compteur)
  - Montant total des échéances du jour
  - Indicateur visuel selon le statut :
    - 🟢 Vert : Toutes les échéances sont payées (PAID)
    - 🟡 Jaune : Échéances en cours (DUE, PARTIAL)
    - 🔴 Rouge : Échéances en retard (OVERDUE)
    - ⚪ Gris : Échéances futures (PENDING)

#### Données à afficher par jour
Pour chaque jour du mois, afficher :
- Nombre d'échéances (`count`)
- Montant total des échéances (`totalAmount`)
- Montant total déjà payé (`paidAmount`)
- Montant restant (`remainingAmount`)
- Liste des échéances avec :
  - Nom du client
  - Montant de l'échéance
  - Statut
  - Numéro d'échéance

### 3.2 Récupération des données

#### Requête pour un mois donné
```typescript
// Exemple : récupérer toutes les échéances pour janvier 2024
const filters: CreditInstallmentFilters = {
  dueDateFrom: new Date(2024, 0, 1), // 1er janvier 2024
  dueDateTo: new Date(2024, 0, 31), // 31 janvier 2024
  status: undefined // Tous les statuts, ou filtrer pour exclure PAID
}

const installments = await creditInstallmentRepository.getInstallmentsWithFilters(filters)
```

#### Enrichissement des données
Pour chaque échéance, il faut récupérer :
1. Les informations du crédit (`CreditContract`) pour obtenir le nom du client
2. Les informations du client (`Member`) pour l'affichage complet

#### Groupement par jour
```typescript
interface DayInstallments {
  date: Date
  installments: CreditInstallment[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  count: number
  statuses: ('PENDING' | 'DUE' | 'PARTIAL' | 'PAID' | 'OVERDUE')[]
}

// Grouper les échéances par jour
const groupedByDay = installments.reduce((acc, installment) => {
  const dayKey = format(installment.dueDate, 'yyyy-MM-dd')
  if (!acc[dayKey]) {
    acc[dayKey] = {
      date: installment.dueDate,
      installments: [],
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      count: 0,
      statuses: []
    }
  }
  acc[dayKey].installments.push(installment)
  acc[dayKey].totalAmount += installment.totalAmount
  acc[dayKey].paidAmount += installment.paidAmount
  acc[dayKey].remainingAmount += installment.remainingAmount
  acc[dayKey].count++
  acc[dayKey].statuses.push(installment.status)
  return acc
}, {} as Record<string, DayInstallments>)
```

### 3.3 Interaction avec le calendrier

#### Clic sur un jour
Lorsqu'on clique sur un jour du calendrier :
1. Ouvrir un modal ou un panneau latéral
2. Afficher la liste détaillée des échéances de ce jour
3. Pour chaque échéance, afficher :
   - Nom du client
   - Numéro d'échéance (ex: "Échéance 2/7")
   - Montant total (`totalAmount`)
   - Montant restant (`remainingAmount`)
   - Statut avec badge coloré
   - Bouton "Enregistrer le paiement" si l'échéance n'est pas complètement payée

#### Enregistrement d'un paiement depuis le calendrier
1. Clic sur "Enregistrer le paiement" pour une échéance
2. Ouvrir le modal de paiement existant (`CreditPaymentModal`)
3. Pré-remplir :
   - `creditId` : ID du crédit
   - `installmentId` : ID de l'échéance (optionnel mais recommandé)
   - Date suggérée : date du jour sélectionné
4. L'admin saisit les informations du paiement (montant, moyen, preuve, etc.)
5. Après enregistrement :
   - Rafraîchir le calendrier
   - Mettre à jour les indicateurs visuels
   - Afficher une notification de succès

---

## 4. Structure technique

### 4.1 Composants à créer

#### `CalendarView.tsx`
Composant principal du calendrier avec :
- Navigation mois/année
- Grille calendrier
- Gestion des clics sur les jours
- Intégration avec les hooks de données

#### `CalendarDay.tsx`
Composant pour afficher un jour du calendrier :
- Badge avec compteur d'échéances
- Indicateur visuel de statut
- Montant total affiché
- Gestion du clic

#### `DayInstallmentsModal.tsx`
Modal affichant les échéances d'un jour :
- Liste des échéances
- Informations détaillées par échéance
- Boutons d'action (enregistrer paiement, voir détails)

### 4.2 Hooks à créer

#### `useCalendarInstallments(month: Date)`
Hook pour récupérer les échéances d'un mois :
```typescript
function useCalendarInstallments(month: Date) {
  const filters: CreditInstallmentFilters = {
    dueDateFrom: startOfMonth(month),
    dueDateTo: endOfMonth(month),
    // Optionnel : exclure les échéances complètement payées
    // status: ['PENDING', 'DUE', 'PARTIAL', 'OVERDUE']
  }
  
  return useQuery({
    queryKey: ['calendar-installments', format(month, 'yyyy-MM')],
    queryFn: () => creditInstallmentRepository.getInstallmentsWithFilters(filters),
    // Enrichir avec les informations des crédits et clients
  })
}
```

#### `useGroupedInstallmentsByDay(installments: CreditInstallment[])`
Hook pour grouper les échéances par jour :
```typescript
function useGroupedInstallmentsByDay(installments: CreditInstallment[]) {
  return useMemo(() => {
    // Logique de groupement par jour
    // Enrichissement avec les données des crédits
  }, [installments])
}
```

### 4.3 Services existants à réutiliser

- `CreditSpecialeService.recordPayment()` : Pour enregistrer un paiement
- `CreditInstallmentRepository.getInstallmentsWithFilters()` : Pour récupérer les échéances
- `CreditContractRepository.getContractById()` : Pour enrichir avec les données du crédit

---

## 5. Logique métier

### 5.1 Calcul du statut d'un jour

Un jour peut avoir plusieurs échéances avec différents statuts. Le statut visuel du jour est déterminé par :
1. **Priorité 1** : S'il y a au moins une échéance `OVERDUE` → 🔴 Rouge
2. **Priorité 2** : S'il y a au moins une échéance `DUE` ou `PARTIAL` → 🟡 Jaune
3. **Priorité 3** : Si toutes les échéances sont `PAID` → 🟢 Vert
4. **Par défaut** : Si toutes les échéances sont `PENDING` → ⚪ Gris

### 5.2 Filtrage des échéances

#### Options de filtrage
- **Toutes les échéances** : Afficher toutes les échéances du mois (y compris payées)
- **Échéances à venir** : Exclure les échéances `PAID`
- **Échéances en retard** : Afficher uniquement les échéances `OVERDUE`
- **Échéances du jour** : Afficher uniquement les échéances `DUE`

#### Filtres par crédit
- Filtrer par client (nom, matricule)
- Filtrer par garant
- Filtrer par statut du crédit (`ACTIVE`, `OVERDUE`, etc.)

### 5.3 Gestion des paiements partiels

Si une échéance a un statut `PARTIAL` :
- Afficher le montant payé et le montant restant
- Permettre d'enregistrer un nouveau paiement pour compléter l'échéance
- Le statut passera à `PAID` lorsque `paidAmount >= totalAmount`

---

## 6. Cas d'usage

### UC1 – Visualiser le calendrier mensuel

**Acteur** : Admin

**Scénario principal** :
1. L'admin accède à la page Calendrier
2. Le calendrier affiche le mois en cours
3. Les jours avec des échéances sont marqués visuellement
4. L'admin peut naviguer vers les mois précédents/suivants

**Postconditions** :
- Le calendrier affiche toutes les échéances du mois sélectionné
- Les indicateurs visuels reflètent correctement les statuts

---

### UC2 – Consulter les échéances d'un jour

**Acteur** : Admin

**Scénario principal** :
1. L'admin clique sur un jour du calendrier
2. Un modal s'ouvre avec la liste des échéances de ce jour
3. Pour chaque échéance, l'admin voit :
   - Nom du client
   - Montant de l'échéance
   - Montant restant
   - Statut
4. L'admin peut fermer le modal

**Postconditions** :
- Les échéances du jour sont affichées correctement
- Les informations sont à jour

---

### UC3 – Enregistrer un paiement depuis le calendrier

**Acteur** : Admin

**Scénario principal** :
1. L'admin consulte les échéances d'un jour
2. L'admin clique sur "Enregistrer le paiement" pour une échéance
3. Le modal de paiement s'ouvre avec les informations pré-remplies
4. L'admin saisit les informations du paiement (montant, moyen, preuve, etc.)
5. L'admin valide le paiement
6. Le système enregistre le paiement
7. Le calendrier se met à jour automatiquement

**Scénarios alternatifs** :
- Si le montant saisi est inférieur au montant restant, l'échéance passe en `PARTIAL`
- Si le paiement est en retard, le système calcule les pénalités
- Si le paiement complète l'échéance, le statut passe à `PAID`

**Postconditions** :
- Le paiement est enregistré
- L'échéance est mise à jour
- Le calendrier reflète les changements
- Les pénalités sont calculées si nécessaire

---

## 7. Points d'attention

### 7.1 Performance
- **Pagination** : Pour les mois avec beaucoup d'échéances, envisager une pagination ou un chargement progressif
- **Cache** : Utiliser React Query pour mettre en cache les données du calendrier
- **Optimisation des requêtes** : Éviter de récupérer toutes les données des crédits si on peut les enrichir côté serveur

### 7.2 Données manquantes
- Gérer les cas où un crédit n'existe plus (soft delete)
- Gérer les cas où un client n'existe plus
- Afficher des valeurs par défaut si les données sont incomplètes

### 7.3 Synchronisation
- Rafraîchir le calendrier après chaque paiement
- Utiliser les invalidations de React Query pour mettre à jour automatiquement
- Gérer les conflits si plusieurs admins modifient simultanément

### 7.4 Accessibilité
- Rendre le calendrier navigable au clavier
- Ajouter des labels ARIA pour les lecteurs d'écran
- Assurer un contraste suffisant pour les indicateurs visuels

---

## 8. Prochaines étapes

1. **Implémentation du composant calendrier de base**
   - Créer `CalendarView.tsx` avec navigation mois/année
   - Créer `CalendarDay.tsx` pour l'affichage des jours
   - Intégrer avec les hooks de données

2. **Enrichissement des données**
   - Créer le hook `useCalendarInstallments`
   - Enrichir les échéances avec les données des crédits et clients
   - Grouper les échéances par jour

3. **Modal de consultation des échéances**
   - Créer `DayInstallmentsModal.tsx`
   - Afficher la liste des échéances d'un jour
   - Intégrer avec le modal de paiement existant

4. **Tests et optimisations**
   - Tester avec différents scénarios (beaucoup d'échéances, échéances en retard, etc.)
   - Optimiser les performances
   - Améliorer l'UX

5. **Extension aux autres modules**
   - Analyser les calendriers pour les autres modules (caisse imprévue, placement, etc.)
   - Créer des onglets pour chaque module
   - Réutiliser la structure du calendrier

---

## 9. Références

- Types : `src/types/types.ts` (lignes 1353-1417)
- Repository : `src/repositories/credit-speciale/CreditInstallmentRepository.ts`
- Interface : `src/repositories/credit-speciale/ICreditInstallmentRepository.ts`
- Service : `src/services/credit-speciale/CreditSpecialeService.ts`
- Modal de paiement : `src/components/credit-speciale/CreditPaymentModal.tsx`
- Documentation crédit spéciale : `documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md`
