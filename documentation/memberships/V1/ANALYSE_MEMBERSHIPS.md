# Analyse fonctionnelle – Module Memberships

## 1. Contexte et périmètre

- Module déjà existant dans le code :  
  - Pages : `src/app/(admin)/memberships/*`  
  - Composants : `src/components/memberships/*`
- Le module **memberships** gère :
  - Les adhésions membres (création, modification, désactivation, statuts…)
  - Les informations d’identité, coordonnées, véhicules associés, etc.
- Toute évolution doit respecter l’architecture globale décrite dans [`documentation/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md).

## 2. Objectifs des nouvelles fonctionnalités

> Cette section sera complétée pour chaque nouvelle fonctionnalité (par exemple : nouveaux filtres, nouvelles statistiques, intégration avec d’autres modules, etc.).

- Définir précisément :
  - Le besoin métier (pourquoi cette évolution est nécessaire).
  - Son impact sur les écrans existants (listes, fiches détaillées, exports).
  - Son interaction éventuelle avec d’autres modules (véhicules, caisse spéciale, bienfaiteur…).

## 3. Analyse UML (à compléter)

### 3.1. Cas d’utilisation

- UC1 – Créer un membre.
- UC2 – Mettre à jour les informations d’un membre.
- UC3 – Consulter la fiche détaillée d’un membre.
- UC4 – Lier un membre à d’autres entités (véhicules, contrats de caisse spéciale, contributions…).
- UC5 – **Rechercher un membre dans l’onglet Véhicules de la fiche membre**.
 - UC6 – **Exporter la liste des membres en PDF / Excel avec filtres véhicules**.
 - UC7 – **Gérer les anniversaires des membres (liste, notifications, exports, calendrier)**.

#### UC5 – Rechercher un membre dans l’onglet Véhicules

- **Acteur principal** : Admin (utilisateur back‑office).
- **Objectif** : permettre à l’admin, depuis la section Véhicules (tabs véhicule), de **rechercher un membre par nom ou matricule** pour :
  - filtrer rapidement les véhicules liés à un membre précis ;
  - vérifier qu’un véhicule est bien rattaché au bon membre.
- **Pré‑conditions** :
  - L’admin est authentifié et a accès au module memberships.
  - Les membres existent avec au minimum : `matricule`, `firstName`, `lastName`.
- **Post‑conditions** :
  - La liste de véhicules affichée dans l’onglet est filtrée selon le membre recherché (nom/matricule).
  - Le critère de recherche est clairement visible (ex. champ de recherche au‑dessus du tableau ou de la grille).
- **Flux nominal** (simplifié) :
  1. L’admin ouvre la fiche membre puis l’onglet **Véhicules**.
  2. L’admin saisit un nom ou un matricule dans un **champ de recherche** dédié.
  3. Le système interroge la liste des membres associés / des véhicules et applique le filtre.
  4. Les véhicules correspondant au membre sélectionné sont affichés (les autres sont masqués).
  5. L’admin peut effacer la recherche pour revenir à la vue complète.
- **Variantes / erreurs** :
  - Aucun membre trouvé : message clair “Aucun membre trouvé pour cette recherche”.
  - Plusieurs membres portant le même nom : possibilité de filtrer par matricule ou d’afficher une liste de choix.

> Remarque : cette fonctionnalité doit rester cohérente avec les mécanismes de recherche déjà utilisés dans d’autres modules (par ex. recherche par nom/matricule dans les listes membres), et respecter l’architecture décrite dans [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md).

#### UC6 – Exporter la liste des membres en PDF / Excel (avec/sans véhicules)

- **Acteur principal** : Admin.
- **Objectif** : permettre à l’admin d’exporter, depuis la liste des membres, un fichier **PDF** ou **Excel** selon trois modes :
  1. Uniquement les membres **qui ont au moins un véhicule**.
  2. Uniquement les membres **sans véhicule**.
  3. **Tous les membres**, qu’ils aient un véhicule ou non.
- **Pré‑conditions** :
  - L’admin est authentifié et a accès à la section liste des membres.
  - Les données membres et leurs véhicules associés sont disponibles (liaison Member ↔ Vehicle correcte).
- **Post‑conditions** :
  - Un fichier PDF ou Excel est généré et téléchargé sur le poste de l’admin.
  - Le contenu du fichier respecte le filtre choisi (avec véhicule, sans véhicule, tous).
- **Flux nominal** (simplifié) :
  1. L’admin ouvre l’écran de **liste des membres** (`MembershipList`).
  2. L’admin choisit le **type d’export** (PDF ou Excel).
  3. L’admin choisit le **filtre d’export** :
     - “Membres avec véhicules”
     - “Membres sans véhicule”
     - “Tous les membres”
  4. Le système applique le filtre sur la source de données (hooks/services memberships + véhicules).
  5. Le système génère le fichier (PDF / Excel) avec les colonnes nécessaires (identité, matricule, statut, info véhicule si applicable).
  6. Le téléchargement démarre automatiquement.
- **Variantes / erreurs** :
  - Aucun membre correspondant au filtre : générer un fichier vide mais valide ou bloquer avec un message explicite.
  - Erreur technique lors de la génération : afficher un message d’erreur (toast) et logger l’erreur côté client.

#### UC7 – Gérer les anniversaires des membres (liste, notifications, exports, calendrier)

- **Acteur principal** : Admin.
- **Objectifs** :
  - Disposer d’une **section / onglet “Anniversaires”** dans le module memberships.
  - Visualiser la **liste des membres par date d’anniversaire**, triée par anniversaires les plus proches (J, futur proche).
  - Être **notifié** des anniversaires :
    - J‑2 (pré‑alerte),
    - J (jour J),
    - J+1 (rappel / suivi).
  - Pouvoir **exporter** en PDF / Excel :
    - La liste des membres qui fêtent leur anniversaire **ce mois‑ci**.
    - La liste des membres pour un **mois donné** (ex. tous les anniversaires de février).
  - Afficher les anniversaires sous forme de **calendrier mensuel** (vue par mois) avec les jours d’anniversaire colorés (ex. en rose) et le(s) nom(s) des membres.
- **Pré‑conditions** :
  - Les membres ont une date de naissance valide (`birthDate`).
  - L’admin est authentifié et a accès au module memberships.
- **Post‑conditions** :
  - L’admin peut identifier rapidement les membres concernés (liste + calendrier).
  - Les notifications sont générées selon la règle J‑2, J, J+1.
- **Flux nominal (simplifié)** :
  1. L’admin ouvre la section / l’onglet **Anniversaires** dans memberships.
  2. Par défaut, la liste affiche les membres dont l’anniversaire est proche, triés par date la plus imminente.
  3. L’admin peut filtrer par **mois** (ex. “février”) pour voir tous les anniversaires de ce mois.
  4. L’admin peut cliquer sur un bouton d’export pour générer un **PDF** ou un **Excel** des anniversaires du mois affiché.
  5. L’admin peut basculer sur une **vue calendrier mensuelle** : chaque jour contenant un anniversaire est mis en évidence (couleur spécifique + noms des membres).
  6. En parallèle, un job de notifications (cf. `documentation/notifications/realisationAfaire.md`) génère les notifications J‑2, J, J+1 pour les membres concernés.
- **Variantes / erreurs** :
  - Aucun anniversaire pour le mois / la période sélectionnée : afficher un message explicite.
  - Erreur de génération d’export : message d’erreur + log technique.
  - Données de date de naissance manquantes ou invalides : exclure de la liste et prévoir un mécanisme de correction.


### 3.2. Diagramme de classes (conceptuel)

> À détailler plus tard sous forme de diagramme UML (ou image jointe) basé sur le modèle suivant.  
> **Important** : la classe conceptuelle “Membre” correspond directement au type `User` défini dans `src/types/types.ts`.

- `User` (Membre)
  - id, matricule
  - identité, coordonnées, statut, rôles, etc. (cf. interface `User` dans `src/types/types.ts`)
- `Membership` / `Subscription` (si couche d’abonnement séparée)
- Liens vers :
  - `Vehicle`
  - `CaisseSpecialeContract`
  - Contributions (bienfaiteur / charités, si nécessaire)

## 4. Alignement avec l’architecture

- Respecter la structure décrite dans [`ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) :
  - Repositories : `src/repositories/memberships/*` (ou équivalent actuel)
  - Services : `src/services/memberships/*`
  - Hooks : `src/hooks/memberships/*`
  - Composants : `src/components/memberships/*`
  - Pages : `src/app/(admin)/memberships/*`
  - Types : `src/types/types.ts` (modèles Member, Membership, etc.)
  - Schemas : `src/schemas/memberships.schema.ts` (formulaires membres)

## 5. Référence croisée

- **Réalisation** : les tâches concrètes à implémenter pour ce module sont listées dans [`realisationAfaire.md`](./realisationAfaire.md).  
- **Architecture globale** : voir [`documentation/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md).


