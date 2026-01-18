# Data-testid - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document liste tous les `data-testid` à ajouter dans les composants pour les tests E2E.

**Total : 57 data-testid** (43 admin + 14 demandeur)

**⚠️ IMPORTANT :** Tous ces `data-testid` doivent être ajoutés dans les composants avant d'implémenter les tests E2E.

## 🎯 Convention de nommage

Format : `[context]-[element]-[action?]`

Exemples :
- `corrections-modal-textarea` : Textarea dans le modal de corrections
- `corrections-modal-submit-button` : Bouton de soumission
- `security-code-input-0` : Premier input du code de sécurité

---

## 📦 Composants Admin

### 1. MembershipRequestActionsV2

**Dropdown "⋮ Plus d'actions" :**
```tsx
<DropdownMenuTrigger data-testid="action-menu">
  <MoreVertical />
</DropdownMenuTrigger>

<DropdownMenuItem data-testid="request-corrections-menu">
  <FileEdit /> Demander des corrections
</DropdownMenuItem>

<DropdownMenuItem data-testid="copy-correction-link-menu">
  <Link /> Copier lien de correction
</DropdownMenuItem>

<DropdownMenuItem data-testid="send-whatsapp-menu">
  <MessageSquare /> Envoyer via WhatsApp
</DropdownMenuItem>

<DropdownMenuItem data-testid="renew-code-menu">
  <RotateCcw /> Régénérer le code
</DropdownMenuItem>
```

**Liste des data-testid :**
- `action-menu` : Bouton dropdown "⋮"
- `request-corrections-menu` : Menu item "Demander des corrections"
- `copy-correction-link-menu` : Menu item "Copier lien de correction"
- `send-whatsapp-menu` : Menu item "Envoyer via WhatsApp"
- `renew-code-menu` : Menu item "Régénérer le code"

---

### 2. CorrectionsModalV2

**Structure complète :**
```tsx
<Dialog data-testid="corrections-modal">
  <DialogTitle data-testid="corrections-modal-title">
    Demander des corrections
  </DialogTitle>
  
  <Textarea
    data-testid="corrections-modal-textarea"
    placeholder="..."
  />
  
  <p data-testid="corrections-modal-counter">
    {count} correction(s) détectée(s)
  </p>
  
  <Button
    data-testid="corrections-modal-cancel-button"
    onClick={onClose}
  >
    Annuler
  </Button>
  
  <Button
    data-testid="corrections-modal-submit-button"
    onClick={handleSubmit}
    disabled={!isValid || isLoading}
  >
    {isLoading ? (
      <>
        <Loader2 /> Envoi en cours...
      </>
    ) : (
      <>
        <FileEdit /> Demander les corrections
      </>
    )}
  </Button>
</Dialog>
```

**Liste des data-testid :**
- `corrections-modal` : Container du modal
- `corrections-modal-title` : Titre du modal
- `corrections-modal-textarea` : Zone de saisie des corrections
- `corrections-modal-counter` : Compteur de corrections
- `corrections-modal-cancel-button` : Bouton "Annuler"
- `corrections-modal-submit-button` : Bouton "Demander les corrections"

---

### 3. Bloc "Corrections demandées" (dans MembershipRequestCard/Row)

**Structure :**
```tsx
{status === 'under_review' && (
  <div data-testid="corrections-block">
    <h4 data-testid="corrections-block-title">
      Corrections demandées
    </h4>
    
    <ul data-testid="corrections-block-list">
      {corrections.slice(0, 3).map((correction, index) => (
        <li key={index} data-testid={`correction-item-${index}`}>
          {correction}
        </li>
      ))}
    </ul>
    
    <div data-testid="corrections-block-code">
      Code: <span data-testid="corrections-block-code-value">{formattedCode}</span>
    </div>
    
    <div data-testid="corrections-block-expiry">
      Expire le: <span data-testid="corrections-block-expiry-value">{expiryDate}</span>
      <span data-testid="corrections-block-expiry-remaining"> (reste {timeRemaining})</span>
    </div>
    
    <div data-testid="corrections-block-requested-by">
      Demandé par: <span data-testid="corrections-block-requested-by-value">{adminName}</span>
      <span data-testid="corrections-block-requested-by-matricule"> ({matricule})</span>
    </div>
    
    <Button
      data-testid="corrections-block-copy-link-button"
      onClick={handleCopyLink}
    >
      <Link /> Copier lien
    </Button>
    
    <Button
      data-testid="corrections-block-send-whatsapp-button"
      onClick={handleSendWhatsApp}
    >
      <MessageSquare /> Envoyer WhatsApp
    </Button>
  </div>
)}
```

**Liste des data-testid :**
- `corrections-block` : Container du bloc
- `corrections-block-title` : Titre "Corrections demandées"
- `corrections-block-list` : Liste des corrections
- `correction-item-{index}` : Item de correction (0, 1, 2, ...)
- `corrections-block-code` : Container du code
- `corrections-block-code-value` : Valeur du code formaté
- `corrections-block-expiry` : Container de l'expiration
- `corrections-block-expiry-value` : Date d'expiration
- `corrections-block-expiry-remaining` : Temps restant
- `corrections-block-requested-by` : Container "Demandé par"
- `corrections-block-requested-by-value` : Nom de l'admin
- `corrections-block-requested-by-matricule` : Matricule de l'admin
- `corrections-block-copy-link-button` : Bouton "Copier lien"
- `corrections-block-send-whatsapp-button` : Bouton "Envoyer WhatsApp"

---

### 4. Badge "En correction"

```tsx
<Badge
  data-testid="status-under-review-badge"
  className="bg-amber-50 text-amber-700"
>
  <FileEdit /> En correction
</Badge>
```

**Liste des data-testid :**
- `status-under-review-badge` : Badge statut "En correction"

---

### 5. SendWhatsAppModalV2

```tsx
<Dialog data-testid="whatsapp-modal">
  <DialogTitle data-testid="whatsapp-modal-title">
    Envoyer via WhatsApp
  </DialogTitle>
  
  {phoneNumbers.length > 1 ? (
    <Select
      data-testid="whatsapp-modal-phone-select"
      value={selectedIndex.toString()}
    >
      <SelectTrigger data-testid="whatsapp-modal-phone-select-trigger">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {phoneNumbers.map((phone, index) => (
          <SelectItem
            key={index}
            value={index.toString()}
            data-testid={`whatsapp-modal-phone-option-${index}`}
          >
            {formatPhoneNumber(phone)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : (
    <p data-testid="whatsapp-modal-single-phone">
      Numéro: {phoneNumbers[0]}
    </p>
  )}
  
  <Button
    data-testid="whatsapp-modal-cancel-button"
    onClick={onClose}
  >
    Annuler
  </Button>
  
  <Button
    data-testid="whatsapp-modal-send-button"
    onClick={handleSend}
  >
    <MessageSquare /> Envoyer via WhatsApp
  </Button>
</Dialog>
```

**Liste des data-testid :**
- `whatsapp-modal` : Container du modal
- `whatsapp-modal-title` : Titre du modal
- `whatsapp-modal-phone-select` : Select des numéros (si plusieurs)
- `whatsapp-modal-phone-select-trigger` : Trigger du select
- `whatsapp-modal-phone-option-{index}` : Option de numéro (0, 1, 2, ...)
- `whatsapp-modal-single-phone` : Affichage numéro unique
- `whatsapp-modal-cancel-button` : Bouton "Annuler"
- `whatsapp-modal-send-button` : Bouton "Envoyer via WhatsApp"

---

### 6. RenewSecurityCodeModalV2

```tsx
<Dialog data-testid="renew-code-modal">
  <DialogTitle data-testid="renew-code-modal-title">
    Régénérer le code de sécurité
  </DialogTitle>
  
  <Alert data-testid="renew-code-modal-warning">
    ⚠️ Un nouveau code invalidera l'ancien code.
  </Alert>
  
  <div data-testid="renew-code-modal-current-code">
    Code actuel: <span data-testid="renew-code-modal-current-code-value">{currentCode}</span>
  </div>
  
  <div data-testid="renew-code-modal-current-expiry">
    Expire le: <span data-testid="renew-code-modal-current-expiry-value">{currentExpiry}</span>
  </div>
  
  <Checkbox
    data-testid="renew-code-modal-confirm-checkbox"
    checked={isConfirmed}
    onCheckedChange={setIsConfirmed}
  >
    Je comprends que l'ancien code sera invalidé
  </Checkbox>
  
  <Button
    data-testid="renew-code-modal-cancel-button"
    onClick={onClose}
  >
    Annuler
  </Button>
  
  <Button
    data-testid="renew-code-modal-renew-button"
    onClick={handleRenew}
    disabled={!isConfirmed || isLoading}
  >
    {isLoading ? (
      <>
        <Loader2 /> Régénération...
      </>
    ) : (
      <>
        <RotateCcw /> Régénérer le code
      </>
    )}
  </Button>
</Dialog>
```

**Liste des data-testid :**
- `renew-code-modal` : Container du modal
- `renew-code-modal-title` : Titre du modal
- `renew-code-modal-warning` : Alerte d'avertissement
- `renew-code-modal-current-code` : Container du code actuel
- `renew-code-modal-current-code-value` : Valeur du code actuel
- `renew-code-modal-current-expiry` : Container de l'expiration actuelle
- `renew-code-modal-current-expiry-value` : Valeur de l'expiration actuelle
- `renew-code-modal-confirm-checkbox` : Checkbox de confirmation
- `renew-code-modal-cancel-button` : Bouton "Annuler"
- `renew-code-modal-renew-button` : Bouton "Régénérer le code"

---

## 📦 Composants Demandeur

### 7. CorrectionBannerV2

```tsx
<Alert data-testid="correction-banner">
  <AlertCircle />
  <AlertDescription>
    <p data-testid="correction-banner-title">
      Corrections demandées :
    </p>
    <ul data-testid="correction-banner-list">
      {corrections.map((correction, index) => (
        <li key={index} data-testid={`correction-banner-item-${index}`}>
          {correction}
        </li>
      ))}
    </ul>
  </AlertDescription>
</Alert>
```

**Liste des data-testid :**
- `correction-banner` : Container du banner
- `correction-banner-title` : Titre "Corrections demandées"
- `correction-banner-list` : Liste des corrections
- `correction-banner-item-{index}` : Item de correction (0, 1, 2, ...)

---

### 8. SecurityCodeFormV2

```tsx
<Card data-testid="security-code-form">
  <CardHeader>
    <CardTitle data-testid="security-code-form-title">
      Code de sécurité requis
    </CardTitle>
    <CardDescription data-testid="security-code-form-description">
      Pour accéder à votre formulaire...
    </CardDescription>
  </CardHeader>
  
  <CardContent>
    <Label data-testid="security-code-form-label">
      Code de sécurité (6 chiffres)
    </Label>
    
    <div data-testid="security-code-inputs">
      {Array.from({ length: 6 }).map((_, index) => (
        <Input
          key={index}
          data-testid={`security-code-input-${index}`}
          type="text"
          maxLength={1}
        />
      ))}
    </div>
    
    {error && (
      <Alert data-testid="security-code-form-error" variant="destructive">
        <AlertCircle />
        <AlertDescription data-testid="security-code-form-error-message">
          {error}
        </AlertDescription>
      </Alert>
    )}
    
    <Button
      data-testid="security-code-form-verify-button"
      onClick={handleVerify}
      disabled={code.length !== 6 || isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 /> Vérification...
        </>
      ) : (
        <>
          <Shield /> Vérifier le code
        </>
      )}
    </Button>
  </CardContent>
</Card>
```

**Liste des data-testid :**
- `security-code-form` : Container du formulaire
- `security-code-form-title` : Titre "Code de sécurité requis"
- `security-code-form-description` : Description
- `security-code-form-label` : Label "Code de sécurité (6 chiffres)"
- `security-code-inputs` : Container des inputs
- `security-code-input-{index}` : Input individuel (0, 1, 2, 3, 4, 5)
- `security-code-form-error` : Container d'erreur
- `security-code-form-error-message` : Message d'erreur
- `security-code-form-verify-button` : Bouton "Vérifier le code"

---

### 9. RegistrationFormV2 (mode correction)

**Bouton de soumission modifié :**
```tsx
{isCorrectionMode && (
  <Button
    data-testid="registration-form-submit-corrections-button"
    type="submit"
    disabled={isSubmitting}
  >
    {isSubmitting ? (
      <>
        <Loader2 /> Soumission en cours...
      </>
    ) : (
      <>
        <FileEdit /> Soumettre les corrections
      </>
    )}
  </Button>
)}
```

**Liste des data-testid :**
- `registration-form-submit-corrections-button` : Bouton "Soumettre les corrections"

---

## 📋 Récapitulatif par composant

### Admin
- `MembershipRequestActionsV2` : 5 data-testid
- `CorrectionsModalV2` : 6 data-testid
- Bloc "Corrections demandées" : 13 data-testid
- Badge "En correction" : 1 data-testid
- `SendWhatsAppModalV2` : 8 data-testid
- `RenewSecurityCodeModalV2` : 10 data-testid

**Total Admin : 43 data-testid**

### Demandeur
- `CorrectionBannerV2` : 4 data-testid
- `SecurityCodeFormV2` : 9 data-testid
- `RegistrationFormV2` (mode correction) : 1 data-testid

**Total Demandeur : 14 data-testid**

### Total général : 57 data-testid

---

## ✅ Checklist d'implémentation

- [ ] Ajouter tous les data-testid dans `MembershipRequestActionsV2`
- [ ] Ajouter tous les data-testid dans `CorrectionsModalV2`
- [ ] Ajouter tous les data-testid dans le bloc "Corrections demandées"
- [ ] Ajouter data-testid dans le badge "En correction"
- [ ] Ajouter tous les data-testid dans `SendWhatsAppModalV2`
- [ ] Ajouter tous les data-testid dans `RenewSecurityCodeModalV2`
- [ ] Ajouter tous les data-testid dans `CorrectionBannerV2`
- [ ] Ajouter tous les data-testid dans `SecurityCodeFormV2`
- [ ] Ajouter data-testid dans `RegistrationFormV2` (mode correction)
- [ ] Vérifier que tous les data-testid sont uniques
- [ ] Tester que les sélecteurs E2E fonctionnent avec ces data-testid
