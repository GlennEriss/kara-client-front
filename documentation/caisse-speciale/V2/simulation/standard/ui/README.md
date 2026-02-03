# UI / UX – Simulation Caisse Spéciale (Standard) V2

> Wireframes et spécifications UI pour la page Simulation (Standard / Standard Charitable).

## Vue d’ensemble

Ce dossier décrit l’interface de la page **Simulation** : formulaire de saisie (type de caisse, montant, durée, date) et tableau récapitulatif des échéances avec colonne des bonus, puis actions (Export PDF/Excel, Partager WhatsApp).

**Design System** : KARA (Bleu foncé #234D65, Or #CBB171)  
**Framework UI** : Shadcn UI  
**Responsive** : Mobile-first (320px+), Tablette (640px+), Desktop (1024px+)

---

## Structure

```
ui/
├── README.md                    # Ce fichier (vue d'ensemble)
└── WIREFRAME_SIMULATION.md      # Wireframe page simulation (formulaire + tableau + actions)
```

---

## Vues

| Fichier | Description |
|---------|-------------|
| [WIREFRAME_SIMULATION.md](./WIREFRAME_SIMULATION.md) | Page unique : formulaire (type, montant, durée 1–12, date souhaitée), bouton « Lancer la simulation », tableau récapitulatif (colonnes N° Échéance, Date échéance, Date prise d’effet bonus, Montant, Taux %, Bonus FCFA, totaux), boutons Export PDF, Export Excel, Partager WhatsApp. États : vide (avant simulation), chargement paramètres, tableau affiché, erreur « Aucun paramètre actif ». |

---

## Principes UX

- **Formulaire compact** : tous les champs sur une même zone (ou en grille sur desktop).
- **Feedback immédiat** : validation Zod, message d’erreur si aucun paramètre actif, loader pendant la récupération des settings.
- **Tableau lisible** : aligné sur l’historique des versements (contrats), avec totaux en bas.
- **Actions groupées** : Export PDF, Export Excel, Partager WhatsApp à proximité du tableau (barre d’actions ou boutons sous le tableau).
- **Responsive** : formulaire en colonnes sur desktop, tableau scroll horizontal sur mobile si besoin.

---

## Références

- [README.md](../README.md) – Contexte, formulaire, tableau
- [Design System KARA](../../../../design-system/DESIGN_SYSTEM_COULEURS_KARA.md)
- [Diagrammes d’activité](../activite/README.md)
- Page versements (inspiration tableau) : `src/app/(admin)/caisse-speciale/contrats/[id]/versements/page.tsx`
