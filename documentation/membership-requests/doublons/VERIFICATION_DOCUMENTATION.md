# Vérification globale – Documentation doublons

**Date** : 2026-02-04  
**Statut** : ✅ Documentée et prête pour l’implémentation

---

## 1. Cohérence globale

| Élément | Statut | Note |
|--------|--------|------|
| README principal | ✅ | Contexte, critères, modèle de données, index, sécurité, mapping composants |
| functions/README.md | ✅ | Détection, normalisation, gestion groupes, résolution, migration (correction signature `updateDuplicateGroups`) |
| firebase/README.md | ✅ | Collections, index Firestore, règles de sécurité |
| workflow/README.md | ✅ | 10 phases (0–9), ordre et dépendances clairs |
| activite/ | ✅ | Détection Cloud Function + consultation UI |
| sequence/ | ✅ | SEQ_DetecterDoublons, SEQ_ConsulterDoublons (domaines) |
| wireframes/ | ✅ | Alerte, onglet Doublons, sections par type, data-testid, responsive |
| ORGANISATION_DIAGRAMMES.md | ✅ | Use case doublons référencé |

---

## 2. Points vérifiés

- **Détection** : Cloud Function `onDocumentWritten('membership-requests/{requestId}')`, garde anti-boucle (sortir si seuls isDuplicate / duplicateGroupIds / champs normalisés changent).
- **Modèle** : Champs sur `membership-requests` (normalizedEmail, normalizedIdentityDocNumber, isDuplicate, duplicateGroupIds) et collection `duplicate-groups` (type, value, requestIds, requestCount, resolvedAt, resolvedBy).
- **Normalisation** : Email (trim + lowercase), pièce (trim + uppercase + sans espaces), téléphone (sans espaces/tirets/parenthèses).
- **Résolution** : Cloud Function `onDuplicateGroupResolved` sur mise à jour de `duplicate-groups` (resolvedAt/resolvedBy) pour retirer groupId des demandes et recalculer isDuplicate.
- **Règles Firestore** : Lecture duplicate-groups = admin ; update limité à resolvedAt/resolvedBy pour les admins ; create/delete = Cloud Functions uniquement.
- **UI** : Alerte (bannière + lien onglet), onglet Doublons avec sections téléphone / email / pièce, « Marquer comme traité » avec modal de confirmation.

---

## 3. Correction apportée

- **functions/README.md** : La fonction `updateDuplicateGroups` doit recevoir les valeurs normalisées pour créer les groupes email et pièce d’identité. Signature mise à jour : `updateDuplicateGroups(requestId, matches, normalizedEmail, normalizedDocNumber)`. Appel dans le script de migration mis à jour en conséquence. Fichier `onDuplicateGroupResolved.ts` ajouté dans la liste des fichiers à créer.

---

## 4. Recommandation

La documentation est **complète et cohérente**. Vous pouvez passer à l’implémentation en suivant le workflow (Phase 0 → Phase 9).
