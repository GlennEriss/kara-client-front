# Storage Rules - Dashboard

> Regles Storage pour exports dashboard en contexte tabs-first.

## 1. Decision V1

### V1 recommande: pas de stockage serveur des exports

- PDF/Excel generes cote client sur tab actif
- telechargement local direct
- pas de path Storage requis

=> aucune regle Storage supplementaire obligatoire en V1.

## 2. Option V2 (archivage serveur)

Si archivage voulu, utiliser un prefixe par tab:

- `dashboard-reports/{activeTab}/{year}/{month}/{fileName}`

Regle conseillee:

```rules
match /dashboard-reports/{activeTab}/{year}/{month}/{fileName} {
  allow read: if isAdmin();
  allow write: if isAdmin() &&
    request.resource.size < 10 * 1024 * 1024 &&
    (
      request.resource.contentType == 'application/pdf' ||
      request.resource.contentType ==
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  allow delete: if isAdmin();
}
```

## 3. Convention nommage fichier (V2)

Exemple:

- `dashboard-reports/credit_fixe/2026/02/dashboard_credit_fixe_2026-02-13.pdf`

## 4. Recommandation

Rester en V1 tant que l'archivage serveur n'est pas un besoin metier explicite.

