# Wireframe – Modal Générer identifiant / Réinitialiser mot de passe

> Modal de confirmation pour la réinitialisation du mot de passe du membre et la génération du PDF d’identifiants.

## Contexte

- **Déclencheur** : clic sur le bouton « Générer identifiant » (ou « Réinitialiser mot de passe ») sur une carte ou une ligne membre, dans la liste des membres (`/memberships`).
- **Rôle** : confirmer l’action, faire recopier le matricule pour éviter les erreurs de cible, puis lancer la réinitialisation et le téléchargement du PDF.

---

## Structure du modal

### Desktop et Mobile (même structure, responsive)

```
┌─────────────────────────────────────────────────────────────┐
│  Réinitialiser le mot de passe du membre                  [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Le mot de passe du membre sera remplacé par son matricule.  │
│  Recopiez le matricule ci-dessous pour confirmer.           │
│                                                             │
│  Matricule du membre (affiché) :                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MAT-2024-001234                                    │   │  ← Lecture seule
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Recopiez le matricule du membre *                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │  ← Champ saisie
│  └─────────────────────────────────────────────────────┘   │
│  (Bouton "Accepter" désactivé tant que la saisie ≠ matricule)
│                                                             │
│  [Message d'erreur si échec API ou validation]               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    [Annuler]    [Accepter]                   │
└─────────────────────────────────────────────────────────────┘
```

### États

1. **Initial** : champ « Recopiez le matricule » vide, bouton « Accepter » désactivé.
2. **Saisie incorrecte** : texte saisi ≠ matricule → bouton « Accepter » resté désactivé (optionnel : message « Le matricule ne correspond pas »).
3. **Saisie correcte** : texte saisi = matricule → bouton « Accepter » activé.
4. **Chargement** : après clic sur « Accepter » → bouton en loading, champs désactivés.
5. **Erreur** : message d’erreur sous les champs ou en toast, modal reste ouverte.
6. **Succès** : toast succès, fermeture du modal, téléchargement du PDF déclenché.

### Éléments UI

- **Titre** : « Réinitialiser le mot de passe du membre » ou « Générer identifiant ».
- **Matricule affiché** : en lecture seule (texte ou champ désactivé) pour que l’admin puisse le recopier.
- **Champ obligatoire** : label « Recopiez le matricule du membre » avec indicateur requis (*).
- **Boutons** : Annuler (secondaire), Accepter (primaire), désactivé tant que la validation n’est pas OK.
- **Accessibilité** : `data-testid` comme indiqué dans `../tests/README.md`.

---

## PDF généré (contenu)

- **Titre** : ex. « Identifiants de connexion – KARA »
- **Matricule** : valeur du matricule du membre.
- **Identifiant** : email ou matricule (selon politique d’auth).
- **Mot de passe** : valeur du matricule (mot de passe après réinitialisation).
- Mise en page simple et lisible (voir composants PDF existants du projet, ex. `@react-pdf/renderer`).
