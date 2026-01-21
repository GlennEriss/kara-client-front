# Data-TestID - Fonctionnalité "Rejet d'une Demande d'Adhésion"

> Liste complète des data-testid à ajouter dans les composants pour les tests E2E et d'intégration

---

## 📋 Vue d'ensemble

**Total estimé** : ~40-50 data-testid

**Convention** : `{feature}-{element}-{action?}`

**Exemples** :
- `reject-modal-reason-input` : Input motif de rejet dans le modal
- `reject-modal-submit-button` : Bouton "Rejeter" dans le modal
- `reopen-modal-reason-input` : Input motif de réouverture
- `delete-modal-matricule-input` : Input matricule de confirmation

---

## 🔴 Modal Rejet (RejectModalV2)

**Composant** : `src/domains/memberships/components/modals/RejectModalV2.tsx`

| Data-TestID | Élément | Description |
|-------------|---------|-------------|
| `reject-modal` | Modal | Container principal du modal |
| `reject-modal-title` | Titre | Titre "Rejeter la demande d'adhésion" |
| `reject-modal-description` | Description | Description du modal |
| `reject-modal-member-name` | Texte | Nom du demandeur affiché |
| `reject-modal-reason-label` | Label | Label "Motif de rejet *" |
| `reject-modal-reason-input` | Textarea | Input motif de rejet (textarea) |
| `reject-modal-reason-counter` | Texte | Compteur de caractères (ex: "125 / 500 caractères") |
| `reject-modal-reason-error` | Texte | Message d'erreur validation motif |
| `reject-modal-cancel-button` | Bouton | Bouton "Annuler" |
| `reject-modal-submit-button` | Bouton | Bouton "Rejeter" (désactivé si validation échoue) |
| `reject-modal-loading` | Spinner | Indicateur de chargement |

**Total** : 11 data-testid

---

## 🔄 Modal Réouverture (ReopenModalV2)

**Composant** : `src/domains/memberships/components/modals/ReopenModalV2.tsx`

| Data-TestID | Élément | Description |
|-------------|---------|-------------|
| `reopen-modal` | Modal | Container principal du modal |
| `reopen-modal-title` | Titre | Titre "Réouvrir la demande d'adhésion" |
| `reopen-modal-description` | Description | Description du modal |
| `reopen-modal-member-name` | Texte | Nom du demandeur affiché |
| `reopen-modal-matricule` | Texte | Matricule affiché |
| `reopen-modal-previous-reject-reason` | Texte | Motif de rejet initial affiché |
| `reopen-modal-reason-label` | Label | Label "Motif de réouverture *" |
| `reopen-modal-reason-input` | Textarea | Input motif de réouverture (textarea) |
| `reopen-modal-reason-counter` | Texte | Compteur de caractères (ex: "125 / 500 caractères") |
| `reopen-modal-reason-error` | Texte | Message d'erreur validation motif |
| `reopen-modal-cancel-button` | Bouton | Bouton "Annuler" |
| `reopen-modal-submit-button` | Bouton | Bouton "Réouvrir" (désactivé si validation échoue) |
| `reopen-modal-loading` | Spinner | Indicateur de chargement |

**Total** : 13 data-testid

---

## 🗑️ Modal Suppression (DeleteModalV2)

**Composant** : `src/domains/memberships/components/modals/DeleteModalV2.tsx`

| Data-TestID | Élément | Description |
|-------------|---------|-------------|
| `delete-modal` | Modal | Container principal du modal |
| `delete-modal-title` | Titre | Titre "Supprimer définitivement le dossier" |
| `delete-modal-warning` | Texte | Avertissement "La suppression sera définitive et non réversible" |
| `delete-modal-member-name` | Texte | Nom du demandeur affiché |
| `delete-modal-matricule-display` | Texte | Matricule affiché pour référence |
| `delete-modal-matricule-label` | Label | Label "Confirmer le matricule *" |
| `delete-modal-matricule-input` | Input | Input confirmation matricule |
| `delete-modal-matricule-error` | Texte | Message d'erreur si matricule incorrect |
| `delete-modal-cancel-button` | Bouton | Bouton "Annuler" |
| `delete-modal-submit-button` | Bouton | Bouton "Supprimer" (désactivé si matricule incorrect) |
| `delete-modal-loading` | Spinner | Indicateur de chargement |

**Total** : 11 data-testid

---

## 💬 Modal WhatsApp (RejectWhatsAppModalV2)

**Composant** : `src/domains/memberships/components/modals/RejectWhatsAppModalV2.tsx`

| Data-TestID | Élément | Description |
|-------------|---------|-------------|
| `reject-whatsapp-modal` | Modal | Container principal du modal |
| `reject-whatsapp-modal-title` | Titre | Titre "💬 Envoyer le motif de rejet via WhatsApp" |
| `reject-whatsapp-modal-description` | Description | Description du modal |
| `reject-whatsapp-modal-phone-label` | Label | Label "Sélectionner le numéro WhatsApp *" (si plusieurs) |
| `reject-whatsapp-modal-phone-display` | Texte | Numéro affiché (si un seul) |
| `reject-whatsapp-modal-phone-select` | Select | Dropdown sélection numéro (si plusieurs) |
| `reject-whatsapp-modal-message-label` | Label | Label "Message (modifiable) *" |
| `reject-whatsapp-modal-message-textarea` | Textarea | Textarea message (modifiable) |
| `reject-whatsapp-modal-cancel-button` | Bouton | Bouton "Annuler" |
| `reject-whatsapp-modal-send-button` | Bouton | Bouton "💬 Envoyer via WhatsApp" |

**Total** : 10 data-testid

---

## 🔘 Actions Post-Rejet (MembershipRequestActionsV2)

**Composant** : `src/domains/memberships/components/actions/MembershipRequestActionsV2.tsx`

| Data-TestID | Élément | Description |
|-------------|---------|-------------|
| `reject-button` | Bouton | Bouton "Rejeter" (si `status !== 'rejected'`) |
| `reopen-button` | Bouton | Bouton "Réouvrir" (si `status === 'rejected'`) |
| `send-whatsapp-button` | Bouton | Bouton "Envoyer WhatsApp" (si `status === 'rejected'`) |
| `delete-button` | Bouton | Bouton "Supprimer" (si `status === 'rejected'`) |
| `view-details-button` | Bouton | Bouton "Voir détails" (toujours visible) |

**Total** : 5 data-testid

---

## 🔔 Notifications (NotificationBell)

**Composant** : `src/components/layout/NotificationBell.tsx` (modification)

| Data-TestID | Élément | Description |
|-------------|---------|-------------|
| `notification-rejected` | Notification | Notification "Demande d'adhésion rejetée" (type: membership_rejected) |
| `notification-reopened` | Notification | Notification "Dossier réouvert" (type: membership_reopened) |
| `notification-deleted` | Notification | Notification "Dossier supprimé définitivement" (type: membership_deleted) |

**Total** : 3 data-testid

---

## 📊 Récapitulatif

| Composant | Nombre Data-TestID |
|-----------|-------------------|
| RejectModalV2 | 11 |
| ReopenModalV2 | 13 |
| DeleteModalV2 | 11 |
| RejectWhatsAppModalV2 | 10 |
| MembershipRequestActionsV2 | 5 |
| NotificationBell | 3 |
| **Total** | **53 data-testid** |

---

## 📝 Code d'Exemple

### RejectModalV2.tsx

```tsx
<Dialog data-testid="reject-modal">
  <DialogHeader>
    <DialogTitle data-testid="reject-modal-title">
      Rejeter la demande d'adhésion
    </DialogTitle>
    <p data-testid="reject-modal-description">
      Vous êtes sur le point de rejeter la demande de{" "}
      <span data-testid="reject-modal-member-name">{memberName}</span>.
    </p>
  </DialogHeader>
  
  <div>
    <Label data-testid="reject-modal-reason-label" htmlFor="reason">
      Motif de rejet *
    </Label>
    <Textarea
      id="reason"
      data-testid="reject-modal-reason-input"
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      placeholder="Indiquez le motif de rejet de cette demande..."
      maxLength={500}
    />
    <span data-testid="reject-modal-reason-counter">
      {reason.length} / 500 caractères
    </span>
    {error && (
      <p data-testid="reject-modal-reason-error" className="text-red-500">
        {error}
      </p>
    )}
  </div>
  
  <DialogFooter>
    <Button
      data-testid="reject-modal-cancel-button"
      variant="outline"
      onClick={onClose}
    >
      Annuler
    </Button>
    <Button
      data-testid="reject-modal-submit-button"
      onClick={handleSubmit}
      disabled={!isValid || isLoading}
    >
      {isLoading ? (
        <span data-testid="reject-modal-loading">Rejet en cours...</span>
      ) : (
        "Rejeter"
      )}
    </Button>
  </DialogFooter>
</Dialog>
```

### ReopenModalV2.tsx

```tsx
<Dialog data-testid="reopen-modal">
  <DialogHeader>
    <DialogTitle data-testid="reopen-modal-title">
      Réouvrir la demande d'adhésion
    </DialogTitle>
    <p data-testid="reopen-modal-description">
      Vous êtes sur le point de réouvrir cette demande qui a été rejetée.
    </p>
  </DialogHeader>
  
  <div>
    <p>
      Demandeur : <span data-testid="reopen-modal-member-name">{memberName}</span>
    </p>
    <p>
      Matricule : <span data-testid="reopen-modal-matricule">{matricule}</span>
    </p>
    <p>
      Motif de rejet initial : <span data-testid="reopen-modal-previous-reject-reason">{previousRejectReason}</span>
    </p>
    
    <Label data-testid="reopen-modal-reason-label" htmlFor="reopen-reason">
      Motif de réouverture *
    </Label>
    <Textarea
      id="reopen-reason"
      data-testid="reopen-modal-reason-input"
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      maxLength={500}
    />
    <span data-testid="reopen-modal-reason-counter">
      {reason.length} / 500 caractères
    </span>
    {error && (
      <p data-testid="reopen-modal-reason-error" className="text-red-500">
        {error}
      </p>
    )}
  </div>
  
  <DialogFooter>
    <Button
      data-testid="reopen-modal-cancel-button"
      variant="outline"
      onClick={onClose}
    >
      Annuler
    </Button>
    <Button
      data-testid="reopen-modal-submit-button"
      onClick={handleSubmit}
      disabled={!isValid || isLoading}
    >
      {isLoading ? (
        <span data-testid="reopen-modal-loading">Réouverture en cours...</span>
      ) : (
        "Réouvrir"
      )}
    </Button>
  </DialogFooter>
</Dialog>
```

### DeleteModalV2.tsx

```tsx
<Dialog data-testid="delete-modal">
  <DialogHeader>
    <DialogTitle data-testid="delete-modal-title">
      Supprimer définitivement le dossier
    </DialogTitle>
    <Alert data-testid="delete-modal-warning" variant="destructive">
      La suppression sera définitive et non réversible.
    </Alert>
  </DialogHeader>
  
  <div>
    <p>
      Nom : <span data-testid="delete-modal-member-name">{memberName}</span>
    </p>
    <p>
      Matricule : <span data-testid="delete-modal-matricule-display">{matricule}</span>
    </p>
    
    <Label data-testid="delete-modal-matricule-label" htmlFor="confirmed-matricule">
      Confirmer le matricule *
    </Label>
    <Input
      id="confirmed-matricule"
      data-testid="delete-modal-matricule-input"
      value={confirmedMatricule}
      onChange={(e) => setConfirmedMatricule(e.target.value)}
      placeholder="Saisir le matricule pour confirmer"
    />
    {error && (
      <p data-testid="delete-modal-matricule-error" className="text-red-500">
        {error}
      </p>
    )}
  </div>
  
  <DialogFooter>
    <Button
      data-testid="delete-modal-cancel-button"
      variant="outline"
      onClick={onClose}
    >
      Annuler
    </Button>
    <Button
      data-testid="delete-modal-submit-button"
      variant="destructive"
      onClick={handleSubmit}
      disabled={confirmedMatricule !== matricule || isLoading}
    >
      {isLoading ? (
        <span data-testid="delete-modal-loading">Suppression en cours...</span>
      ) : (
        "Supprimer"
      )}
    </Button>
  </DialogFooter>
</Dialog>
```

### RejectWhatsAppModalV2.tsx

```tsx
<Dialog data-testid="reject-whatsapp-modal">
  <DialogHeader>
    <DialogTitle data-testid="reject-whatsapp-modal-title">
      💬 Envoyer le motif de rejet via WhatsApp
    </DialogTitle>
    <p data-testid="reject-whatsapp-modal-description">
      Un message WhatsApp sera envoyé au demandeur avec le motif de rejet.
    </p>
  </DialogHeader>
  
  <div>
    {phoneNumbers.length > 1 ? (
      <>
        <Label data-testid="reject-whatsapp-modal-phone-label" htmlFor="phone">
          Sélectionner le numéro WhatsApp *
        </Label>
        <Select
          id="phone"
          data-testid="reject-whatsapp-modal-phone-select"
          value={selectedPhone}
          onValueChange={setSelectedPhone}
        >
          {phoneNumbers.map((phone) => (
            <SelectItem key={phone} value={phone}>
              {phone}
            </SelectItem>
          ))}
        </Select>
      </>
    ) : (
      <p>
        Numéro WhatsApp : <span data-testid="reject-whatsapp-modal-phone-display">{phoneNumbers[0]}</span>
      </p>
    )}
    
    <Label data-testid="reject-whatsapp-modal-message-label" htmlFor="message">
      Message (modifiable) *
    </Label>
    <Textarea
      id="message"
      data-testid="reject-whatsapp-modal-message-textarea"
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      rows={10}
    />
  </div>
  
  <DialogFooter>
    <Button
      data-testid="reject-whatsapp-modal-cancel-button"
      variant="outline"
      onClick={onClose}
    >
      Annuler
    </Button>
    <Button
      data-testid="reject-whatsapp-modal-send-button"
      onClick={handleSendWhatsApp}
    >
      💬 Envoyer via WhatsApp
    </Button>
  </DialogFooter>
</Dialog>
```

---

## ✅ Checklist

- [ ] Ajouter tous les data-testid dans `RejectModalV2.tsx` (11 data-testid)
- [ ] Ajouter tous les data-testid dans `ReopenModalV2.tsx` (13 data-testid)
- [ ] Ajouter tous les data-testid dans `DeleteModalV2.tsx` (11 data-testid)
- [ ] Ajouter tous les data-testid dans `RejectWhatsAppModalV2.tsx` (10 data-testid)
- [ ] Ajouter tous les data-testid dans `MembershipRequestActionsV2.tsx` (5 data-testid)
- [ ] Ajouter tous les data-testid dans `NotificationBell.tsx` (3 data-testid)
- [ ] Vérifier que tous les sélecteurs E2E fonctionnent

---

## 📚 Références

- **Modal Rejet** : `../FLUX_REJET.md`
- **Modal Réouverture** : `../ACTIONS_POST_REJET.md` §1
- **Modal Suppression** : `../ACTIONS_POST_REJET.md` §2
- **Modal WhatsApp** : `../wireframes/MODAL_WHATSAPP_REJET.md`
- **Actions Post-Rejet** : `../ACTIONS_POST_REJET.md`
- **Tests E2E** : `TESTS_E2E.md`

---

**Note** : Cette liste sera complétée lors de l'implémentation des composants.
