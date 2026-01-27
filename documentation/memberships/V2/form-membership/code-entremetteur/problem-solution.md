# Problématique et Solution : Saisie du Code Entremetteur

## Contexte
Actuellement, lors de l'ajout d'un membre via le formulaire administratif (`/memberships/add`), l'étape 1 ("Informations d'identité") demande la saisie du **Code Entremetteur** (ou code de parrainage).

Ce champ est implémenté comme un simple champ texte (`<Input />`) demandant un format spécifique (ex: `XXXX.MK.XXXX`).

## Implémentation Actuelle (Step 1)

Dans le code actuel (visible dans `Step1.tsx` et `IdentityStepV2.tsx`), le champ est un input standard :

```tsx
<Label>Qui vous a référé?</Label>
<Input
  {...register('identity.intermediaryCode')}
  placeholder="Ex: 1228.MK.0058"
/>
<p>Format : XXXX.MK.XXXX</p>
```

## Les Inconvénients (La Douleur)

Cette implémentation pose un problème d'expérience utilisateur majeur pour l'administrateur :

1.  **Flux de travail interrompu** : L'admin ne connaît pas le code par cœur.
2.  **Navigation fastidieuse** :
    *   L'admin doit ouvrir un nouvel onglet.
    *   Aller dans la liste des membres.
    *   Rechercher le membre entremetteur par son nom.
    *   Copier son code unique.
    *   Revenir sur l'onglet du formulaire.
    *   Coller le code.
3.  **Risques d'erreurs** :
    *   Erreur de copie (espace en trop, caractère manquant).
    *   Erreur de format.
    *   Confusion entre deux membres portant le même nom si on ne vérifie pas attentivement.
4.  **Perte de temps** : Ce qui devrait prendre 2 secondes en prend 30 à 60.

## Solution Proposée

Pour résoudre ce problème, nous recommandons de remplacer le champ texte simple par un **composant de recherche avec autocomplétion** (Combobox ou AsyncSelect).

### Fonctionnement suggéré :
1.  L'admin commence à taper le **nom** ou le **prénom** de l'entremetteur dans le champ.
2.  Le système effectue une recherche en temps réels parmi les membres existants.
3.  Une liste de résultats s'affiche avec : `Nom Prénom (Code Entremetteur)`.
4.  L'admin sélectionne la bonne personne.
5.  Le système remplit automatiquement le champ `intermediaryCode` (et potentiellement stocke l'ID de l'entremetteur pour une liaison plus robuste).

### Bénéfices :
*   **Rapidité** : Plus besoin de changer de page.
*   **Fiabilité** : Impossible de se tromper de code ou de format.
*   **Confort** : L'admin reste concentré sur sa tâche de saisie.
