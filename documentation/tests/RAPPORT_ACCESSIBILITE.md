# Rapport d'accessibilité – KARA Front

**Date :** 2025-01-22  
**Périmètre :** Page d'accueil (homepage), composants partagés, textes alternatifs.

---

## 1. Contrastes de couleurs

### Problème identifié et corrigé
- **Blanc sur KARA Gold (#CBB171)** : ratio ≈ **2,09:1** → **non conforme** WCAG AA (4,5:1 pour le texte normal, 3:1 pour le grand texte).
- **Localisation :** Badge décoratif hero (icône étoile sur fond doré dégradé).

### Correctif appliqué
- Remplacement de `text-white` par `text-kara-primary-dark` (#224D62) sur l’icône du badge, conformément au design system (« Fond doré + texte bleu foncé »).
- Contraste bleu foncé sur or : conforme WCAG AA.

### Combinaisons recommandées (Design System)
- Fond bleu foncé + texte blanc ✓  
- Fond doré + texte bleu foncé ✓  
- À éviter : **texte blanc sur fond doré**.

---

## 2. Sémantique HTML

### État initial
- Pas de `<main>`
- `nav` et `footer` présents

### Correctifs appliqués
- **`<main id="main-content">`** : toutes les sections (hero, qui-sommes-nous, objectifs, services, adhésion, contact) sont regroupées dans un landmark `main`.
- **`<footer role="contentinfo">`** : rôle explicite (redondant avec l’élément `footer`, mais clarifie l’intention).
- **`<nav aria-label="Navigation principale">`** : label pour la navigation principale.

### Hiérarchie des titres
- **h1** : « KARA Mutuelle de Solidarité »
- **h2** : sections (Qui sommes-nous, Objectifs, Services, etc.)
- **h3** : sous-sections
- **h4** : Liens rapides, Suivez-nous dans le footer  

Hiérarchie cohérente et logique.

---

## 3. Attributs ARIA

### Modifications réalisées

| Élément | Attributs ajoutés |
|--------|--------------------|
| **Nav** | `aria-label="Navigation principale"` |
| **Menu mobile (toggle)** | `aria-label` dynamique (« Ouvrir le menu » / « Fermer le menu »), `aria-expanded`, `type="button"` |
| **Icônes menu (Menu/X)** | `aria-hidden` (décoratives) |
| **Boutons réseaux sociaux** | `aria-label` pour chaque réseau (Facebook, Twitter, Instagram, LinkedIn, YouTube, TikTok), `aria-hidden` sur les icônes |
| **Groupe « Suivez-nous »** | `role="group"` et `aria-label="Réseaux sociaux"` |
| **Badge hero** | `aria-hidden="true"` (décoratif) |
| **Liens rapides (footer)** | `type="button"` sur les boutons |

---

## 4. Navigation au clavier

### Focus visible
- **Règle globale** : `:focus-visible { outline: 2px solid var(--kara-gold); outline-offset: 2px; }` dans `globals.css`.
- **Composants ciblés** :  
  - Menu mobile : `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kara-gold focus-visible:ring-offset-2`  
  - Boutons réseaux sociaux : idem  
  - Liens rapides (footer) : idem  
  - Boutons de navigation desktop : idem  

### Ordre de tabulation
- Logo → liens nav → Mon espace / Se connecter → contenu `main` → footer (Liens rapides, Suivez-nous).
- Tous les éléments interactifs sont accessibles au clavier.

### Test effectué
- Tabulation sur la homepage : focus visible sur les boutons (ring doré), ordre logique, pas d’éléments bloquants.

---

## 5. Textes alternatifs (images)

### Corrigés

| Fichier | Élément | Avant | Après |
|---------|--------|-------|--------|
| **DocumentsStepV2** | Aperçu recto/verso | `alt=""` | `alt="Aperçu du recto/verso du document d'identité"` (selon `isBack`) |
| **MemberGroupSearch** | Avatar membre | pas d’alt | `alt="Photo de {firstName} {lastName}"` |
| **AddContributionForm** | Avatar membre sélectionné | pas d’alt | `alt="Photo de {firstName} {lastName}"` |
| **CharityParticipantsSection** | Avatar participant | pas d’alt | Alt selon type (membre ou groupe) |
| **MemberSearchInput** (véhicule) | Avatar membre sélectionné | pas d’alt | `alt="Photo de {firstName} {lastName}"` |
| **FilleulsList** | Avatar parrain + avatar filleul | pas d’alt | `alt="Photo de {firstName} {lastName}"` |
| **AddParticipantModal** | Avatar membre | pas d’alt | `alt="Photo de {firstName} {lastName}"` |

### Déjà conformes
- **Homepage** : Logo KARA, image « KARA - Solidarité Active », `FooterLogo` avec alt.
- **MemberCard**, **MembershipRequestMobileCardV2**, **MembershipRequestRowV2**, **AdminDashboard**, **ListDocumentsV2**, **ListDocuments**, **PhotoIdentityForm**, **AdminFormModal**, etc. : `AvatarImage` ou `Image` avec `alt` approprié.

---

## 6. Synthèse des correctifs

1. **Contraste** : Badge hero → texte bleu foncé sur fond doré.
2. **Sémantique** : `<main>`, `aria-label` sur `nav`, `role="contentinfo"` sur `footer`.
3. **ARIA** : Menu mobile, boutons réseaux sociaux, groupes labellisés, `aria-hidden` sur éléments décoratifs.
4. **Clavier** : `:focus-visible` global + rings sur les contrôles clés.
5. **Alt** : DocumentsStepV2 + 6 usages d’`AvatarImage` sans alt corrigés.

---

## 7. Recommandations ultérieures

- Étendre l’audit aux autres pages (adhésion, espace membre, admin).
- Vérifier les contrastes dans les thèmes sombres si usage.
- Tester avec un lecteur d’écran (NVDA, JAWS, VoiceOver).
- Ajouter des tests E2E d’accessibilité (axe-core, Pa11y, ou équivalent).

---

*Rapport généré à partir d’un audit manuel (navigateur, snapshot a11y, scripts de contraste) et des correctifs appliqués dans le dépôt.*
