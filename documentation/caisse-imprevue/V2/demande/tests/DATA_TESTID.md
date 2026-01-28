# Data-testid - Module Demandes Caisse Imprévue V2

## 📋 Vue d'ensemble

Ce document liste tous les `data-testid` à ajouter dans les composants pour faciliter les tests E2E.

**Total estimé : ~120 data-testid**

**⚠️ IMPORTANT :** Tous ces `data-testid` doivent être ajoutés dans les composants avant d'implémenter les tests E2E.

---

## 🎯 Convention de nommage

Format : `ci-demand-[element]-[action?]`

Exemples :
- `ci-demand-list-search-input` : Input de recherche dans la liste
- `ci-demand-form-step1-member-search` : Recherche membre étape 1
- `ci-demand-card-approve-button` : Bouton accepter sur une card

**Préfixe** : `ci-demand-` (Caisse Imprévue - Demandes)

---

## 📦 1. Page Liste des Demandes

### 1.1 Header

```tsx
<div data-testid="ci-demand-list-header">
  <h1 data-testid="ci-demand-list-title">Demandes Caisse Imprévue</h1>
  <p data-testid="ci-demand-list-description">Gérez les demandes...</p>
  <Button data-testid="ci-demand-list-export-button">Exporter</Button>
  <Button data-testid="ci-demand-list-new-button">Nouvelle demande</Button>
</div>
```

**Liste des data-testid :**
- `ci-demand-list-header` : Container du header
- `ci-demand-list-title` : Titre de la page
- `ci-demand-list-description` : Description sous le titre
- `ci-demand-list-export-button` : Bouton export
- `ci-demand-list-new-button` : Bouton nouvelle demande

---

### 1.2 Statistiques

```tsx
<div data-testid="ci-demand-list-stats">
  <div data-testid="ci-demand-stat-total">
    <span data-testid="ci-demand-stat-total-label">Total</span>
    <span data-testid="ci-demand-stat-total-value">45</span>
  </div>
  <div data-testid="ci-demand-stat-pending">
    <span data-testid="ci-demand-stat-pending-label">En attente</span>
    <span data-testid="ci-demand-stat-pending-value">12</span>
  </div>
  <div data-testid="ci-demand-stat-approved">
    <span data-testid="ci-demand-stat-approved-label">Acceptées</span>
    <span data-testid="ci-demand-stat-approved-value">28</span>
  </div>
  <div data-testid="ci-demand-stat-rejected">
    <span data-testid="ci-demand-stat-rejected-label">Refusées</span>
    <span data-testid="ci-demand-stat-rejected-value">5</span>
  </div>
</div>
```

**Liste des data-testid :**
- `ci-demand-list-stats` : Container des stats
- `ci-demand-stat-total` : Card stat total
- `ci-demand-stat-total-label` : Label "Total"
- `ci-demand-stat-total-value` : Valeur du total
- `ci-demand-stat-pending` : Card stat en attente
- `ci-demand-stat-pending-label` : Label "En attente"
- `ci-demand-stat-pending-value` : Valeur en attente
- `ci-demand-stat-approved` : Card stat acceptées
- `ci-demand-stat-approved-label` : Label "Acceptées"
- `ci-demand-stat-approved-value` : Valeur acceptées
- `ci-demand-stat-rejected` : Card stat refusées
- `ci-demand-stat-rejected-label` : Label "Refusées"
- `ci-demand-stat-rejected-value` : Valeur refusées

---

### 1.3 Tabs

```tsx
<Tabs data-testid="ci-demand-list-tabs">
  <TabsList>
    <TabsTrigger data-testid="ci-demand-tab-all">Toutes</TabsTrigger>
    <TabsTrigger data-testid="ci-demand-tab-pending">En attente</TabsTrigger>
    <TabsTrigger data-testid="ci-demand-tab-approved">Acceptées</TabsTrigger>
    <TabsTrigger data-testid="ci-demand-tab-rejected">Refusées</TabsTrigger>
    <TabsTrigger data-testid="ci-demand-tab-reopened">Réouvertes</TabsTrigger>
  </TabsList>
</Tabs>
```

**Liste des data-testid :**
- `ci-demand-list-tabs` : Container des tabs
- `ci-demand-tab-all` : Tab "Toutes"
- `ci-demand-tab-pending` : Tab "En attente"
- `ci-demand-tab-approved` : Tab "Acceptées"
- `ci-demand-tab-rejected` : Tab "Refusées"
- `ci-demand-tab-reopened` : Tab "Réouvertes"

---

### 1.4 Barre de Recherche et Filtres

```tsx
<div data-testid="ci-demand-list-filters">
  <Input
    data-testid="ci-demand-list-search-input"
    placeholder="Rechercher par nom ou prénom..."
  />
  
  <Select data-testid="ci-demand-filter-date">
    <SelectTrigger data-testid="ci-demand-filter-date-trigger">
      <SelectValue placeholder="Filtrer par date" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem data-testid="ci-demand-filter-date-all">Toutes les dates</SelectItem>
      <SelectItem data-testid="ci-demand-filter-date-today">Aujourd'hui</SelectItem>
      <SelectItem data-testid="ci-demand-filter-date-week">Cette semaine</SelectItem>
      <SelectItem data-testid="ci-demand-filter-date-month">Ce mois</SelectItem>
    </SelectContent>
  </Select>
  
  <Select data-testid="ci-demand-filter-frequency">
    <SelectTrigger data-testid="ci-demand-filter-frequency-trigger">
      <SelectValue placeholder="Fréquence" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem data-testid="ci-demand-filter-frequency-all">Toutes</SelectItem>
      <SelectItem data-testid="ci-demand-filter-frequency-monthly">Mensuel</SelectItem>
      <SelectItem data-testid="ci-demand-filter-frequency-daily">Journalier</SelectItem>
    </SelectContent>
  </Select>
  
  <Select data-testid="ci-demand-filter-sort">
    <SelectTrigger data-testid="ci-demand-filter-sort-trigger">
      <SelectValue placeholder="Trier par" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem data-testid="ci-demand-sort-date-desc">Date (récent)</SelectItem>
      <SelectItem data-testid="ci-demand-sort-date-asc">Date (ancien)</SelectItem>
      <SelectItem data-testid="ci-demand-sort-name-asc">Nom (A-Z)</SelectItem>
      <SelectItem data-testid="ci-demand-sort-name-desc">Nom (Z-A)</SelectItem>
    </SelectContent>
  </Select>
  
  <Button data-testid="ci-demand-filters-reset-button">Réinitialiser</Button>
</div>
```

**Liste des data-testid :**
- `ci-demand-list-filters` : Container des filtres
- `ci-demand-list-search-input` : Input de recherche
- `ci-demand-filter-date` : Select filtre date
- `ci-demand-filter-date-trigger` : Trigger du select date
- `ci-demand-filter-date-all` : Option "Toutes les dates"
- `ci-demand-filter-date-today` : Option "Aujourd'hui"
- `ci-demand-filter-date-week` : Option "Cette semaine"
- `ci-demand-filter-date-month` : Option "Ce mois"
- `ci-demand-filter-frequency` : Select filtre fréquence
- `ci-demand-filter-frequency-trigger` : Trigger du select fréquence
- `ci-demand-filter-frequency-all` : Option "Toutes"
- `ci-demand-filter-frequency-monthly` : Option "Mensuel"
- `ci-demand-filter-frequency-daily` : Option "Journalier"
- `ci-demand-filter-sort` : Select tri
- `ci-demand-filter-sort-trigger` : Trigger du select tri
- `ci-demand-sort-date-desc` : Option "Date (récent)"
- `ci-demand-sort-date-asc` : Option "Date (ancien)"
- `ci-demand-sort-name-asc` : Option "Nom (A-Z)"
- `ci-demand-sort-name-desc` : Option "Nom (Z-A)"
- `ci-demand-filters-reset-button` : Bouton réinitialiser

---

### 1.5 Toggle Vue Liste/Cards

```tsx
<ToggleGroup data-testid="ci-demand-view-toggle">
  <Toggle data-testid="ci-demand-view-list" value="list">
    <List /> Liste
  </Toggle>
  <Toggle data-testid="ci-demand-view-cards" value="cards">
    <Grid3x3 /> Cards
  </Toggle>
</ToggleGroup>
```

**Liste des data-testid :**
- `ci-demand-view-toggle` : Container du toggle
- `ci-demand-view-list` : Bouton vue liste
- `ci-demand-view-cards` : Bouton vue cards

---

### 1.6 Card Demande (Vue Cards)

```tsx
<Card data-testid={`ci-demand-card-${demandId}`}>
  <CardHeader>
    <div data-testid={`ci-demand-card-${demandId}-header`}>
      <Badge data-testid={`ci-demand-card-${demandId}-status-badge`}>
        {statusLabel}
      </Badge>
    </div>
  </CardHeader>
  
  <CardContent>
    <div data-testid={`ci-demand-card-${demandId}-member-name`}>
      {memberName}
    </div>
    <div data-testid={`ci-demand-card-${demandId}-member-phone`}>
      {phone}
    </div>
    <div data-testid={`ci-demand-card-${demandId}-amount`}>
      {amount} FCFA/mois
    </div>
    <div data-testid={`ci-demand-card-${demandId}-duration`}>
      {duration} mois
    </div>
    <div data-testid={`ci-demand-card-${demandId}-cause`}>
      {cause}
    </div>
    
    <div data-testid={`ci-demand-card-${demandId}-actions`}>
      {status === 'PENDING' && (
        <>
          <Button data-testid={`ci-demand-card-${demandId}-approve-button`}>
            Accepter
          </Button>
          <Button data-testid={`ci-demand-card-${demandId}-reject-button`}>
            Refuser
          </Button>
        </>
      )}
      {status === 'REJECTED' && (
        <>
          <Button data-testid={`ci-demand-card-${demandId}-reopen-button`}>
            Réouvrir
          </Button>
          <Button data-testid={`ci-demand-card-${demandId}-delete-button`}>
            Supprimer
          </Button>
        </>
      )}
      {status === 'APPROVED' && (
        <Button data-testid={`ci-demand-card-${demandId}-create-contract-button`}>
          Créer contrat
        </Button>
      )}
      <Button data-testid={`ci-demand-card-${demandId}-details-button`}>
        Voir détails
      </Button>
    </div>
  </CardContent>
</Card>
```

**Liste des data-testid :**
- `ci-demand-card-{demandId}` : Container de la card
- `ci-demand-card-{demandId}-header` : Header de la card
- `ci-demand-card-{demandId}-status-badge` : Badge de statut
- `ci-demand-card-{demandId}-member-name` : Nom du membre
- `ci-demand-card-{demandId}-member-phone` : Téléphone du membre
- `ci-demand-card-{demandId}-amount` : Montant mensuel
- `ci-demand-card-{demandId}-duration` : Durée
- `ci-demand-card-{demandId}-cause` : Motif de la demande
- `ci-demand-card-{demandId}-actions` : Container des actions
- `ci-demand-card-{demandId}-approve-button` : Bouton accepter
- `ci-demand-card-{demandId}-reject-button` : Bouton refuser
- `ci-demand-card-{demandId}-reopen-button` : Bouton réouvrir
- `ci-demand-card-{demandId}-delete-button` : Bouton supprimer
- `ci-demand-card-{demandId}-create-contract-button` : Bouton créer contrat
- `ci-demand-card-{demandId}-details-button` : Bouton voir détails

---

### 1.7 Table Demande (Vue Liste)

```tsx
<Table data-testid="ci-demand-list-table">
  <TableHeader>
    <TableRow>
      <TableHead data-testid="ci-demand-table-header-status">Statut</TableHead>
      <TableHead data-testid="ci-demand-table-header-name">Nom</TableHead>
      <TableHead data-testid="ci-demand-table-header-phone">Téléphone</TableHead>
      <TableHead data-testid="ci-demand-table-header-amount">Montant</TableHead>
      <TableHead data-testid="ci-demand-table-header-duration">Durée</TableHead>
      <TableHead data-testid="ci-demand-table-header-date">Date</TableHead>
      <TableHead data-testid="ci-demand-table-header-actions">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {demands.map(demand => (
      <TableRow key={demand.id} data-testid={`ci-demand-table-row-${demand.id}`}>
        <TableCell>
          <Badge data-testid={`ci-demand-table-row-${demand.id}-status-badge`}>
            {statusLabel}
          </Badge>
        </TableCell>
        <TableCell data-testid={`ci-demand-table-row-${demand.id}-member-name`}>
          {memberName}
        </TableCell>
        <TableCell data-testid={`ci-demand-table-row-${demand.id}-phone`}>
          {phone}
        </TableCell>
        <TableCell data-testid={`ci-demand-table-row-${demand.id}-amount`}>
          {amount} FCFA/mois
        </TableCell>
        <TableCell data-testid={`ci-demand-table-row-${demand.id}-duration`}>
          {duration} mois
        </TableCell>
        <TableCell data-testid={`ci-demand-table-row-${demand.id}-date`}>
          {createdAt}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger data-testid={`ci-demand-table-row-${demand.id}-actions-menu`}>
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem data-testid={`ci-demand-table-row-${demand.id}-approve-menu`}>
                Accepter
              </DropdownMenuItem>
              <DropdownMenuItem data-testid={`ci-demand-table-row-${demand.id}-reject-menu`}>
                Refuser
              </DropdownMenuItem>
              <DropdownMenuItem data-testid={`ci-demand-table-row-${demand.id}-details-menu`}>
                Voir détails
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Liste des data-testid :**
- `ci-demand-list-table` : Container de la table
- `ci-demand-table-header-status` : Header colonne statut
- `ci-demand-table-header-name` : Header colonne nom
- `ci-demand-table-header-phone` : Header colonne téléphone
- `ci-demand-table-header-amount` : Header colonne montant
- `ci-demand-table-header-duration` : Header colonne durée
- `ci-demand-table-header-date` : Header colonne date
- `ci-demand-table-header-actions` : Header colonne actions
- `ci-demand-table-row-{demandId}` : Ligne de la table
- `ci-demand-table-row-{demandId}-status-badge` : Badge statut dans la ligne
- `ci-demand-table-row-{demandId}-member-name` : Nom dans la ligne
- `ci-demand-table-row-{demandId}-phone` : Téléphone dans la ligne
- `ci-demand-table-row-{demandId}-amount` : Montant dans la ligne
- `ci-demand-table-row-{demandId}-duration` : Durée dans la ligne
- `ci-demand-table-row-{demandId}-date` : Date dans la ligne
- `ci-demand-table-row-{demandId}-actions-menu` : Menu dropdown actions
- `ci-demand-table-row-{demandId}-approve-menu` : Menu item accepter
- `ci-demand-table-row-{demandId}-reject-menu` : Menu item refuser
- `ci-demand-table-row-{demandId}-details-menu` : Menu item voir détails

---

### 1.8 Pagination

```tsx
<div data-testid="ci-demand-list-pagination">
  <PaginationWithEllipses>
    <PaginationPrevious data-testid="ci-demand-pagination-prev-button">
      Précédent
    </PaginationPrevious>
    <PaginationItem data-testid="ci-demand-pagination-page-1">1</PaginationItem>
    <PaginationItem data-testid="ci-demand-pagination-page-2">2</PaginationItem>
    <PaginationNext data-testid="ci-demand-pagination-next-button">
      Suivant
    </PaginationNext>
  </PaginationWithEllipses>
  <div data-testid="ci-demand-pagination-info">
    Affichant 1-10 sur 45 demandes
  </div>
</div>
```

**Liste des data-testid :**
- `ci-demand-list-pagination` : Container de la pagination
- `ci-demand-pagination-prev-button` : Bouton précédent
- `ci-demand-pagination-next-button` : Bouton suivant
- `ci-demand-pagination-page-{pageNumber}` : Bouton page spécifique
- `ci-demand-pagination-info` : Info pagination (X-Y sur Z)

---

### 1.9 Empty State

```tsx
<div data-testid="ci-demand-list-empty">
  <Inbox data-testid="ci-demand-list-empty-icon" />
  <h3 data-testid="ci-demand-list-empty-title">
    Aucune demande trouvée
  </h3>
  <p data-testid="ci-demand-list-empty-message">
    Commencez par créer une nouvelle demande
  </p>
  <Button data-testid="ci-demand-list-empty-create-button">
    Créer une demande
  </Button>
</div>
```

**Liste des data-testid :**
- `ci-demand-list-empty` : Container empty state
- `ci-demand-list-empty-icon` : Icône empty state
- `ci-demand-list-empty-title` : Titre empty state
- `ci-demand-list-empty-message` : Message empty state
- `ci-demand-list-empty-create-button` : Bouton créer depuis empty state

---

### 1.10 Loading State

```tsx
<div data-testid="ci-demand-list-loading">
  <Loader2 data-testid="ci-demand-list-loading-spinner" />
  <span data-testid="ci-demand-list-loading-text">Chargement...</span>
</div>
```

**Liste des data-testid :**
- `ci-demand-list-loading` : Container loading
- `ci-demand-list-loading-spinner` : Spinner loading
- `ci-demand-list-loading-text` : Texte "Chargement..."

---

## 📝 2. Formulaire de Création (3 Étapes)

### 2.1 Header et Breadcrumb

```tsx
<Breadcrumb data-testid="ci-demand-form-breadcrumb">
  <BreadcrumbItem>
    <BreadcrumbLink data-testid="ci-demand-form-breadcrumb-list">
      Demandes
    </BreadcrumbLink>
  </BreadcrumbItem>
  <BreadcrumbItem>
    <BreadcrumbPage data-testid="ci-demand-form-breadcrumb-new">
      Nouvelle demande
    </BreadcrumbPage>
  </BreadcrumbItem>
</Breadcrumb>

<div data-testid="ci-demand-form-header">
  <h1 data-testid="ci-demand-form-title">Nouvelle Demande</h1>
  <p data-testid="ci-demand-form-description">
    Créez une demande en 3 étapes
  </p>
</div>
```

**Liste des data-testid :**
- `ci-demand-form-breadcrumb` : Container breadcrumb
- `ci-demand-form-breadcrumb-list` : Lien "Demandes"
- `ci-demand-form-breadcrumb-new` : Page "Nouvelle demande"
- `ci-demand-form-header` : Container header
- `ci-demand-form-title` : Titre du formulaire
- `ci-demand-form-description` : Description du formulaire

---

### 2.2 Indicateur d'Étapes

```tsx
<div data-testid="ci-demand-form-steps">
  <div data-testid="ci-demand-form-step-1" className={step1Active ? 'active' : ''}>
    <span data-testid="ci-demand-form-step-1-number">1</span>
    <span data-testid="ci-demand-form-step-1-label">Membre + Motif</span>
  </div>
  <div data-testid="ci-demand-form-step-2" className={step2Active ? 'active' : ''}>
    <span data-testid="ci-demand-form-step-2-number">2</span>
    <span data-testid="ci-demand-form-step-2-label">Forfait</span>
  </div>
  <div data-testid="ci-demand-form-step-3" className={step3Active ? 'active' : ''}>
    <span data-testid="ci-demand-form-step-3-number">3</span>
    <span data-testid="ci-demand-form-step-3-label">Contact</span>
  </div>
</div>
```

**Liste des data-testid :**
- `ci-demand-form-steps` : Container des étapes
- `ci-demand-form-step-1` : Container étape 1
- `ci-demand-form-step-1-number` : Numéro étape 1
- `ci-demand-form-step-1-label` : Label étape 1
- `ci-demand-form-step-2` : Container étape 2
- `ci-demand-form-step-2-number` : Numéro étape 2
- `ci-demand-form-step-2-label` : Label étape 2
- `ci-demand-form-step-3` : Container étape 3
- `ci-demand-form-step-3-number` : Numéro étape 3
- `ci-demand-form-step-3-label` : Label étape 3

---

### 2.3 Étape 1 : Membre + Motif

```tsx
<div data-testid="ci-demand-form-step1">
  <div data-testid="ci-demand-form-step1-member-section">
    <Label data-testid="ci-demand-form-step1-member-label">
      👤 Sélection du membre
    </Label>
    
    <Input
      data-testid="ci-demand-form-step1-member-search-input"
      placeholder="Rechercher un membre..."
    />
    
    {/* Liste résultats recherche */}
    <div data-testid="ci-demand-form-step1-member-results">
      {isLoading && (
        <div data-testid="ci-demand-form-step1-member-results-loading">
          Chargement...
        </div>
      )}
      
      {results.length === 0 && !isLoading && (
        <div data-testid="ci-demand-form-step1-member-results-empty">
          Aucun membre trouvé
        </div>
      )}
      
      {results.map(member => (
        <div
          key={member.id}
          data-testid={`ci-demand-form-step1-member-result-${member.id}`}
          onClick={() => selectMember(member)}
        >
          <span data-testid={`ci-demand-form-step1-member-result-${member.id}-name`}>
            {member.name}
          </span>
          <span data-testid={`ci-demand-form-step1-member-result-${member.id}-phone`}>
            {member.phone}
          </span>
          <span data-testid={`ci-demand-form-step1-member-result-${member.id}-matricule`}>
            {member.matricule}
          </span>
        </div>
      ))}
    </div>
    
    {/* Membre sélectionné */}
    {selectedMember && (
      <div data-testid="ci-demand-form-step1-member-selected">
        <span data-testid="ci-demand-form-step1-member-selected-name">
          {selectedMember.name}
        </span>
        <Button data-testid="ci-demand-form-step1-member-selected-clear">
          Changer
        </Button>
      </div>
    )}
  </div>
  
  <div data-testid="ci-demand-form-step1-cause-section">
    <Label data-testid="ci-demand-form-step1-cause-label">
      📝 Motif de la demande *
    </Label>
    <Textarea
      data-testid="ci-demand-form-step1-cause-textarea"
      placeholder="Décrivez le motif de la demande (minimum 10 caractères)..."
    />
    <div data-testid="ci-demand-form-step1-cause-counter">
      {charCount}/500 caractères
    </div>
    {errors.cause && (
      <p data-testid="ci-demand-form-step1-cause-error">
        {errors.cause.message}
      </p>
    )}
  </div>
  
  <Button data-testid="ci-demand-form-step1-next-button">
    Suivant
  </Button>
</div>
```

**Liste des data-testid :**
- `ci-demand-form-step1` : Container étape 1
- `ci-demand-form-step1-member-section` : Section membre
- `ci-demand-form-step1-member-label` : Label sélection membre
- `ci-demand-form-step1-member-search-input` : Input recherche membre
- `ci-demand-form-step1-member-results` : Container résultats recherche
- `ci-demand-form-step1-member-results-loading` : État loading résultats
- `ci-demand-form-step1-member-results-empty` : État aucun résultat
- `ci-demand-form-step1-member-result-{memberId}` : Résultat membre (cliquable)
- `ci-demand-form-step1-member-result-{memberId}-name` : Nom dans résultat
- `ci-demand-form-step1-member-result-{memberId}-phone` : Téléphone dans résultat
- `ci-demand-form-step1-member-result-{memberId}-matricule` : Matricule dans résultat
- `ci-demand-form-step1-member-selected` : Container membre sélectionné
- `ci-demand-form-step1-member-selected-name` : Nom membre sélectionné
- `ci-demand-form-step1-member-selected-clear` : Bouton changer membre
- `ci-demand-form-step1-cause-section` : Section motif
- `ci-demand-form-step1-cause-label` : Label motif
- `ci-demand-form-step1-cause-textarea` : Textarea motif
- `ci-demand-form-step1-cause-counter` : Compteur caractères
- `ci-demand-form-step1-cause-error` : Message erreur motif
- `ci-demand-form-step1-next-button` : Bouton suivant étape 1

---

### 2.4 Étape 2 : Forfait + Fréquence

```tsx
<div data-testid="ci-demand-form-step2">
  <div data-testid="ci-demand-form-step2-subscriptions-section">
    <Label data-testid="ci-demand-form-step2-subscriptions-label">
      💰 Sélection du forfait
    </Label>
    
    {isLoadingSubscriptions && (
      <div data-testid="ci-demand-form-step2-subscriptions-loading">
        Chargement des forfaits...
      </div>
    )}
    
    <div data-testid="ci-demand-form-step2-subscriptions-list">
      {subscriptions.map(sub => (
        <Card
          key={sub.id}
          data-testid={`ci-demand-form-step2-subscription-${sub.id}`}
          className={selectedSubscriptionId === sub.id ? 'selected' : ''}
        >
          <CardHeader>
            <CardTitle data-testid={`ci-demand-form-step2-subscription-${sub.id}-title`}>
              {sub.code}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid={`ci-demand-form-step2-subscription-${sub.id}-amount`}>
              {sub.amountPerMonth} FCFA/mois
            </div>
            <div data-testid={`ci-demand-form-step2-subscription-${sub.id}-duration`}>
              Durée: {sub.duration} mois
            </div>
            <Button
              data-testid={`ci-demand-form-step2-subscription-${sub.id}-select-button`}
              onClick={() => selectSubscription(sub)}
            >
              Sélectionner
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
    
    {subscriptions.length === 0 && !isLoadingSubscriptions && (
      <div data-testid="ci-demand-form-step2-subscriptions-empty">
        Aucun forfait disponible
      </div>
    )}
  </div>
  
  <div data-testid="ci-demand-form-step2-frequency-section">
    <Label data-testid="ci-demand-form-step2-frequency-label">
      🔄 Fréquence de paiement *
    </Label>
    <RadioGroup
      data-testid="ci-demand-form-step2-frequency-radio"
      value={frequency}
      onValueChange={setFrequency}
    >
      <div data-testid="ci-demand-form-step2-frequency-monthly">
        <RadioButton
          data-testid="ci-demand-form-step2-frequency-monthly-radio"
          value="MONTHLY"
        />
        <Label data-testid="ci-demand-form-step2-frequency-monthly-label">
          Mensuel
        </Label>
      </div>
      <div data-testid="ci-demand-form-step2-frequency-daily">
        <RadioButton
          data-testid="ci-demand-form-step2-frequency-daily-radio"
          value="DAILY"
        />
        <Label data-testid="ci-demand-form-step2-frequency-daily-label">
          Journalier
        </Label>
      </div>
    </RadioGroup>
  </div>
  
  <div data-testid="ci-demand-form-step2-date-section">
    <Label data-testid="ci-demand-form-step2-date-label">
      📅 Date souhaitée *
    </Label>
    <DatePicker
      data-testid="ci-demand-form-step2-date-picker"
      value={desiredDate}
      onChange={setDesiredDate}
    />
  </div>
  
  <div data-testid="ci-demand-form-step2-actions">
    <Button data-testid="ci-demand-form-step2-prev-button">
      Précédent
    </Button>
    <Button data-testid="ci-demand-form-step2-next-button">
      Suivant
    </Button>
  </div>
</div>
```

**Liste des data-testid :**
- `ci-demand-form-step2` : Container étape 2
- `ci-demand-form-step2-subscriptions-section` : Section forfaits
- `ci-demand-form-step2-subscriptions-label` : Label forfaits
- `ci-demand-form-step2-subscriptions-loading` : État loading forfaits
- `ci-demand-form-step2-subscriptions-list` : Liste des forfaits
- `ci-demand-form-step2-subscription-{subscriptionId}` : Card forfait
- `ci-demand-form-step2-subscription-{subscriptionId}-title` : Titre forfait
- `ci-demand-form-step2-subscription-{subscriptionId}-amount` : Montant forfait
- `ci-demand-form-step2-subscription-{subscriptionId}-duration` : Durée forfait
- `ci-demand-form-step2-subscription-{subscriptionId}-select-button` : Bouton sélectionner
- `ci-demand-form-step2-subscriptions-empty` : État aucun forfait
- `ci-demand-form-step2-frequency-section` : Section fréquence
- `ci-demand-form-step2-frequency-label` : Label fréquence
- `ci-demand-form-step2-frequency-radio` : Container radio group
- `ci-demand-form-step2-frequency-monthly` : Option mensuel
- `ci-demand-form-step2-frequency-monthly-radio` : Radio mensuel
- `ci-demand-form-step2-frequency-monthly-label` : Label mensuel
- `ci-demand-form-step2-frequency-daily` : Option journalier
- `ci-demand-form-step2-frequency-daily-radio` : Radio journalier
- `ci-demand-form-step2-frequency-daily-label` : Label journalier
- `ci-demand-form-step2-date-section` : Section date
- `ci-demand-form-step2-date-label` : Label date
- `ci-demand-form-step2-date-picker` : Date picker
- `ci-demand-form-step2-actions` : Container actions
- `ci-demand-form-step2-prev-button` : Bouton précédent
- `ci-demand-form-step2-next-button` : Bouton suivant

---

### 2.5 Étape 3 : Contact d'urgence

```tsx
<div data-testid="ci-demand-form-step3">
  <div data-testid="ci-demand-form-step3-contact-section">
    <Label data-testid="ci-demand-form-step3-contact-label">
      📞 Contact d'urgence *
    </Label>
    
    <Tabs data-testid="ci-demand-form-step3-contact-tabs">
      <TabsList>
        <TabsTrigger data-testid="ci-demand-form-step3-contact-tab-member">
          Sélectionner membre
        </TabsTrigger>
        <TabsTrigger data-testid="ci-demand-form-step3-contact-tab-manual">
          Saisir manuellement
        </TabsTrigger>
      </TabsList>
      
      <TabsContent data-testid="ci-demand-form-step3-contact-tab-member-content">
        <Input
          data-testid="ci-demand-form-step3-contact-member-search-input"
          placeholder="Rechercher un membre..."
        />
        
        <div data-testid="ci-demand-form-step3-contact-member-results">
          {results.map(member => (
            <div
              key={member.id}
              data-testid={`ci-demand-form-step3-contact-member-result-${member.id}`}
            >
              {member.name}
            </div>
          ))}
        </div>
        
        {selectedContactMember && (
          <div data-testid="ci-demand-form-step3-contact-member-selected">
            {selectedContactMember.name}
          </div>
        )}
      </TabsContent>
      
      <TabsContent data-testid="ci-demand-form-step3-contact-tab-manual-content">
        <Input
          data-testid="ci-demand-form-step3-contact-lastname-input"
          placeholder="Nom *"
        />
        <Input
          data-testid="ci-demand-form-step3-contact-firstname-input"
          placeholder="Prénom"
        />
        <Input
          data-testid="ci-demand-form-step3-contact-phone1-input"
          placeholder="Téléphone 1 *"
        />
        <Input
          data-testid="ci-demand-form-step3-contact-phone2-input"
          placeholder="Téléphone 2"
        />
        <Select data-testid="ci-demand-form-step3-contact-relationship">
          <SelectTrigger data-testid="ci-demand-form-step3-contact-relationship-trigger">
            <SelectValue placeholder="Lien de parenté *" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem data-testid="ci-demand-form-step3-contact-relationship-family">
              Famille
            </SelectItem>
            <SelectItem data-testid="ci-demand-form-step3-contact-relationship-friend">
              Ami(e)
            </SelectItem>
            {/* ... autres options */}
          </SelectContent>
        </Select>
        <Select data-testid="ci-demand-form-step3-contact-typeid">
          <SelectTrigger data-testid="ci-demand-form-step3-contact-typeid-trigger">
            <SelectValue placeholder="Type de pièce *" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem data-testid="ci-demand-form-step3-contact-typeid-cni">
              CNI
            </SelectItem>
            <SelectItem data-testid="ci-demand-form-step3-contact-typeid-passport">
              Passeport
            </SelectItem>
            {/* ... autres options */}
          </SelectContent>
        </Select>
        <Input
          data-testid="ci-demand-form-step3-contact-idnumber-input"
          placeholder="Numéro de pièce *"
        />
        <div data-testid="ci-demand-form-step3-contact-document-upload">
          <Input
            type="file"
            data-testid="ci-demand-form-step3-contact-document-input"
            accept="image/*"
          />
          <div data-testid="ci-demand-form-step3-contact-document-preview">
            {documentPreview && <img src={documentPreview} />}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </div>
  
  <div data-testid="ci-demand-form-step3-actions">
    <Button data-testid="ci-demand-form-step3-prev-button">
      Précédent
    </Button>
    <Button data-testid="ci-demand-form-step3-submit-button">
      Créer la demande
    </Button>
  </div>
</div>
```

**Liste des data-testid :**
- `ci-demand-form-step3` : Container étape 3
- `ci-demand-form-step3-contact-section` : Section contact
- `ci-demand-form-step3-contact-label` : Label contact
- `ci-demand-form-step3-contact-tabs` : Container tabs
- `ci-demand-form-step3-contact-tab-member` : Tab sélectionner membre
- `ci-demand-form-step3-contact-tab-manual` : Tab saisir manuellement
- `ci-demand-form-step3-contact-tab-member-content` : Contenu tab membre
- `ci-demand-form-step3-contact-member-search-input` : Recherche membre contact
- `ci-demand-form-step3-contact-member-results` : Résultats recherche membre
- `ci-demand-form-step3-contact-member-result-{memberId}` : Résultat membre contact
- `ci-demand-form-step3-contact-member-selected` : Membre contact sélectionné
- `ci-demand-form-step3-contact-tab-manual-content` : Contenu tab manuel
- `ci-demand-form-step3-contact-lastname-input` : Input nom
- `ci-demand-form-step3-contact-firstname-input` : Input prénom
- `ci-demand-form-step3-contact-phone1-input` : Input téléphone 1
- `ci-demand-form-step3-contact-phone2-input` : Input téléphone 2
- `ci-demand-form-step3-contact-relationship` : Select lien parenté
- `ci-demand-form-step3-contact-relationship-trigger` : Trigger select lien
- `ci-demand-form-step3-contact-relationship-family` : Option famille
- `ci-demand-form-step3-contact-relationship-friend` : Option ami(e)
- `ci-demand-form-step3-contact-typeid` : Select type pièce
- `ci-demand-form-step3-contact-typeid-trigger` : Trigger select type
- `ci-demand-form-step3-contact-typeid-cni` : Option CNI
- `ci-demand-form-step3-contact-typeid-passport` : Option passeport
- `ci-demand-form-step3-contact-idnumber-input` : Input numéro pièce
- `ci-demand-form-step3-contact-document-upload` : Zone upload document
- `ci-demand-form-step3-contact-document-input` : Input file document
- `ci-demand-form-step3-contact-document-preview` : Preview document
- `ci-demand-form-step3-actions` : Container actions
- `ci-demand-form-step3-prev-button` : Bouton précédent
- `ci-demand-form-step3-submit-button` : Bouton créer demande

---

## 📄 3. Page de Détails

### 3.1 Header

```tsx
<div data-testid="ci-demand-detail-header">
  <Breadcrumb data-testid="ci-demand-detail-breadcrumb">
    <BreadcrumbLink data-testid="ci-demand-detail-breadcrumb-list">
      Demandes
    </BreadcrumbLink>
    <BreadcrumbPage data-testid="ci-demand-detail-breadcrumb-detail">
      Détails
    </BreadcrumbPage>
  </Breadcrumb>
  
  <div data-testid="ci-demand-detail-title-section">
    <Badge data-testid="ci-demand-detail-status-badge">
      {statusLabel}
    </Badge>
    <h1 data-testid="ci-demand-detail-title">
      Demande #{demandId.slice(-6)}
    </h1>
    <p data-testid="ci-demand-detail-created-date">
      Créée le {createdAt}
    </p>
  </div>
  
  <Button data-testid="ci-demand-detail-back-button">
    Retour
  </Button>
</div>
```

**Liste des data-testid :**
- `ci-demand-detail-header` : Container header
- `ci-demand-detail-breadcrumb` : Breadcrumb
- `ci-demand-detail-breadcrumb-list` : Lien "Demandes"
- `ci-demand-detail-breadcrumb-detail` : Page "Détails"
- `ci-demand-detail-title-section` : Section titre
- `ci-demand-detail-status-badge` : Badge statut
- `ci-demand-detail-title` : Titre "Demande #..."
- `ci-demand-detail-created-date` : Date de création
- `ci-demand-detail-back-button` : Bouton retour

---

### 3.2 Card Informations Demandeur

```tsx
<Card data-testid="ci-demand-detail-member-card">
  <CardHeader>
    <CardTitle data-testid="ci-demand-detail-member-card-title">
      👤 Informations du demandeur
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div data-testid="ci-demand-detail-member-name">
      <span data-testid="ci-demand-detail-member-name-label">Nom:</span>
      <span data-testid="ci-demand-detail-member-name-value">{name}</span>
    </div>
    <div data-testid="ci-demand-detail-member-phone">
      <span data-testid="ci-demand-detail-member-phone-label">Téléphone:</span>
      <span data-testid="ci-demand-detail-member-phone-value">{phone}</span>
    </div>
    <div data-testid="ci-demand-detail-member-email">
      <span data-testid="ci-demand-detail-member-email-label">Email:</span>
      <span data-testid="ci-demand-detail-member-email-value">{email}</span>
    </div>
    <div data-testid="ci-demand-detail-member-matricule">
      <span data-testid="ci-demand-detail-member-matricule-label">Matricule:</span>
      <span data-testid="ci-demand-detail-member-matricule-value">{matricule}</span>
    </div>
  </CardContent>
</Card>
```

**Liste des data-testid :**
- `ci-demand-detail-member-card` : Card informations demandeur
- `ci-demand-detail-member-card-title` : Titre card
- `ci-demand-detail-member-name` : Container nom
- `ci-demand-detail-member-name-label` : Label "Nom:"
- `ci-demand-detail-member-name-value` : Valeur nom
- `ci-demand-detail-member-phone` : Container téléphone
- `ci-demand-detail-member-phone-label` : Label "Téléphone:"
- `ci-demand-detail-member-phone-value` : Valeur téléphone
- `ci-demand-detail-member-email` : Container email
- `ci-demand-detail-member-email-label` : Label "Email:"
- `ci-demand-detail-member-email-value` : Valeur email
- `ci-demand-detail-member-matricule` : Container matricule
- `ci-demand-detail-member-matricule-label` : Label "Matricule:"
- `ci-demand-detail-member-matricule-value` : Valeur matricule

---

### 3.3 Card Motif

```tsx
<Card data-testid="ci-demand-detail-cause-card">
  <CardHeader>
    <CardTitle data-testid="ci-demand-detail-cause-card-title">
      📝 Motif de la demande
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p data-testid="ci-demand-detail-cause-text">
      {cause}
    </p>
  </CardContent>
</Card>
```

**Liste des data-testid :**
- `ci-demand-detail-cause-card` : Card motif
- `ci-demand-detail-cause-card-title` : Titre card
- `ci-demand-detail-cause-text` : Texte du motif

---

### 3.4 Card Forfait

```tsx
<Card data-testid="ci-demand-detail-subscription-card">
  <CardHeader>
    <CardTitle data-testid="ci-demand-detail-subscription-card-title">
      💰 Forfait sélectionné
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div data-testid="ci-demand-detail-subscription-code">
      {code}
    </div>
    <div data-testid="ci-demand-detail-subscription-amount">
      Montant: {amount} FCFA/mois
    </div>
    <div data-testid="ci-demand-detail-subscription-duration">
      Durée: {duration} mois
    </div>
    <div data-testid="ci-demand-detail-subscription-frequency">
      Fréquence: {frequencyLabel}
    </div>
    <div data-testid="ci-demand-detail-subscription-desired-date">
      Date souhaitée: {desiredDate}
    </div>
  </CardContent>
</Card>
```

**Liste des data-testid :**
- `ci-demand-detail-subscription-card` : Card forfait
- `ci-demand-detail-subscription-card-title` : Titre card
- `ci-demand-detail-subscription-code` : Code forfait
- `ci-demand-detail-subscription-amount` : Montant
- `ci-demand-detail-subscription-duration` : Durée
- `ci-demand-detail-subscription-frequency` : Fréquence
- `ci-demand-detail-subscription-desired-date` : Date souhaitée

---

### 3.5 Card Contact d'urgence

```tsx
<Card data-testid="ci-demand-detail-contact-card">
  <CardHeader>
    <CardTitle data-testid="ci-demand-detail-contact-card-title">
      📞 Contact d'urgence
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div data-testid="ci-demand-detail-contact-name">
      Nom: {contactName}
    </div>
    <div data-testid="ci-demand-detail-contact-phone">
      Téléphone: {contactPhone}
    </div>
    <div data-testid="ci-demand-detail-contact-relationship">
      Lien: {relationship}
    </div>
    <div data-testid="ci-demand-detail-contact-typeid">
      Type pièce: {typeId}
    </div>
    <div data-testid="ci-demand-detail-contact-idnumber">
      Numéro: {idNumber}
    </div>
    {documentPhotoUrl && (
      <Button data-testid="ci-demand-detail-contact-document-button">
        Voir photo pièce
      </Button>
    )}
  </CardContent>
</Card>
```

**Liste des data-testid :**
- `ci-demand-detail-contact-card` : Card contact
- `ci-demand-detail-contact-card-title` : Titre card
- `ci-demand-detail-contact-name` : Nom contact
- `ci-demand-detail-contact-phone` : Téléphone contact
- `ci-demand-detail-contact-relationship` : Lien parenté
- `ci-demand-detail-contact-typeid` : Type pièce
- `ci-demand-detail-contact-idnumber` : Numéro pièce
- `ci-demand-detail-contact-document-button` : Bouton voir photo

---

### 3.6 Tableau Versements

```tsx
<Card data-testid="ci-demand-detail-payment-schedule-card">
  <CardHeader>
    <CardTitle data-testid="ci-demand-detail-payment-schedule-title">
      💵 Plan de remboursement
    </CardTitle>
  </CardHeader>
  <CardContent>
    <Table data-testid="ci-demand-detail-payment-schedule-table">
      <TableHeader>
        <TableRow>
          <TableHead data-testid="ci-demand-payment-table-header-month">Mois</TableHead>
          <TableHead data-testid="ci-demand-payment-table-header-date">Date</TableHead>
          <TableHead data-testid="ci-demand-payment-table-header-amount">Montant</TableHead>
          <TableHead data-testid="ci-demand-payment-table-header-cumulative">Cumulé</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment, index) => (
          <TableRow key={index} data-testid={`ci-demand-payment-table-row-${index + 1}`}>
            <TableCell data-testid={`ci-demand-payment-table-row-${index + 1}-month`}>
              {index + 1}
            </TableCell>
            <TableCell data-testid={`ci-demand-payment-table-row-${index + 1}-date`}>
              {payment.date}
            </TableCell>
            <TableCell data-testid={`ci-demand-payment-table-row-${index + 1}-amount`}>
              {payment.amount} FCFA
            </TableCell>
            <TableCell data-testid={`ci-demand-payment-table-row-${index + 1}-cumulative`}>
              {payment.cumulative} FCFA
            </TableCell>
          </TableRow>
        ))}
        <TableRow data-testid="ci-demand-payment-table-row-total">
          <TableCell colSpan={3} data-testid="ci-demand-payment-table-total-label">
            Total ({totalMonths} mois)
          </TableCell>
          <TableCell data-testid="ci-demand-payment-table-total-amount">
            {totalAmount} FCFA
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

**Liste des data-testid :**
- `ci-demand-detail-payment-schedule-card` : Card tableau versements
- `ci-demand-detail-payment-schedule-title` : Titre card
- `ci-demand-detail-payment-schedule-table` : Tableau versements
- `ci-demand-payment-table-header-month` : Header colonne mois
- `ci-demand-payment-table-header-date` : Header colonne date
- `ci-demand-payment-table-header-amount` : Header colonne montant
- `ci-demand-payment-table-header-cumulative` : Header colonne cumulé
- `ci-demand-payment-table-row-{index}` : Ligne versement
- `ci-demand-payment-table-row-{index}-month` : Mois dans ligne
- `ci-demand-payment-table-row-{index}-date` : Date dans ligne
- `ci-demand-payment-table-row-{index}-amount` : Montant dans ligne
- `ci-demand-payment-table-row-{index}-cumulative` : Cumulé dans ligne
- `ci-demand-payment-table-row-total` : Ligne total
- `ci-demand-payment-table-total-label` : Label total
- `ci-demand-payment-table-total-amount` : Montant total

---

### 3.7 Actions

```tsx
<div data-testid="ci-demand-detail-actions">
  {status === 'PENDING' && (
    <>
      <Button data-testid="ci-demand-detail-approve-button">
        Accepter
      </Button>
      <Button data-testid="ci-demand-detail-reject-button">
        Refuser
      </Button>
    </>
  )}
  {status === 'APPROVED' && (
    <Button data-testid="ci-demand-detail-create-contract-button">
      Créer contrat
    </Button>
  )}
  {status === 'REJECTED' && (
    <>
      <Button data-testid="ci-demand-detail-reopen-button">
        Réouvrir
      </Button>
      <Button data-testid="ci-demand-detail-delete-button">
        Supprimer
      </Button>
    </>
  )}
  <Button data-testid="ci-demand-detail-edit-button">
    Modifier
  </Button>
</div>
```

**Liste des data-testid :**
- `ci-demand-detail-actions` : Container actions
- `ci-demand-detail-approve-button` : Bouton accepter
- `ci-demand-detail-reject-button` : Bouton refuser
- `ci-demand-detail-reopen-button` : Bouton réouvrir
- `ci-demand-detail-delete-button` : Bouton supprimer
- `ci-demand-detail-create-contract-button` : Bouton créer contrat
- `ci-demand-detail-edit-button` : Bouton modifier

---

## 🎭 4. Modals

### 4.1 Modal Accepter

```tsx
<Dialog data-testid="ci-demand-approve-modal">
  <DialogContent>
    <DialogHeader>
      <DialogTitle data-testid="ci-demand-approve-modal-title">
        ✅ Accepter la demande
      </DialogTitle>
      <DialogDescription data-testid="ci-demand-approve-modal-description">
        Confirmez l'acceptation de cette demande
      </DialogDescription>
    </DialogHeader>
    
    <div data-testid="ci-demand-approve-modal-member-info">
      <div data-testid="ci-demand-approve-modal-member-name">
        Demandeur: {memberName}
      </div>
      <div data-testid="ci-demand-approve-modal-cause">
        Motif: {cause}
      </div>
    </div>
    
    <div data-testid="ci-demand-approve-modal-reason-section">
      <Label data-testid="ci-demand-approve-modal-reason-label">
        💰 Raison d'acceptation *
      </Label>
      <Textarea
        data-testid="ci-demand-approve-modal-reason-textarea"
        placeholder="Décrivez la raison d'acceptation (minimum 10 caractères)..."
      />
      <div data-testid="ci-demand-approve-modal-reason-counter">
        {charCount}/500 caractères
      </div>
      {errors.reason && (
        <p data-testid="ci-demand-approve-modal-reason-error">
          {errors.reason.message}
        </p>
      )}
    </div>
    
    <DialogFooter>
      <Button data-testid="ci-demand-approve-modal-cancel-button">
        Annuler
      </Button>
      <Button data-testid="ci-demand-approve-modal-submit-button">
        Accepter
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Liste des data-testid :**
- `ci-demand-approve-modal` : Container modal
- `ci-demand-approve-modal-title` : Titre modal
- `ci-demand-approve-modal-description` : Description modal
- `ci-demand-approve-modal-member-info` : Container infos membre
- `ci-demand-approve-modal-member-name` : Nom membre
- `ci-demand-approve-modal-cause` : Motif demande
- `ci-demand-approve-modal-reason-section` : Section raison
- `ci-demand-approve-modal-reason-label` : Label raison
- `ci-demand-approve-modal-reason-textarea` : Textarea raison
- `ci-demand-approve-modal-reason-counter` : Compteur caractères
- `ci-demand-approve-modal-reason-error` : Message erreur
- `ci-demand-approve-modal-cancel-button` : Bouton annuler
- `ci-demand-approve-modal-submit-button` : Bouton accepter

---

### 4.2 Modal Refuser

```tsx
<Dialog data-testid="ci-demand-reject-modal">
  <DialogContent>
    <DialogHeader>
      <DialogTitle data-testid="ci-demand-reject-modal-title">
        ❌ Refuser la demande
      </DialogTitle>
    </DialogHeader>
    
    <div data-testid="ci-demand-reject-modal-member-info">
      <div data-testid="ci-demand-reject-modal-member-name">
        Demandeur: {memberName}
      </div>
      <div data-testid="ci-demand-reject-modal-cause">
        Motif original: {cause}
      </div>
    </div>
    
    <div data-testid="ci-demand-reject-modal-reason-section">
      <Label data-testid="ci-demand-reject-modal-reason-label">
        ⚠️ Motif de refus *
      </Label>
      <Textarea
        data-testid="ci-demand-reject-modal-reason-textarea"
        placeholder="Décrivez le motif de refus (minimum 10 caractères)..."
      />
      <div data-testid="ci-demand-reject-modal-reason-counter">
        {charCount}/500 caractères
      </div>
    </div>
    
    <DialogFooter>
      <Button data-testid="ci-demand-reject-modal-cancel-button">
        Annuler
      </Button>
      <Button data-testid="ci-demand-reject-modal-submit-button" variant="destructive">
        Refuser
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Liste des data-testid :**
- `ci-demand-reject-modal` : Container modal
- `ci-demand-reject-modal-title` : Titre modal
- `ci-demand-reject-modal-member-info` : Container infos membre
- `ci-demand-reject-modal-member-name` : Nom membre
- `ci-demand-reject-modal-cause` : Motif original
- `ci-demand-reject-modal-reason-section` : Section motif refus
- `ci-demand-reject-modal-reason-label` : Label motif refus
- `ci-demand-reject-modal-reason-textarea` : Textarea motif refus
- `ci-demand-reject-modal-reason-counter` : Compteur caractères
- `ci-demand-reject-modal-cancel-button` : Bouton annuler
- `ci-demand-reject-modal-submit-button` : Bouton refuser

---

### 4.3 Modal Réouvrir

```tsx
<Dialog data-testid="ci-demand-reopen-modal">
  <DialogContent>
    <DialogHeader>
      <DialogTitle data-testid="ci-demand-reopen-modal-title">
        🔄 Réouvrir la demande
      </DialogTitle>
    </DialogHeader>
    
    <div data-testid="ci-demand-reopen-modal-info">
      <div data-testid="ci-demand-reopen-modal-member-name">
        Demandeur: {memberName}
      </div>
      <div data-testid="ci-demand-reopen-modal-current-status">
        Statut actuel: [Badge: Refusé]
      </div>
      <div data-testid="ci-demand-reopen-modal-rejection-reason">
        Motif de refus: {rejectionReason}
      </div>
    </div>
    
    <div data-testid="ci-demand-reopen-modal-reason-section">
      <Label data-testid="ci-demand-reopen-modal-reason-label">
        💬 Raison de réouverture *
      </Label>
      <Textarea
        data-testid="ci-demand-reopen-modal-reason-textarea"
        placeholder="Décrivez la raison de réouverture (minimum 10 caractères)..."
      />
    </div>
    
    <DialogFooter>
      <Button data-testid="ci-demand-reopen-modal-cancel-button">
        Annuler
      </Button>
      <Button data-testid="ci-demand-reopen-modal-submit-button">
        Réouvrir
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Liste des data-testid :**
- `ci-demand-reopen-modal` : Container modal
- `ci-demand-reopen-modal-title` : Titre modal
- `ci-demand-reopen-modal-info` : Container infos
- `ci-demand-reopen-modal-member-name` : Nom membre
- `ci-demand-reopen-modal-current-status` : Statut actuel
- `ci-demand-reopen-modal-rejection-reason` : Motif refus initial
- `ci-demand-reopen-modal-reason-section` : Section raison réouverture
- `ci-demand-reopen-modal-reason-label` : Label raison
- `ci-demand-reopen-modal-reason-textarea` : Textarea raison
- `ci-demand-reopen-modal-cancel-button` : Bouton annuler
- `ci-demand-reopen-modal-submit-button` : Bouton réouvrir

---

### 4.4 Modal Supprimer

```tsx
<Dialog data-testid="ci-demand-delete-modal">
  <DialogContent>
    <DialogHeader>
      <DialogTitle data-testid="ci-demand-delete-modal-title">
        🗑️ Supprimer la demande
      </DialogTitle>
    </DialogHeader>
    
    <div data-testid="ci-demand-delete-modal-warning">
      <AlertCircle data-testid="ci-demand-delete-modal-warning-icon" />
      <p data-testid="ci-demand-delete-modal-warning-text">
        Cette action est définitive. La demande sera supprimée définitivement.
      </p>
    </div>
    
    <div data-testid="ci-demand-delete-modal-info">
      <div data-testid="ci-demand-delete-modal-member-name">
        Demandeur: {memberName}
      </div>
      <div data-testid="ci-demand-delete-modal-status">
        Statut: [Badge: Refusé]
      </div>
    </div>
    
    <DialogFooter>
      <Button data-testid="ci-demand-delete-modal-cancel-button">
        Annuler
      </Button>
      <Button data-testid="ci-demand-delete-modal-submit-button" variant="destructive">
        Supprimer
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Liste des data-testid :**
- `ci-demand-delete-modal` : Container modal
- `ci-demand-delete-modal-title` : Titre modal
- `ci-demand-delete-modal-warning` : Container avertissement
- `ci-demand-delete-modal-warning-icon` : Icône avertissement
- `ci-demand-delete-modal-warning-text` : Texte avertissement
- `ci-demand-delete-modal-info` : Container infos
- `ci-demand-delete-modal-member-name` : Nom membre
- `ci-demand-delete-modal-status` : Statut demande
- `ci-demand-delete-modal-cancel-button` : Bouton annuler
- `ci-demand-delete-modal-submit-button` : Bouton supprimer

---

### 4.5 Modal Créer Contrat

```tsx
<Dialog data-testid="ci-demand-create-contract-modal">
  <DialogContent>
    <DialogHeader>
      <DialogTitle data-testid="ci-demand-create-contract-modal-title">
        📄 Créer un contrat
      </DialogTitle>
    </DialogHeader>
    
    <div data-testid="ci-demand-create-contract-modal-info">
      <div data-testid="ci-demand-create-contract-modal-member-name">
        Demandeur: {memberName}
      </div>
      <div data-testid="ci-demand-create-contract-modal-subscription">
        Forfait: {subscriptionCode} - {amount} FCFA/mois
      </div>
      <div data-testid="ci-demand-create-contract-modal-duration">
        Durée: {duration} mois
      </div>
    </div>
    
    <div data-testid="ci-demand-create-contract-modal-date-section">
      <Label data-testid="ci-demand-create-contract-modal-date-label">
        📅 Date de début *
      </Label>
      <DatePicker
        data-testid="ci-demand-create-contract-modal-date-picker"
        value={startDate}
        onChange={setStartDate}
      />
    </div>
    
    <div data-testid="ci-demand-create-contract-modal-confirmation">
      ⚠️ Confirmez la création du contrat à partir de cette demande.
    </div>
    
    <DialogFooter>
      <Button data-testid="ci-demand-create-contract-modal-cancel-button">
        Annuler
      </Button>
      <Button data-testid="ci-demand-create-contract-modal-submit-button">
        Créer le contrat
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Liste des data-testid :**
- `ci-demand-create-contract-modal` : Container modal
- `ci-demand-create-contract-modal-title` : Titre modal
- `ci-demand-create-contract-modal-info` : Container infos
- `ci-demand-create-contract-modal-member-name` : Nom membre
- `ci-demand-create-contract-modal-subscription` : Forfait
- `ci-demand-create-contract-modal-duration` : Durée
- `ci-demand-create-contract-modal-date-section` : Section date
- `ci-demand-create-contract-modal-date-label` : Label date
- `ci-demand-create-contract-modal-date-picker` : Date picker
- `ci-demand-create-contract-modal-confirmation` : Message confirmation
- `ci-demand-create-contract-modal-cancel-button` : Bouton annuler
- `ci-demand-create-contract-modal-submit-button` : Bouton créer

---

### 4.6 Modal Modifier

```tsx
<Dialog data-testid="ci-demand-edit-modal">
  <DialogContent>
    <DialogHeader>
      <DialogTitle data-testid="ci-demand-edit-modal-title">
        ✏️ Modifier la demande
      </DialogTitle>
    </DialogHeader>
    
    {/* Formulaire similaire au formulaire de création mais pré-rempli */}
    <div data-testid="ci-demand-edit-modal-form">
      {/* Champs modifiables */}
    </div>
    
    <DialogFooter>
      <Button data-testid="ci-demand-edit-modal-cancel-button">
        Annuler
      </Button>
      <Button data-testid="ci-demand-edit-modal-submit-button">
        Enregistrer les modifications
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Liste des data-testid :**
- `ci-demand-edit-modal` : Container modal
- `ci-demand-edit-modal-title` : Titre modal
- `ci-demand-edit-modal-form` : Container formulaire
- `ci-demand-edit-modal-cancel-button` : Bouton annuler
- `ci-demand-edit-modal-submit-button` : Bouton enregistrer

---

## 📊 Résumé par Composant

| Composant | Nombre de data-testid |
|-----------|----------------------|
| **Liste** | ~45 |
| **Formulaire Création** | ~50 |
| **Page Détails** | ~35 |
| **Modals** | ~40 |
| **TOTAL** | **~170** |

---

## ✅ Checklist d'Implémentation

- [ ] Ajouter tous les data-testid dans `ListDemandesV2.tsx`
- [ ] Ajouter tous les data-testid dans `CreateDemandFormV2.tsx`
- [ ] Ajouter tous les data-testid dans `DemandDetailV2.tsx`
- [ ] Ajouter tous les data-testid dans `AcceptDemandModalV2.tsx`
- [ ] Ajouter tous les data-testid dans `RejectDemandModalV2.tsx`
- [ ] Ajouter tous les data-testid dans `ReopenDemandModalV2.tsx`
- [ ] Ajouter tous les data-testid dans `DeleteDemandModalV2.tsx`
- [ ] Ajouter tous les data-testid dans `ConfirmContractModalV2.tsx`
- [ ] Ajouter tous les data-testid dans `EditDemandModalV2.tsx`
- [ ] Vérifier que tous les data-testid sont uniques
- [ ] Documenter les data-testid dans les composants (JSDoc)

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior QA
