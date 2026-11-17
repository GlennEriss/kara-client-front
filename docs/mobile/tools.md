# Outils de gestion dans LE KARA

Les écrans natifs de consultation donnent accès aux outils web responsifs existants dans une WebView dédiée : versements et corrections dans les contrats, reçus officiels, exports PDF/Excel, retardataires, historique des contacts et plans d’appels. Ce choix conserve les règles métier des caisses, crédits et placements.

- Le lien du calendrier conserve produit, contrat, échéance et mois ; le dashboard conserve section et période.
- `POST /api/mobile/tools/session` vérifie le jeton Firebase natif avec révocation, relit les permissions et bloque le changement de mot de passe obligatoire.
- Le serveur crée un jeton personnalisé pour le même UID, sans ajouter de rôle. Il n’accepte aucun URL libre ni UID fourni par le téléphone.
- `/mobile-tools` échange le jeton avec Firebase Auth, vérifie l’UID obtenu, puis crée le cookie HttpOnly existant. Le jeton ne passe jamais dans un URL et n’est pas enregistré dans le marqueur de navigation.
- La session web est dédiée aux outils. Elle est fermée à la sortie, sans déconnecter le SDK Firebase natif. Les vues et règles Firebase du site gardent leurs contrôles habituels.
- Les documents PDF/Excel/images autorisés sont transmis au lecteur/partage natif (20 Mo maximum). Le pont vérifie origine, identifiant de session, droits, nom et format. Les fichiers temporaires sont supprimés à la fermeture des outils.
- Les liens téléphoniques et WhatsApp ouvrent les applications du téléphone. L’utilisateur décide de l’appel ou de l’envoi ; les tests ne contactent personne.
- Les boutons de reçus CS/CI utilisent désormais les factures et générateurs PDF des contrats, à la place des anciens hooks provisoires. Les documents financiers sont masqués au rôle sans montants.

Le menu web est retiré dans ce contexte intégré ; la barre native fournit retour, rechargement et fermeture. La fermeture invalide le cache natif des échéances et indicateurs. Les thèmes et la réduction des mouvements sont transmis aux outils.

La route publique de démarrage n’affiche aucune donnée métier. Elle se limite à la connexion initiée par l’application. Les routes métier restent protégées par le middleware, les gardes d’accès et les règles Firebase existantes.

Déploiement : publier les changements de `kara-client-front` avant d’utiliser LE KARA 1.0.4. Aucun nouveau secret n’est requis ; la signature utilise le compte Firebase Admin déjà configuré.

Validation : tests de session et de permissions, liens profonds des six activités, refus d’identité incohérente/redirection externe, traitement des fichiers, génération des reçus et build Next de production. Les paiements réels de production ne sont pas utilisés comme données de test.
