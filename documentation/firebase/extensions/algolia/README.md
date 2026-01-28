# Extension Firebase Algolia (firestore-algolia-search) — Mise en place KARA

Objectif : remplacer/compléter nos triggers maison par l’extension Firebase officielle d’Algolia pour garantir :
- sync automatique Firestore → Algolia (create/update/delete)
- full reindex automatique à l’installation et lors d’un changement de config
- moins de “drift” (documents ajoutés mais pas indexés)

## 1) Pré-requis

- Plan Firebase **Blaze** (l’extension le requiert)
- Une clé Algolia **non-admin** dédiée (ACLs: `addObject`, `deleteObject`, `listIndexes`, `deleteIndex`, `editSettings`, `settings`)
- Avoir les index Algolia :
  - `membership-requests-dev`, `membership-requests-preprod`, `membership-requests-prod`
  - `members-dev`, `members-preprod`, `members-prod`

## 2) Fonctions “transform” (obligatoire chez nous)

Notre front et nos repositories s’attendent à un champ `searchableText` dans Algolia.

On expose donc 2 endpoints HTTP (appelés par l’extension) :
- `transformMembershipRequestsAlgoliaPayload`
- `transformMembersAlgoliaPayload`

Ils retournent `{ result: <payload enrichi> }` et ajoutent `searchableText` + aplatissement de quelques champs.

## 3) Installer l’extension (2 instances par projet)

L’extension à installer : `algolia/firestore-algolia-search`

On installe **2 instances** :
- une qui écoute `membership-requests`
- une qui écoute `users`

### DEV (`kara-gabon-dev`)

```bash
firebase use dev

# membership-requests → membership-requests-dev
firebase ext:install algolia/firestore-algolia-search \
  --project kara-gabon-dev \
  --instance-id algolia-membership-requests \
  --params documentation/firebase/extensions/algolia/params.membership-requests.dev.txt

# users → members-dev
firebase ext:install algolia/firestore-algolia-search \
  --project kara-gabon-dev \
  --instance-id algolia-members \
  --params documentation/firebase/extensions/algolia/params.members.dev.txt
```

### PREPROD (`kara-gabon-preprod`)

```bash
firebase use preprod

firebase ext:install algolia/firestore-algolia-search \
  --project kara-gabon-preprod \
  --instance-id algolia-membership-requests \
  --params documentation/firebase/extensions/algolia/params.membership-requests.preprod.txt

firebase ext:install algolia/firestore-algolia-search \
  --project kara-gabon-preprod \
  --instance-id algolia-members \
  --params documentation/firebase/extensions/algolia/params.members.preprod.txt
```

### PROD (`kara-gabon`)

```bash
firebase use prod

firebase ext:install algolia/firestore-algolia-search \
  --project kara-gabon \
  --instance-id algolia-membership-requests \
  --params documentation/firebase/extensions/algolia/params.membership-requests.prod.txt

firebase ext:install algolia/firestore-algolia-search \
  --project kara-gabon \
  --instance-id algolia-members \
  --params documentation/firebase/extensions/algolia/params.members.prod.txt
```

## 4) Important : éviter la double indexation

Si l’extension est installée, nos triggers maison (`syncToAlgolia`, `syncMembersToAlgolia`) doivent **s’arrêter** sinon vous indexez deux fois.

On a ajouté un garde-fou : si `algolia.use_extension=true` (ou `ALGOLIA_USE_EXTENSION=1`) alors les triggers maison **ne font rien**.

À appliquer par projet :

```bash
firebase functions:config:set algolia.use_extension="true"
firebase deploy --only functions
```

## 5) Paramètres (fichiers .txt)

Les fichiers `params.*.txt` sont des templates : **remplacer** `YOUR_ALGOLIA_APP_ID` et `YOUR_ALGOLIA_API_KEY`.

Pour `ALGOLIA_API_KEY`, utiliser une clé dédiée (pas Admin key).

