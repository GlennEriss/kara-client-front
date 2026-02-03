## Cloud Functions – Générer identifiant (V2)

### Rôle optionnel

La réinitialisation du mot de passe du membre peut être réalisée soit par une **route API Next.js** (recommandé, voir `firebase/README.md`), soit par une **Cloud Function** Firebase.

### Si une Cloud Function est utilisée

- **Nom suggéré** : `resetMemberPassword` ou `adminResetMemberPassword`.
- **Déclencheur** : HTTP (POST), avec vérification du token (admin).
- **Paramètres** : `uid` (ou `memberId`) et `newPassword` (matricule).
- **Logique** :
  1. Vérifier que l’appelant est admin (token Firebase Auth ou lecture Firestore `admins/{uid}`).
  2. Appeler `admin.auth().updateUser(uid, { password: newPassword })`.
  3. Retourner `{ success: true }` ou une erreur structurée.
- **Sécurité** : ne pas exposer la fonction sans authentification et contrôle du rôle admin.

### Référence

- Implémentation côté front : appel depuis `GenererIdentifiantService` vers cette fonction (ou vers la route API).
- Firebase Auth Admin : [Documentation](https://firebase.google.com/docs/auth/admin/manage-users#update_a_user).
