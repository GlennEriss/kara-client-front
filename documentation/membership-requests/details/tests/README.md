## Tests – Vue détails demande d’adhésion

Objectif : documenter les tests à prévoir (unitaires et intégration) pour la page `MembershipRequestDetails` dans la nouvelle architecture (domain/services/hooks).

### Tests existants
- ✅ Tests unitaires utilitaires : `formatDateDetailed`, `isDateExpired`, `formatAddress`, `resolveAdhesionPdfUrl`
- ✅ Tests unitaires hook : `useMembershipRequestDetails`
- ✅ Tests d'intégration : `membership-request-details.integration.test.tsx` (13 scénarios)

### Checklist tests (détaillée)

#### Tests unitaires - Utilitaires (`details/utils.ts`)
- [x] `formatDateDetailed` : timestamps Date/Firestore/string → format fr-FR ✅ `formatDateDetailed.test.ts`
- [x] `formatDateDetailed` : gestion valeurs null/undefined → "Non définie" ✅ `formatDateDetailed.test.ts`
- [x] `isDateExpired` : date passée → true ✅ `isDateExpired.test.ts`
- [x] `isDateExpired` : date future/aujourd'hui → false ✅ `isDateExpired.test.ts`
- [x] `isDateExpired` : valeurs null/undefined → false ✅ `isDateExpired.test.ts`
- [x] `formatAddress` : tous champs présents → format complet ✅ `formatAddress.test.ts`
- [x] `formatAddress` : champs manquants → format partiel ✅ `formatAddress.test.ts`
- [x] `formatAddress` : tous champs vides → "Non renseignée" ✅ `formatAddress.test.ts`
- [x] `resolveAdhesionPdfUrl` : `adhesionPdfURL` présent → retourne URL ✅ `resolveAdhesionPdfUrl.test.ts`
- [x] `resolveAdhesionPdfUrl` : pas d'URL, doc Firestore trouvé → retourne doc.url ✅ `resolveAdhesionPdfUrl.test.ts`
- [x] `resolveAdhesionPdfUrl` : pas d'URL, aucun doc → retourne null ✅ `resolveAdhesionPdfUrl.test.ts`
- [ ] `getStatusBadgeProps` : chaque statut (pending/approved/rejected/under_review) → props correctes (géré par `StatusBadgeV2` composant)

#### Tests unitaires - Sous-composants présentatifs
- [ ] `DetailsHeaderStatus` : affiche titre, statut (badge), matricule, dates
- [ ] `DetailsHeaderStatus` : bouton retour fonctionne
- [ ] `DetailsIdentityCard` : affiche firstName/lastName, photo (ou fallback), gender, birthDate
- [ ] `DetailsIdentityCard` : photo manquante → affiche placeholder
- [ ] `DetailsContactCard` : affiche contacts[] et email
- [ ] `DetailsContactCard` : contacts vides → affiche "Non renseigné"
- [ ] `DetailsAddressCard` : affiche adresse formatée
- [ ] `DetailsAddressCard` : adresse vide → affiche "Non renseignée"
- [ ] `DetailsEmploymentCard` : affiche profession/entreprise si présents
- [ ] `DetailsEmploymentCard` : affiche intermédiaire si code présent
- [ ] `DetailsEmploymentCard` : tous champs vides → masque ou affiche "Non renseigné"
- [ ] `DetailsPaymentCard` : `isPaid=true` → badge "Payé" (vert), affiche montant/date/mode
- [ ] `DetailsPaymentCard` : `isPaid=false` → badge "Non payé" (rouge), masque détails
- [ ] `DetailsPaymentCard` : plusieurs paiements → affiche historique trié
- [ ] `DetailsDocumentsCard` : affiche lien PDF adhésion (URL directe ou fallback)
- [ ] `DetailsDocumentsCard` : PDF manquant → affiche message/erreur
- [ ] `DetailsDocumentsCard` : affiche pièces d'identité (recto/verso)
- [ ] `DetailsMetaCard` : affiche admin traiteur (nom si disponible)
- [ ] `DetailsMetaCard` : affiche dates processed/approved
- [ ] `DetailsMetaCard` : `reviewNote` présent → affiche bloc corrections
- [ ] `DetailsSkeleton` : affiche skeletons pour toutes sections
- [ ] `DetailsErrorState` : affiche message erreur + boutons retry/back

#### Tests unitaires - Hook `useMembershipRequestDetails`
- [x] Hook : agrège `useMembershipRequest` + admin + intermédiaire + documents ✅ `useMembershipRequestDetails.test.ts`
- [x] Hook : `isLoading=true` → retourne loading state ✅ `useMembershipRequestDetails.test.ts`
- [x] Hook : `isError=true` → retourne error state ✅ `useMembershipRequestDetails.test.ts`
- [x] Hook : succès → retourne data complète (request, admin, intermediary, adhesionPdfUrlResolved) ✅ `useMembershipRequestDetails.test.ts`
- [x] Hook : fallback PDF → appelle `resolveAdhesionPdfUrl` si `adhesionPdfURL` absent ✅ `useMembershipRequestDetails.test.ts`
- [x] Hook : cache React Query → évite appels multiples ✅ (géré par React Query)

#### Tests d'intégration - Scénarios complets
- [x] **Chargement réussi** : route → hook → Firestore → affichage toutes sections ✅ `INT-DETAILS-01`
- [x] **Erreur 404** : demande introuvable → affiche message erreur + bouton retour ✅ `INT-DETAILS-02`
- [x] **Erreur réseau** : timeout/permission → affiche erreur + bouton retry ✅ `INT-DETAILS-03`
- [x] **PDF adhésion - URL directe** : `adhesionPdfURL` présent → ouvre URL dans nouvel onglet ✅ `INT-DETAILS-04`
- [x] **PDF adhésion - Fallback Firestore** : pas d'URL → cherche dans `documents` type `ADHESION` → ouvre doc.url ✅ `INT-DETAILS-05`
- [x] **PDF adhésion - Manquant** : pas d'URL + aucun doc Firestore → toast "PDF non disponible" ✅ `INT-DETAILS-06`
- [x] **Paiement payé** : affiche badge vert + détails (montant, date, mode) ✅ `INT-DETAILS-07`
- [x] **Paiement non payé** : affiche badge rouge, masque détails ✅ `INT-DETAILS-08`
- [x] **Statut "En cours d'examen"** : affiche badge bleu + bloc corrections (reviewNote) ✅ `INT-DETAILS-09`
- [x] **Admin traiteur** : `getAdminById` appelé → affiche nom admin ✅ `INT-DETAILS-12`
- [x] **Intermédiaire** : code présent → `useIntermediary` appelé → affiche infos intermédiaire ✅ `INT-DETAILS-13`
- [x] **États de chargement** : skeletons affichés → remplacés par contenu au chargement ✅ `INT-DETAILS-11`
- [x] **Navigation** : bouton retour → redirection vers liste ✅ `INT-DETAILS-10`
- [ ] **Pièce d'identité** : affiche photos recto/verso depuis `documents.*` (à tester manuellement ou E2E)

#### Fixtures de données à créer
- [ ] `fixture-request-approved-with-pdf.json` : demande approuvée, `adhesionPdfURL` présent, payée
- [ ] `fixture-request-approved-no-pdf.json` : demande approuvée, pas d'URL (nécessite fallback)
- [ ] `fixture-request-pending.json` : demande en attente, non payée
- [ ] `fixture-request-rejected.json` : demande rejetée, motif présent
- [ ] `fixture-request-under-review.json` : demande en cours, `reviewNote` + code sécurité
- [ ] `fixture-admin-processed-by.json` : données admin (nom, matricule)
- [ ] `fixture-intermediary.json` : données intermédiaire (si code présent)
- [ ] `fixture-document-adhesion.json` : document Firestore type `ADHESION` (pour fallback)

#### Tests E2E (Playwright)
- [ ] **Navigation vers détails** : clic depuis liste → ouverture page détails
- [ ] **Chargement réussi** : toutes sections visibles (identité, contact, adresse, emploi, paiement, documents, meta)
- [ ] **Erreur 404** : demande introuvable → message erreur + bouton retour fonctionne
- [ ] **Erreur réseau** : timeout → message erreur + bouton retry fonctionne
- [ ] **PDF adhésion - URL directe** : clic "Adhésion PDF" → ouvre URL dans nouvel onglet
- [ ] **PDF adhésion - Fallback** : pas d'URL → fallback Firestore → ouvre doc.url
- [ ] **PDF adhésion - Manquant** : pas d'URL + aucun doc → toast "PDF non disponible"
- [ ] **Pièce d'identité** : affichage photos recto/verso
- [ ] **Paiement payé** : badge "Payé" visible + détails affichés
- [ ] **Paiement non payé** : badge "Non payé" visible + détails masqués
- [ ] **Statut "En cours d'examen"** : badge bleu + bloc corrections visible
- [ ] **Navigation retour** : bouton retour → redirection vers liste

#### Attributs `data-testid` à ajouter sur les composants
**Composant principal :**
- `data-testid="membership-request-details"` : conteneur principal
- `data-testid="details-loading"` : état chargement (skeletons)
- `data-testid="details-error"` : état erreur

**DetailsHeaderStatus :**
- `data-testid="details-header"` : conteneur header
- `data-testid="details-status-badge"` : badge statut
- `data-testid="details-matricule"` : matricule
- `data-testid="details-back-button"` : bouton retour

**DetailsIdentityCard :**
- `data-testid="details-identity-card"` : carte identité
- `data-testid="details-identity-photo"` : photo (ou placeholder)
- `data-testid="details-identity-name"` : nom complet
- `data-testid="details-identity-birthdate"` : date naissance

**DetailsContactCard :**
- `data-testid="details-contact-card"` : carte contact
- `data-testid="details-contact-phone"` : téléphone(s)
- `data-testid="details-contact-email"` : email

**DetailsAddressCard :**
- `data-testid="details-address-card"` : carte adresse
- `data-testid="details-address-full"` : adresse formatée

**DetailsEmploymentCard :**
- `data-testid="details-employment-card"` : carte emploi
- `data-testid="details-employment-profession"` : profession
- `data-testid="details-employment-company"` : entreprise
- `data-testid="details-employment-intermediary"` : intermédiaire (si présent)

**DetailsPaymentCard :**
- `data-testid="details-payment-card"` : carte paiement
- `data-testid="details-payment-status"` : badge payé/non payé
- `data-testid="details-payment-amount"` : montant (si payé)
- `data-testid="details-payment-date"` : date paiement (si payé)
- `data-testid="details-payment-mode"` : mode paiement (si payé)

**DetailsDocumentsCard :**
- `data-testid="details-documents-card"` : carte documents
- `data-testid="details-adhesion-pdf-button"` : bouton "Adhésion PDF"
- `data-testid="details-identity-document-front"` : pièce identité recto
- `data-testid="details-identity-document-back"` : pièce identité verso

**DetailsMetaCard :**
- `data-testid="details-meta-card"` : carte meta
- `data-testid="details-processed-by"` : admin traiteur
- `data-testid="details-processed-at"` : date traitement
- `data-testid="details-review-note"` : bloc corrections (si présent)

**DetailsErrorState :**
- `data-testid="details-error-message"` : message erreur
- `data-testid="details-error-retry-button"` : bouton retry
- `data-testid="details-error-back-button"` : bouton retour

#### Couverture cible et résultats

**Utilitaires** : ✅ **100%** (fonctions pures, faciles à tester)
- `formatDateDetailed` : 100% couverture
- `isDateExpired` : 100% couverture
- `formatAddress` : 100% couverture
- `resolveAdhesionPdfUrl` : 100% couverture

**Hook `useMembershipRequestDetails`** : ✅ **≥ 80%** (tous les chemins de données)
- Agrégation des données : ✅ Testé
- États loading/error : ✅ Testé
- Fallback PDF : ✅ Testé

**Intégration** : ✅ **Tous les scénarios critiques** (chargement, erreurs, PDF, paiement)
- 13 scénarios d'intégration couverts dans `membership-request-details.integration.test.tsx`

**Sous-composants** : ⚠️ **À compléter** (≥ 80% cible)
- Les composants sont créés mais les tests unitaires individuels ne sont pas encore écrits
- Les composants sont testés indirectement via les tests d'intégration
- **Recommandation** : Ajouter des tests unitaires pour chaque composant si nécessaire

**E2E** : ⚠️ **À faire** (tous les scénarios utilisateur)
- Tests E2E avec Playwright à créer dans une phase ultérieure
