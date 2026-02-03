# Parametres Caisse Speciale (settings)

## Vue d'ensemble

Ce document decrit les parametres de la **Caisse speciale** accessibles via la page :
`/caisse-speciale/settings`.

Les parametres sont versionnes par **type de caisse** et pilotent :
- Les **bonus** appliques par mois (M4 a M12)
- Les **penalites** appliquees en cas de retard
- Les textes metier optionnels affiches dans l'interface

---

## Objectifs

- Centraliser les regles de bonus et penalites pour chaque type de caisse.
- Gerer des **versions** avec une seule version **active** par type.
- Supporter les besoins classiques **et** caritatifs via des types dedies.

---

## Types de parametres (caisseType)

Les parametres sont distingues par le champ `caisseType`. Les 3 nouveaux types a ajouter sont **charitables**.

| Libelle UI | Code (CaisseType) | Description |
| --- | --- | --- |
| Standard | STANDARD | Regles pour les contrats standard classiques |
| Journalier | JOURNALIERE | Regles pour les contrats journaliers classiques |
| Libre | LIBRE | Regles pour les contrats libres classiques |
| Standard Charitable | STANDARD_CHARITABLE | Variante caritative du standard |
| Journalier Charitable | JOURNALIERE_CHARITABLE | Variante caritative du journalier |
| Libre Charitable | LIBRE_CHARITABLE | Variante caritative du libre |

---

## Modele de donnees (CaisseSettings)

Chaque document stocke dans `caisseSettings` represente une version de parametres :

- `id: string` (ID custom possible : `MK_VERSION_<TYPE>_<DDMMYY>_<HHmm>`)
- `caisseType: CaisseType`
- `isActive: boolean`
- `effectiveAt: Date`
- `bonusTable: Record<string, number>` (M4 a M12)
- `penaltyRules: { day4To12: { perDay?: number, steps?: Array<{ from: number, to: number, rate: number }> } }`
- `businessTexts?: Record<string, string>`
- `createdAt: Date`
- `updatedAt?: Date`
- `createdBy: string`
- `updatedBy?: string`

---

## Regles de gestion

- **Une seule version active par type** : l'activation d'une version desactive toutes les autres du meme `caisseType`.
- **Tri et affichage** : l'interface liste les versions par date de creation (desc).
- **Application metier** : les contrats utilisent la version active correspondant a leur `caisseType`.
- **Charitable** : meme logique, mais regles separees pour les contrats caritatifs.

---

## Reference technique

- Page admin : `src/app/(admin)/caisse-speciale/settings/page.tsx`
- Acces DB : `src/db/caisse/settings.db.ts`
- Types : `src/services/caisse/types.ts` (`CaisseSettings`, `CaisseType`)
- Collection Firestore : `caisseSettings`
