# Gestion financière native LE KARA

Les routes mobiles `/finance/caisse-speciale`, `/finance/caisse-imprevue` et `/finance/credit-speciale` sont des écrans React Native. Les dossiers et les formulaires de paiement n'utilisent ni navigateur ni WebView. Les anciens liens `/tools` de ces trois activités sont redirigés vers les écrans natifs.

## Parcours disponibles

| Activité | Parcours |
| --- | --- |
| Commun | Listes de demandes et contrats, recherche, filtres de statut, pagination, détails, historique, validation des demandes, création du contrat, documents signés, reçus, contrats et quittances PDF, exports PDF/Excel |
| Caisse spéciale | Contrat individuel ou groupe, types standard/journalière/libre et variantes charitables, contributions et corrections, suppression dans l'ordre métier, bonus, paramètres, simulation, déclarations de membres, retraits anticipés et remboursements finaux |
| Caisse imprévue | Demandes V2 et réouverture, forfaits et changement de forfait, versements répartis sur plusieurs échéances, corrections et suppressions, aides, remboursement des aides par versement, documents soumis par le membre, retraits et remboursements |
| Crédit spécial | Demandes, simulations standard/personnalisée/par durée, échéancier, paiements et corrections, pénalités, repos, rémunération et règlements du garant, augmentation, phase fixe, décharge, quittance signée/remplacement, clôture, perte et recouvrements, manque à gagner, règlement vendeur et livraison |

Les migrations Excel et les outils de maintenance globaux du site ne font pas partie de ces parcours transactionnels. Le tableau de bord analytique étendu et le planning de relances conservent leur intégration existante ; ils ne sont pas remplacés par cette évolution des trois sections financières.

## Frontière serveur

- `GET /api/mobile/finance/[module]` : listes et actions autorisées.
- `GET /api/mobile/finance/[module]/[id]?kind=contract|demand|settings` : dossier, historique et actions.
- `GET /api/mobile/finance/[module]/lookups` : choix de membres, agents et dossiers appartenant au contrat.
- `POST /api/mobile/finance/[module]/[id]` : formulaire multipart (`action`, `operationId`, `payload`, fichiers). Le serveur définit l'acteur depuis le jeton Firebase vérifié, jamais depuis les champs.
- `GET /api/mobile/finance/[module]/[id]/file` : document autorisé transmis en base64 au lecteur/partage natif. Les fichiers sont issus du dossier et du bucket du projet, sans URL arbitraire fournie par le téléphone.

Les permissions sont rechargées à chaque requête. Les écritures exigent le droit de l'action et bloquent le changement obligatoire du mot de passe. Les identifiants de paiements, pénalités et versements au garant sont vérifiés dans le contrat demandé. Les suppressions de contrats et clôtures en perte restent réservées au superadmin. Le rôle AgentRecouvrement conserve ses restrictions de montants et ses parcours existants.

Chaque saisie porte une clé d'idempotence et un verrou de dossier. Un résultat terminé peut être relu sans exécuter à nouveau le paiement. Une opération échouée ou interrompue n'est pas rejouée automatiquement : contrôler son historique et les documents `mobileFinanceOperations` / `mobileFinanceLocks` avant toute régularisation administrative. Ces collections restent interdites aux clients par les règles Firestore par défaut ; seules les API Admin y écrivent.

Les services métier et repositories existants reçoivent des dépendances propres à la requête. Le site conserve leurs dépendances navigateur par défaut. Aucune session Firebase navigateur ni rôle global n'est modifié par une requête mobile. Les créations financières ne remplacent pas silencieusement un document ayant déjà le même identifiant.

Les preuves sont limitées à 8 Mo par fichier et 20 Mo par formulaire ; les types et signatures PDF/JPEG/PNG/WebP sont contrôlés. Le formulaire natif affiche un récapitulatif avant confirmation. Les reçus et modèles contractuels réutilisent les générateurs du site.

## Validation

Les tests métier, de permissions, de reprise, les documents PDF et les parcours des trois sections sont testés avec des données fictives. Les intégrations CS/CI/crédit tournent uniquement avec `FIRESTORE_EMULATOR_HOST=127.0.0.1:8189` et le projet `demo-kara-native-finance`, jamais avec la base de production.

Aucun build APK n'est autorisé sans demande explicite de l'utilisateur. Les tests navigateur et l'émulateur Firestore ne constituent pas une validation du nouveau binaire Android/iOS ; la sélection native de fichiers et le lecteur du téléphone devront être contrôlés dans le prochain binaire autorisé.
