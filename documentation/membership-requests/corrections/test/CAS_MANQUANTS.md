# Cas de Tests Manquants - Feedback P0

## 📋 Vue d'ensemble

Ce document liste les cas de tests manquants identifiés après analyse du feedback P0 et ajoutés aux fichiers de tests.

---

## ✅ Cas ajoutés

### 1. Dropdown conditionnel selon statut

**Test ajouté :** `P0-CORR-02: devrait afficher "Demander des corrections" uniquement si status=pending`

**Ce qui est testé :**
- ✅ "Demander des corrections" visible si `status === 'pending'`
- ✅ "Demander des corrections" NON visible si `status === 'under_review'`
- ✅ Actions post-création visibles si `status === 'under_review'` :
  - Copier lien de correction
  - Envoyer via WhatsApp
  - Régénérer le code

**Fichier :** `TESTS_E2E.md` §1.1

---

### 2. Modal simplifié (sans WhatsApp)

**Test ajouté :** `P0-CORR-03: devrait ne pas afficher WhatsApp dans le modal de corrections`

**Ce qui est testé :**
- ✅ Le modal ne contient PAS de checkbox "Envoyer via WhatsApp"
- ✅ Le modal ne contient PAS de sélecteur de numéro
- ✅ Le modal contient uniquement le textarea

**Fichier :** `TESTS_E2E.md` §1.1

---

### 3. Affichage "En correction" complet

**Test amélioré :** `P0-CORR-01` (ajout de vérifications)

**Ce qui est testé :**
- ✅ Badge "En correction"
- ✅ Format code : AB12-CD34 (vérifié)
- ✅ Date expiration : Format "18/01/2026 22:10" (ajouté)
- ✅ Temps restant : Format "(reste 2j 13h)" (ajouté)
- ✅ "Demandé par" : Nom + Matricule (format "(MAT-001)") (ajouté)
- ✅ Actions restent accessibles : Détails, Fiche, Pièce (ajouté)

**Fichier :** `TESTS_E2E.md` §1.1

---

### 4. Lien de correction (format correct)

**Test amélioré :** `P0-CORR-04`

**Ce qui est testé :**
- ✅ Format : `/register?requestId=XXX` (vérifié)
- ✅ **Nouveau :** Le lien ne contient PAS de paramètre `code=` (ajouté)

**Fichier :** `TESTS_E2E.md` §1.2

---

### 5. WhatsApp (message complet)

**Test amélioré :** `P0-CORR-05B`

**Ce qui est testé :**
- ✅ Le message WhatsApp contient le lien (ajouté)
- ✅ Le message WhatsApp contient le code formaté (AB12-CD34) (ajouté)
- ✅ Le message WhatsApp contient la date d'expiration (ajouté)
- ✅ Le message WhatsApp contient le temps restant (ajouté)

**Test ajouté :** `P0-CORR-05: devrait afficher "Envoyer via WhatsApp" uniquement si numéro disponible`

**Ce qui est testé :**
- ✅ Bouton visible si numéro disponible
- ✅ Bouton NON visible si pas de numéro
- ✅ Menu item NON visible dans dropdown si pas de numéro

**Fichier :** `TESTS_E2E.md` §1.3

---

### 6. Affichage max 3 corrections + "Voir plus"

**Test ajouté :** `P0-CORR-06: devrait afficher max 3 corrections puis "Voir plus"`

**Ce qui est testé :**
- ✅ Seules les 3 premières corrections sont affichées
- ✅ "Voir plus" ou "... et X autre(s)" est affiché si plus de 3 corrections
- ✅ Le compteur d'autres corrections est correct

**Fichier :** `TESTS_E2E.md` §1.4

---

### 7. Régénération code (vérifications complètes)

**Test amélioré :** `P0-CORR-06B`

**Ce qui est testé :**
- ✅ Nouveau code différent de l'ancien (vérifié)
- ✅ Format code : AB12-CD34 (vérifié)
- ✅ **Nouveau :** Nouvelle expiration = 48h à partir de maintenant (ajouté)
- ✅ **Nouveau :** Temps restant proche de 48h (47-48h) (ajouté)

**Fichier :** `TESTS_E2E.md` §1.4

---

## 📊 Résumé des ajouts

| Cas | Test | Statut |
|-----|------|--------|
| Dropdown conditionnel | P0-CORR-02 | ✅ Ajouté |
| Modal sans WhatsApp | P0-CORR-03 | ✅ Ajouté |
| Affichage complet "En correction" | P0-CORR-01 | ✅ Amélioré |
| Format lien (sans code) | P0-CORR-04 | ✅ Amélioré |
| WhatsApp conditionnel | P0-CORR-05 | ✅ Ajouté |
| Message WhatsApp complet | P0-CORR-05B | ✅ Amélioré |
| Max 3 corrections | P0-CORR-06 | ✅ Ajouté |
| Régénération complète | P0-CORR-06B | ✅ Amélioré |

**Total : 8 cas ajoutés/améliorés**

---

## ✅ Checklist finale

### Feedback P0 couvert

- [x] **1. Actions dans dropdown** : Test P0-CORR-02
- [x] **2. Modal simplifié** : Test P0-CORR-03
- [x] **3. Affichage "En correction"** : Test P0-CORR-01 (amélioré)
- [x] **4. Lien de correction** : Test P0-CORR-04 (amélioré)
- [x] **5. Gestion du code** : Tests P0-CORR-06, P0-CORR-06B
- [x] **6. WhatsApp** : Tests P0-CORR-05, P0-CORR-05B

### Détails couverts

- [x] Badge "En correction"
- [x] Format code AB12-CD34
- [x] Date expiration formatée
- [x] Temps restant (2j 13h)
- [x] "Demandé par" avec matricule
- [x] Max 3 corrections + "Voir plus"
- [x] Actions restent accessibles
- [x] Dropdown change selon statut
- [x] Lien sans code dans URL
- [x] Message WhatsApp complet
- [x] WhatsApp conditionnel (si numéro)

---

## 📝 Notes

Tous les cas du feedback P0 sont maintenant couverts dans les tests E2E. Les tests unitaires et d'intégration couvrent également les aspects techniques (génération code, formatage, etc.).
