# Réalisation à faire – Module Placement

Ce document liste les fonctionnalités à implémenter pour aboutir au module Placement complet. Il s’appuie sur :
- L’architecture globale : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- L’analyse détaillée : [`./placement.md`](./placement.md) (processus, UML, stats, formulaires, règles métier)

## 1. Rappels module Placement
- Pages ciblées : `src/app/(admin)/placements/*` (liste, détails)
- Composants : `src/components/placement/*`
- Types et modèles : `src/types/types.ts` (Placement, CommissionPaymentPlacement, EarlyExitPlacement, etc.)
- Repositories/Services : `src/repositories/placement/*`, `src/services/placement/*`

## 2. Backlog de fonctionnalités à implémenter (référence `placement.md`)

### A. Vue liste Placements (alignée Caisse Spéciale / Caisse Imprévue)
- [x] Onglets : Tous, Mensuel, Final, Commissions du mois, En retard (+ Actifs/Brouillons/Clos/Retrait anticipé si besoin)
- [x] Stats (carrousel + cartes, design caisses) : total, montants engagés, actifs, brouillons, clos, retraits anticipés, commissions dues/payées, montants payés, répartition par mode/statut (camembert), top bienfaiteurs
- [ ] Filtres : recherche (nom/prénom/matricule), statut, mode de règlement, période, filtre “commissions du mois”, filtre retard (échéances passées non payées) _(recherche + filtres mois/en retard implémentés ; reste affinage sur échéancier réel)_
- [x] Cards (design caisses) : nom/prénom bienfaiteur, téléphone, contact urgent, montant, taux, durée, mode, prochaine commission ou date finale, bouton téléversement contrat
- [x] Traduction statuts : Brouillon, Actif, Clos, Sortie anticipée, Annulé
- [x] Actions : brouillon → modifier + suppression (modal), pas de “Retrait anticipé” en liste, bouton “Ouvrir” (détails) si Actif
- [x] Pagination
- [x] Exports PDF/Excel : liste placements filtrés, liste bienfaiteurs filtrés

### B. Formulaire Placement
- [x] Mode mensuel : champ “Date du 1er versement de commission” ; fin = date 1er versement + durée (mois)
- [x] Mode final : champ “Date de début de contrat” ; fin = date début + durée (mois)
- [x] Contact urgent (réutiliser `caisse-imprevue/Step3.tsx`) _(détails ajoutés : prénom, téléphone2, lien, type/n° pièce ; upload doc à voir si nécessaire)_
- [ ] Recherche membre (nom, prénom, matricule) + ajout rôle « Bienfaiteur » si absent
- [ ] Validation stricte des montants/taux/période (numériques, sans zéros initiaux parasites)

### C. Activation et verrouillage
- [x] Activation = contrat PDF signé téléversé + période démarrée (date 1er versement ou date début ≤ aujourd’hui)
- [x] Verrou : dès qu’une commission est payée, le contrat PDF n’est plus modifiable (blocage upload contrat si commission payée)

### D. Page Détails (design `caisse-imprevue/contrats/[id]`)
- [ ] En-tête : badges type placement + statut (traduit), bouton “Ouvrir” si Actif
- [ ] Bloc infos : ID contrat, montant/date prochaine commission, date fin, coordonnées (téléphone, contact urgent)
- [ ] Stats du contrat : montants payés/restants, commissions payées/due, répartition, gauge progression (mensuel vs final)
- [ ] Historique des versements (timeline) avec reçus/preuves PDF téléchargeables
- [ ] Échéancier : liste échéances mensuelles cliquables pour payer ; si payé, voir/télécharger le reçu
- [ ] Capital (fin / retrait anticipé) : remboursement final, PDF quittance finale ; cas retrait anticipé : avenant + quittance sortie
- [ ] Bouton “Contact urgent” (modal)

### E. Commissions et paiements
- [ ] Génération commissions après activation (contrat téléversé + statut Actif)
- [ ] Paiement commission : upload preuve, statut Paid, verrou contrat
- [ ] Échéancier et “commissions du mois” / “en retard”
- [ ] Export/affichage reçus PDF _(receipts affichés si `receiptDocumentId` en UI)_

### F. Documents
- [ ] Téléversement contrat PDF signé (activation) ; verrou après paiement
- [ ] Preuves commissions (PDF/image) ; quittances (finale, sortie anticipée) _(génération + upload quittances finale / sortie anticipée ajoutées, liaison via boutons de vue)_ 
- [ ] Avenant retrait anticipé _(génération automatique + liaison en UI ; persistance sur le placement)_

### G. Notifications (à intégrer après livraison fonctionnelle)
- [ ] Rappels commissions (due, overdue), activation placement, sortie anticipée, clôture
- [ ] Jobs/planifications (cf. `documentation/notifications/*`)

## 3. Impacts architecturaux
- Repositories/Services : `PlacementRepository`, `PlacementService` (activation, verrou, commissions, docs)
- Hooks : `usePlacements` et dérivés (onglets, filtres, stats, pagination, détails)
- UI : composants liste/cards/stats/exports, page détails (design caisse-imprevue), formulaires
- Types : `src/types/types.ts` (statuts traduits, champs dates dépendants du mode, contact urgent)
- Schemas : Zod pour formulaire (dates selon mode, contact urgent, montants numériques)

## 4. Lien avec l’analyse
- Toute nouvelle implémentation doit rester cohérente avec `placement.md` :
  - Cas d’utilisation / séquences (activation, paiement commissions, retrait anticipé, exports)
  - Diagrammes UML (classes, séquences) à ajuster si de nouveaux champs ou règles sont ajoutés


