# Analyse – Calendrier des versements – Caisse Imprévue

## 1. Contexte et objectif

### Objectif principal
Créer une vue calendrier mensuelle permettant de visualiser et gérer tous les versements à effectuer pour les contrats de caisse imprévue, avec la possibilité de filtrer par type de contrat (journalier, mensuel).

### Périmètre
- Module : Caisse Imprévue
- Types de contrats : `DAILY` (journalier), `MONTHLY` (mensuel)
- Vue : Calendrier mensuel avec filtres par type de contrat
- Fonctionnalités : Visualisation des versements, filtrage par type, enregistrement de paiements depuis le calendrier

---

## 2. Structure des données

### 2.1 Contrats de Caisse Imprévue (ContractCI)

Les contrats de caisse imprévue sont caractérisés par leur fréquence de paiement :

```typescript
interface ContractCI {
  id: string
  memberId: string
  memberFirstName: string
  memberLastName: string
  memberContacts: string[]
  memberEmail?: string
  memberPhotoUrl?: string
  
  // Informations du forfait
  subscriptionCIID: string
  subscriptionCICode: string
  subscriptionCILabel?: string
  subscriptionCIAmountPerMonth: number
  subscriptionCINominal: number
  subscriptionCIDuration: number
  subscriptionCISupportMin: number
  subscriptionCISupportMax: number
  
  // Fréquence de paiement (clé pour le calendrier)
  paymentFrequency: 'DAILY' | 'MONTHLY'
  firstPaymentDate: string // Date de début (format: "YYYY-MM-DD")
  
  // Statut du contrat
  status: 'ACTIVE' | 'FINISHED' | 'CANCELED'
  
  // Progression
  totalMonthsPaid: number // Nombre de mois complètement payés
  
  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}
```

### 2.2 Versements (PaymentCI)

Les versements sont stockés dans une sous-collection `payments` de chaque contrat :

```typescript
interface PaymentCI {
  id: string // Ex: "month-0", "month-1", etc.
  contractId: string
  monthIndex: number // 0, 1, 2, ..., 11 (index du mois dans le contrat)
  status: 'DUE' | 'PAID' | 'PARTIAL'
  
  // Objectifs et cumuls
  targetAmount: number // Montant objectif du mois
  accumulatedAmount: number // Total versé ce mois
  
  // Versements du mois (liste de VersementCI)
  versements: VersementCI[]
  
  // Remboursement de support (si applicable)
  supportRepaymentAmount?: number
  
  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

interface VersementCI {
  id: string // Ex: "v_20250119_1430"
  date: string // Format: "2025-01-19"
  time: string // Format: "14:30"
  amount: number
  mode: PaymentMode // airtel_money | mobicash | cash | bank_transfer
  proofUrl: string
  proofPath: string
  createdAt: Date
  createdBy: string
  penalty?: number
  daysLate?: number
  supportRepaymentAmount?: number
  supportRepaymentId?: string
}
```

**Note importante** : Contrairement à la caisse spéciale, les `PaymentCI` n'ont pas de champ `dueAt` direct. La date d'échéance doit être calculée à partir de :
- `firstPaymentDate` du contrat
- `monthIndex` du paiement
- `paymentFrequency` du contrat (pour déterminer si c'est quotidien ou mensuel)

### 2.3 Types de contrats

#### Contrats Journaliers (`DAILY`)
- **Fréquence** : Versements quotidiens
- **Caractéristiques** : 
  - Versements fréquents (tous les jours)
  - Montant mensuel divisé sur plusieurs jours
  - Peut avoir plusieurs `versements` dans un même `PaymentCI`
- **Affichage par défaut** : Oui (par défaut dans le calendrier)

#### Contrats Mensuels (`MONTHLY`)
- **Fréquence** : Versements mensuels
- **Caractéristiques** :
  - Versement mensuel unique
  - Montant fixe par mois (`subscriptionCIAmountPerMonth`)
  - Structure plus simple
- **Affichage** : Via filtre switch

---

## 3. Analyse fonctionnelle

### 3.1 Affichage du calendrier mensuel

#### Vue calendrier par défaut
- **Type affiché par défaut** : Contrats `DAILY` uniquement
- **Format** : Calendrier mensuel classique (grille 7 jours × ~5 semaines)
- **Navigation** : Mois précédent/suivant, sélection de mois/année
- **Affichage par jour** :
  - Nombre de versements (badge avec compteur)
  - Montant total des versements du jour
  - **Indicateur visuel selon le statut et la date** :
    - 🟢 **Vert** : Versements enregistrés (payés)
      - Condition : `status === 'PAID'` OU (`status === 'PARTIAL'` ET `accumulatedAmount >= targetAmount`)
      - Signification : Le versement a été complètement enregistré
    - 🟠 **Orange** : Versements imminents (à l'approche du jour de paiement)
      - Condition : `status === 'DUE'` OU (`status === 'PARTIAL'` ET `accumulatedAmount < targetAmount`) ET date d'échéance calculée `>= aujourd'hui` ET `<= aujourd'hui + N jours`
      - Exemple : On est le 13, un versement prévu le 13 / 14 / 15 (si \(N=2\)) sera en orange
      - Signification : Versements très proches, à traiter en priorité
    - 🟡 **Jaune** : Versements à venir (non encore imminents)
      - Condition : `status === 'DUE'` OU (`status === 'PARTIAL'` ET `accumulatedAmount < targetAmount`) ET date d'échéance calculée `> aujourd'hui + N jours`
      - Exemple : On est le 13, un versement prévu le 20 (si \(N=2\)) sera en jaune
      - Signification : Versements prévus mais pas encore urgents
    - 🔴 **Rouge** : Versements en retard (passés et non enregistrés)
      - Condition : (`status === 'DUE'` OU (`status === 'PARTIAL'` ET `accumulatedAmount < targetAmount`)) ET date d'échéance calculée `< aujourd'hui`
      - Exemple : On est le 13, il y avait 2 versements prévus le 12 qui n'ont pas été enregistrés → ils seront en rouge
      - Signification : Versements qui auraient dû être payés mais qui ne l'ont pas été
    - ⚪ **Gris** : Aucun versement
      - Condition : Aucun versement pour ce jour
      - Signification : Jour sans versement

#### Filtres par type de contrat

**Composant de filtrage** : Switches/Toggles pour chaque type

```
┌─────────────────────────────────────────┐
│  Filtres par type de contrat           │
├─────────────────────────────────────────┤
│  ☑ Journaliers (par défaut)           │
│  ☐ Mensuels                            │
└─────────────────────────────────────────┘
```

**Comportement** :
- Par défaut : Seul "Journaliers" est activé
- L'utilisateur peut activer/désactiver chaque type indépendamment
- Les deux types peuvent être affichés simultanément
- Le calendrier se met à jour automatiquement lors du changement de filtre

#### Filtres par couleur (statut)

**Objectif** : pouvoir afficher/masquer les versements selon leur état (payé / en retard / imminent / à venir).

**Composant de filtrage** : chips / switches (multi-sélection), par exemple :

- ☑ Payés (🟢)
- ☑ En retard (🔴)
- ☑ Imminents (🟠) *(\(N\) jours avant échéance, configurable)*
- ☑ À venir (🟡)
- ☐ Partiels (🟡/🟠 selon date) *(souvent masqué par défaut)*

**Règle de couleur (rappel)** :
- 🟢 `PAID` OU (`PARTIAL` ET `accumulatedAmount >= targetAmount`)
- 🔴 (`DUE` OU (`PARTIAL` ET `accumulatedAmount < targetAmount`)) ET date d'échéance `< aujourd'hui`
- 🟠 (`DUE` OU (`PARTIAL` ET `accumulatedAmount < targetAmount`)) ET date d'échéance `∈ [aujourd'hui ; aujourd'hui + N jours]`
- 🟡 (`DUE` OU (`PARTIAL` ET `accumulatedAmount < targetAmount`)) ET date d'échéance `> aujourd'hui + N jours`
- ⚪ Aucun versement

#### Changement de mois (passé / futur)

Comme c'est un calendrier, l'admin peut naviguer sur les **mois passés** et **mois futurs** :
- **Portée des données** : on charge uniquement les versements dont la date d'échéance calculée est **dans le mois affiché**.
- **Couleurs** : elles restent calculées **par rapport à la date du jour** (today). Donc :
  - Sur un mois passé : les versements non payés apparaîtront majoritairement en **rouge**.
  - Sur un mois futur : les versements non payés apparaîtront en **jaune/orange** selon le seuil \(N\).

#### Données à afficher par jour

Pour chaque jour du mois, afficher :
- Nombre de versements (`count`)
- Montant total des versements (`totalAmount`)
- Montant total déjà payé (`paidAmount`)
- Montant restant (`remainingAmount`)
- Liste des versements avec :
  - Nom du membre
  - Type de contrat (`DAILY`, `MONTHLY`)
  - Montant du versement (`targetAmount` pour le mois, ou montant journalier pour DAILY)
  - Montant accumulé (`accumulatedAmount`)
  - Statut (`DUE`, `PAID`, `PARTIAL`)
  - Numéro de mois (`monthIndex`)

### 3.2 Récupération des données

#### Calcul de la date d'échéance

Pour chaque `PaymentCI`, la date d'échéance doit être calculée :

```typescript
function calculateDueDate(contract: ContractCI, payment: PaymentCI): Date {
  const firstPaymentDate = new Date(contract.firstPaymentDate)
  
  if (contract.paymentFrequency === 'DAILY') {
    // Pour les contrats journaliers, chaque jour correspond à un versement
    // La date d'échéance est calculée en ajoutant monthIndex jours
    return addDays(firstPaymentDate, payment.monthIndex)
  } else {
    // Pour les contrats mensuels, chaque mois correspond à un versement
    // La date d'échéance est calculée en ajoutant monthIndex mois
    return addMonths(firstPaymentDate, payment.monthIndex)
  }
}
```

#### Requête pour un mois donné avec filtres

```typescript
// Exemple : récupérer tous les contrats actifs pour janvier 2024
// Filtrer par type de paiement selon les filtres sélectionnés

interface CalendarFilters {
  month: Date                    // Mois à afficher
  paymentFrequencies: ('DAILY' | 'MONTHLY')[]  // Types sélectionnés : ['DAILY'] par défaut
}

// Étape 1 : Récupérer les contrats avec les types sélectionnés
const contracts = await contractCIRepository.getContractsWithFilters({
  paymentFrequency: filters.paymentFrequencies.length === 1 
    ? filters.paymentFrequencies[0] 
    : undefined, // Si plusieurs types, ne pas filtrer au niveau du repository
  status: ['ACTIVE'], // Contrats actifs uniquement
  // Filtrer ensuite côté client si plusieurs types
})

// Filtrer par types si plusieurs sélectionnés
const filteredContracts = contracts.filter(c => 
  filters.paymentFrequencies.includes(c.paymentFrequency)
)

// Étape 2 : Pour chaque contrat, récupérer les versements du mois
const monthStart = startOfMonth(filters.month)
const monthEnd = endOfMonth(filters.month)

const payments: Array<PaymentCI & { contract: ContractCI; dueDate: Date }> = []

for (const contract of filteredContracts) {
  // Récupérer tous les versements du contrat
  const contractPayments = await paymentCIRepository.getPaymentsByContractId(
    contract.id
  )
  
  // Calculer la date d'échéance pour chaque versement
  const paymentsWithDueDate = contractPayments.map(p => ({
    ...p,
    contract,
    dueDate: calculateDueDate(contract, p)
  }))
  
  // Filtrer les versements du mois
  const monthPayments = paymentsWithDueDate.filter(p => {
    const dueDateStart = startOfDay(p.dueDate)
    return dueDateStart >= monthStart && dueDateStart <= monthEnd
  })
  
  payments.push(...monthPayments)
}

// Étape 3 : Grouper par jour
const groupedByDay = groupPaymentsByDay(payments)
```

#### Enrichissement des données

Pour chaque versement, il faut récupérer :
1. Les informations du contrat (`ContractCI`) pour obtenir le type de paiement et calculer la date d'échéance
2. Les informations du membre (`User`) pour l'affichage du nom (déjà dans le contrat : `memberFirstName`, `memberLastName`, `memberContacts`, `memberPhotoUrl`)

#### Groupement par jour

```typescript
interface DayPayments {
  date: Date
  payments: Array<PaymentCI & { contract: ContractCI; dueDate: Date }>
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  count: number
  statuses: ('DUE' | 'PAID' | 'PARTIAL')[]
  paymentFrequencies: ('DAILY' | 'MONTHLY')[] // Types de contrats présents ce jour
  color: 'green' | 'orange' | 'yellow' | 'red' | 'gray' // Couleur du jour selon la logique métier
}

// Fonction pour calculer la couleur d'un jour
function calculateDayColor(
  payments: Array<PaymentCI & { contract: ContractCI; dueDate: Date }>,
  today: Date
): 'green' | 'orange' | 'yellow' | 'red' | 'gray' {
  if (payments.length === 0) return 'gray'
  
  const todayStart = startOfDay(today)
  const IMMINENT_DAYS = 2 // configurable (ex: 0 = seulement aujourd'hui, 2 = J+2, 3 = J+3)
  
  // Vérifier s'il y a des versements en retard (rouge)
  const hasOverdue = payments.some(p => {
    const isDue = p.status === 'DUE' || (p.status === 'PARTIAL' && p.accumulatedAmount < p.targetAmount)
    if (!isDue) return false
    const dueStart = startOfDay(p.dueDate)
    return dueStart < todayStart
  })
  if (hasOverdue) return 'red'

  // Vérifier s'il y a des versements imminents (orange)
  const hasImminent = payments.some(p => {
    const isDue = p.status === 'DUE' || (p.status === 'PARTIAL' && p.accumulatedAmount < p.targetAmount)
    if (!isDue) return false
    const dueStart = startOfDay(p.dueDate)
    const diffDays = Math.floor((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= IMMINENT_DAYS
  })
  if (hasImminent) return 'orange'

  // Vérifier s'il y a des versements à venir (jaune)
  const hasUpcoming = payments.some(p => {
    const isDue = p.status === 'DUE' || (p.status === 'PARTIAL' && p.accumulatedAmount < p.targetAmount)
    if (!isDue) return false
    const dueStart = startOfDay(p.dueDate)
    const diffDays = Math.floor((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays > IMMINENT_DAYS
  })
  if (hasUpcoming) return 'yellow'
  
  // Vérifier si tous les versements sont payés (vert)
  const allPaid = payments.every(p => 
    p.status === 'PAID' || (p.status === 'PARTIAL' && p.accumulatedAmount >= p.targetAmount)
  )
  if (allPaid) return 'green'
  
  // Par défaut : jaune
  return 'yellow'
}

// Grouper les versements par jour
const today = new Date()
const groupedByDay = payments.reduce((acc, payment) => {
  const dayKey = format(payment.dueDate, 'yyyy-MM-dd')
  if (!acc[dayKey]) {
    acc[dayKey] = {
      date: payment.dueDate,
      payments: [],
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      count: 0,
      statuses: [],
      paymentFrequencies: [],
      color: 'gray' // Sera calculé après le groupement
    }
  }
  
  acc[dayKey].payments.push(payment)
  acc[dayKey].totalAmount += payment.targetAmount
  const paid = payment.status === 'PAID' || (payment.status === 'PARTIAL' && payment.accumulatedAmount >= payment.targetAmount)
  if (paid) {
    acc[dayKey].paidAmount += payment.accumulatedAmount
  } else {
    acc[dayKey].remainingAmount += (payment.targetAmount - payment.accumulatedAmount)
  }
  acc[dayKey].count++
  acc[dayKey].statuses.push(payment.status)
  
  if (!acc[dayKey].paymentFrequencies.includes(payment.contract.paymentFrequency)) {
    acc[dayKey].paymentFrequencies.push(payment.contract.paymentFrequency)
  }
  
  return acc
}, {} as Record<string, DayPayments>)

// Calculer la couleur pour chaque jour
Object.values(groupedByDay).forEach(day => {
  day.color = calculateDayColor(day.payments, today)
})
```

### 3.3 Interaction avec le calendrier

#### Clic sur un jour
Lorsqu'on clique sur un jour du calendrier :
1. Ouvrir un modal ou un panneau latéral avec la liste des versements du jour
2. Afficher la liste détaillée des versements de ce jour
3. Grouper par type de contrat (Journaliers, Mensuels)
4. Pour chaque versement dans la liste, afficher :
   - Nom du membre (déjà dans le contrat)
   - Type de contrat avec badge coloré
   - Montant du versement (`targetAmount`)
   - Montant accumulé (`accumulatedAmount`)
   - Montant restant (`targetAmount - accumulatedAmount`)
   - **Badge de couleur** selon le statut (vert/orange/jaune/rouge/gris)
   - Numéro de mois (`monthIndex`)
   - Date d'échéance calculée

#### Clic sur un versement individuel
Lorsqu'on clique sur un versement individuel (depuis la liste du jour ou directement depuis le calendrier) :
1. **Ouvrir une sidebar à droite** qui s'affiche avec animation
2. **Structure de la sidebar** en 3 zones :

##### Zone 1 : En-tête fixe (top-0, position fixed)
**Informations du membre et du contrat**
- Photo du membre (si disponible, `memberPhotoUrl`)
- Nom complet du membre (`memberFirstName` + `memberLastName`)
- Contacts du membre (`memberContacts`)
- Email du membre (`memberEmail`)
- **Informations du contrat** :
  - Type de contrat (Journalier/Mensuel) avec badge
  - ID du contrat
  - Statut du contrat (`ACTIVE`, `FINISHED`, `CANCELED`)
  - Forfait (`subscriptionCICode`, `subscriptionCILabel`)
  - Montant mensuel (`subscriptionCIAmountPerMonth`)
  - Mois en cours (`monthIndex` / `subscriptionCIDuration`)
  - Nombre de mois payés (`totalMonthsPaid`)

##### Zone 2 : Contenu scrollable (middle)
**Détails sur le versement et le contrat**
- **Informations du versement** :
  - Date d'échéance calculée (`dueDate`)
  - Montant objectif (`targetAmount`)
  - Montant accumulé (`accumulatedAmount`)
  - Montant restant (`targetAmount - accumulatedAmount`)
  - Statut avec badge coloré (`DUE`, `PAID`, `PARTIAL`)
  - Numéro de mois (`monthIndex`)
  - Liste des versements individuels (`versements`) :
    - Date et heure de chaque versement
    - Montant de chaque versement
    - Moyen de paiement
    - Pénalités appliquées (si applicable)
- **Historique des versements** (liste scrollable) :
  - Versements précédents du contrat
  - Versements suivants prévus
  - Statistiques du contrat (montant total payé, nombre de mois payés)

##### Zone 3 : Actions fixes (bottom-0, position fixed/absolute)
**Bouton d'action principal**
- **Si versement non payé** (`status === 'DUE'` OU (`status === 'PARTIAL'` ET `accumulatedAmount < targetAmount`)) :
  - Bouton "Faire un versement" (couleur primaire)
  - Au clic : Ouvrir le formulaire d'enregistrement de paiement
- **Si versement payé** (`status === 'PAID'` OU (`status === 'PARTIAL'` ET `accumulatedAmount >= targetAmount`)) :
  - Bouton "Voir le reçu" (couleur secondaire)
  - Au clic : Afficher le reçu PDF dans la zone scrollable
  - Bouton "Télécharger le reçu PDF" (icône de téléchargement)
  - Utiliser la fonctionnalité existante de génération/téléchargement de reçu

#### Enregistrement d'un paiement depuis la sidebar
1. Clic sur "Faire un versement" dans la sidebar
2. Ouvrir le modal de paiement existant (selon le type de contrat)
3. Pré-remplir :
   - `contractId` : ID du contrat
   - `monthIndex` : Index du mois du versement
   - Date suggérée : date d'échéance du versement ou date du jour
   - Montant suggéré : montant restant (`targetAmount - accumulatedAmount`)
4. L'admin saisit les informations du paiement (montant, moyen, preuve, etc.)
5. Après enregistrement :
   - Fermer le modal
   - Rafraîchir la sidebar (mettre à jour les informations)
   - Rafraîchir le calendrier
   - Mettre à jour les indicateurs visuels
   - Afficher une notification de succès
   - Le bouton passe de "Faire un versement" à "Voir le reçu" si le versement est complété

#### Affichage du reçu PDF dans la sidebar
1. Clic sur "Voir le reçu" pour un versement payé
2. **Afficher le reçu dans la zone scrollable** :
   - Intégrer un viewer PDF (iframe ou composant PDF viewer)
   - Afficher le reçu depuis `receiptUrl` du paiement (si disponible)
   - Si le reçu n'existe pas encore, le générer automatiquement
3. **Bouton de téléchargement** :
   - Toujours visible dans la zone d'actions (bottom)
   - Permet de télécharger le reçu en PDF
   - Utiliser la fonctionnalité existante de téléchargement

---

## 4. Structure technique

### 4.1 Composants à créer

#### `CalendarViewCI.tsx`
Composant principal du calendrier avec :
- Navigation mois/année
- Grille calendrier
- Filtres par type de contrat (switches)
- Gestion des clics sur les jours
- Intégration avec les hooks de données

#### `PaymentFrequencyFilters.tsx`
Composant pour les filtres par type :
- Switches pour chaque type (`DAILY`, `MONTHLY`)
- État par défaut : `DAILY` activé
- Gestion de l'état des filtres
- Callback pour notifier les changements

#### `CalendarDayCI.tsx`
Composant pour afficher un jour du calendrier :
- Badge avec compteur de versements
- **Indicateur visuel de couleur** :
  - Fond ou bordure colorée selon `dayPayments.color`
  - 🟢 Vert : Tous les versements payés
  - 🟠 Orange : Versements imminents (date proche, \(N\) jours)
  - 🟡 Jaune : Versements à venir (date future)
  - 🔴 Rouge : Versements en retard (date < aujourd'hui)
  - ⚪ Gris : Aucun versement
- Montant total affiché
- Badge indiquant les types de contrats présents
- Gestion du clic avec feedback visuel

#### `DayPaymentsModalCI.tsx`
Modal affichant les versements d'un jour :
- Liste des versements groupés par type de contrat
- Informations détaillées par versement
- **Badge de couleur pour chaque versement** selon la logique :
  - Fonction utilitaire `getPaymentColor(payment: PaymentCI, dueDate: Date, today: Date)` :
    ```typescript
    function getPaymentColor(
      payment: PaymentCI, 
      dueDate: Date, 
      today: Date
    ): 'green' | 'orange' | 'yellow' | 'red' | 'gray' {
      const IMMINENT_DAYS = 2 // configurable
      const isPaid = payment.status === 'PAID' || 
                     (payment.status === 'PARTIAL' && payment.accumulatedAmount >= payment.targetAmount)
      if (isPaid) return 'green'
      
      const todayStart = startOfDay(today)
      const dueDateStart = startOfDay(dueDate)
      if (dueDateStart < todayStart) return 'red'
      
      const diffDays = Math.floor((dueDateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays <= IMMINENT_DAYS ? 'orange' : 'yellow'
    }
    ```
- Clic sur un versement → ouvre `PaymentSidebarCI`

#### `PaymentSidebarCI.tsx`
Sidebar à droite affichant les détails d'un versement :

**Structure en 3 zones** :

1. **Zone en-tête (top-0, position fixed)**
   - Composant `PaymentSidebarHeaderCI.tsx`
   - Informations du membre :
     - Photo du membre (`memberPhotoUrl`)
     - Nom complet (`memberFirstName` + `memberLastName`)
     - Contacts (`memberContacts`)
     - Email (`memberEmail`)
   - Informations du contrat :
     - Type de contrat avec badge (Journalier/Mensuel)
     - ID du contrat
     - Statut du contrat
     - Forfait (code, label)
     - Montant mensuel
     - Progression (mois payés / durée totale)

2. **Zone contenu (middle, scrollable)**
   - Composant `PaymentSidebarContentCI.tsx`
   - Détails du versement :
     - Date d'échéance calculée
     - Montant objectif
     - Montant accumulé
     - Montant restant
     - Statut avec badge coloré
     - Liste des versements individuels (`versements`)
   - Historique des versements :
     - Liste des versements précédents
     - Versements suivants prévus
   - Statistiques du contrat :
     - Montant total payé
     - Nombre de mois payés
   - **Affichage du reçu PDF** (si versement payé et "Voir le reçu" cliqué) :
     - Viewer PDF intégré (iframe ou composant PDF)
     - Affichage depuis `receiptUrl` du paiement
     - Génération automatique si le reçu n'existe pas

3. **Zone actions (bottom-0, position fixed/absolute)**
   - Composant `PaymentSidebarActionsCI.tsx`
   - **Bouton conditionnel** :
     - Si `status === 'DUE'` OU (`status === 'PARTIAL'` ET `accumulatedAmount < targetAmount`) : Bouton "Faire un versement"
       - Ouvre le modal de paiement existant
     - Si `status === 'PAID'` OU (`status === 'PARTIAL'` ET `accumulatedAmount >= targetAmount`) : Bouton "Voir le reçu"
       - Affiche le reçu PDF dans la zone scrollable
       - Bouton "Télécharger le reçu PDF" (icône de téléchargement)
       - Utilise la fonctionnalité existante de téléchargement

**Fonctionnalités** :
- Animation d'ouverture/fermeture (slide depuis la droite)
- Overlay pour fermer la sidebar (clic en dehors)
- Bouton de fermeture (X) en haut à droite
- Responsive : s'adapte sur mobile (plein écran ou drawer)

### 4.2 Hooks à créer

#### `useCalendarCaisseImprevue(month: Date, paymentFrequencies: ('DAILY' | 'MONTHLY')[])`
Hook pour récupérer les versements d'un mois avec filtres :

```typescript
function useCalendarCaisseImprevue(
  month: Date, 
  paymentFrequencies: ('DAILY' | 'MONTHLY')[]
) {
  const filters = useMemo(() => ({
    monthStart: startOfMonth(month),
    monthEnd: endOfMonth(month),
    paymentFrequencies
  }), [month, paymentFrequencies])
  
  return useQuery({
    queryKey: ['calendar-payments-ci', format(month, 'yyyy-MM'), paymentFrequencies.join(',')],
    queryFn: async () => {
      // 1. Récupérer les contrats avec les types sélectionnés
      const contracts = await contractCIRepository.getContractsWithFilters({
        status: ['ACTIVE']
      })
      
      // Filtrer par types
      const filteredContracts = contracts.filter(c => 
        paymentFrequencies.includes(c.paymentFrequency)
      )
      
      // 2. Récupérer les versements pour chaque contrat
      const payments: Array<PaymentCI & { contract: ContractCI; dueDate: Date }> = []
      
      for (const contract of filteredContracts) {
        const contractPayments = await paymentCIRepository.getPaymentsByContractId(
          contract.id
        )
        
        // Calculer la date d'échéance pour chaque versement
        const paymentsWithDueDate = contractPayments.map(p => ({
          ...p,
          contract,
          dueDate: calculateDueDate(contract, p)
        }))
        
        // Filtrer les versements du mois
        const monthPayments = paymentsWithDueDate.filter(p => {
          const dueDateStart = startOfDay(p.dueDate)
          return dueDateStart >= filters.monthStart && dueDateStart <= filters.monthEnd
        })
        
        payments.push(...monthPayments)
      }
      
      // 3. Enrichir avec les données des membres (déjà dans le contrat)
      // 4. Grouper par jour
      return groupPaymentsByDay(payments)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

#### `useGroupedPaymentsByDayCI(payments: PaymentCI[])`
Hook pour grouper les versements par jour :

```typescript
function useGroupedPaymentsByDayCI(
  payments: Array<PaymentCI & { contract: ContractCI; dueDate: Date }>
) {
  return useMemo(() => {
    // Logique de groupement par jour
    // Enrichissement avec les données des membres (déjà dans le contrat)
    return groupedPayments
  }, [payments])
}
```

### 4.3 Services existants à réutiliser

- `CaisseImprevueService.createVersement()` : Pour enregistrer un paiement
- `ContractCIRepository.getContractsWithFilters()` : Pour récupérer les contrats
- `PaymentCIRepository.getPaymentsByContractId()` : Pour récupérer les versements
- **Services de génération/téléchargement de reçu PDF** :
  - Fonctionnalité existante dans les modules pour générer les reçus PDF
  - Fonctionnalité existante pour télécharger les reçus PDF
  - Réutiliser `receiptUrl` du paiement pour afficher le reçu
  - Si `receiptUrl` n'existe pas, utiliser le service de génération de reçu existant

### 4.4 Structure de la sidebar

#### Layout de la sidebar

```typescript
<div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-xl z-50 flex flex-col">
  {/* Zone 1 : En-tête fixe (top-0) */}
  <div className="fixed top-0 right-0 w-full md:w-96 bg-white border-b z-10">
    <PaymentSidebarHeaderCI 
      contract={contract}
      onClose={() => setSelectedPayment(null)}
    />
  </div>
  
  {/* Zone 2 : Contenu scrollable (middle) */}
  <div className="flex-1 overflow-y-auto pt-[header-height] pb-[actions-height]">
    <PaymentSidebarContentCI 
      payment={payment}
      contract={contract}
      paymentHistory={paymentHistory}
      showReceipt={showReceipt}
    />
  </div>
  
  {/* Zone 3 : Actions fixes (bottom-0) */}
  <div className="fixed bottom-0 right-0 w-full md:w-96 bg-white border-t z-10">
    <PaymentSidebarActionsCI 
      payment={payment}
      onRecordPayment={() => openPaymentModal()}
      onViewReceipt={() => setShowReceipt(true)}
      onDownloadReceipt={() => downloadReceipt()}
    />
  </div>
</div>
```

#### Gestion du reçu PDF

```typescript
// Hook pour gérer l'affichage et le téléchargement du reçu
function usePaymentReceiptCI(payment: PaymentCI) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(payment.receiptUrl || null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const generateReceipt = async () => {
    if (receiptUrl) return receiptUrl
    
    setIsGenerating(true)
    try {
      // Utiliser le service existant de génération de reçu
      const url = await caisseImprevueService.generateReceiptPDF(payment.id)
      setReceiptUrl(url)
      return url
    } catch (error) {
      console.error('Erreur lors de la génération du reçu:', error)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }
  
  const downloadReceipt = async () => {
    const url = receiptUrl || await generateReceipt()
    // Utiliser la fonctionnalité existante de téléchargement
    window.open(url, '_blank')
    // Ou utiliser un service de téléchargement
    // await downloadFile(url, `receipt_${payment.id}.pdf`)
  }
  
  return {
    receiptUrl,
    isGenerating,
    generateReceipt,
    downloadReceipt
  }
}
```

---

## 5. Logique métier

### 5.1 Calcul du statut d'un jour

Un jour peut avoir plusieurs versements avec différents statuts. Le statut visuel du jour est déterminé par la **priorité suivante** :

#### Logique de détermination de la couleur

```typescript
function getDayColor(
  payments: Array<PaymentCI & { contract: ContractCI; dueDate: Date }>, 
  today: Date
): 'green' | 'orange' | 'yellow' | 'red' | 'gray' {
  const todayStart = startOfDay(today)
  const IMMINENT_DAYS = 2 // configurable
  
  // Vérifier s'il y a des versements en retard (rouge)
  const hasOverdue = payments.some(p => {
    const isDue = p.status === 'DUE' || (p.status === 'PARTIAL' && p.accumulatedAmount < p.targetAmount)
    if (!isDue) return false
    const dueStart = startOfDay(p.dueDate)
    return dueStart < todayStart
  })
  if (hasOverdue) return 'red'
  
  // Vérifier s'il y a des versements imminents (orange)
  const hasImminent = payments.some(p => {
    const isDue = p.status === 'DUE' || (p.status === 'PARTIAL' && p.accumulatedAmount < p.targetAmount)
    if (!isDue) return false
    const dueStart = startOfDay(p.dueDate)
    const diffDays = Math.floor((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= IMMINENT_DAYS
  })
  if (hasImminent) return 'orange'

  // Vérifier s'il y a des versements à venir (jaune)
  const hasUpcoming = payments.some(p => {
    const isDue = p.status === 'DUE' || (p.status === 'PARTIAL' && p.accumulatedAmount < p.targetAmount)
    if (!isDue) return false
    const dueStart = startOfDay(p.dueDate)
    const diffDays = Math.floor((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays > IMMINENT_DAYS
  })
  if (hasUpcoming) return 'yellow'
  
  // Vérifier si tous les versements sont payés (vert)
  const allPaid = payments.length > 0 && payments.every(p => 
    p.status === 'PAID' || (p.status === 'PARTIAL' && p.accumulatedAmount >= p.targetAmount)
  )
  if (allPaid) return 'green'
  
  // Par défaut : jaune si des versements existent
  return payments.length > 0 ? 'yellow' : 'gray'
}
```

#### Priorité des couleurs

1. **🔴 Rouge (Priorité 1)** : En retard
   - Condition : Au moins un versement avec (`status === 'DUE'` OU (`status === 'PARTIAL'` ET `accumulatedAmount < targetAmount`)) ET date d'échéance `< aujourd'hui`
   - Exemple : On est le 13 janvier, il y a 2 versements prévus le 12 janvier qui n'ont pas été enregistrés → le jour du 12 sera en rouge
   - Signification : Action requise immédiatement

2. **🟠 Orange (Priorité 2)** : Imminent (à l'approche)
   - Condition : Au moins un versement `DUE` ou `PARTIAL` avec date d'échéance `∈ [aujourd'hui ; aujourd'hui + N jours]`
   - Signification : À traiter en priorité dans les prochains jours

3. **🟡 Jaune (Priorité 3)** : À venir
   - Condition : Au moins un versement `DUE` ou `PARTIAL` avec date d'échéance `> aujourd'hui + N jours`
   - Signification : Versements prévus mais pas encore urgents

4. **🟢 Vert (Priorité 4)** : Payé
   - Condition : Tous les versements ont `status === 'PAID'` OU (`status === 'PARTIAL'` ET `accumulatedAmount >= targetAmount`)
   - Signification : Tous les versements du jour ont été enregistrés

5. **⚪ Gris (Par défaut)** : Aucun versement
   - Condition : Aucun versement pour ce jour
   - Signification : Jour sans versement

#### Exemples concrets

**Exemple 1 : Jour avec versements mixtes**
- Date : 12 janvier
- Aujourd'hui : 13 janvier
- Versements :
  - Versement 1 : `dueDate = 12 janvier`, `status = 'DUE'` → En retard
  - Versement 2 : `dueDate = 12 janvier`, `status = 'PAID'` → Payé
- **Résultat** : 🔴 Rouge (priorité au versement en retard)

**Exemple 2 : Jour avec versement partiel**
- Date : 15 janvier
- Aujourd'hui : 13 janvier
- Versements :
  - Versement 1 : `dueDate = 15 janvier`, `status = 'PARTIAL'`, `accumulatedAmount = 5000`, `targetAmount = 10000` → Partiel
- **Résultat** : 🟠 Orange si \(N \ge 2\), sinon 🟡 Jaune

**Exemple 3 : Jour avec tous les versements payés**
- Date : 10 janvier
- Aujourd'hui : 13 janvier
- Versements :
  - Versement 1 : `dueDate = 10 janvier`, `status = 'PAID'` → Payé
  - Versement 2 : `dueDate = 10 janvier`, `status = 'PARTIAL'`, `accumulatedAmount = 10000`, `targetAmount = 10000` → Payé (complet)
- **Résultat** : 🟢 Vert (tous payés)

### 5.2 Filtrage par type de contrat

#### Comportement des filtres
- **Par défaut** : Seul `DAILY` est activé
- **Sélection multiple** : L'utilisateur peut activer plusieurs types simultanément
- **Désélection** : Si tous les filtres sont désactivés, afficher un message "Aucun filtre sélectionné"
- **Mise à jour** : Le calendrier se met à jour automatiquement lors du changement de filtre

#### Filtres par statut (optionnel)
En plus des filtres par type, on peut ajouter :
- Tous les versements
- Versements à venir uniquement (exclure `PAID`)
- Versements en retard uniquement (`DUE` ou `PARTIAL` avec date d'échéance `< aujourd'hui`)

### 5.3 Gestion des versements partiels

Si un versement a un statut `PARTIAL` :
- Afficher le montant payé (`accumulatedAmount`) et le montant restant (`targetAmount - accumulatedAmount`)
- Permettre d'enregistrer un nouveau paiement pour compléter le versement
- Le statut passera à `PAID` lorsque `accumulatedAmount >= targetAmount`

### 5.4 Différences entre types de contrats

#### Contrats Journaliers (`DAILY`)
- Versements quotidiens
- Peuvent avoir plusieurs `versements` dans un même `PaymentCI`
- Affichage par défaut dans le calendrier
- Badge spécial pour identifier ce type

#### Contrats Mensuels (`MONTHLY`)
- Versements mensuels
- Structure plus simple
- Affichage via filtre switch
- Badge spécial pour identifier ce type

---

## 6. Cas d'usage

### UC1 – Visualiser le calendrier mensuel (par défaut)

**Acteur** : Admin

**Scénario principal** :
1. L'admin accède à la page Calendrier > Caisse Imprévue
2. Le calendrier affiche le mois en cours
3. Par défaut, seuls les versements des contrats `DAILY` sont affichés
4. Les jours avec des versements sont marqués visuellement
5. L'admin peut naviguer vers les mois précédents/suivants

**Postconditions** :
- Le calendrier affiche uniquement les versements des contrats journaliers
- Les indicateurs visuels reflètent correctement les statuts

---

### UC2 – Filtrer par type de contrat

**Acteur** : Admin

**Scénario principal** :
1. L'admin voit les filtres par type de contrat (Journaliers activé par défaut)
2. L'admin active le filtre "Mensuels"
3. Le calendrier se met à jour pour afficher les versements des contrats `DAILY` et `MONTHLY`
4. L'admin peut désactiver le filtre "Journaliers" pour voir uniquement les mensuels

**Scénarios alternatifs** :
- Si l'admin désactive tous les filtres, afficher "Aucun filtre sélectionné"
- Les filtres peuvent être activés/désactivés indépendamment

**Postconditions** :
- Le calendrier affiche uniquement les versements des types sélectionnés
- Les indicateurs visuels sont mis à jour

---

### UC3 – Consulter les versements d'un jour

**Acteur** : Admin

**Scénario principal** :
1. L'admin clique sur un jour du calendrier
2. Un modal s'ouvre avec la liste des versements de ce jour
3. Les versements sont groupés par type de contrat (Journaliers, Mensuels)
4. Pour chaque versement, l'admin voit :
   - Nom du membre
   - Type de contrat avec badge
   - Montant objectif (`targetAmount`)
   - Montant accumulé (`accumulatedAmount`)
   - Montant restant
   - Statut
   - Numéro de mois (`monthIndex`)
5. L'admin peut fermer le modal

**Postconditions** :
- Les versements du jour sont affichés correctement
- Les informations sont à jour

---

### UC4 – Consulter les détails d'un versement (Sidebar)

**Acteur** : Admin

**Scénario principal** :
1. L'admin clique sur un versement (depuis la liste du jour ou directement depuis le calendrier)
2. Une sidebar s'ouvre à droite avec animation
3. **Zone en-tête (fixe en haut)** :
   - L'admin voit les informations du membre (photo, nom, contacts, email)
   - L'admin voit les informations du contrat (type, ID, statut, forfait, montant mensuel, progression)
4. **Zone contenu (scrollable au milieu)** :
   - L'admin voit les détails du versement (date, montant objectif, montant accumulé, montant restant, statut, etc.)
   - L'admin voit la liste des versements individuels (`versements`)
   - L'admin voit l'historique des versements du contrat
   - L'admin voit les statistiques du contrat
5. **Zone actions (fixe en bas)** :
   - Si le versement n'est pas payé : bouton "Faire un versement"
   - Si le versement est payé : bouton "Voir le reçu"
6. L'admin peut fermer la sidebar (bouton X ou clic sur l'overlay)

**Postconditions** :
- La sidebar affiche toutes les informations nécessaires
- Les informations sont à jour
- La sidebar peut être fermée facilement

---

### UC5 – Enregistrer un paiement depuis la sidebar

**Acteur** : Admin

**Scénario principal** :
1. L'admin ouvre la sidebar d'un versement non payé
2. L'admin clique sur "Faire un versement" dans la zone d'actions (en bas)
3. Le modal de paiement s'ouvre avec les informations pré-remplies :
   - `contractId` : ID du contrat
   - `monthIndex` : Index du mois
   - Date suggérée : date d'échéance du versement ou date du jour
   - Montant suggéré : montant restant (`targetAmount - accumulatedAmount`)
4. L'admin saisit les informations du paiement (montant, moyen, preuve, etc.)
5. L'admin valide le paiement
6. Le système enregistre le paiement
7. La sidebar se met à jour automatiquement :
   - Le bouton passe de "Faire un versement" à "Voir le reçu" si le versement est complété
   - Les informations du versement sont mises à jour
   - Le statut passe à `PAID` si `accumulatedAmount >= targetAmount`, sinon reste `PARTIAL`
8. Le calendrier se met à jour automatiquement (couleur passe en vert si complété)

**Scénarios alternatifs** :
- Si le montant saisi est inférieur au montant restant, le versement reste `PARTIAL`
- Si le paiement complète le versement, le statut passe à `PAID`
- Si le paiement est en retard, le système calcule les pénalités

**Postconditions** :
- Le paiement est enregistré
- Le versement est mis à jour
- La sidebar reflète les changements
- Le calendrier reflète les changements
- Les pénalités sont calculées si nécessaire

---

### UC6 – Consulter le reçu d'un versement payé

**Acteur** : Admin

**Scénario principal** :
1. L'admin ouvre la sidebar d'un versement payé (statut `PAID` ou `PARTIAL` avec `accumulatedAmount >= targetAmount`, couleur verte)
2. L'admin voit le bouton "Voir le reçu" dans la zone d'actions (en bas)
3. L'admin clique sur "Voir le reçu"
4. Le reçu PDF s'affiche dans la zone scrollable de la sidebar :
   - Si le reçu existe déjà (`receiptUrl`), il est affiché directement
   - Si le reçu n'existe pas, il est généré automatiquement
5. L'admin peut faire défiler pour voir tout le reçu
6. L'admin peut cliquer sur "Télécharger le reçu PDF" pour télécharger le fichier
7. Le reçu est téléchargé sur l'ordinateur de l'admin

**Scénarios alternatifs** :
- Si la génération du reçu échoue, afficher un message d'erreur
- Si le reçu est en cours de génération, afficher un indicateur de chargement

**Postconditions** :
- Le reçu est affiché dans la sidebar
- Le reçu peut être téléchargé
- La fonctionnalité existante de génération/téléchargement est réutilisée

---

## 7. Points d'attention

### 7.1 Performance
- **Pagination** : Pour les mois avec beaucoup de versements, envisager une pagination ou un chargement progressif
- **Cache** : Utiliser React Query pour mettre en cache les données du calendrier
- **Optimisation des requêtes** : 
  - Éviter de récupérer toutes les données des contrats si on peut les enrichir côté serveur
  - Utiliser des requêtes batch pour récupérer les versements de plusieurs contrats
  - Calculer les dates d'échéance côté client pour éviter des requêtes supplémentaires

### 7.2 Données manquantes
- Gérer les cas où un contrat n'existe plus (soft delete)
- Gérer les cas où un membre n'existe plus
- Afficher des valeurs par défaut si les données sont incomplètes
- Gérer les cas où `firstPaymentDate` est invalide ou manquant

### 7.3 Synchronisation
- Rafraîchir le calendrier après chaque paiement
- Utiliser les invalidations de React Query pour mettre à jour automatiquement
- Gérer les conflits si plusieurs admins modifient simultanément

### 7.4 Accessibilité
- Rendre le calendrier navigable au clavier
- Ajouter des labels ARIA pour les lecteurs d'écran
- Assurer un contraste suffisant pour les indicateurs visuels
- Rendre les switches accessibles
- Rendre la sidebar accessible au clavier (fermeture avec Escape, navigation au clavier)

### 7.5 UX spécifique aux filtres
- Indiquer clairement quel filtre est actif par défaut
- Permettre de réinitialiser les filtres à l'état par défaut
- Sauvegarder les préférences de filtres de l'utilisateur (localStorage)

### 7.6 UX spécifique à la sidebar
- **Animation** : Transition fluide à l'ouverture/fermeture (slide depuis la droite)
- **Overlay** : Fond semi-transparent pour mettre en évidence la sidebar
- **Responsive** : Sur mobile, la sidebar peut prendre tout l'écran ou être un drawer
- **Hauteurs fixes** : S'assurer que les zones fixes (header et actions) ont des hauteurs définies pour éviter les chevauchements
- **Scroll** : La zone scrollable doit avoir un padding-top et padding-bottom pour éviter que le contenu soit masqué par les zones fixes
- **Génération de reçu** : Afficher un indicateur de chargement pendant la génération du reçu
- **Erreurs** : Gérer les cas où le reçu ne peut pas être généré ou téléchargé
- **Performance** : Lazy loading des données du membre et de l'historique si volumineux

### 7.7 Calcul des dates d'échéance
- **Précision** : S'assurer que le calcul de la date d'échéance est correct pour les deux types de contrats
- **Gestion des jours** : Pour les contrats `DAILY`, gérer les cas où le jour calculé tombe un week-end ou jour férié (si applicable)
- **Gestion des mois** : Pour les contrats `MONTHLY`, gérer les cas où le mois suivant n'a pas le même nombre de jours (ex: 31 janvier → 28/29 février)

### 7.8 Fonctionnalités recommandées (pour un calendrier "optimal")

- **Recherche rapide** : champ de recherche (nom/matricule/téléphone) qui filtre les versements affichés.
- **Vue "liste" en parallèle** : toggle Calendrier ↔ Liste (triable par retard, montant, membre, type).
- **Compteurs/KPI du mois** : total à encaisser, déjà encaissé, reste à encaisser, nombre de retards.
- **Actions rapides** : bouton "Encaisser" directement depuis un item (sans repasser par la fiche contrat).
- **Sélection multiple & actions bulk** : marquer plusieurs versements, exporter, relancer.
- **Export** : PDF/Excel des versements du mois (avec filtres appliqués).
- **Rappels/notifications** : relance auto (J-1/J0/J+1) selon couleur (orange/rouge).
- **Historique d'activité** : qui a encaissé quoi et quand (audit simple).
- **Sauvegarde des filtres** : conserver type/couleur/recherche par utilisateur (localStorage).

---

## 8. Prochaines étapes

1. **Implémentation du composant calendrier de base**
   - Créer `CalendarViewCI.tsx` avec navigation mois/année
   - Créer `CalendarDayCI.tsx` pour l'affichage des jours
   - Intégrer avec les hooks de données

2. **Implémentation des filtres par type**
   - Créer `PaymentFrequencyFilters.tsx` avec switches
   - Gérer l'état par défaut (`DAILY` activé)
   - Intégrer avec le hook de données

3. **Enrichissement des données**
   - Créer le hook `useCalendarCaisseImprevue`
   - Calculer les dates d'échéance pour chaque versement
   - Enrichir les versements avec les données des contrats (déjà présentes)
   - Grouper les versements par jour

4. **Modal de consultation des versements d'un jour**
   - Créer `DayPaymentsModalCI.tsx`
   - Afficher la liste des versements groupés par type
   - Permettre de cliquer sur un versement pour ouvrir la sidebar

5. **Implémentation de la sidebar**
   - Créer `PaymentSidebarCI.tsx` avec structure en 3 zones
   - Créer `PaymentSidebarHeaderCI.tsx` (zone fixe en haut)
   - Créer `PaymentSidebarContentCI.tsx` (zone scrollable au milieu)
   - Créer `PaymentSidebarActionsCI.tsx` (zone fixe en bas)
   - Intégrer l'affichage du reçu PDF
   - Intégrer le téléchargement du reçu PDF
   - Intégrer avec le modal de paiement existant

6. **Gestion du reçu PDF**
   - Créer le hook `usePaymentReceiptCI`
   - Intégrer avec les services existants de génération de reçu
   - Intégrer avec les services existants de téléchargement de reçu
   - Gérer les états de chargement et d'erreur

7. **Tests et optimisations**
   - Tester avec différents scénarios (beaucoup de versements, différents types, etc.)
   - Tester la sidebar sur différents écrans (desktop, tablette, mobile)
   - Optimiser les performances
   - Améliorer l'UX

---

## 9. Analyse UML (proposition)

> Objectif : proposer une **mise en place du calendrier** (Caisse Imprévue) en respectant l'architecture du projet (Pages/Components/Hooks/Services/Repositories/Types), et en réutilisant les logiques existantes (enregistrement paiement, reçu PDF, etc.).

### 9.1 Diagramme de packages (architecture cible)

```plantuml
@startuml
title Packages – Calendrier Caisse Imprévue (aligné architecture)
skinparam packageStyle rectangle

package "src/app/(admin)/calendrier" as App {
  [page.tsx] as CalendarPage
}

package "src/components/calendrier" as Components {
  [CalendarViewCI.tsx] as CalendarViewCI
  [PaymentFrequencyFilters.tsx] as PaymentFrequencyFilters
  [ColorFilters.tsx] as ColorFilters
  [DayPaymentsModalCI.tsx] as DayPaymentsModalCI
  [PaymentSidebarCI.tsx] as PaymentSidebarCI
  [PaymentSidebarHeaderCI.tsx] as PaymentSidebarHeaderCI
  [PaymentSidebarContentCI.tsx] as PaymentSidebarContentCI
  [PaymentSidebarActionsCI.tsx] as PaymentSidebarActionsCI
}

package "src/hooks" as Hooks {
  [useCalendarCaisseImprevue.ts] as UseCalendarCI
  [usePaymentReceiptCI.ts] as UsePaymentReceiptCI
}

package "src/services" as Services {
  [CaisseImprevueService] as CaisseImprevueService
}

package "src/repositories" as Repos {
  [ContractCIRepository] as ContractCIRepo
  [PaymentCIRepository] as PaymentCIRepo
  [DocumentRepository] as DocRepo
}

package "src/types" as Types {
  [ContractCI] as ContractCIType
  [PaymentCI] as PaymentCIType
}

CalendarPage --> CalendarViewCI
CalendarViewCI --> PaymentFrequencyFilters
CalendarViewCI --> ColorFilters
CalendarViewCI --> DayPaymentsModalCI
CalendarViewCI --> PaymentSidebarCI

CalendarViewCI --> UseCalendarCI
PaymentSidebarCI --> UsePaymentReceiptCI

UseCalendarCI --> CaisseImprevueService

CaisseImprevueService --> ContractCIRepo
CaisseImprevueService --> PaymentCIRepo
CaisseImprevueService --> DocRepo

@enduml
```

### 9.2 Diagramme de classes (conceptuel)

```plantuml
@startuml
title Classes – Modèle conceptuel Calendrier Caisse Imprévue
skinparam classAttributeIconSize 0

enum PaymentFrequency {
  DAILY
  MONTHLY
}

enum PaymentCIStatus {
  DUE
  PAID
  PARTIAL
}

enum PaymentColor {
  green
  orange
  yellow
  red
  gray
}

class CalendarFilters {
  +month: Date
  +paymentFrequencies: PaymentFrequency[]
  +colorFilters: PaymentColor[]
  +imminentDays: number
  +search?: string
}

class CalendarPaymentItemCI {
  +paymentId: string
  +contractId: string
  +dueDate: Date
  +targetAmount: number
  +accumulatedAmount: number
  +status: PaymentCIStatus
  +color: PaymentColor
  +memberId: string
  +memberDisplayName: string
  +paymentFrequencyLabel: string
  +receiptUrl?: string
}

class CalendarDaySummaryCI {
  +date: Date
  +count: number
  +totalAmount: number
  +paidAmount: number
  +remainingAmount: number
  +color: PaymentColor
  +items: CalendarPaymentItemCI[*]
}

class PaymentColorPolicy {
  +imminentDays: number
  +getPaymentColor(payment, dueDate, today): PaymentColor
  +getDayColor(payments, today): PaymentColor
}

class DueDateCalculator {
  +calculateDueDate(contract, payment): Date
}

class CalendarCaisseImprevueQuery {
  +getMonthPayments(filters): CalendarDaySummaryCI[*]
}

CalendarCaisseImprevueQuery --> CalendarFilters
CalendarCaisseImprevueQuery --> CalendarDaySummaryCI
CalendarDaySummaryCI "1" o-- "*" CalendarPaymentItemCI
CalendarPaymentItemCI --> PaymentColor
CalendarFilters --> PaymentColor
PaymentColorPolicy --> PaymentColor
CalendarCaisseImprevueQuery --> PaymentColorPolicy
CalendarCaisseImprevueQuery --> DueDateCalculator

@enduml
```

### 9.3 Diagramme de cas d'utilisation (Admin)

```plantuml
@startuml
title Use cases – Calendrier (Caisse Imprévue)
left to right direction

actor Admin

rectangle "Calendrier (Caisse Imprévue)" {
  usecase "UC1\nConsulter le mois" as UC1
  usecase "UC2\nFiltrer par type" as UC2
  usecase "UC3\nFiltrer par couleur" as UC3
  usecase "UC4\nOuvrir sidebar versement" as UC4
  usecase "UC5\nEnregistrer versement" as UC5
  usecase "UC6\nVoir / télécharger reçu" as UC6
}

Admin --> UC1
Admin --> UC2
Admin --> UC3
Admin --> UC4
Admin --> UC5
Admin --> UC6

UC4 ..> UC5 : <<extend>>
UC4 ..> UC6 : <<extend>>
@enduml
```

### 9.4 Diagramme de séquence – Charger un mois (avec filtres)

```plantuml
@startuml
title Séquence – Charger calendrier mensuel (Caisse Imprévue)

actor Admin
participant "UI CalendarViewCI" as UI
participant "Hook useCalendarCaisseImprevue" as Hook
participant "CaisseImprevueService" as Service
database "ContractCIRepository" as ContractRepo
database "PaymentCIRepository" as PaymentRepo

Admin -> UI : Ouvre page calendrier / change mois / change filtres
UI -> Hook : loadMonth(filters)
Hook -> Service : getContracts(filters.paymentFrequencies)
Service -> ContractRepo : getContractsWithFilters(status, paymentFrequency?)
ContractRepo --> Service : contracts[]

loop pour chaque contrat
  Service -> PaymentRepo : getPaymentsByContractId(contractId)
  PaymentRepo --> Service : payments[]
  Service -> Service : calculateDueDate(contract, payment) pour chaque payment
end

Service --> Hook : payments enrichis (contracts + payments + dueDate)
Hook -> Hook : filterByMonth + groupByDay + compute colors + apply colorFilters/search
Hook --> UI : days[] (CalendarDaySummaryCI)
UI --> Admin : Affichage calendrier
@enduml
```

### 9.5 Diagramme de séquence – Enregistrer un versement (depuis sidebar)

```plantuml
@startuml
title Séquence – Enregistrer versement depuis la sidebar

actor Admin
participant "UI CalendarViewCI" as UI
participant "PaymentSidebarCI" as Sidebar
participant "Modal Paiement (existant)" as Modal
participant "CaisseImprevueService" as Service
database "PaymentCIRepository" as PaymentRepo
participant "Documents/Storage" as Docs

Admin -> UI : Clique un versement (DUE ou PARTIAL)
UI -> Sidebar : open(payment)
Sidebar --> Admin : Affiche détails + bouton "Faire un versement"

Admin -> Sidebar : Clique "Faire un versement"
Sidebar -> Modal : open(prefill contractId/monthIndex/dueDate/amount)
Admin -> Modal : Saisit infos (montant/mode/preuve/date/heure)
Modal -> Service : createVersement(contractId, monthIndex, versementData, proofFile, userId)
Service -> PaymentRepo : addVersement + updatePaymentStatus
PaymentRepo --> Service : OK
opt Génération reçu
  Service -> Docs : generateReceiptPDF(paymentId)
  Docs --> Service : receiptUrl
  Service -> PaymentRepo : update receiptUrl
end
Service --> Modal : success
Modal --> Sidebar : close + refresh
Sidebar -> UI : invalidateQueries (calendar month)
UI --> Admin : couleurs mises à jour (vert si complété)
@enduml
```

### 9.6 Diagramme de séquence – Voir / télécharger un reçu (depuis sidebar)

```plantuml
@startuml
title Séquence – Voir / télécharger reçu PDF

actor Admin
participant "PaymentSidebarCI" as Sidebar
participant "Hook usePaymentReceiptCI" as ReceiptHook
participant "CaisseImprevueService" as Service
database "PaymentCIRepository" as PaymentRepo
participant "Documents/Storage" as Docs

Admin -> Sidebar : Clique versement (PAID ou PARTIAL complet)
Sidebar --> Admin : Bouton "Voir le reçu"
Admin -> Sidebar : Clique "Voir le reçu"
Sidebar -> ReceiptHook : ensureReceipt()
alt receiptUrl existe
  ReceiptHook --> Sidebar : receiptUrl
else receiptUrl absent
  ReceiptHook -> Service : generateReceiptPDF(paymentId)
  Service -> Docs : generateReceiptPDF(paymentId)
  Docs --> Service : receiptUrl
  Service -> PaymentRepo : update receiptUrl
  PaymentRepo --> Service : OK
  Service --> ReceiptHook : receiptUrl
  ReceiptHook --> Sidebar : receiptUrl
end
Sidebar --> Admin : Affiche PDF (viewer)
Admin -> Sidebar : Clique "Télécharger"
Sidebar -> ReceiptHook : downloadReceipt()
ReceiptHook --> Admin : téléchargement (open / download)
@enduml
```

### 9.7 Diagramme d'activité – Couleurs + filtres (type/couleur/recherche)

```plantuml
@startuml
title Activité – Construire la vue calendrier (couleurs + filtres)
start
:Charger contrats actifs (filtres paymentFrequency);
:Pour chaque contrat, charger payments;
:Calculer dueDate pour chaque payment (calculateDueDate);
:Filtrer payments du mois (dueDate dans monthStart/monthEnd);
:Enrichir avec données contrat (déjà présentes);
:Calculer couleur de chaque payment (vert/rouge/orange/jaune/gris);
:Appliquer filtres type (paymentFrequencies);
:Appliquer filtres couleur (colorFilters);
:Appliquer recherche (nom/matricule/téléphone);
:Grouper par jour;
:Calculer couleur du jour (priorité rouge > orange > jaune > vert > gris);
:Rendre la grille calendrier + indicateurs;
stop
@enduml
```

---

## 10. Références

- Types : `src/types/types.ts` (ContractCI, PaymentCI, VersementCI)
- Repository : `src/repositories/caisse-imprevu/` (ContractCIRepository, PaymentCIRepository)
- Service : `src/services/caisse-imprevue/` (CaisseImprevueService)
- Documentation caisse imprévue : `documentation/caisse-imprevue/ANALYSE_CAISSE_IMPREVUE_CONTRATS.md`
- Architecture globale : `documentation/architecture/ARCHITECTURE.md`
- Documentation calendrier caisse spéciale : `documentation/calendrier/ANALYSE_CALENDRIER_CAISSE_SPECIALE.md` (référence pour la structure)
