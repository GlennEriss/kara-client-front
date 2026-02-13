# Tableau de bord - Specification metier et architecture domains

> Objectif: construire un dashboard admin de pilotage, utile a la decision, aligne avec l'architecture domains du projet, avec navigation principale par tabs modules.

## 0. Arborescence documentaire complete

- `documentation/dashboard/README.md`
- `documentation/dashboard/architecture/README.md`
- `documentation/dashboard/activite/DashboardPilotageActivite.puml`
- `documentation/dashboard/sequence/README.md`
- `documentation/dashboard/sequence/SEQ_ChargerDashboard.puml`
- `documentation/dashboard/sequence/SEQ_ChangerFiltresDashboard.puml`
- `documentation/dashboard/firebase/README.md`
- `documentation/dashboard/firebase/firestore-rules.md`
- `documentation/dashboard/firebase/storage-rules.md`
- `documentation/dashboard/firebase/firestore-indexes.md`
- `documentation/dashboard/firebase/cloud-functions.md`
- `documentation/dashboard/wireframes/desktop.md`
- `documentation/dashboard/wireframes/mobile.md`

## 1. Objectif metier

Le dashboard doit permettre un pilotage rapide, actionnable et module par module.

Questions metier cibles:

- Qui traite l'activite administrative et a quel rythme?
- Quelle est la performance des agents de recouvrement?
- Comment se structurent les membres par groupes?
- Quels metiers sont les plus representes?
- Quelle est la repartition geographique des membres?
- Quelle est la sante de chaque module financier (caisse/credit/placement)?

## 2. Navigation tabs (pivot UX)

Le dashboard est pilote par une barre de tabs.

| Tab | Role |
| --- | --- |
| `Executive` | Synthese globale multi-modules |
| `Caisse speciale` | KPI et tendances caisse speciale |
| `Caisse imprevue` | KPI et tendances caisse imprevue |
| `Credit speciale` | KPI et tendances credit speciale |
| `Credit fixe` | KPI et tendances credit fixe |
| `Caisse aide` | KPI et tendances caisse aide |
| `Placements` | KPI et tendances placements |
| `Administration` | Activite admins et roles |
| `Recouvrement` | Performance agents de recouvrement |
| `Groupes` | Structure des groupes et repartition membres |
| `Metiers` | Repartition professionnelle des membres |
| `Geographie` | Repartition geographique des membres |

Regles:

- un seul tab actif a la fois
- les filtres globaux sont conserves quand on change de tab
- chaque tab charge uniquement ses widgets

## 3. KPI obligatoires par tab

### 3.1 Tab Executive

- membres actifs
- demandes en attente (global)
- encours contrats actifs
- total impayes

### 3.2 Tabs modules financiers

#### Caisse speciale

- demandes (pending/approved/rejected)
- contrats actifs
- montant encours
- impayes du module

#### Caisse imprevue

- demandes par statut
- contrats actifs
- versements dus vs payes
- impayes du module

#### Credit speciale

- demandes par statut
- contrats actifs
- echeances overdue
- impayes + penalites

#### Credit fixe

- demandes par statut
- contrats actifs
- reste a rembourser
- impayes du module

#### Caisse aide

- demandes par statut
- contrats actifs
- reste a rembourser
- cas a transformer (fin delai)

#### Placements

- demandes placements par statut
- placements actifs
- montant total place
- commissions dues/payees

### 3.3 Tab Administration

- total admins
- actifs/inactifs
- repartition par role
- top admins traiteurs

### 3.4 Tab Recouvrement

- total/actifs/inactifs
- repartition H/F
- anniversaires du mois
- montants collectes par agent
- taux paiements sans agent

### 3.5 Tab Groupes

- total groupes
- groupes avec membres
- groupes vides
- membres sans groupe
- top groupes par effectif

### 3.6 Tab Metiers

- total metiers references
- membres avec/sans metier
- metier le plus exerce
- top metiers

### 3.7 Tab Geographie

- repartition par province
- top villes
- top quartiers
- top arrondissements
- taux couverture adresse

## 4. Regles de calcul metier

Regles globales:

- base membres: roles `Adherant`, `Bienfaiteur`, `Sympathisant`
- valeurs vides comptees dans "non renseigne"
- periode par defaut: mois courant

Formules cle:

- `membresAvecMetier = count(users where normalize(profession) != '')`
- `membresSansMetier = membresTotal - membresAvecMetier`
- `metierLePlusExerce = maxBy(countBy(normalize(profession)))`
- `membresSansGroupe = count(users where groupIds absent or groupIds.length = 0)`
- `tauxSansAgent = paiementsSansAgent / paiementsTotaux * 100`
- `tauxCouvertureAdresse = membresAvecProvinceEtVille / membresTotal * 100`

## 5. Sources de donnees et mapping par tab

| Tab | Collections principales |
| --- | --- |
| Executive | `users`, `membership-requests`, `creditDemands`, `caisseSpecialeDemands`, `caisseImprevueDemands`, `placementDemands` |
| Caisse speciale | `caisseSpecialeDemands`, `caisseContracts` |
| Caisse imprevue | `caisseImprevueDemands`, `contractsCI` |
| Credit speciale/fixe/aide | `creditDemands`, `creditContracts`, `creditPayments`, `creditInstallments` |
| Placements | `placementDemands`, `placements` |
| Administration | `admins` |
| Recouvrement | `agentsRecouvrement`, `payments` |
| Groupes | `groups`, `users` |
| Metiers | `professions`, `users` |
| Geographie | `users`, `provinces/departments/communes/districts/quarters` |

## 6. Architecture cible (domains-first)

Conforme a:

- `documentation/architecture/ARCHITECTURE.md`
- `documentation/architecture/PLAN_MIGRATION_DOMAINS.md`

References detaillees:

- architecture et cache: `documentation/dashboard/architecture/README.md`
- activite: `documentation/dashboard/activite/DashboardPilotageActivite.puml`
- sequences: `documentation/dashboard/sequence/README.md`
- Firebase: `documentation/dashboard/firebase/README.md`
- wireframes: `documentation/dashboard/wireframes/desktop.md`, `documentation/dashboard/wireframes/mobile.md`

## 7. Contrat de donnees cible (tabs-first)

```ts
export type DashboardTabKey =
  | 'executive'
  | 'caisse_speciale'
  | 'caisse_imprevue'
  | 'credit_speciale'
  | 'credit_fixe'
  | 'caisse_aide'
  | 'placements'
  | 'administration'
  | 'recouvrement'
  | 'groupes'
  | 'metiers'
  | 'geographie'

export interface DashboardSnapshot {
  generatedAt: Date
  period: { from: Date; to: Date }
  activeTab: DashboardTabKey
  tabs: Record<DashboardTabKey, unknown>
}
```

## 8. UX et visualisation

- navigation principale par tabs
- desktop: tabs sur ligne complete (scroll si besoin)
- mobile: tabs horizontaux scrollables
- widgets limites au tab actif pour garder lisibilite/performance

## 9. Filtres transverses

Filtres:

- periode (`today`, `7d`, `30d`, `month`, `custom`)
- zone (`province`, `city`)
- type membre (`adherant`, `bienfaiteur`, `sympathisant`)
- `moduleCompare` (optionnel, visible uniquement dans le tab `Executive`)

Regles:

- changement filtre conserve le tab actif
- changement tab conserve les filtres
- changement tab reinitialise `moduleCompare` a `all` hors `Executive`

## 10. Performance et qualite

- cache React Query + cache Firestore d'agregats
- Cloud Functions recommandees pour pre-calcul
- fallback partiel par tab si source indisponible
- chargement et erreurs geres par section

## 11. Reponses techniques attendues

- Cache: **oui** (detail architecture)
- Cloud Functions: **oui, recommande**
- Firestore rules: **oui** (collections dashboard techniques)
- Storage rules: **optionnel V1**, requis si archivage exports
- Indexes Firestore: **oui**, listes par tabs/modules
- Wireframes mobile/desktop: **oui**, navigation tabs incluse

## 12. Plan de realisation

1. Creer domaine `src/domains/dashboard/*` avec `activeTab`.
2. Implementer `DashboardTabs` + sections par tab.
3. Brancher cache et repository d'agregats.
4. Ajouter Cloud Functions dashboard.
5. Ajouter/valider indexes et rules.
6. Retirer le dashboard mock legacy.

## 13. Definition de termine (DoD)

- tabs modules fonctionnels et coherents
- chaque tab affiche ses KPI metier
- filtres et tabs synchronises sans perte d'etat
- dashboard responsive desktop/mobile
- cache/Cloud Functions/rules/indexes documentes et appliques

## 14. Etat actuel et migration

Etat actuel:

- route `/dashboard` existante
- composant legacy `src/components/dashboard/Dashboard.tsx` a remplacer

Strategie:

- migration progressive vers `src/domains/dashboard/`
- bascule finale quand tous les tabs sont branches sur donnees reelles

## 15. Checklist documentation

- [x] specification tabs-first
- [x] architecture + cache
- [x] cloud functions
- [x] firestore/storage rules
- [x] firestore indexes
- [x] diagramme d'activite
- [x] diagrammes de sequence
- [x] wireframes desktop/mobile
