## Diagrammes d'activité – Générer identifiant (V2)

Ce dossier contient les **diagrammes d'activité** (PlantUML) décrivant le flux de la fonctionnalité « Générer identifiant » / réinitialisation du mot de passe.

### Diagrammes disponibles

- **`main.puml`** : flux principal depuis la liste des membres jusqu’à la génération du PDF (ouverture du modal, saisie du matricule, validation, mise à jour mot de passe, génération PDF).

### Scénarios couverts

- Clic sur « Générer identifiant » → ouverture du modal.
- Saisie du matricule : bouton « Accepter » désactivé tant que la saisie ne correspond pas au matricule du membre.
- Acceptation → mise à jour du mot de passe (côté serveur) puis génération et téléchargement du PDF.
- Cas d’erreur : échec de la mise à jour du mot de passe → message d’erreur, modal reste ouvert.

### Référence

- Spécification fonctionnelle : `../README.md`
- Séquence (architecture domains) : `../sequence/SEQ_GenererIdentifiant.puml`
