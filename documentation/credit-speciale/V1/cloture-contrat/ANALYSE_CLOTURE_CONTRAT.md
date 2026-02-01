# Analyse – Clôture de contrat (Crédit spéciale)

## Contexte

Ce document décrit le flux de clôture d'un contrat de crédit spéciale lorsque le montant restant atteint 0. **Le passage à DISCHARGED n'est pas automatique** : l'admin doit valider manuellement le remboursement final.

## Déclencheur

Quand **MONTANT RESTANT = 0** sur la fiche contrat, une nouvelle section apparaît (juste avant la section Documents) avec un bouton **« Remboursement final »**.

## Flux en deux phases

### Phase 1 : Remboursement final (Décharge)

1. **Affichage** : Bouton « Remboursement final » visible lorsque montant restant = 0
2. **Action** : L'admin clique sur « Remboursement final »
3. **Modal** : S'ouvre avec :
   - Message : « Acceptez-vous de valider le remboursement final de l'emprunt du membre [nom prénom] ? »
   - Champ **motif** (obligatoire)
   - Bouton « Valider le remboursement final »
4. **Validation** : L'admin saisit le motif et valide
5. **Résultat** :
   - Statut du contrat → **DISCHARGED**
   - Affichage dans la section : motif donné, admin déchargeur, date de décharge

### Phase 2 : Clôture du contrat (Quittance signée)

Après décharge, un formulaire apparaît dans la section « Déchargé » :

1. **Bouton « Télécharger la quittance »**  
   - Génère un PDF à partir du template `QUITTANCE_CREDIT_SPECIALE.docx` prérempli avec les infos du contrat (pour que le membre la signe)  
   - L'admin envoie la quittance remplie au membre (WhatsApp, mail, impression)

2. **Workflow externe** : Le membre signe la quittance et la renvoie à l'admin

3. **Bouton « Téléverser la quittance signée »**  
   - L'admin upload le PDF signé par le membre

4. **Formulaire de clôture** :
   - **Date de clôture** : défaut = aujourd'hui, modifiable (ex. membre a signé hier)
   - **Heure** : défaut = heure actuelle
   - **Motif de clôture** : obligatoire
   - **Bouton « Clôturer le contrat »**

5. **Double validation** : À l'appui sur « Clôturer », modal : « Êtes-vous d'accord pour clôturer ce contrat ? »

6. **Résultat** :
   - Statut du contrat → **CLOSED**
   - Affichage : admin clôturant, date de clôture
   - Section Documents : bouton « Quittance signée » affiché après « Contrat signé »

## Règles métier

- **Augmenter le crédit** : Le bouton doit être **désactivé** lorsque le contrat est DISCHARGED ou CLOSED.

## Cas d'utilisation

| UC | Nom | Acteur |
|----|-----|--------|
| UC_ValiderRemboursementFinal | Valider le remboursement final (décharge) | Admin |
| UC_TelechargerQuittance | Télécharger la quittance remplie | Admin |
| UC_TeleverserQuittanceSignee | Téléverser la quittance signée | Admin |
| UC_CloturerContrat | Clôturer le contrat | Admin |

## Diagrammes

- Use case : [`use-case/UC_ClotureContrat.puml`](./use-case/UC_ClotureContrat.puml)
- Activité : [`activity/UC_ClotureContrat_activity.puml`](./activity/UC_ClotureContrat_activity.puml)
- Séquence : [`sequence/UC_ClotureContrat_sequence.puml`](./sequence/UC_ClotureContrat_sequence.puml) (architecture domains)
- Classes : [`documentation/uml/classes/CLASSES_CREDIT_SPECIALE.puml`](../../../uml/classes/CLASSES_CREDIT_SPECIALE.puml) (CreditContract, services, hooks mis à jour)

## Workflow d'implémentation

Guide complet pour l'implémentation : [`WORKFLOW.md`](./WORKFLOW.md)

- Branche : `feat/credit-speciale-cloture-contrat`
- 18 tâches avec diagrammes à consulter avant chaque tâche
- Cursor Skills associés à chaque tâche
- Référence au dossier [`firebase/`](./firebase/) pour les règles et index

## Firebase

Configuration Firestore et Storage pour ce use case :

- **Vue d'ensemble** : [`firebase/README.md`](./firebase/README.md)
- **Règles Firestore** : [`firebase/FIRESTORE_RULES.md`](./firebase/FIRESTORE_RULES.md) (transitions DISCHARGED, CLOSED)
- **Règles Storage** : [`firebase/STORAGE_RULES.md`](./firebase/STORAGE_RULES.md) (quittances PDF)
- **Index Firestore** : [`firebase/INDEXES.md`](./firebase/INDEXES.md)
