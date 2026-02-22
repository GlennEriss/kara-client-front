# Points faibles / risques (auth actuelle)

## Sécurité
1. **ID token stocké en cookie non-HttpOnly**
   - Accessible par JavaScript → vulnérable en cas de XSS (exfiltration du token).
2. **Middleware ne vérifie pas la validité**
   - Il suffit d’avoir un cookie présent (même expiré/forgé) pour passer le guard.
   - Pas de validation d’expiration, ni de claims (rôle admin), ni de révocation.
3. **Pas de vraie gestion de session**
   - Pas de session server-side, pas de “logout global”, pas d’invalidation centralisée.
4. **Refresh géré par timer navigateur**
   - Fragile (onglet inactif, throttling, device sleep, multi-tabs).
   - Peut provoquer des comportements incohérents (cookie expiré mais Firebase encore connecté, ou inverse).
5. **Multiples endroits écrivent le cookie**
   - Risque d’incohérence (options différentes, oubli de suppression, logique dupliquée).

## UX / fiabilité
1. **Décorrélation entre “Firebase user” et “cookie token”**
   - Le middleware peut rediriger sur la base d’un cookie stale alors que Firebase est déconnecté (ou l’inverse).
2. **Pas de stratégie claire multi-onglets**
   - Plusieurs onglets peuvent rafraîchir/supprimer le cookie de manière concurrente.

## Maintenance / évolutivité
1. **Couplage fort au cookie “auth-token”**
   - Toute la protection des routes dépend d’un artefact client fragile.
2. **Absence d’un “Auth Client” central**
   - Chaque domaine fait “un peu sa sauce” pour lire/écrire le token.

