## Tests – Anniversaires membres (V2)

### 1. Tests unitaires

#### 1.1 `useMemberBirthdays`

- [ ] Calcul correct des `nextBirthday`, `daysUntil`, `age` pour différents cas (anniversaire passé/à venir).
- [ ] Filtrage par mois/année pour la vue calendrier.
- [ ] Filtrage par recherche (nom/prénom/matricule).
- [ ] Gestion des membres sans `birthDate` ou avec dates invalides.

#### 1.2 Exports anniversaires

- [ ] Génération des lignes pour Excel/PDF (nom, prénom, matricule, date de naissance, prochain anniversaire, jours restants, âge).
- [ ] Gestion du cas "aucun anniversaire à exporter".

### 2. Tests d’intégration

Fichier cible : `src/domains/memberships/__tests__/integration/membership-birthdays.integration.test.tsx`

- [ ] **INT-BIRTHDAYS-01 – Vue liste**
  - Afficher les anniversaires à venir (triés par `daysUntil`).
  - Vérifier les filtres (recherche, période).
- [ ] **INT-BIRTHDAYS-02 – Vue calendrier**
  - Navigation mois/année.
  - Affichage des jours contenant des anniversaires.
- [ ] **INT-BIRTHDAYS-03 – Exports**
  - Export Excel/PDF pour un mois donné.
  - Vérifier le contenu de l’export.

### 3. Tests E2E (Playwright – à planifier)

- [ ] Aller sur l’onglet/page Anniversaires.
- [ ] Changer de mois/année et vérifier les données.
- [ ] Lancer un export et vérifier qu’un fichier est téléchargé.

### 4. Attributs `data-testid` recommandés

- `data-testid="member-birthdays-list"` : conteneur vue liste.
- `data-testid="member-birthdays-calendar"` : conteneur vue calendrier.
- `data-testid="member-birthdays-export-excel"`, `member-birthdays-export-pdf` : boutons d’export.

### 5. Couverture cible

- **Hook** : ≥80% (`useMemberBirthdays`).
- **UI** : au moins via tests d’intégration.
- **Exports** : cas principaux couverts.
