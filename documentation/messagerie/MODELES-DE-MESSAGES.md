# Modèles de messages WhatsApp

La section **Système → Modèles de messages** permet de personnaliser les textes déjà utilisés dans les parcours de l’administration. Les variables entre doubles accolades sont remplacées par les données réelles. Les clés absentes dans la configuration Firebase utilisent immédiatement le texte fourni par l’application, sans migration ni enregistrement préalable.

Le catalogue couvre les anniversaires, rappels et préavis de versement, placements, assurances et adhésions, ainsi que :

- les invitations aux événements publiés ;
- les invitations aux collectes publiques du module Bienfaiteur ;
- le bloc facultatif permettant de contribuer en argent ou en nature ;
- les relances d’accords entre membres dans un groupe ;
- les simulations de crédit calculées et personnalisées ;
- les simulations fixe / aide ;
- les simulations de caisse spéciale avec bonus et dates de remise.

Le bloc de contribution n’est préparé que si l’option est cochée et qu’une collecte visible est disponible. Les messages personnalisés s’appliquent aussi à l’aperçu et à la copie depuis l’invitation. Les échéanciers restent construits à partir des montants de la simulation : le modèle modifie leur présentation et ne modifie aucun calcul.

Une invitation ou une relance ouvre un brouillon WhatsApp. Le gestionnaire choisit le destinataire et confirme l’envoi dans WhatsApp. L’application ne confirme ni l’envoi ni la réception. Les messages initiés depuis le portail membre pour contacter KARA restent distincts de ces modèles d’administration.

Les invitations, leur bloc de contribution et les demandes de correction d’adhésion disposent d’un champ **URL du site pour les liens**. Il remplace l’adresse de base des liens générés en conservant les chemins, identifiants, paramètres et fragments propres au dossier ou à l’événement. HTTPS est exigé (HTTP local autorisé pour le développement), sans identifiant, paramètres ou fragment sur l’adresse de base. L’aperçu, le brouillon WhatsApp et les corrections envoyées depuis les adhésions utilisent cette adresse. Un champ vide rétablit le site habituel. Les personnalisations des textes et adresses sont remplacées par champ lors de l’enregistrement, afin qu’un retour au défaut reste effectif après rechargement.
