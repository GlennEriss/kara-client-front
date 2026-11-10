# Invitations WhatsApp

Les formulaires Événements et Bienfaiteur proposent « Préparer les invitations WhatsApp ». La création reste indépendante de l’envoi. Après publication, le panneau s’ouvre si cette option était cochée. La fiche propose aussi « Inviter par WhatsApp » pour préparer les invitations plus tard.

## Destinataires et envoi

Les membres adhérents, bienfaiteurs et sympathisants sont chargés à l’ouverture du panneau. Aucun filtre d’abonnement ni limite de première page n’est appliqué. Le compte technique INCONNU est exclu. Le numéro WhatsApp est prioritaire ; à défaut, le premier contact renseigné est utilisé. Un numéro invalide doit être corrigé dans la fiche membre.

La sélection globale inclut tous les membres avec un numéro valide, au-delà des 20 lignes affichées. Chaque clic ouvre une seule conversation `wa.me` avec un message personnalisé. L’administrateur confirme l’envoi dans WhatsApp. Aucune API d’envoi automatique n’est utilisée. Le compteur local indique des conversations ouvertes, sans attester d’un envoi, d’une livraison ni d’une lecture ; il est réinitialisé lorsque la page est quittée.

## Publication et contributions

- Événements : invitation disponible pour `published`, `poll_open` et `location_confirmed` uniquement.
- Bienfaiteur : collecte publique, `upcoming` ou `ongoing` uniquement.
- Une invitation communautaire propose de contribuer uniquement si sa collecte associée est publique et ouverte.
- La création et l’édition communautaires enregistrent bien `charityEventId`. Retirer la collecte supprime l’association.
- Sans adresse membre configurée, le message invite à répondre sur WhatsApp en précisant le montant ou la nature du don proposé. L’admin enregistre ensuite le don lorsqu’il est reçu. L’invitation ne crée aucun don et ne confirme aucun encaissement.

## Liens vers l’espace membre

L’origine par défaut de l’application membre est `https://association-le-kara.com`. La variable publique facultative `NEXT_PUBLIC_MEMBERS_APP_URL` permet de la remplacer pour un environnement de test. Elle ne doit pas contenir l’adresse de l’admin. Comme les autres variables `NEXT_PUBLIC_*`, elle est prise en compte au build.

Les messages incluent les liens directs vers l’événement et, si la collecte est ouverte, vers « Je veux contribuer ». Le membre peut aussi répondre sur WhatsApp. Aucun lien admin n’est envoyé au membre.

Les chemins sont `/evenements/{id}` et `/bienfaiteur/{id}`. Seules les adresses HTTPS sont acceptées, avec une exception HTTP pour `localhost` et `127.0.0.1` en développement. Ces pages restent accessibles après connexion du membre selon les règles d’accès existantes.
