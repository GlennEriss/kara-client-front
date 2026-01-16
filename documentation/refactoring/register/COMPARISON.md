# Comparaison Ancien vs Nouveau Formulaire Register

## Étape 1 : Identité (IdentityStepV2)

### ✅ **TOUS LES CHAMPS RESTAURÉS** :
1. ✅ **Numéro d'acte de naissance** (`birthCertificateNumber`) - **OBLIGATOIRE**
2. ✅ **Lieu de prière** (`prayerPlace`) - **OBLIGATOIRE**
3. ✅ **Code entremetteur** (`intermediaryCode`) - **OBLIGATOIRE** (format: `[Numéro].MK.[Numéro]`)
4. ✅ **Genre** (`gender`) - **OBLIGATOIRE** (Homme/Femme)
5. ✅ **Informations du conjoint** (conditionnel selon `maritalStatus`) :
   - ✅ `spouseLastName` - Requis si Marié(e) ou Concubinage
   - ✅ `spouseFirstName` - Requis si Marié(e) ou Concubinage
   - ✅ `spousePhone` - Requis si Marié(e) ou Concubinage (format +241)
6. ✅ **Question voiture** (`hasCar`) - Checkbox Oui/Non

### ✅ **VALIDATIONS RESTAURÉES** :
1. ✅ **Numéros de téléphone** : 
   - ✅ Placeholder mis à jour avec format `+24165671734`
   - ✅ Message d'aide avec opérateurs valides
   - ✅ Affichage des erreurs de validation (gérées par Zod)
2. ✅ **Code entremetteur** : Message d'aide avec format requis
3. ✅ **Validation conditionnelle conjoint** : Affichage conditionnel selon `maritalStatus` avec nettoyage automatique des champs

### ✅ Présent dans V2 :
- Civilité, Nom, Prénom
- Email (optionnel)
- Date de naissance
- Lieu de naissance
- Nationalité
- Situation matrimoniale
- Religion
- Contacts (avec validation Zod stricte)

---

## Étape 2 : Adresse (AddressStepV2)

### ❌ Fonctionnalités manquantes dans V2 :
1. **Modals admin** pour créer rapidement :
   - Province
   - Commune
   - Arrondissement (District)
   - Quartier (Quarter)
2. **Boutons "+"** à côté des selects pour les admins

### ✅ Présent dans V2 :
- Sélection en cascade Province → Ville → Arrondissement → Quartier
- Informations complémentaires (textarea)

---

## Étape 3 : Entreprise (CompanyStepV2)

### ✅ **TOUTES LES FONCTIONNALITÉS RESTAURÉES** :
1. **Tabs pour choisir la source d'adresse** :
   - ✅ Onglet "Base de données" (sélection cascade comme Step2)
   - ✅ Onglet "Recherche Photon" (géolocalisation API)
2. **Recherche Photon pour l'entreprise** :
   - ✅ Recherche de quartier avec API Photon Komoot
   - ✅ Détection automatique de ville/province
   - ✅ Correction de ville si nécessaire
3. **Modals admin** pour créer rapidement :
   - ✅ Entreprise (`CompanyCombobox` pour admin)
   - ✅ Profession (`ProfessionCombobox` pour admin)
   - ✅ Province, Commune, Arrondissement, Quartier (pour adresse entreprise)
4. **Validation de l'ancienneté** :
   - ✅ Format attendu : `"2 ans"` ou `"6 mois"`
   - ✅ Suggestions prédéfinies (6 mois, 1 an, 2 ans, etc.)
   - ✅ Validation regex : `/^\d+\s*(mois|années?|ans?)$/`
   - ✅ Message d'aide avec format attendu

### ✅ Présent dans V2 :
- Toggle emploi (isEmployed)
- Nom de l'entreprise (avec CompanyCombobox pour admin)
- Profession (avec ProfessionCombobox pour admin)
- Ancienneté avec validation stricte
- Adresse entreprise complète avec tabs BD/Photon

---

## Étape 4 : Documents (DocumentsStepV2)

### ⚠️ Validations manquantes dans V2 :
1. **Validation en temps réel** moins complète que l'ancien
2. **Messages d'erreur** moins détaillés
3. **Résumé de validation** moins complet

### ✅ Présent dans V2 :
- Type de document
- Numéro de document
- Photo recto (obligatoire)
- Photo verso (optionnelle)
- Date de délivrance
- Date d'expiration
- Lieu de délivrance
- Checkbox conditions acceptées
- Compression d'images

---

## Schémas de validation

### ✅ Tous les schémas Zod sont présents et corrects :
- `identitySchema` : Contient toutes les validations (téléphone, code entremetteur, conjoint conditionnel)
- `addressSchema` : Correct
- `companySchema` : Correct
- `documentsSchema` : Correct

**Le problème** : Les composants V2 n'utilisent pas tous les champs définis dans les schémas !

---

## Actions à prendre

### ✅ **TERMINÉ** :
1. ✅ **IdentityStepV2** : Tous les champs ajoutés + validation stricte des téléphones + informations conjoint conditionnelles
2. ✅ **CompanyStepV2** : Tabs BD/Photon restaurés, Photon API, modals admin, validation ancienneté

### ⏳ **EN ATTENTE** (optionnel) :
3. **AddressStepV2** : Ajouter les modals admin pour créer provinces/communes/districts/quartiers (utile mais pas critique)
4. **DocumentsStepV2** : Améliorer les validations en temps réel (déjà fonctionnel, peut être amélioré)

### 📝 **Note** :
Les schémas Zod contiennent déjà toutes les validations nécessaires. Les composants V2 utilisent maintenant tous les champs définis dans les schémas. Les validations sont gérées automatiquement par `react-hook-form` + `zodResolver`.
