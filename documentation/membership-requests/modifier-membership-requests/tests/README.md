## Tests – Modifier une demande d'adhésion

Cette section décrit la stratégie de test pour garantir la robustesse de la modification des demandes.

### Stratégie de Test

#### 1. Tests Unitaires (Frontend)
- **`useDocumentUpload` Hook** :
  - Vérifier que les `data:` URIs sont acceptés.
  - Vérifier que les `https:` URLs sont acceptées (Bug fix).
  - Vérifier la compression d'image.
- **`MembershipFormService`** :
  - Mocker l'appel Cloud Function.
  - Vérifier la transformation des données avant envoi.

#### 2. Tests d'Intégration (Backend - Emulateurs)
- **Cloud Function `updateMembershipRequest`** :
  - **Cas Nominal** : Admin authentifié, payload valide -> Mise à jour Firestore effectuée.
  - **Cas Erreur Auth** : Utilisateur non authentifié ou non-admin -> Rejet (`PERMISSION_DENIED`).
  - **Cas Validation** : Payload invalide (ex: email malformé) -> Rejet (`INVALID_ARGUMENT`).
  - **Cas Inexistant** : ID inconnu -> Rejet (`NOT_FOUND`).

#### 3. Tests E2E (Cypress/Playwright)
- **Scénario Admin** :
  1. Login Admin.
  2. Navigation vers une demande.
  3. Clic "Modifier".
  4. Modification d'un champ (ex: Nom).
  5. Soumission.
  6. Vérification du toast succès.
  7. Rechargement page -> la modification persiste.
