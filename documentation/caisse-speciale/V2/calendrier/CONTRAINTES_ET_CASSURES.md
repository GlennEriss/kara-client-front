# Calendrier caisse spéciale – Contraintes et cassures

Document de référence pour toute évolution ou remplacement du calendrier des versements sur la page détail contrat (`/caisse-speciale/contrats/[id]`).

---

## Contraintes à respecter

### Métier

| Contrainte | Description |
|-----------|-------------|
| Périodes 30 jours | Contrats JOURNALIERE / JOURNALIERE_CHARITABLE : un « mois » = 30 jours à partir de `firstPaymentDate` ; `dueMonthIndex` et plages de dates doivent rester cohérents. |
| Statuts par jour | Cinq états affichés : **Versé**, **À verser (passé)**, **À venir**, **Non disponible**, **Aujourd’hui**. Comportement et sens ne doivent pas changer. |
| Groupe vs individuel | Pour un contrat de groupe, un jour « Versé » peut reposer sur plusieurs contributions (`groupContributions`) ; la logique ne doit pas être simplifiée au détriment du groupe. |
| Clic sur un jour | Dans la plage autorisée (après premier versement, pas contrat clôturé) : clic ouvre soit le détail du versement existant, soit le formulaire de nouveau versement. |
| Résumé mensuel | Les cartes « Mois 1 », « Mois 2 », … (objectif, versé, progression, plage de dates) doivent continuer à refléter les mêmes données que le calendrier. |

### Technique

| Contrainte | Description |
|-----------|-------------|
| Source des paiements | Les versements viennent de la sous-collection Firestore `caisseContracts/{contractId}/payments` (et leurs `contribs` / `groupContributions`). |
| Lecture / écriture | Aujourd’hui `getContractWithComputedState` fait une écriture (`updateContract`). Toute refonte doit éviter d’aggraver les races (idéalement : lecture seule côté calendrier, mise à jour statut ailleurs). |
| Clés React Query | Le détail contrat utilise `['caisse-contract', contractId]`. Toute mutation qui modifie les paiements doit invalider cette clé (ou un préfixe) pour garder l’UI cohérente. |
| Normalisation des dates | `paidAt` / `dueAt` peuvent être Date, Timestamp Firestore ou string ; la logique d’affichage doit continuer à normaliser correctement pour la comparaison jour à jour. |

### UX

| Contrainte | Description |
|-----------|-------------|
| Légende | La légende des couleurs sous la grille doit rester présente et identique (Versé, À verser (passé), À venir, Non disponible, Aujourd’hui). |
| Navigation mois | Les boutons « Mois précédent » / « Mois suivant » et le titre « Mois Année » doivent rester. |
| Pas de régression visuelle | Les couleurs et libellés (Versé = vert, À verser = rouge, etc.) ne doivent pas changer sans accord. |

---

## Cassures à éviter

Lors d’un remplacement ou d’une grosse refonte du calendrier, ne pas :

1. **Changer l’URL** de la page détail contrat (`/caisse-speciale/contrats/[id]`).
2. **Changer le choix de composant** selon `caisseType` : JOURNALIERE / JOURNALIERE_CHARITABLE → `DailyContract` (celui qui contient le calendrier).
3. **Supprimer ou modifier le flux** : clic jour → détail versement **ou** formulaire nouveau versement → enregistrement → mise à jour de la grille.
4. **Casser le résumé mensuel** : les cartes Mois 1…N doivent toujours utiliser les mêmes données que le calendrier (même `data.payments`, mêmes helpers de total / statut / plage).
5. **Introduire une deuxième source de vérité** pour les paiements (ex. état local qui n’est plus synchronisé avec React Query / Firestore).
6. **Oublier d’invalider** la query `['caisse-contract', contractId]` (ou équivalent) après enregistrement ou modification d’un versement, sous peine de « disparition » du versement à l’écran.
7. **Modifier la règle des 30 jours** (journalier) ou le calcul de `dueMonthIndex` sans adapter ensemble le calendrier et le résumé mensuel.
8. **Rendre le calendrier dépendant d’un autre type de contrat** : le calendrier « jour par jour » reste spécifique aux contrats journaliers (Daily) ; Standard / Free ont d’autres vues.

---

## Checklist d’intégration d’un nouveau calendrier

- [ ] Nouveau composant de grille reçoit bien `daysWithStatus` (ou équivalent) et `onDayClick` ; pas d’appel direct à Firestore ou à `pay()` dans le composant.
- [ ] Hook ou page invalide `['caisse-contract', contractId]` (ou clé utilisée par la page) après chaque enregistrement / modification de versement.
- [ ] Optionnel : retry ou court délai après mutation avant refetch pour limiter le read-after-write Firestore.
- [ ] Optionnel : mise à jour optimiste du cache pour le jour concerné après succès de `pay()` / `payGroup()`.
- [ ] Résumé mensuel (Mois 1…N) toujours alimenté par les mêmes données que la grille (même `data.payments` / même hook).
- [ ] Clic sur un jour ouvre bien détail ou formulaire selon présence d’un versement pour ce jour.
- [ ] Légende et navigation mois conservées.
- [ ] Contrats de groupe : logique « Versé » basée sur les contributions de groupe conservée.
- [ ] Tests : au moins un scénario « enregistrer un versement → le jour reste Versé après refetch ».
