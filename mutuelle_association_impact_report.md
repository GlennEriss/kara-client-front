# Phrases impactées: mutuelle -> association

Total d'entrées: 124

## documentation/README.md
- Avant: Ce dossier contient toute la documentation du projet KARA Mutuelle.
- Après: Ce dossier contient toute la documentation du projet KARA Association.

## documentation/agent-de-recouvrement/ANALYSE_ALGOLIA_VS_FIRESTORE.md
- Avant: Les agents sont des employés de la mutuelle (typiquement 10-100). Algolia est conçu pour des volumes plus importants (milliers+). Firestore gère facilement ce volume.
- Après: Les agents sont des employés de l'association (typiquement 10-100). Algolia est conçu pour des volumes plus importants (milliers+). Firestore gère facilement ce volume.

## documentation/agent-de-recouvrement/README.md
- Avant: Ce document décrit le concept d'**agent de recouvrement** dans le contexte de KARA Mutuelle, ses objectifs, son utilisation et les modalités de création. Cette documentation sert de base pour l'analyse et l'implémentation de cette fonctionnalité.
- Après: Ce document décrit le concept d'**agent de recouvrement** dans le contexte de KARA Association, ses objectifs, son utilisation et les modalités de création. Cette documentation sert de base pour l'analyse et l'implémentation de cette fonctionnalité.

## documentation/agent-de-recouvrement/README.md
- Avant: Un **agent de recouvrement** est une personne chargée d'aller récupérer l'argent auprès des membres lors de l'enregistrement d'un versement. Il s'agit d'un acteur terrain qui collecte physiquement les paiements (espèces, mobile money, etc.) auprès des adhérents et rapporte ces fonds à la mutuelle.
- Après: Un **agent de recouvrement** est une personne chargée d'aller récupérer l'argent auprès des membres lors de l'enregistrement d'un versement. Il s'agit d'un acteur terrain qui collecte physiquement les paiements (espèces, mobile money, etc.) auprès des adhérents et rapporte ces fonds à l'association.

## documentation/agent-de-recouvrement/README.md
- Avant: - **Responsabilité** : L'agent est responsable des fonds collectés jusqu'à leur remise à la mutuelle
- Après: - **Responsabilité** : L'agent est responsable des fonds collectés jusqu'à leur remise à l'association

## documentation/agent-de-recouvrement/README.md
- Avant: - Un agent de recouvrement est typiquement un **employé** ou **collaborateur** de la mutuelle
- Après: - Un agent de recouvrement est typiquement un **employé** ou **collaborateur** de l'association

## documentation/agent-de-recouvrement/WORKFLOW.md
- Avant: > Objectif : un workflow **solide**, reproductible, adapté au module **Agents de Recouvrement** (KARA Mutuelle).
- Après: > Objectif : un workflow **solide**, reproductible, adapté au module **Agents de Recouvrement** (KARA Association).

## documentation/agent-de-recouvrement/use-case/UC_AgentRecouvrement.puml
- Avant: title Cas d'utilisation – Module Agent de recouvrement\nKARA Mutuelle
- Après: title Cas d'utilisation – Module Agent de recouvrement\nKARA Association

## documentation/architecture/ARCHITECTURE.md
- Avant: - Le projet s’opère pour la mutuelle KARA au **Gabon**. Les données (adresses, numéros de téléphone, documents) doivent toujours respecter les formats et références locales.
- Après: - Le projet s’opère pour l'Association KARA au **Gabon**. Les données (adresses, numéros de téléphone, documents) doivent toujours respecter les formats et références locales.

## documentation/architecture/ARCHITECTURE_RESTRUCTURATION.md
- Avant: KARA est une **mutuelle au Gabon** qui gère :
- Après: KARA est une **association au Gabon** qui gère :

## documentation/architecture/ARCHITECTURE_RESTRUCTURATION.md
- Avant: **Responsabilité** : Gérer le cycle de vie des membres de la mutuelle
- Après: **Responsabilité** : Gérer le cycle de vie des membres de l'association

## documentation/caisse-imprevue/V1/DEMANDES_CAISSE_IMPREVUE.md
- Avant: memberId?: string // Si le contact est un membre de la mutuelle
- Après: memberId?: string // Si le contact est un membre de l'association

## documentation/caisse-imprevue/V1/DEMANDES_CAISSE_IMPREVUE.md
- Avant: - Sélection d'un membre de la mutuelle comme contact d'urgence OU saisie manuelle (obligatoire)
- Après: - Sélection d'un membre de l'association comme contact d'urgence OU saisie manuelle (obligatoire)

## documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md
- Avant: ### Processus étudié : Gestion des crédits exceptionnels (Mutuelle Kara)
- Après: ### Processus étudié : Gestion des crédits exceptionnels (Association Kara)

## documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md
- Avant: 9- Enregistrer les infos du client (nom, prénom), le garant (membre de la mutuelle ou admin), le lien de parenté avec le garant, le numéro de téléphone, la cause du crédit (Équipe Kara, Garant).
- Après: 9- Enregistrer les infos du client (nom, prénom), le garant (membre de l'association ou admin), le lien de parenté avec le garant, le numéro de téléphone, la cause du crédit (Équipe Kara, Garant).

## documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md
- Avant: 20- Rémunérer le garant membre de la mutuelle (parrain) à un pourcentage variable (0% à 5%) du montant global (capital + intérêts) de chaque échéance, calculé sur maximum 7 mois (Équipe Kara, Garant).
- Après: 20- Rémunérer le garant membre de l'association (parrain) à un pourcentage variable (0% à 5%) du montant global (capital + intérêts) de chaque échéance, calculé sur maximum 7 mois (Équipe Kara, Garant).

## documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md
- Avant: 21- Calculer et attribuer automatiquement un pourcentage variable (0% à 5%, par défaut 2%) du montant global (capital + intérêts) de chaque échéance au garant membre (parrain) si c'est un membre de la mutuelle, calculé sur maximum 7 mois (Système, Garant).
- Après: 21- Calculer et attribuer automatiquement un pourcentage variable (0% à 5%, par défaut 2%) du montant global (capital + intérêts) de chaque échéance au garant membre (parrain) si c'est un membre de l'association, calculé sur maximum 7 mois (Système, Garant).

## documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md
- Avant: - Garant requis (membre ou admin de la mutuelle)
- Après: - Garant requis (membre ou admin de l'association)

## documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md
- Avant: 1. Le système vérifie si le garant est un membre de la mutuelle qui a parrainé le client
- Après: 1. Le système vérifie si le garant est un membre de l'association qui a parrainé le client

## documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md
- Avant: **Objectif** : Calculer et attribuer un pourcentage variable (0% à 5%) du montant global (capital + intérêts) au garant si c'est un membre de la mutuelle, limité à 7 mois maximum
- Après: **Objectif** : Calculer et attribuer un pourcentage variable (0% à 5%) du montant global (capital + intérêts) au garant si c'est un membre de l'association, limité à 7 mois maximum

## documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md
- Avant: - Le garant est un membre de la mutuelle (pas un admin)
- Après: - Le garant est un membre de l'association (pas un admin)

## documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md
- Avant: - Si le garant est un membre de la mutuelle (parrain), il peut recevoir une rémunération sur chaque mensualité versée.
- Après: - Si le garant est un membre de l'association (parrain), il peut recevoir une rémunération sur chaque mensualité versée.

## documentation/credit-speciale/V1/credit-speciale-classes.puml
- Avant: par la mutuelle au garant
- Après: par l'association au garant

## documentation/credit-speciale/V1/credit-speciale-usecases-admin.puml
- Avant: Si le garant est un membre de la mutuelle,
- Après: Si le garant est un membre de l'association,

## documentation/credit-speciale/V2/enregistrer-paiement-garant/README.md
- Avant: - **Enregistrer un paiement** qui prouve que la mutuelle a payé le garant : **date**, **montant**, **moyen de paiement** (Airtel Money, Mobicash, Espèce, Virement bancaire), **preuve** (fichier image/PDF), éventuellement **référence** ou **commentaire**.
- Après: - **Enregistrer un paiement** qui prouve que l'association a payé le garant : **date**, **montant**, **moyen de paiement** (Airtel Money, Mobicash, Espèce, Virement bancaire), **preuve** (fichier image/PDF), éventuellement **référence** ou **commentaire**.

## documentation/credit-speciale/V2/enregistrer-paiement-garant/README.md
- Avant: - **Manque :** Aucun moyen actuel d’enregistrer **le fait que la mutuelle a payé le garant** (date, montant, preuve, mode de paiement). Il n’existe ni champ « payé au garant » ni entité dédiée.
- Après: - **Manque :** Aucun moyen actuel d’enregistrer **le fait que l'association a payé le garant** (date, montant, preuve, mode de paiement). Il n’existe ni champ « payé au garant » ni entité dédiée.

## documentation/credit-speciale/V2/enregistrer-paiement-garant/README.md
- Avant: | **Date du paiement** | Oui         | Date à laquelle la mutuelle a payé le garant. |
- Après: | **Date du paiement** | Oui         | Date à laquelle l'association a payé le garant. |

## documentation/firebase/FIREBASE_CONFIGURATIONS.md
- Avant: # Configurations Firebase — KARA Mutuelle
- Après: # Configurations Firebase — KARA Association

## documentation/firebase/FIREBASE_MULTI_ENVIRONNEMENT.md
- Avant: # Configuration Multi-Environnement Firebase — KARA Mutuelle
- Après: # Configuration Multi-Environnement Firebase — KARA Association

## documentation/general/NEXT_STEPS.md
- Avant: # Prochaines Étapes — KARA Mutuelle
- Après: # Prochaines Étapes — KARA Association

## documentation/general/WORKFLOW.md
- Avant: # WORKFLOW.md — Workflow d'implémentation (Next.js + Firebase) — KARA Mutuelle (V1)
- Après: # WORKFLOW.md — Workflow d'implémentation (Next.js + Firebase) — KARA Association (V1)

## documentation/general/WORKFLOW.md
- Avant: **KARA** est une **mutuelle d'aide** pour les Gabonais dans le besoin et pour les associations.
- Après: **KARA** est une **association d'aide** pour les Gabonais dans le besoin et pour les associations.

## documentation/general/WORKFLOW.md
- Avant: - **Dashboard admin** pour gérer les membres de la mutuelle
- Après: - **Dashboard admin** pour gérer les membres de l'association

## documentation/general/WORKFLOW.md
- Avant: title Use Cases - KARA Mutuelle
- Après: title Use Cases - KARA Association

## documentation/general/WORKFLOW.md
- Avant: usecase "UC-MEM-001: S'inscrire à la mutuelle" as UC_REGISTER
- Après: usecase "UC-MEM-001: S'inscrire à l'association" as UC_REGISTER

## documentation/membership-requests/ANALYSE_WHATSAPP.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/membership-requests/ANALYSE_WHATSAPP.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/membership-requests/ANALYSE_WHATSAPP.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/membership-requests/ANALYSE_WHATSAPP.md
- Avant: `Cordialement,\nKARA Mutuelle`,
- Après: `Cordialement,\nKARA Association`,

## documentation/membership-requests/PLAN_NOTIFICATIONS.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/membership-requests/PLAN_NOTIFICATIONS.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/membership-requests/PLAN_NOTIFICATIONS.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/membership-requests/approbation/ENVOI_IDENTIFIANTS.md
- Avant: - Logo KARA Mutuelle
- Après: - Logo KARA Association

## documentation/membership-requests/approbation/ENVOI_IDENTIFIANTS.md
- Avant: ¦           KARA MUTUELLE                         ¦
- Après: ¦           KARA Association                         ¦

## documentation/membership-requests/approbation/ENVOI_IDENTIFIANTS.md
- Avant: ¦  L'équipe KARA Mutuelle                         ¦
- Après: ¦  L'équipe KARA Association                         ¦

## documentation/membership-requests/approbation/ENVOI_IDENTIFIANTS.md
- Avant: doc.text('KARA MUTUELLE', 105, 30, { align: 'center' })
- Après: doc.text('KARA Association', 105, 30, { align: 'center' })

## documentation/membership-requests/approbation/ENVOI_IDENTIFIANTS.md
- Avant: doc.text('L\'équipe KARA Mutuelle', 20, 217)
- Après: doc.text('L\'équipe KARA Association', 20, 217)

## documentation/membership-requests/approbation/FLUX_APPROBATION.md
- Avant: - Logo KARA Mutuelle
- Après: - Logo KARA Association

## documentation/membership-requests/approbation/GESTION_IDENTIFIANTS.md
- Avant: Votre demande d'adhésion a été approuvée ! Vous êtes maintenant membre de KARA Mutuelle.
- Après: Votre demande d'adhésion a été approuvée ! Vous êtes maintenant membre de KARA Association.

## documentation/membership-requests/approbation/GESTION_IDENTIFIANTS.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/membership-requests/approbation/test/TESTS_UNITAIRES.md
- Avant: expect(pdfText).toContain('KARA Mutuelle')
- Après: expect(pdfText).toContain('KARA Association')

## documentation/membership-requests/approbation/test/TESTS_UNITAIRES.md
- Avant: companyName: 'KARA Mutuelle',
- Après: companyName: 'KARA Association',

## documentation/membership-requests/approbation/test/TESTS_UNITAIRES.md
- Avant: expect(getByTestId('approval-modal-company-name')).toHaveTextContent('KARA Mutuelle')
- Après: expect(getByTestId('approval-modal-company-name')).toHaveTextContent('KARA Association')

## documentation/membership-requests/approbation/wireframes/APPROVAL_MODAL_STATES.md
- Avant: ¦  ¦  ¦ Nom: KARA Mutuelle                                 ¦  ¦  ¦
- Après: ¦  ¦  ¦ Nom: KARA Association                                 ¦  ¦  ¦

## documentation/membership-requests/rejet/ACTIONS_POST_REJET.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/membership-requests/rejet/FLUX_REJET.md
- Avant: - Signature : KARA Mutuelle
- Après: - Signature : KARA Association

## documentation/membership-requests/rejet/FLUX_REJET.md
- Avant: `Cordialement,\nKARA Mutuelle`
- Après: `Cordialement,\nKARA Association`

## documentation/membership-requests/rejet/activite/Rejeter.puml
- Avant: - Template KARA Mutuelle;
- Après: - Template KARA Association;

## documentation/membership-requests/rejet/functions/onMembershipRequestRejected.md
- Avant: // L'équipe KARA Mutuelle
- Après: // L'équipe KARA Association

## documentation/membership-requests/rejet/functions/onMembershipRequestRejected.md
- Avant: // const smsMessage = `Bonjour ${firstName},\n\nVotre demande d'adhésion KARA (${matricule}) a été rejetée.\n\nMotif: ${motifReject}\n\nCordialement, KARA Mutuelle`
- Après: // const smsMessage = `Bonjour ${firstName},\n\nVotre demande d'adhésion KARA (${matricule}) a été rejetée.\n\nMotif: ${motifReject}\n\nCordialement, KARA Association`

## documentation/membership-requests/rejet/functions/onMembershipRequestRejected.md
- Avant: L'équipe KARA Mutuelle
- Après: L'équipe KARA Association

## documentation/membership-requests/rejet/functions/onMembershipRequestRejected.md
- Avant: <p>Cordialement,<br>L'équipe KARA Mutuelle</p>
- Après: <p>Cordialement,<br>L'équipe KARA Association</p>

## documentation/membership-requests/rejet/functions/onMembershipRequestRejected.md
- Avant: Cordialement, KARA Mutuelle
- Après: Cordialement, KARA Association

## documentation/membership-requests/rejet/notification/README.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/membership-requests/rejet/wireframes/MODAL_WHATSAPP_REJET.md
- Avant: ¦ ¦ ¦ KARA Mutuelle                                       ¦ ¦ ¦
- Après: ¦ ¦ ¦ KARA Association                                       ¦ ¦ ¦

## documentation/membership-requests/rejet/wireframes/MODAL_WHATSAPP_REJET.md
- Avant: ¦ ¦ ¦ KARA Mutuelle                                       ¦ ¦ ¦
- Après: ¦ ¦ ¦ KARA Association                                       ¦ ¦ ¦

## documentation/membership-requests/rejet/wireframes/MODAL_WHATSAPP_REJET.md
- Avant: KARA Mutuelle`
- Après: KARA Association`

## documentation/membership-requests/rejet/wireframes/MODAL_WHATSAPP_REJET.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/membership-requests/rejet/wireframes/MODAL_WHATSAPP_REJET.md
- Avant: KARA Mutuelle
- Après: KARA Association

## documentation/placement/placement.md
- Avant: ## Processus étudié : Gestion des placements (Mutuelle Kara)
- Après: ## Processus étudié : Gestion des placements (Association Kara)

## documentation/tests/RAPPORT_ACCESSIBILITE.md
- Avant: - **h1** : « KARA Mutuelle de Solidarité »
- Après: - **h1** : « KARA Association de Solidarité »

## documentation/uml/README.md
- Avant: # Documentation UML — KARA Mutuelle
- Après: # Documentation UML — KARA Association

## documentation/uml/README.md
- Avant: - `UC-MEM-001: S'inscrire à la mutuelle`
- Après: - `UC-MEM-001: S'inscrire à l'association`

## documentation/uml/use-cases/USE_CASES_COMPLETS.puml
- Avant: title Use Cases Complets - KARA Mutuelle\n(Niveau Architecte Senior)
- Après: title Use Cases Complets - KARA Association\n(Niveau Architecte Senior)

## documentation/uml/use-cases/USE_CASES_COMPLETS.puml
- Avant: usecase "UC-MEM-001: S'inscrire à la mutuelle\n(formulaire public)" as UC_REGISTER
- Après: usecase "UC-MEM-001: S'inscrire à l'association\n(formulaire public)" as UC_REGISTER

## documentation/vehicule/FORMULAIRE_ASSURANCE_VEHICULE.md
- Avant: - **"Membre KARA"** : Pour les membres de la mutuelle
- Après: - **"Membre KARA"** : Pour les membres de l'association

## e2e/README.md
- Avant: # Tests E2E - KARA Mutuelle
- Après: # Tests E2E - KARA Association

## src/app/(admin)/contracts-history/page.tsx
- Avant: ADHESION: 'Adhésion Mutuelle',
- Après: ADHESION: 'Adhésion association',

## src/components/auth/AuthLayout.tsx
- Avant: footerText = "© 2025 KARA - Mutuelle de Solidarité"
- Après: footerText = "© 2025 KARA - association de Solidarité"

## src/components/caisse-imprevue/ContractCIView.tsx
- Avant: MUTUELLE KARA
- Après: Association KARA

## src/components/caisse-imprevue/ContractCIView.tsx
- Avant: <li><b>L&apos;adhérent :</b> Est un membre de la mutuelle qui souscrit au Volet Entraide.</li>
- Après: <li><b>L&apos;adhérent :</b> Est un membre de l'association qui souscrit au Volet Entraide.</li>

## src/components/caisse-speciale/CaisseSpecialePDFV2.tsx
- Avant: * Nouveau document conforme au modèle officiel de la mutuelle
- Après: * Nouveau document conforme au modèle officiel de l'association

## src/components/caisse-speciale/CaisseSpecialeSimulationPage.tsx
- Avant: 'KARA - Mutuelle de solidarite',
- Après: 'KARA - Association de solidarite',

## src/components/credit-speciale/AdhesionCreditSpecialeV2.tsx
- Avant: Je soussigné M/Mme/Mlle <Text style={styles.bold}>{member.lastName.toUpperCase()} {member.firstName}</Text> de nationalité <Text style={styles.bold}>{member.nationality}</Text> membre de l'Association <Text style={styles.bold}>LE KARA</Text> par la présente, je reconnais avoir reçu de la mutuelle un accompagnement financier, conformément aux dispositions du règlement intérieur, d'un montant de
- Après: Je soussigné M/Mme/Mlle <Text style={styles.bold}>{member.lastName.toUpperCase()} {member.firstName}</Text> de nationalité <Text style={styles.bold}>{member.nationality}</Text> membre de l'Association <Text style={styles.bold}>LE KARA</Text> par la présente, je reconnais avoir reçu de l'association un accompagnement financier, conformément aux dispositions du règlement intérieur, d'un montant de

## src/components/credit-speciale/AdhesionCreditSpecialeV3.tsx
- Avant: de nationalité <Text style={{ fontWeight: 'bold' }}>{member.nationality} </Text>Membre de l’Association LE KARA par la présente, je reconnais avoir reçu de la mutuelle un accompagnement financier, conformément aux dispositions du règlement intérieur, d’un montant de :
- Après: de nationalité <Text style={{ fontWeight: 'bold' }}>{member.nationality} </Text>Membre de l’Association LE KARA par la présente, je reconnais avoir reçu de l'association un accompagnement financier, conformément aux dispositions du règlement intérieur, d’un montant de :

## src/components/credit-speciale/ContractCreationModal.tsx
- Avant: <strong>{demand.guarantorFirstName} {demand.guarantorLastName}</strong> est un membre de la mutuelle et recevra une rémunération sur chaque échéance (calculée sur le reste dû, maximum 7 mois).
- Après: <strong>{demand.guarantorFirstName} {demand.guarantorLastName}</strong> est un membre de l'association et recevra une rémunération sur chaque échéance (calculée sur le reste dû, maximum 7 mois).

## src/components/credit-speciale/CreditContractDetail.tsx
- Avant: Le garant n'est pas un membre de la mutuelle. Seuls les garants qui sont des membres de la mutuelle peuvent recevoir une commission.
- Après: Le garant n'est pas un membre de l'association. Seuls les garants qui sont des membres de l'association peuvent recevoir une commission.

## src/components/credit-speciale/CreditSpecialeContractPDF.tsx
- Avant: Je soussigné M/Mme/Mlle <Text style={styles.bold}>{member.lastName.toUpperCase()} {member.firstName}</Text> de nationalité <Text style={styles.bold}>{getNationalityName(member.nationality)}</Text> membre de l'Association <Text style={styles.bold}>LE KARA</Text> par la présente, je reconnais avoir reçu de la mutuelle un accompagnement financier, conformément aux dispositions du règlement intérieur, d'un montant de
- Après: Je soussigné M/Mme/Mlle <Text style={styles.bold}>{member.lastName.toUpperCase()} {member.firstName}</Text> de nationalité <Text style={styles.bold}>{getNationalityName(member.nationality)}</Text> membre de l'Association <Text style={styles.bold}>LE KARA</Text> par la présente, je reconnais avoir reçu de l'association un accompagnement financier, conformément aux dispositions du règlement intérieur, d'un montant de

## src/components/filleuls/FilleulsList.tsx
- Avant: doc.text('Mutuelle KARA', marginX, 25)
- Après: doc.text('Association KARA', marginX, 25)

## src/components/homepage/homepage.tsx
- Avant: Mutuelle de Solidarité
- Après: association de Solidarité

## src/components/homepage/homepage.tsx
- Avant: Découvrez l'histoire et les valeurs qui animent notre mutuelle
- Après: Découvrez l'histoire et les valeurs qui animent notre association

## src/components/homepage/homepage.tsx
- Avant: fullText="Née du désir profond des jeunes d'Awoungou de créer un espace d'entraide, de partage et de solidarité, la mutuelle KARA est une association gabonaise à but non lucratif s'inscrivant dans une démarche purement sociale."
- Après: fullText="Née du désir profond des jeunes d'Awoungou de créer un espace d'entraide, de partage et de solidarité, l'Association KARA est une association gabonaise à but non lucratif s'inscrivant dans une démarche purement sociale."

## src/components/homepage/homepage.tsx
- Avant: Nous croyons que chaque membre a quelque chose à donner, c'est pourquoi la mutuelle KARA s'ouvre au monde par les actions charitables auprès des nécessiteux.
- Après: Nous croyons que chaque membre a quelque chose à donner, c'est pourquoi l'Association KARA s'ouvre au monde par les actions charitables auprès des nécessiteux.

## src/components/homepage/homepage.tsx
- Avant: Comme toute association, Kara vit des cotisations mensuelles de ses membres et du soutien des bénévoles. À travers l'entraide mensuelle, chacun participe activement au fonctionnement régulier de notre mutuelle.
- Après: Comme toute association, Kara vit des cotisations mensuelles de ses membres et du soutien des bénévoles. À travers l'entraide mensuelle, chacun participe activement au fonctionnement régulier de notre association.

## src/components/homepage/homepage.tsx
- Avant: fullText="La Caisse spéciale est un fond volontaire destiné à encourager l'épargne volontaire et l'autonomie de chaque membre. En contrepartie des versements mensuels, la mutuelle KARA assure la conservation et la mise à disposition de ces fonds aux épargnants en cas de besoin."
- Après: fullText="La Caisse spéciale est un fond volontaire destiné à encourager l'épargne volontaire et l'autonomie de chaque membre. En contrepartie des versements mensuels, l'Association KARA assure la conservation et la mise à disposition de ces fonds aux épargnants en cas de besoin."

## src/components/homepage/homepage.tsx
- Avant: Pour obtenir des informations supplémentaires et discuter amplement avec les représentants de la mutuelle KARA, contactez le secrétaire général.
- Après: Pour obtenir des informations supplémentaires et discuter amplement avec les représentants de l'Association KARA, contactez le secrétaire général.

## src/components/homepage/homepage.tsx
- Avant: Une mutuelle gabonaise à but non lucratif dédiée à la solidarité active et à l'entraide communautaire.
- Après: Une association gabonaise à but non lucratif dédiée à la solidarité active et à l'entraide communautaire.

## src/components/homepage/homepage.tsx
- Avant: <p className="text-gray-300">© 2025 KARA - Mutuelle de Solidarité. Tous droits réservés.</p>
- Après: <p className="text-gray-300">© 2025 KARA - association de Solidarité. Tous droits réservés.</p>

## src/components/login/LoginMembershipWithEmailAndPassword.tsx
- Avant: alt="KARA - Mutuelle de Solidarité"
- Après: alt="KARA - association de Solidarité"

## src/components/logo/LogoSVG.tsx
- Avant: KARA Logo - Mutuelle KARA
- Après: KARA Logo - Association KARA

## src/components/register/Step5.tsx
- Avant: `Bonjour, je viens de soumettre ma demande d'inscription à la mutuelle Kara. Je vous envoie la capture d'écran de mon transfert de 10300 FCFA via ${currentProvider} pour finaliser mon inscription.`
- Après: `Bonjour, je viens de soumettre ma demande d'inscription à l'Association Kara. Je vous envoie la capture d'écran de mon transfert de 10300 FCFA via ${currentProvider} pour finaliser mon inscription.`

## src/components/register/Step5.tsx
- Avant: Votre demande d'inscription à la <strong>Mutuelle Kara</strong> a été enregistrée
- Après: Votre demande d'inscription à l'<strong>Association Kara</strong> a été enregistrée

## src/components/register/Step5.tsx
- Avant: Pour activer votre mutuelle, veuillez suivre ces 3 étapes simples :
- Après: Pour activer votre association, veuillez suivre ces 3 étapes simples :

## src/components/register/Step5.tsx
- Avant: "Bonjour, je viens de soumettre ma demande d'inscription à la mutuelle Kara.
- Après: "Bonjour, je viens de soumettre ma demande d'inscription à l'Association Kara.

## src/components/register/Step5.tsx
- Avant: Bienvenue dans la famille <strong>Mutuelle Kara</strong>.
- Après: Bienvenue dans la famille <strong>Association Kara</strong>.

## src/constantes/membership-requests.ts
- Avant: `Cordialement,\nKARA Mutuelle`,
- Après: `Cordialement,\nKARA Association`,

## src/constantes/membership-requests.ts
- Avant: `Cordialement,\nKARA Mutuelle`,
- Après: `Cordialement,\nKARA Association`,

## src/constantes/membership-requests.ts
- Avant: `Cordialement,\nKARA Mutuelle`,
- Après: `Cordialement,\nKARA Association`,

## src/domains/auth/registration/components/RegistrationFormV2.tsx
- Avant: <span className="text-sm font-medium text-slate-600">Mutuelle Kara</span>
- Après: <span className="text-sm font-medium text-slate-600">Association Kara</span>

## src/domains/auth/registration/components/steps/SuccessStepV2.tsx
- Avant: `Bonjour, je viens de soumettre ma demande d'inscription à la mutuelle Kara. Je vous envoie la capture d'écran de mon transfert de 10300 FCFA via ${currentProvider} pour finaliser mon inscription.`
- Après: `Bonjour, je viens de soumettre ma demande d'inscription à l'Association Kara. Je vous envoie la capture d'écran de mon transfert de 10300 FCFA via ${currentProvider} pour finaliser mon inscription.`

## src/domains/auth/registration/components/steps/SuccessStepV2.tsx
- Avant: Votre demande à la <strong>Mutuelle Kara</strong> a été enregistrée
- Après: Votre demande à l'<strong>Association Kara</strong> a été enregistrée

## src/domains/auth/registration/components/steps/SuccessStepV2.tsx
- Avant: Pour activer votre mutuelle, veuillez effectuer le paiement :
- Après: Pour activer votre association, veuillez effectuer le paiement :

## src/domains/auth/registration/components/steps/SuccessStepV2.tsx
- Avant: <span className="text-sm">Bienvenue dans la famille <strong>Mutuelle Kara</strong></span>
- Après: <span className="text-sm">Bienvenue dans la famille <strong>Association Kara</strong></span>

## src/domains/financial/caisse-imprevue/entities/subscription.types.ts
- Avant: memberId?: string // Si le contact est un membre de la mutuelle
- Après: memberId?: string // Si le contact est un membre de l'association

## src/domains/memberships/__tests__/unit/utils/correctionUtils.test.ts
- Avant: expect(message).toContain('KARA Mutuelle')
- Après: expect(message).toContain('KARA Association')

## src/domains/memberships/__tests__/unit/utils/whatsappUrl.test.ts
- Avant: expect(decodedUrl).toContain('KARA Mutuelle')
- Après: expect(decodedUrl).toContain('KARA Association')

## src/domains/memberships/components/IdentifiantsMembrePDF.tsx
- Avant: Mutuelle KARA – Document à remettre au membre
- Après: Association KARA – Document à remettre au membre

## src/domains/memberships/components/modals/RejectWhatsAppModalV2.tsx
- Avant: KARA Mutuelle`
- Après: KARA Association`

## src/domains/memberships/utils/correctionUtils.ts
- Avant: KARA Mutuelle`
- Après: KARA Association`

## src/domains/memberships/utils/whatsappUrl.ts
- Avant: KARA Mutuelle`
- Après: KARA Association`

## src/schemas/schemas.ts
- Avant: 'Mutuelle santé',
- Après: 'association santé',

## src/services/credit-speciale/ICreditSpecialeService.ts
- Avant: // Paiement au garant (preuve du versement effectué par la mutuelle)
- Après: // Paiement au garant (preuve du versement effectué par l'association)

## src/types/types.ts
- Avant: * Enregistrement du paiement effectué par la mutuelle au garant (preuve de versement de la commission)
- Après: * Enregistrement du paiement effectué par l'association au garant (preuve de versement de la commission)

## src/utils/pdfGenerator.ts
- Avant: doc.text('KARA Mutuelle', margin, 30)
- Après: doc.text('KARA Association', margin, 30)

