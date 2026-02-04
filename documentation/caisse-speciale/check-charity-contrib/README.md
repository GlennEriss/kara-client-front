# Check Charity Contrib – Analyse

## Contexte

Ce sous-dossier documente la fonctionnalité **vérification « œuvre de charité »** pour le module Caisse Spéciale : déterminer si un membre est éligible aux types de caisse charitable et afficher des **informations sur la dernière œuvre de charité** à laquelle il a contribué, à l’étape 2 des formulaires **Nouvelle demande** et **Nouveau contrat**.

---

## 1. Section Bienfaiteur (œuvres de charité)

### Où c’est géré

- **Liste des charités** : `http://localhost:3000/bienfaiteur`
- **Détails d’un événement** (ex. Recolte MELEN) : `http://localhost:3000/bienfaiteur/{eventId}`  
  Onglets : Contributions, **Participants**, Groupes, Médias, Paramètres.
- **Enregistrement d’une contribution** : depuis la page événement, formulaire « Ajouter une contribution » :
  - Type de contributeur : **Membre individuel** ou **Groupe**
  - Recherche du membre (nom, matricule…)
  - Type de contribution : **Espèces / Virement** ou **Don en nature**
  - Montant, méthode de paiement, date de contribution, preuve, notes

Les contributions sont donc enregistrées **par événement** ; chaque contribution est liée à un **participant** (membre ou groupe) de cet événement.

### Participant vs contributeur

| Notion | Description |
|--------|-------------|
| **Participant** | Un membre (ou un groupe) est **inscrit** comme participant à un événement de charité. Il peut n’avoir **aucune contribution** encore (ex. message « Aucun participant pour le moment » sur l’onglet Participants). |
| **Contributeur** | Un participant qui a **au moins une contribution** enregistrée (espèces/virement ou don en nature) pour cet événement. |

Pour l’éligibilité aux caisses charitable, on doit se baser sur le fait d’**avoir réellement contribué**, pas seulement d’être inscrit comme participant. Sinon, un membre ajouté par erreur ou qui n’a jamais versé serait considéré à tort comme éligible.

---

## 2. Règle métier recommandée

### Éligibilité aux types charitable

Un membre est **éligible** aux types **Standard Charitable**, **Journalière Charitable** et **Libre Charitable** si et seulement si :

- Il existe **au moins un** `CharityParticipant` (type `member`, `memberId` = ce membre) avec **`contributionsCount > 0`**  
  **ou** de façon équivalente : il existe au moins une **`CharityContribution`** liée à un tel participant.

On ne se base **pas** sur la seule présence dans la liste des participants (qui peut être sans contribution).

### Informations « dernière œuvre » en step 2

En plus du booléen « éligible / non éligible », il est utile d’afficher en step 2 un résumé de la **dernière œuvre de charité** à laquelle le membre a contribué, par exemple :

- Nom de l’événement (ex. « Recolte MELEN »)
- Date de la dernière contribution (ex. « 04/02/2026 »)
- Optionnel : montant ou type (espèces / don en nature)

Cela évite de dupliquer une info déjà présente côté Bienfaiteur et donne du contexte à l’admin sans quitter le formulaire caisse spéciale.

---

## 3. Faut-il mettre un booléen sur le membre ?

### Recommandation : **ne pas** ajouter un simple booléen sur le membre

Raisons principales :

1. **Double source de vérité** : les contributions existent déjà dans `charity-events/{eventId}/contributions` et les participants dans `charity-events/{eventId}/participants`. Un champ du type `user.hasParticipatedInCharity` devrait être mis à jour à chaque ajout/suppression de contribution, sinon il devient faux. Risque d’incohérence et de logique dupliquée.
2. **Pas assez riche** : un booléen ne permet pas d’afficher « la dernière œuvre à laquelle il a participé » en step 2, alors que les données (participant + `lastContributionAt`, événement) permettent de le faire.
3. **Redondant** : la réponse « a-t-il déjà contribué ? » peut être dérivée des données bienfaiteur existantes (participants avec `contributionsCount > 0` ou existence de contributions).

### Approche retenue : cache + Cloud Function

On utilise un **document de synthèse** par membre : `member-charity-summary/{memberId}` (champs : `eligible`, `lastContributionAt`, `lastEventId`, `lastEventName`, `lastAmount?`). Une **Cloud Function** est déclenchée à chaque création / modification / suppression d’une contribution et met à jour ce document. Le step 2 lit ce document (une seule lecture) pour afficher l’éligibilité et le bloc « Dernière œuvre ». Détail de la Cloud Function : [function/README.md](./function/README.md).

---

## 4. Périmètre fonctionnel

| Élément | Détail |
|--------|--------|
| **Écrans** | Step 2 « Informations de la demande » (nouvelle demande) et Step 2 « Configuration du contrat » (nouveau contrat). |
| **URLs** | `/caisse-speciale/demandes/nouvelle`, `/caisse-speciale/contrats/nouveau`. |
| **Règle** | Types **Standard Charitable**, **Journalière Charitable**, **Libre Charitable** accessibles **uniquement** si le membre a déjà **contribué** à au moins une œuvre de charité (cf. critère ci‑dessus). Sinon : indisponibles (grisés + message). |
| **UX supplémentaire** | Si éligible : afficher un court résumé « Dernière œuvre : [nom événement] ([date], [montant ou type si pertinent]) » dans le step 2. |

### Types de caisse concernés

| Code | Libellé |
|------|---------|
| `STANDARD_CHARITABLE` | Standard Charitable |
| `JOURNALIERE_CHARITABLE` | Journalière Charitable |
| `LIBRE_CHARITABLE` | Libre Charitable |

Les types non charitable (Standard, Journalière, Libre) restent accessibles à tous.

---

## 5. Données et implémentation

### Modèle actuel (rappel)

- **CharityParticipant** (sous `charity-events/{eventId}/participants`) : `memberId`, `participantType`, `contributionsCount`, `lastContributionAt`, `totalAmount`, etc.
- **CharityContribution** (sous `charity-events/{eventId}/contributions`) : `participantId`, `contributionDate`, montant, type (espèces / don en nature), preuve, etc.

Pour un membre donné, « a déjà contribué » = il existe au moins un participant (type member, ce memberId) avec `contributionsCount > 0`. La « dernière œuvre » = ce participant (ou le plus récent parmi plusieurs) avec `lastContributionAt` le plus récent ; l’`eventId` est dans le chemin du document ou sur le participant selon le schéma.

### Implémentation (cache + Cloud Function)

- **Collection** : `member-charity-summary/{memberId}` (un document par membre), mis à jour par la **Cloud Function** à chaque changement dans `charity-events/{eventId}/contributions`. Voir [function/README.md](./function/README.md).
- **Côté client (step 2)** : service ou repository qui lit `getDoc(member-charity-summary/{memberId})` et retourne `{ eligible, lastContribution }`. Hook : `useMemberCharityEligibility(memberId)` avec cache React Query.

---

## 6. Fichiers concernés

| Rôle | Fichier / zone |
|------|-----------------|
| Formulaire demande – Step 2 | `src/components/caisse-speciale/forms/steps/Step2InfosDemande.tsx` |
| Formulaire contrat – Step 2 | `src/components/caisse-speciale/steps/Step2ContractConfiguration.tsx` |
| Types de caisse | `src/services/caisse/types.ts` (`CaisseType`) |
| Schéma validation | `src/schemas/caisse-speciale.schema.ts` |
| Bienfaiteur – participants | `src/repositories/bienfaiteur/CharityParticipantRepository.ts` |
| Bienfaiteur – contributions | `src/repositories/bienfaiteur/CharityContributionRepository.ts`, `src/services/bienfaiteur/CharityContributionService.ts` |
| Types | `CharityParticipant`, `CharityContribution` dans `src/types/types.ts` |

---

## 7. Cloud Function

Une **Cloud Function** met à jour le cache `member-charity-summary/{memberId}` à chaque création / modification / suppression d’une contribution. Le step 2 lit ce document. Voir **[function/](./function/README.md)** pour le détail (déclencheur, logique, index, règles).

## 8. Structure de la documentation

- **[activite/](./activite/)** – Diagramme d’activité (consultation step 2 ; Cloud Function en flux parallèle).
- **[sequence/](./sequence/)** – Diagramme de séquence (lecture cache en step 2 ; Cloud Function sur écriture contribution).
- **[function/](./function/)** – Mise en œuvre de la Cloud Function.
- **[WORKFLOW.md](./WORKFLOW.md)** – Plan d’implémentation par étapes.

## 9. Résumé

- **Ne pas** ajouter un simple booléen sur le membre : source de vérité = participants + contributions bienfaiteur.
- **Éligibilité** = avoir **au moins une contribution** (participant avec `contributionsCount > 0`).
- **Implémentation** : cache **member-charity-summary** maintenu par une **Cloud Function** ; le step 2 lit ce document via un service/hook `useMemberCharityEligibility(memberId)`. Détail dans [function/README.md](./function/README.md).

Ce document sert de base pour la conception détaillée et l’implémentation de la règle et de l’affichage « dernière œuvre » en step 2.
