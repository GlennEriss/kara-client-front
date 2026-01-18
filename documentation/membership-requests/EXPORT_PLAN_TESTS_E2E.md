# Plan de Test E2E - Export des demandes d'adhésion

## 📋 Vue d'ensemble

**Fonctionnalité:** Export des demandes d'adhésion (PDF + Excel)  
**Page:** `/membership-requests`  
**Modal:** "Exporter les demandes d'adhésion"  
**Objectif:** Valider que l'export fonctionne selon les options du modal et que tous les boutons/inputs se comportent correctement sur desktop + mobile.

---

## 🎯 Stratégie de test

### Environnements de test
- **Desktop:** 1280x720 (Chrome)
- **Tablette:** iPad Pro (1024x1366)
- **Mobile:** Pixel 5 (393x851)

### Jeux de données (Fixtures)
- Demande "En attente" non payée
- Demande "En attente" payée
- Demande "Approuvée" (payée)
- Demande "Rejetée" (non payée)
- Demande "En cours de révision"
- Demandes avec différentes dates (derniers 30 jours, anciennes, futures)

### Gestion des téléchargements
- **Playwright download handling:** Intercepter les downloads avec `page.waitForEvent('download')`
- **Validation fichiers:**
  - PDF: Vérifier titre, date, colonnes principales, nombre de pages
  - Excel: Vérifier colonnes, lignes, format de date, valeurs calculées

### Robustesse
- Double-clic sur "Générer l'export"
- Erreurs réseau (mock 500)
- Export volumineux (>1000 demandes)
- Dataset vide (aucune demande)

---

## 📊 Matrice de couverture

### P0 - Bloquant (Téléchargement & cohérence)

| ID | Cas de test | Format | Scope | Tri | Filtres | Priorité |
|----|-------------|--------|-------|-----|---------|----------|
| P0-01 | Export PDF par défaut (période) | PDF | Période | Date desc | Aucun | P0 |
| P0-02 | Export Excel par défaut (période) | Excel | Période | Date desc | Aucun | P0 |
| P0-03 | Export PDF toutes les demandes | PDF | Toutes | Date desc | Aucun | P0 |
| P0-04 | Export Excel toutes les demandes | Excel | Toutes | Date desc | Aucun | P0 |
| P0-05 | Export PDF par nombre (100 dernières) | PDF | Quantité | Date desc | Aucun | P0 |
| P0-06 | Export Excel par nombre (100 dernières) | Excel | Quantité | Date desc | Aucun | P0 |
| P0-07 | Validation contenu PDF (titre, date, colonnes) | PDF | Période | Date desc | Aucun | P0 |
| P0-08 | Validation contenu Excel (colonnes, lignes) | Excel | Période | Date desc | Aucun | P0 |

### P1 - Fortement recommandé (Validations & UX)

| ID | Cas de test | Format | Scope | Tri | Filtres | Priorité |
|----|-------------|--------|-------|-----|---------|----------|
| P1-01 | Reset valeurs par défaut | - | - | - | - | P1 |
| P1-02 | Filtre statut "En attente" | PDF | Période | Date desc | En attente | P1 |
| P1-03 | Filtre statut "Approuvées" | Excel | Période | Date desc | Approuvées | P1 |
| P1-04 | Filtre paiement "Payées" | PDF | Période | Date desc | Payées | P1 |
| P1-05 | Filtre paiement "Non payées" | Excel | Période | Date desc | Non payées | P1 |
| P1-06 | Tri Date ascendant | PDF | Période | Date asc | Aucun | P1 |
| P1-07 | Tri Nom A→Z | Excel | Période | Nom asc | Aucun | P1 |
| P1-08 | Tri Nom Z→A | PDF | Période | Nom desc | Aucun | P1 |
| P1-09 | Aperçu mis à jour après changement | - | Période | Date desc | Aucun | P1 |
| P1-10 | Validation dates période (Du ≤ Au) | - | Période | - | - | P1 |
| P1-11 | Validation nombre (1-10000) | - | Quantité | - | - | P1 |
| P1-12 | Bouton désactivé si config invalide | - | - | - | - | P1 |

### P2 - Amélioration UX (Accessibilité & Mobile)

| ID | Cas de test | Format | Scope | Tri | Filtres | Priorité |
|----|-------------|--------|-------|-----|---------|----------|
| P2-01 | Fermeture modal bouton X | - | - | - | - | P2 |
| P2-02 | Fermeture modal bouton Annuler | - | - | - | - | P2 |
| P2-03 | Fermeture modal touche ESC | - | - | - | - | P2 |
| P2-04 | Focus trap dans le modal | - | - | - | - | P2 |
| P2-05 | Overlay backdrop ferme le modal | - | - | - | - | P2 |
| P2-06 | Responsive mobile (layout 1 colonne) | - | - | - | - | P2 |
| P2-07 | Checkboxes fonctionnent en mobile | - | - | - | Tous | P2 |
| P2-08 | Dates en colonne sur mobile | - | Période | - | - | P2 |
| P2-09 | Boutons footer responsive (stack sur mobile) | - | - | - | - | P2 |

### Robustesse & Erreurs

| ID | Cas de test | Format | Scope | Tri | Filtres | Priorité |
|----|-------------|--------|-------|-----|---------|----------|
| R-01 | Double-clic sur "Générer" (1 seul export) | PDF | Période | Date desc | Aucun | P1 |
| R-02 | Erreur backend (mock 500) → toast erreur | PDF | Période | Date desc | Aucun | P1 |
| R-03 | Export volumineux (>1000) → warning | Excel | Toutes | Date desc | Aucun | P2 |
| R-04 | Dataset vide → message approprié | PDF | Période | Date desc | Aucun | P2 |
| R-05 | Dates invalides (Du > Au) → désactivé | - | Période | - | - | P1 |
| R-06 | Nombre invalide (<1 ou >10000) → désactivé | - | Quantité | - | - | P1 |

---

## ✅ Liste complète des cas de test

### Total: 33 cas de test
- **P0:** 8 cas (24%)
- **P1:** 13 cas (39%)
- **P2:** 9 cas (27%)
- **Robustesse:** 6 cas (18%)

### Répartition par format
- **PDF:** 14 cas
- **Excel:** 13 cas
- **Général (pas d'export):** 6 cas

---

## 🧪 Implémentation recommandée

### Tests à implémenter en priorité (minimum viable)

1. **Export PDF:** "Par période" + tri récent→ancien + filtre "En attente"
2. **Export Excel:** "Nombre de demandes=100" + tri + sans filtres
3. **Reset:** après modifications, revenir à l'état par défaut
4. **Fermeture modal:** Annuler / X / ESC
5. **Erreur backend:** mock 500 sur endpoint export → message d'erreur et pas de download

### Ordre d'implémentation

**Phase 1 (MVP):**
- P0-01, P0-02, P0-07, P0-08 (Exports de base + validation)
- R-02 (Gestion erreur)
- P1-12 (Validation config)

**Phase 2 (Complémentaire):**
- P1-01, P1-02, P1-06 (Reset, filtres, tri)
- P2-01, P2-02, P2-03 (Fermeture modal)
- R-01 (Double-clic)

**Phase 3 (Bonus):**
- P2-06, P2-07, P2-08 (Responsive mobile)
- R-03, R-04 (Volumineux, vide)

---

## 📈 Métriques de couverture

### Couverture fonctionnelle
- **Téléchargement:** 100% (P0)
- **Configuration:** 100% (P0 + P1)
- **Filtres:** 80% (P1)
- **Tri:** 100% (P1)
- **UX/Responsive:** 60% (P2)
- **Gestion erreurs:** 80% (Robustesse)

### Couverture plateformes
- **Desktop:** 100% (tous les cas)
- **Tablette:** 80% (cas critiques)
- **Mobile:** 60% (cas critiques + responsive)

---

## 📝 Notes & Recommandations

### Cas non testables automatiquement
- **Performance export volumineux:** Nécessite données réelles (>1000 demandes)
- **Format exact PDF/Excel:** Validation complète nécessite parsing approfondi
- **Accessibilité complète:** Audit manuel recommandé (ARIA, navigation clavier)

### Recommandations QA
1. **Tests de performance:** Mesurer temps d'export pour >1000 demandes
2. **Tests de charge:** Valider comportement avec 10+ exports simultanés
3. **Tests d'accessibilité:** Audit manuel avec lecteur d'écran
4. **Tests cross-browser:** Valider sur Firefox et Safari
5. **Tests de régression:** Ajouter tests E2E à la CI/CD

---

## 🔄 Maintenance

### Fréquence de mise à jour
- **Révision plan:** Mensuelle
- **Mise à jour tests:** À chaque modification fonctionnelle
- **Ajout nouveaux cas:** Lors de nouvelles fonctionnalités

### Critères de succès
- ✅ Tous les tests P0 passent
- ✅ 80%+ des tests P1 passent
- ✅ Aucune régression sur exports existants
- ✅ Temps d'exécution < 10 minutes

---

**Date de création:** 2026-01-18  
**Version:** 1.0  
**Auteur:** QA Automation Team
