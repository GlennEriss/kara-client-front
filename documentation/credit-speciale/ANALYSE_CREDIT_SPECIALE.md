# Analyse fonctionnelle – Module Crédit spéciale

## 1. Contexte et périmètre

### Processus étudié : Gestion des crédits exceptionnels (Mutuelle Kara)

1- Solliciter un accompagnement exceptionnel (demande de prêt d'un montant) (Client).  
2- Demander au client comment il souhaite rembourser le prêt (Équipe Kara).  
3- Indiquer le montant mensuel qu'il peut rembourser (ex: 50 000 FCFA par mois) (Client).  
4- Faire une simulation (montant, taux pour voir les intérêts, montant versé, date du 1er versement) (Équipe Kara).  
5- Valider le prêt si la simulation ne dépasse pas 7 mois, sinon refuser (Équipe Kara).  
6- Proposer un montant minimum qui ne dépasse pas 7 mois, sinon amener le client à revoir son montant d'emprunt à la baisse (Équipe Kara, Client).  
7- Faire une simulation personnalisée en indiquant le montant que le client est capable de donner chaque mois (ex: 1er versement 30 000 FCFA, 2ème 0 FCFA, 3ème 100 000 FCFA...) jusqu'à remboursement total (Client).  
8- Générer 2 tableaux récapitulatifs : un sur 7 mois et un qui suit les tarifs d'accord du client sur ses versements (Équipe Kara).  
9- Enregistrer les infos du client (nom, prénom), le garant (membre de la mutuelle ou admin), le lien de parenté avec le garant, le numéro de téléphone, la cause du crédit (Équipe Kara, Garant).  
10- Vérifier l'éligibilité : enregistrer l'emprunt uniquement si le client est à jour à la caisse imprévue et/ou si son garant est à jour à la caisse imprévue (l'un des 2 doit être à jour). Pour quelqu'un qui n'a jamais fait de module, refuser automatiquement sauf cas particulier accepté par l'admin (Équipe Kara, Garant).  
11- Générer un contrat (Équipe Kara).  
12- Signer le contrat (Client).  
13- Téléverser le contrat signé et remettre l'argent au client (Équipe Kara).  
14- Assurer le suivi de versement : pour chaque versement, enregistrer les paiements (date de remise, heure remise, moyen de paiement, montant remis, preuve (capture image), commentaire, notation sur 10) (Équipe Kara).  
15- Transformer en crédit fixe un crédit non remboursé après 7 mois (enlever les intérêts) (Équipe Kara).  
16- Calculer les pénalités : si le client a des retards de paiement (ex: doit payer 10 000 FCFA le 9 décembre et paye après 3 jours), appliquer la règle de 3 (montant mensuel/30 × jours de retard) et ajouter la pénalité (Équipe Kara).  
17- Notifier le client des pénalités et lui laisser le choix de les rembourser ou non à chaque versement (Équipe Kara, Client).  
18- Bloquer une nouvelle demande si, en fin de contrat, aucune pénalité n'a été remboursée (Équipe Kara).  
19- Générer une décharge en fin de remboursement de l'emprunt (Équipe Kara).  
20- Rémunérer le garant membre de la mutuelle (parrain) à 2% du montant versé par mois (Équipe Kara, Garant).  
21- Permettre au garant de consulter l'historique de ses rémunérations (Garant, Équipe Kara).

### Difficultés du processus

1. Calculs manuels de simulation sujets à erreurs (montant, taux, intérêts, durée) -> A1 (Équipe Kara)  
2. Vérification manuelle de l'éligibilité (caisse imprévue à jour) chronophage et source d'erreurs -> A2 (Équipe Kara)  
3. Génération manuelle des tableaux récapitulatifs (7 mois vs simulation personnalisée) -> A3 (Équipe Kara)  
4. Gestion manuelle des contrats (génération, signature, téléversement) -> A4 (Équipe Kara)  
5. Suivi manuel des versements avec risque d'oubli ou d'erreur dans l'enregistrement -> A5 (Équipe Kara)  
6. Calcul manuel des pénalités (règle de 3) source d'erreurs et de litiges -> A6 (Équipe Kara)  
7. Oubli de transformation en crédit fixe après 7 mois -> A7 (Équipe Kara)  
8. Suivi manuel des pénalités impayées et blocage des nouveaux emprunts -> A8 (Équipe Kara)  
9. Génération manuelle de la décharge en fin de contrat -> A9 (Équipe Kara)  
10. Calcul manuel de la rémunération du garant (2% du taux mensuel) -> A10 (Équipe Kara)  
11. Distinction manuelle entre les 3 types de crédits (spéciale 7 mois, fixe illimité, aide 3 mois) -> A11 (Équipe Kara)  
12. Gestion manuelle des garanties (vérification membre vs admin, lien de parenté) -> A12 (Équipe Kara)  
13. Absence de traçabilité complète des décisions et validations -> A13 (Équipe Kara)  
14. Notifications manuelles des échéances et pénalités -> A14 (Équipe Kara, Client)  
15. Risque de perte ou d'erreur dans la conservation des preuves de paiement -> A15 (Équipe Kara)

### Nouveau processus proposé

1- Mettre à disposition la liste des membres et leurs statuts (à jour ou non à la caisse imprévue) (Système).  
2- Saisir une demande de prêt (montant, type de crédit spéciale/fixe/aide) par le client ou la créer côté admin pour le compte du client (Client, Équipe Kara).  
3- Enregistrer la demande en statut `PENDING` (Système).  
4- Examiner la demande et la valider ou la refuser : passage à `APPROVED` ou `REJECTED` (Équipe Kara).  
5- Proposer automatiquement une simulation après validation (`APPROVED`) : montant, taux, montant versé, date du 1er versement, calcul de durée et intérêts (Système).  
6- Valider automatiquement si la simulation respecte la limite (7 mois pour spéciale, 3 mois pour aide, illimité pour fixe) (Système).  
7- Proposer automatiquement un montant minimum si la simulation dépasse la limite, ou permettre au client de revoir son montant d'emprunt à la baisse (Système, Client).  
8- Permettre une simulation personnalisée où le client indique le montant qu'il peut donner chaque mois jusqu'à remboursement total (Client).  
9- Générer automatiquement 2 tableaux récapitulatifs : un sur la durée limite (7 ou 3 mois) et un qui suit les montants d'accord du client (Système).  
10- Enregistrer automatiquement les informations du client (nom, prénom, téléphone, cause) et permettre la sélection du garant (membre ou admin) avec lien de parenté (Système, Équipe Kara, Garant).  
11- Vérifier automatiquement l'éligibilité : client à jour OU garant à jour à la caisse imprévue. Pour un membre qui n'a jamais fait de module, refuser automatiquement sauf validation manuelle de l'admin (Système, Équipe Kara, Garant).  
12- Générer automatiquement le contrat PDF prérempli avec toutes les informations (Système).  
13- Permettre la signature électronique du contrat par le client (Client, Système).  
14- Téléverser automatiquement le contrat signé, notifier les parties, et permettre l'enregistrement de la remise d'argent (Système, Équipe Kara).  
15- Permettre l'enregistrement des versements avec tous les détails (date, heure, moyen de paiement, montant, preuve, commentaire, notation) (Équipe Kara, Système).  
16- Transformer automatiquement un crédit spéciale non remboursé après 7 mois en crédit fixe (enlever les intérêts) (Système).  
17- Calculer automatiquement les pénalités en cas de retard (règle de 3 : montant mensuel / 30 jours × nombre de jours de retard) (Système).  
18- Notifier automatiquement le client des pénalités à chaque versement et enregistrer son choix de les rembourser ou non (Système, Client).  
19- Bloquer automatiquement les nouveaux emprunts si des pénalités impayées existent sur le dernier crédit terminé (Système).  
20- Générer automatiquement la décharge en fin de remboursement complet (Système, Équipe Kara).  
21- Calculer et attribuer automatiquement 2% du montant versé par mois au garant membre (parrain) si c'est un membre de la mutuelle (Système, Garant).  
22- Permettre au garant de consulter l'historique de ses rémunérations (Système, Garant, Équipe Kara).  
23- Planifier automatiquement les rappels d'échéance et notifier le client (Système).  
24- Suivre automatiquement l'état de chaque crédit (en cours, transformé, terminé) et afficher les statistiques (Système).  
25- Archiver automatiquement tous les documents (contrat, preuves, décharge) et conserver l'historique complet (Système).

## Problématique

### Objectif général

Offrir un module Crédit spéciale qui automatise la gestion des demandes de prêts exceptionnels (crédit spéciale, crédit fixe, crédit aide), avec simulation automatique, vérification d'éligibilité, génération de contrats, suivi des versements, calcul des pénalités, transformation en crédit fixe, et gestion des garanties, tout en laissant à l'équipe Kara la validation métier et les décisions d'acceptation/refus.

### Objectifs spécifiques

| Système | Équipe Kara | Client |
| --- | --- | --- |
| Authentifier l'utilisateur applicatif ; exposer la liste des membres et leurs statuts (caisse imprévue) ; permettre la création de demandes de prêt (montant, type de crédit) ; enregistrer les demandes en statut `PENDING` ; permettre la validation/refus des demandes (`APPROVED`/`REJECTED`) ; calculer automatiquement les simulations (montant, taux, intérêts, durée) ; valider automatiquement si la simulation respecte les limites (7 mois pour spéciale, 3 mois pour aide) ; proposer automatiquement un montant minimum en cas de dépassement ; permettre les simulations personnalisées avec montants variables par mois ; générer automatiquement 2 tableaux récapitulatifs (limite vs personnalisé) ; vérifier automatiquement l'éligibilité (client ou garant à jour à la caisse imprévue) ; générer automatiquement le contrat PDF prérempli ; gérer la signature électronique du contrat ; téléverser automatiquement le contrat signé ; calculer automatiquement les pénalités (règle de 3) en cas de retard ; transformer automatiquement un crédit spéciale non remboursé après 7 mois en crédit fixe (enlever les intérêts) ; bloquer automatiquement les nouveaux emprunts si pénalités impayées ; générer automatiquement la décharge en fin de remboursement ; calculer et attribuer automatiquement 2% du taux mensuel au garant membre ; planifier automatiquement les rappels d'échéance et notifier ; suivre automatiquement l'état de chaque crédit et afficher les statistiques ; archiver automatiquement tous les documents et conserver l'historique complet. | Se connecter au back-office ; créer une demande de prêt pour un client ; examiner et valider/refuser les demandes (`APPROVED`/`REJECTED`) ; ajuster les paramètres de simulation si nécessaire ; sélectionner le garant (membre ou admin) et enregistrer le lien de parenté ; valider manuellement l'éligibilité en cas de cas particulier ; signer le contrat côté Kara ; enregistrer la remise d'argent au client ; enregistrer les versements avec tous les détails (date, heure, moyen de paiement, montant, preuve, commentaire, notation) ; notifier le client des pénalités et enregistrer son choix de les rembourser ou non ; contrôler le suivi et lever les alertes ; générer et remettre la décharge en fin de remboursement ; participer à l'archivage et au feedback. | Faire une demande de prêt (montant, type de crédit spéciale/fixe/aide) ; indiquer le montant mensuel de remboursement souhaité ; faire une simulation personnalisée avec montants variables par mois ; valider la simulation proposée ; signer le contrat en ligne ; recevoir l'argent ; recevoir les notifications d'échéance ; effectuer les versements de remboursement ; être notifié des pénalités et choisir de les rembourser ou non ; recevoir la décharge en fin de remboursement complet. |

## Analyse UML

### Diagrammes de cas d'utilisation (Use Cases)

**Processus étudié (manuel, sans système)** – par acteur :  
- Client : `documentation/credit-speciale/credit-speciale-usecases-client.puml` (PNG suggéré : `credit-speciale-usecases-client.png`)  
- Équipe Kara : `documentation/credit-speciale/credit-speciale-usecases-admin.puml` (PNG suggéré : `credit-speciale-usecases-admin.png`)

**Nouveau processus (avec automatisations)** – par acteur :  
- Client : `documentation/credit-speciale/credit-speciale-usecases-nouveau-client.puml` (PNG suggéré : `credit-speciale-usecases-nouveau-client.png`)  
- Équipe Kara : `documentation/credit-speciale/credit-speciale-usecases-nouveau-admin.puml` (PNG suggéré : `credit-speciale-usecases-nouveau-admin.png`)  
- Système : `documentation/credit-speciale/credit-speciale-usecases-nouveau-systeme.puml` (PNG suggéré : `credit-speciale-usecases-nouveau-systeme.png`)

**Use cases par package (architecture)** :  
- `documentation/credit-speciale/credit-speciale-usecases-packages.puml` (PNG suggéré : `credit-speciale-usecases-packages.png`)  
  - UI/Pages : BO Kara (demandes, simulations, contrats, versements, pénalités), Espace Client (demande, simulation perso, signature, pénalités)  
  - Hooks/Mediators : orchestration des formulaires (demande, simulation, versement, preuve, pénalités)  
  - Services Crédit spéciale : demandes & validation, simulations (standard/perso, tableaux 7/3 mois), éligibilité & garantie, contrat & remise fonds, versements/pénalités/transformation/blocage, rémunération garant  
  - Repositories : CRUD crédits, paiements, pénalités, garanties, contrats signés  
  - Documents/Storage : contrats PDF, décharges, preuves de versement  
  - Notifications : échéances, pénalités, transformation, blocage  
  - Caisse imprévue/Membership : vérification du statut à jour (client ou garant)

**Diagramme de packages (structure sans use cases)** :  
- `documentation/credit-speciale/credit-speciale-packages.puml` (PNG suggéré : `credit-speciale-packages.png`) — recense UI/Pages, Hooks/Mediators, Services Crédit spéciale (demandes, simulations, éligibilité/garanties, contrats, versements/pénalités, transformation, blocage, rémunération garant), Repositories, Documents/Storage, Notifications, Caisse imprévue/Membership, Paiement/Preuves, et leurs dépendances.

**Use cases détaillés par package (nouveau processus)** :  
- UI / Pages : `documentation/credit-speciale/credit-speciale-usecases-ui.puml`  
- Hooks / Mediators : `documentation/credit-speciale/credit-speciale-usecases-hooks.puml`  
- Services Crédit spéciale : `documentation/credit-speciale/credit-speciale-usecases-services.puml`  
- Repositories : `documentation/credit-speciale/credit-speciale-usecases-repositories.puml`  
- Documents / Storage : `documentation/credit-speciale/credit-speciale-usecases-documents.puml`  
- Notifications : `documentation/credit-speciale/credit-speciale-usecases-notifications.puml`  
- Caisse imprévue / Membership : `documentation/credit-speciale/credit-speciale-usecases-ci.puml`  
- Paiement / Preuves : `documentation/credit-speciale/credit-speciale-usecases-payments.puml`

## 2. Types de crédits

### 2.1. Crédit spéciale
- **Durée maximale** : 7 mois
- **Caractéristiques** :
  - Simulation obligatoire avant validation
  - Validation automatique si la simulation ne dépasse pas 7 mois
  - Refus si la simulation dépasse 7 mois (avec proposition de montant minimum)
  - Transformation en crédit fixe après 7 mois si non remboursé
  - Pénalités en cas de retard de paiement
  - Garant requis (membre ou admin de la mutuelle)
  - Contrat signé obligatoire
  - Décharge à la fin du remboursement

### 2.2. Crédit fixe
- **Durée** : Sans limite (jusqu'au remboursement intégral)
- **Caractéristiques** :
  - Même principe que le crédit spéciale
  - Pas de limite de 7 mois
  - Peut dépasser 7 mois et plus
  - Pas d'intérêts après transformation depuis crédit spéciale
  - Autres caractéristiques similaires au crédit spéciale

### 2.3. Crédit aide
- **Durée maximale** : 3 mois
- **Caractéristiques** :
  - Même principe que le crédit spéciale
  - Durée limitée à 3 mois maximum
  - Autres caractéristiques similaires au crédit spéciale

## 3. Diagramme de classes (conceptuel)

Voir `documentation/credit-speciale/credit-speciale-classes.puml` (rendu recommandé en `credit-speciale-classes.png`) qui couvre : emprunteur (User/Member), garant (User/Admin), contrat, simulations, paiements/pénalités, scoring fiabilité, rémunération garant, documents (contrat, signé, reçu, décharge) et métadonnées `createdBy/updatedBy`.

## 4. Cas d'utilisation (Use Cases)

### UC1 – Demander un prêt (Client)

**Acteur** : Membre (Client)

**Objectif** : Permettre à un membre de faire une demande de prêt d'un montant spécifique

**Préconditions** :
- Le membre est authentifié
- Le membre a accès au module de crédit spéciale

**Scénario principal** :
1. Le membre accède à la page de demande de crédit
2. Le membre sélectionne le type de crédit (spéciale, fixe, ou aide)
3. Le membre saisit le montant demandé
4. Le membre indique comment il souhaite rembourser (montant mensuel)
5. Le système enregistre la demande avec le statut `PENDING`

**Scénarios alternatifs** :
- Si le membre n'a pas rempli tous les champs obligatoires, afficher un message d'erreur
- Si le montant demandé est invalide, afficher un message d'erreur

**Postconditions** :
- La demande est enregistrée avec le statut `PENDING`
- L'admin est notifié de la nouvelle demande

---

### UC2 – Simuler un prêt (Admin)

**Acteur** : Admin

**Objectif** : Permettre à l'admin de faire une simulation de prêt pour valider ou refuser la demande

**Préconditions** :
- Une demande de prêt existe avec le statut `PENDING`
- L'admin est authentifié

**Scénario principal** :
1. L'admin accède à la demande de prêt
2. L'admin saisit les paramètres de simulation :
   - Montant du prêt
   - Taux d'intérêt
   - Montant versé mensuellement
   - Date du premier versement
3. Le système calcule :
   - La durée de remboursement en mois
   - Le total des intérêts
   - Le montant total à rembourser
4. Le système vérifie si la durée ne dépasse pas la limite :
   - **Crédit spéciale** : 7 mois maximum
   - **Crédit aide** : 3 mois maximum
   - **Crédit fixe** : Pas de limite
5. Si la simulation est valide (ne dépasse pas la limite) :
   - Le système propose de valider le prêt
6. Si la simulation dépasse la limite :
   - Le système refuse le prêt
   - Le système propose un montant minimum qui respecte la limite
   - Le client peut revoir son montant d'emprunt à la baisse

**Scénarios alternatifs** :
- Si le montant minimum proposé est trop faible, l'admin peut suggérer une autre solution
- Si le client accepte le montant minimum, on passe à l'étape suivante

**Postconditions** :
- La simulation est enregistrée
- Le statut du crédit est mis à jour (`APPROVED` ou `REJECTED`)

---

### UC3 – Simulation personnalisée (Client/Admin)

**Acteur** : Client ou Admin

**Objectif** : Permettre de faire une simulation avec des montants variables par mois

**Préconditions** :
- Une demande de prêt existe
- L'utilisateur est authentifié

**Scénario principal** :
1. L'utilisateur choisit l'option "Simulation personnalisée"
2. L'utilisateur saisit le montant qu'il peut payer pour chaque mois :
   - Mois 1 : 30 000 FCFA
   - Mois 2 : 0 FCFA
   - Mois 3 : 100 000 FCFA
   - ... jusqu'à ce que la somme + intérêts soit totalement remboursée
3. Le système génère deux tableaux récapitulatifs :
   - **Tableau 1** : Simulation sur 7 mois (pour crédit spéciale) ou 3 mois (pour crédit aide)
   - **Tableau 2** : Simulation suivant les montants d'accord du client
4. Le système affiche les deux tableaux pour comparaison

**Scénarios alternatifs** :
- Si les montants saisis ne permettent pas de rembourser le prêt, afficher un avertissement
- Si la simulation personnalisée dépasse la limite, proposer des ajustements

**Postconditions** :
- Les deux tableaux récapitulatifs sont générés
- La simulation personnalisée est enregistrée

---

### UC4 – Enregistrer les informations du crédit (Admin)

**Acteur** : Admin

**Objectif** : Enregistrer toutes les informations nécessaires avant la validation finale du crédit

**Préconditions** :
- La simulation a été validée
- Le crédit a le statut `APPROVED`

**Scénario principal** :
1. L'admin saisit les informations du client :
   - Nom et prénom (déjà disponibles, vérification)
   - Numéro de téléphone
   - Cause du crédit
2. L'admin saisit les informations du garant :
   - Type de garant (membre de la mutuelle ou admin)
   - Si membre : sélection du membre
   - Si admin : sélection de l'admin
   - Nom et prénom du garant
   - Lien de parenté avec le garant
3. Le système vérifie l'éligibilité :
   - Le client est à jour à la caisse imprévue **OU**
   - Le garant est à jour à la caisse imprévue
   - Si aucun des deux n'est à jour, le crédit est automatiquement refusé
   - Exception : l'admin peut accepter manuellement si c'est un cas particulier
4. Si éligible :
   - Les informations sont enregistrées
   - Le système passe à l'étape de génération du contrat

**Scénarios alternatifs** :
- Si le client ou le garant n'est pas à jour, afficher un message d'avertissement
- L'admin peut forcer l'acceptation avec une justification

**Postconditions** :
- Toutes les informations sont enregistrées
- L'éligibilité est vérifiée et enregistrée

---

### UC5 – Générer et signer le contrat (Admin/Client)

**Acteur** : Admin et Client

**Objectif** : Générer un contrat, le faire signer par le client, et le téléverser

**Préconditions** :
- Toutes les informations du crédit sont enregistrées
- Le crédit a le statut `APPROVED`
- L'éligibilité est confirmée

**Scénario principal** :
1. L'admin génère le contrat PDF avec toutes les informations :
   - Informations du client
   - Informations du garant
   - Montant du prêt
   - Taux d'intérêt
   - Plan de remboursement
   - Conditions générales
2. Le contrat est affiché/téléchargé
3. Le client signe le contrat (physiquement ou électroniquement)
4. L'admin téléverse le contrat signé dans le système
5. Le système enregistre le document signé
6. L'admin remet l'argent au client
7. Le statut du crédit passe à `ACTIVE`

**Scénarios alternatifs** :
- Si le contrat n'est pas signé, le crédit reste en statut `APPROVED`
- Si le téléversement échoue, afficher un message d'erreur

**Postconditions** :
- Le contrat signé est enregistré dans le système
- Le crédit a le statut `ACTIVE`
- L'argent a été remis au client

---

### UC6 – Suivi des versements (Admin)

**Acteur** : Admin

**Objectif** : Enregistrer les paiements effectués par le client pour le remboursement du crédit

**Préconditions** :
- Le crédit a le statut `ACTIVE`
- Des versements sont programmés

**Scénario principal** :
1. Le client vient effectuer un versement
2. L'admin accède à la page de suivi des versements du crédit
3. L'admin sélectionne le versement concerné
4. L'admin enregistre les informations du paiement :
   - Date de remise
   - Heure de remise
   - Moyen de paiement (espèces, mobile money, virement, etc.)
   - Montant remis
   - Preuve (capture d'image)
   - Commentaire
   - Notation sur 10
5. Le système calcule automatiquement les pénalités si le paiement est en retard
6. Le système affiche les pénalités à l'admin
7. L'admin notifie le client des pénalités
8. Le client choisit de rembourser les pénalités ou non
9. Le système enregistre le paiement avec ou sans pénalités
10. Le statut du versement est mis à jour (`PAID` ou `PARTIAL`)

**Scénarios alternatifs** :
- Si le montant remis est inférieur au montant dû, le versement est marqué comme `PARTIAL`
- Si le client refuse de payer les pénalités, elles sont reportées au prochain versement
- Si aucune preuve n'est fournie, l'admin peut quand même enregistrer avec un avertissement

**Postconditions** :
- Le versement est enregistré
- Les pénalités sont calculées et enregistrées
- Le statut du crédit est mis à jour si nécessaire

---

### UC7 – Transformation en crédit fixe (Système)

**Acteur** : Système (automatique)

**Objectif** : Transformer automatiquement un crédit spéciale non remboursé après 7 mois en crédit fixe

**Préconditions** :
- Le crédit est de type `SPECIALE`
- Le crédit a le statut `ACTIVE`
- 7 mois se sont écoulés depuis le premier versement
- Le crédit n'est pas entièrement remboursé

**Scénario principal** :
1. Un job planifié s'exécute quotidiennement
2. Le système vérifie tous les crédits spéciaux actifs
3. Pour chaque crédit spéciale :
   - Le système calcule le nombre de mois écoulés depuis le premier versement
   - Si 7 mois ou plus se sont écoulés et le crédit n'est pas remboursé :
     - Le système transforme le crédit en crédit fixe
     - Le système enlève les intérêts (le crédit fixe n'a pas d'intérêts)
     - Le statut passe à `TRANSFORMED`
     - Le système enregistre la date de transformation
     - Le système crée une notification pour l'admin

**Scénarios alternatifs** :
- Si le crédit est déjà remboursé, aucune transformation n'est nécessaire
- Si le crédit est en défaut, il peut être transformé manuellement par l'admin

**Postconditions** :
- Le crédit est transformé en crédit fixe
- Les intérêts sont supprimés
- Le statut est mis à jour
- L'admin est notifié

---

### UC8 – Calcul des pénalités (Système)

**Acteur** : Système (automatique)

**Objectif** : Calculer les pénalités en cas de retard de paiement

**Préconditions** :
- Un versement est en retard (date d'échéance dépassée)
- Le montant mensuel est connu

**Règle de calcul** :
- Si le client doit payer 10 000 FCFA le 9 décembre
- Et qu'il paye 3 jours après (le 12 décembre)
- Calcul : (10 000 FCFA / 30 jours) × 3 jours = pénalité pour 3 jours
- Montant total à payer = 10 000 FCFA + pénalités des 3 jours

**Scénario principal** :
1. Le client effectue un versement en retard
2. Le système calcule le nombre de jours de retard
3. Le système applique la règle de trois :
   - Montant mensuel / 30 jours = montant par jour
   - Montant par jour × nombre de jours de retard = pénalité
4. Le système ajoute la pénalité au montant dû
5. Le système affiche le montant total (versement + pénalités) à l'admin
6. L'admin notifie le client des pénalités
7. Le client choisit de payer les pénalités ou non

**Scénarios alternatifs** :
- Si le client paie les pénalités, elles sont enregistrées comme payées
- Si le client ne paie pas les pénalités, elles sont reportées et ajoutées à la liste des pénalités impayées

**Postconditions** :
- Les pénalités sont calculées et enregistrées
- Le client est informé des pénalités
- Le choix du client est enregistré

---

### UC9 – Blocage pour pénalités impayées (Système)

**Acteur** : Système (automatique)

**Objectif** : Empêcher un membre de faire un nouvel emprunt s'il a des pénalités impayées

**Préconditions** :
- Un crédit précédent est terminé (`COMPLETED`)
- Le crédit a des pénalités impayées à la fin du contrat

**Scénario principal** :
1. Le membre tente de faire une nouvelle demande de crédit
2. Le système vérifie l'historique des crédits du membre
3. Pour chaque crédit terminé :
   - Le système vérifie s'il y a des pénalités impayées
   - Si des pénalités sont impayées :
     - Le système bloque la nouvelle demande
     - Le système affiche un message : "Vous ne pouvez pas faire un nouvel emprunt tant que vous n'avez pas remboursé les pénalités de votre dernier emprunt"
     - Le système affiche le montant des pénalités impayées
4. Le membre doit d'abord rembourser les pénalités
5. Une fois les pénalités remboursées, le membre peut faire une nouvelle demande

**Scénarios alternatifs** :
- Si le membre n'a pas de pénalités impayées, la demande peut être créée normalement
- L'admin peut exceptionnellement autoriser une nouvelle demande malgré les pénalités impayées

**Postconditions** :
- La nouvelle demande est bloquée si des pénalités sont impayées
- Le membre est informé du blocage et du montant à rembourser

---

### UC10 – Générer une décharge (Admin)

**Acteur** : Admin

**Objectif** : Générer une décharge prouvant que le client ne doit plus rien après le remboursement complet

**Préconditions** :
- Le crédit a le statut `ACTIVE`
- Tous les versements sont payés (`PAID`)
- Le montant total (prêt + intérêts) est entièrement remboursé
- Toutes les pénalités sont payées (ou le client a choisi de ne pas les payer)

**Scénario principal** :
1. L'admin vérifie que le crédit est entièrement remboursé
2. L'admin vérifie le statut de toutes les pénalités
3. L'admin génère la décharge PDF contenant :
   - Informations du client
   - Informations du crédit
   - Montant total remboursé
   - Date de remboursement complet
   - Confirmation qu'aucune dette n'est due
   - Signature de l'admin
4. La décharge est téléchargée et/ou imprimée
5. La décharge est remise au client
6. Le statut du crédit passe à `COMPLETED`
7. Le système enregistre la décharge dans les documents du crédit

**Scénarios alternatifs** :
- Si des pénalités sont impayées, l'admin peut quand même générer la décharge mais avec une mention des pénalités impayées
- Si le crédit a été transformé en crédit fixe, la décharge mentionne cette transformation

**Postconditions** :
- La décharge est générée et enregistrée
- Le crédit a le statut `COMPLETED`
- Le client a reçu la décharge

---

### UC11 – Rémunération du garant membre (Système)

**Acteur** : Système (automatique)

**Objectif** : Calculer et attribuer 2% du taux mensuel au garant si c'est un membre de la mutuelle

**Préconditions** :
- Le crédit a un garant de type `MEMBER`
- Un versement mensuel a été effectué
- Le garant est un membre de la mutuelle (pas un admin)

**Scénario principal** :
1. Le client effectue un versement mensuel
2. Le système vérifie le type de garant
3. Si le garant est un membre (`type = 'MEMBER'`) :
   - Le système calcule 2% du montant mensuel versé
   - Le système enregistre cette rémunération pour le garant
   - Le système crée une transaction ou un crédit pour le garant
   - Le système notifie le garant de sa rémunération
4. La rémunération est cumulée pour chaque versement effectué

**Scénarios alternatifs** :
- Si le garant est un admin, aucune rémunération n'est attribuée
- Si le versement est partiel, la rémunération est calculée sur le montant effectivement versé

**Postconditions** :
- La rémunération est calculée et enregistrée
- Le garant est notifié de sa rémunération
- Le montant est disponible pour le garant

---

## 5. Règles métier

### 5.1. Éligibilité au crédit

Un membre peut obtenir un crédit si :
- **Condition principale** : Le membre est à jour à la caisse imprévue **OU** le garant est à jour à la caisse imprévue
- **Exception** : L'admin peut accepter manuellement un crédit même si aucune des conditions n'est remplie (cas particulier)
- **Restriction** : Pour quelqu'un qui n'a jamais fait de module (première fois), l'emprunt est automatiquement refusé sauf si l'admin accepte manuellement

### 5.2. Validation des simulations

- **Crédit spéciale** : La simulation doit ne pas dépasser 7 mois. Si elle dépasse, le prêt est refusé et un montant minimum est proposé.
- **Crédit aide** : La simulation doit ne pas dépasser 3 mois. Si elle dépasse, le prêt est refusé et un montant minimum est proposé.
- **Crédit fixe** : Aucune limite de durée, la simulation peut dépasser 7 mois.

### 5.3. Transformation en crédit fixe

- Un crédit spéciale non remboursé après 7 mois se transforme automatiquement en crédit fixe
- Les intérêts sont supprimés lors de la transformation
- Le statut passe à `TRANSFORMED`

### 5.4. Calcul des pénalités

- **Formule** : (Montant mensuel / 30 jours) × Nombre de jours de retard
- Les pénalités sont ajoutées au montant dû
- Le client peut choisir de payer les pénalités ou non à chaque versement
- Si les pénalités ne sont pas payées, elles sont reportées

### 5.5. Blocage pour pénalités impayées

- Si un crédit est terminé avec des pénalités impayées, le membre ne peut pas faire un nouvel emprunt
- Le membre doit d'abord rembourser toutes les pénalités impayées
- L'admin peut exceptionnellement autoriser un nouvel emprunt

### 5.6. Rémunération du garant

- Les bonus ne s'appliquent qu'aux garants qui ont apporté l'emprunteur (parrainage).  
- Si le garant est un membre de la mutuelle, il gagne **2% du montant versé par mois par l'emprunteur**.  
- La rémunération est calculée à chaque versement mensuel.  
- Si le garant est un admin, aucune rémunération n'est attribuée.

### 5.7. Notation fiabilité emprunteur (admin uniquement)

- **Visibilité** : badge/note uniquement pour l'admin (jamais visible au client).  
- **Échelle** : score sur 10, borné entre 0 et 10. Classification indicative : Fiable (≥ 8), Moyen (5 à 7.75), Risque (< 5).  
- **Base** : score initial 5/10 à la création de la demande.  
- **Règles d'évolution (proposées)** :
  - Ponctualité : +1 si paiement le jour J ; +0.5 si J+1 ; -0.25 par jour au-delà de J+1 (plancher 0).  
  - Anticipation : +0.5 si paiement avant J.  
  - Pénalités : -0.5 si pénalité impayée en fin de contrat ; -0.25 par pénalité non réglée en cours.  
  - Recence : appliquer un facteur 0.5 sur les pénalités/payments de plus de 6 mois pour atténuer l'ancien historique.  
  - Cap bas/haut : jamais < 0, jamais > 10.  
- **Déclencheurs** : mise à jour à chaque paiement et lors du bilan de fin de contrat ; job périodique possible pour recalcul recence.  
- **Affichage** : dans les listes (onglets demandes et contrats), fiches contrats, filtres/tri (admin).  
- **Usage** : aide à la décision (priorisation, alerte), sans blocage automatique (sauf règles spécifiques ultérieures).

### 5.8. Garant (rôle, éligibilité, rémunération)

- **Rôle** : le garant est obligatoire (membre ou admin), avec lien de parenté renseigné.  
- **Éligibilité** : l'un des deux (emprunteur ou garant) doit être à jour à la caisse imprévue ; sinon refus, sauf dérogation admin.  
- **Parrainage** : seuls les garants qui ont apporté l’emprunteur sont éligibles aux bonus.  
- **Rémunération** : 2% du montant versé par mois par l'emprunteur, uniquement si le garant est un membre (pas d'admin). Calculée à chaque versement.  
- **Documents** : les informations garant sont visibles dans les fiches contrats (admin), jamais dans l’espace client.

## 6. Structure des données

### 6.1. Type CreditSpeciale

```typescript
export type CreditType = 'SPECIALE' | 'FIXE' | 'AIDE'
export type CreditStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'TRANSFORMED'

export interface CreditSpeciale {
  id: string
  memberId: string
  memberFirstName: string
  memberLastName: string
  memberPhone: string
  creditType: CreditType
  requestedAmount: number
  interestRate: number
  monthlyPayment: number
  firstPaymentDate: Date
  totalAmount: number // montant + intérêts
  status: CreditStatus
  guarantor: Guarantor
  relationshipWithGuarantor: string
  creditReason: string
  contractDocumentId?: string
  signedContractDocumentId?: string
  simulationData: SimulationData
  customSimulationData?: CustomSimulationData
  isEligible: boolean
  eligibilityReason?: string
  transformedFromCreditId?: string
  transformedAt?: Date
  dischargeDocumentId?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}
```

### 6.2. Type Guarantor

```typescript
export type GuarantorType = 'MEMBER' | 'ADMIN'

export interface Guarantor {
  type: GuarantorType
  memberId?: string // si type = 'MEMBER'
  adminId?: string // si type = 'ADMIN'
  firstName: string
  lastName: string
  phone?: string
  isUpToDate: boolean // à jour à la caisse imprévue
}
```

### 6.3. Type SimulationData

```typescript
export interface SimulationData {
  amount: number
  interestRate: number
  monthlyPayment: number
  firstPaymentDate: Date
  durationInMonths: number
  totalInterest: number
  totalAmount: number
  isValid: boolean // ne dépasse pas la limite
  proposedMinimumAmount?: number // si refus
}
```

### 6.4. Type CustomSimulationData

```typescript
export interface CustomPayment {
  monthIndex: number
  amount: number
  dueDate: Date
}

export interface CustomSimulationData {
  payments: CustomPayment[]
  totalAmount: number
  durationInMonths: number
  isValid: boolean
}
```

### 6.5. Type CreditPayment

```typescript
export type PaymentStatus = 'DUE' | 'PAID' | 'PARTIAL' | 'OVERDUE'

export interface CreditPayment {
  id: string
  creditId: string
  monthIndex: number
  dueDate: Date
  amount: number
  paidAmount: number
  penaltyAmount: number
  status: PaymentStatus
  paidAt?: Date
  paymentMethod?: string
  proofImageUrl?: string
  comment?: string
  rating?: number // sur 10
  daysLate?: number
  penaltyPaid: boolean
  createdAt: Date
  updatedAt: Date
}
```

## 7. Alignement avec l'architecture

- Respecter la structure décrite dans [`ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) :
  - Repositories : `src/repositories/credit-speciale/*`
  - Services : `src/services/credit-speciale/*`
  - Hooks : `src/hooks/credit-speciale/*`
  - Composants : `src/components/credit-speciale/*`
  - Pages : `src/app/(admin)/credit-speciale/*`
  - Types : `src/types/types.ts` (modèles de crédits, paiements, etc.)
  - Schemas : `src/schemas/credit-speciale.schema.ts` (formulaires associés)

## 8. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Module caisse imprévue** : [`../caisse-imprevue/ANALYSE_CAISSE_IMPREVUE_CONTRATS.md`](../caisse-imprevue/ANALYSE_CAISSE_IMPREVUE_CONTRATS.md) (pour la vérification d'éligibilité)
- **Module caisse spéciale** : [`../caisse-speciale/ANALYSE_CAISSE_SPECIALE.md`](../caisse-speciale/ANALYSE_CAISSE_SPECIALE.md) (pour les similarités avec les contrats)

