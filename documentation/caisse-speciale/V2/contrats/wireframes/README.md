# Wireframes – Contrats Caisse Spéciale V2

Ce document décrit l'organisation des **cards de la liste des contrats** (vue grille), telle que demandée.
Référence visuelle : `/caisse-speciale/demandes` (organisation des cards).

---

## Objectif

- Aligner la mise en page des cards **Contrats** sur l'organisation des cards **Demandes**.
- Remplacer l’icône inutile par **la photo du membre**.
- Afficher clairement le **matricule du contrat** (non tronqué).
- Forcer **3 cards par ligne** en vue grille.

---

## Grille (layout)

- **Grille** : 3 cards par ligne (desktop).
- **Organisation** : même rythme/espacement que `/caisse-speciale/demandes`.

---

## Structure d’une card (ordre strict des lignes)

1. **Photo du membre** (avatar) à la place de l’icône.
2. **Matricule du contrat** (visible en entier, non tronqué).
3. **Badges d’état** (ex. : Individuel, Retard, Actif…).
4. **Type de contrat**.
5. **Nom du membre**.
6. **Prénom du membre**.
7. **Matricule du membre**.
8. **Contacts du membre**.
9. **Contact urgent** :
   - Nom
   - Prénom
   - Téléphone
10. **Mensualité**.
11. **Durée**.
12. **Date de début d’échéance**.
13. **Prochaine échéance**.
14. **État du contrat PDF**.
15. **Versé : X FCFA**.
16. **Actions** alignées **verticalement** (colonne de boutons).

---

## Notes d’implémentation (UX)

- Le matricule du contrat doit être **lisible** et **non tronqué** (ex. monospace si besoin).
- Les badges d’état doivent être **sur une seule ligne** si possible.
- Les informations de contact doivent être **lisibles** (téléphone, email si disponible).
- Le bloc contact urgent doit être **clairement séparé** des infos membre.

---

*Dernière mise à jour : 2026-02-03*
