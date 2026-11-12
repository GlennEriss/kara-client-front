# Accords entre membres

Dans la fiche d’un groupe, l’onglet **Accords entre membres** permet à l’administration de suivre des ventes, prestations ou prêts entre deux membres identifiés. Un membre peut être bénéficiaire de plusieurs accords et payer plusieurs autres membres. Ces accords ne créent aucun contrat de crédit financé par KARA et n’indemnisent pas automatiquement un défaut.

Exemple : Alice vend des ventilateurs à 60 000 FCFA. Bob en prend un en trois échéances de 20 000 FCFA ; Paul en prend deux en quatre échéances de 30 000 FCFA. La sélection des deux acheteurs crée deux accords indépendants. Les conditions et dates se modifient avant confirmation. Les avances s’enregistrent ensuite comme de vrais versements.

## Les deux circuits

- **Direct** : Bob remet 20 000 à Alice. L’admin constate un versement reçu directement par le bénéficiaire. La dette et la somme à recevoir diminuent de 20 000. Aucun mouvement dans la trésorerie de KARA.
- **Via KARA** : Bob remet 20 000 à KARA. La dette de Bob diminue immédiatement. KARA conserve 20 000 à remettre à Alice. Une remise effective de 12 000 laisse 8 000 à reverser ; elle ne constitue pas un second paiement de Bob.

L’accord n’est « Réglé et remis » que lorsque le membre a tout payé et que KARA n’a plus de fonds à reverser. Les versements couvrent les échéances anciennes en premier. Les montants sont des entiers FCFA. Les doublons réseau sont protégés par des identifiants stables et des transactions. Le contrôle chronologique interdit un reversement antérieur à l’encaissement qui le finance.

## Suivi et confidentialité

L’administration crée, valide et corrige les opérations. Elle peut conserver un justificatif, un motif de correction, les relances, les promesses et les dates prévues. Les relances de ces accords restent dans leur suivi et son filtre ; elles ne sont pas des tâches du calendrier central. WhatsApp ouvre seulement un brouillon. Une correction annule une écriture erronée, sans matérialiser un remboursement d’argent.

Le membre consulte **Mes groupes → Mes accords** : ses échéanciers à payer, ses sommes à recevoir et les versements enregistrés. Il contacte KARA par WhatsApp pour faire le point. Il ne crée ni accord ni paiement. L’API vérifie la session et l’appartenance au groupe, puis retourne seulement les accords dont il est effectivement l’une des deux parties. Les notes internes, justificatifs, auteurs et historiques administratifs restent privés. Les lectures Firestore directes des accords sont réservées aux admins.

Le retrait d’un membre est bloqué s’il participe encore à un accord en cours de règlement ou de reversement. La suppression du groupe est bloquée dès qu’il possède un historique d’accords.

## Bilan financier et mise en service

Le module **Accords entre membres** constate les seuls fonds transitant par KARA : entrées, remises effectives, fonds encore à reverser. Son résultat est nul, aucune redevance n’étant prévue. Les créances entre membres ne deviennent pas des créances de KARA. Les détails et exports reprennent chaque accord et les deux parties, sans additionner une seconde fois les annexes aux totaux.

Déployer les interfaces admin et membre compatibles ainsi que les règles Firestore et Storage mises à jour avant utilisation. Pas de migration des anciens projets : les accords ont leurs propres sous-collections. Aucun message ni transfert d’argent n’est envoyé automatiquement.
