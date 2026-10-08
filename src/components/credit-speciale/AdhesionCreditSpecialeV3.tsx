'use client'

import {
  EMPTY,
  FieldTable,
  MutuelleHeader,
  MutuellePageChrome,
  MutuelleSection,
  MutuelleSignatureRow,
  collectDocumentFields,
  field,
  formatAmount,
  formatDate,
  fullNameFrom,
  mutuelleStyles as styles,
  numberToWords,
  readField,
  toDate,
  type DocumentCompletion,
  type DocumentField,
  type FieldRow,
  type MutuelleSigner,
} from '@/components/pdf/mutuelle/MutuelleDocumentKit'
import { calculateAgeFromBirthDate, getIdentityDocumentLabel } from '@/components/pdf/MemberInfoRows'
import { getNationalityName } from '@/constantes/nationality'
import type { CreditContract } from '@/types/types'
import { addContractMonths } from '@/utils/contract-months'
import { calculateSchedule } from '@/utils/credit-speciale-calculations'
import { computeWeeklyCreditTotals, formatCreditDuration, isWeeklyCredit, splitFlatInstallments } from '@/utils/credit-weekly'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

/**
 * Contrat de crédit (spécial, fixe ou aide) : reconnaissance de dette,
 * protocole d'accompagnement et acte de cautionnement solidaire.
 *
 * Mise en forme alignée sur les actes de la Mutuelle (modèle LIQUIDATION.docx :
 * en-tête LE KARA, sections sur bandeau, tableaux et signatures). Contrairement
 * aux contrats de caisse, les clauses ne renvoient pas au Règlement intérieur :
 * elles fondent l'engagement du débiteur et de sa caution et sont reprises mot
 * pour mot.
 */

const localStyles = StyleSheet.create({
  amount: { fontSize: 9.4, textAlign: 'center', marginBottom: 2 },
  actTitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#1f4f68',
    textDecoration: 'underline',
    marginBottom: 8,
  },
  checkboxRow: { flexDirection: 'row', marginLeft: 12, marginBottom: 4 },
  checkboxItem: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  checkbox: { width: 9, height: 9, border: '1px solid #1f2937', marginRight: 5, alignItems: 'center', justifyContent: 'center' },
  checkmark: { width: 5, height: 5, backgroundColor: '#1f2937' },
  scheduleHead: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderLeft: '1px solid #cbd5e1',
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
  },
  scheduleCell: { flex: 1, paddingVertical: 2, paddingHorizontal: 4, fontSize: 8.6, textAlign: 'center' },
  scheduleBand: { backgroundColor: '#f8fafc' },
})

export interface AdhesionCreditSpecialeFillData {
  memberSignature: string | null
  secretarySignature: string | null
  guarantorSignature: string | null
  accompanimentType: 'EXCEPTIONNEL' | 'REGULIER' | null
  reconnaissanceCity: string
  reconnaissanceDate: string
  sanctionsCity: string
  sanctionsDate: string
}

export const EMPTY_ADHESION_CREDIT_SPECIALE_FILL_DATA: AdhesionCreditSpecialeFillData = {
  memberSignature: null,
  secretarySignature: null,
  guarantorSignature: null,
  accompanimentType: null,
  reconnaissanceCity: '',
  reconnaissanceDate: '',
  sanctionsCity: '',
  sanctionsDate: '',
}

interface AdhesionCreditSpecialeV3Props {
  contract: CreditContract
  memberData?: any
  guarantorData?: any
  fillData?: AdhesionCreditSpecialeFillData
  completion?: DocumentCompletion | null
}

const Checkbox = ({ checked, label }: { checked: boolean; label: string }) => (
  <View style={localStyles.checkboxItem}>
    <View style={localStyles.checkbox}>{checked ? <View style={localStyles.checkmark} /> : null}</View>
    <Text>{label}</Text>
  </View>
)

type CreditContractInput = Omit<AdhesionCreditSpecialeV3Props, 'fillData' | 'completion'>

/** Champs des tableaux d'identification, partagés avec la modale pour la saisie des informations manquantes. */
export const buildCreditContractFields = ({ contract, memberData, guarantorData }: CreditContractInput) => {
  const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')
  const memberPhones: string[] = (memberData?.contacts?.length ? memberData.contacts : contract.clientContacts ?? []).filter(Boolean)
  const guarantorAddress = guarantorData?.address && typeof guarantorData.address === 'object'
    ? guarantorData.address.district || guarantorData.address.city || ''
    : String(guarantorData?.address ?? '')

  return {
    member: [
      [
        field('member.lastName', 'Nom(s) :', String(memberData?.lastName || contract.clientLastName || '').toUpperCase()),
        field('member.firstName', 'Prénom(s) :', memberData?.firstName || contract.clientFirstName),
      ],
      [
        field('member.matricule', 'Matricule / N° d’adhérent :', memberData?.matricule || memberData?.id || contract.clientId),
        field('contract.id', 'Référence du contrat :', contract.id),
      ],
      [
        field('member.birthDate', 'Date de naissance :', optionalDate(memberData?.birthDate), 'date'),
        field('member.birthPlace', 'Lieu de naissance :', memberData?.birthPlace),
      ],
      [
        field(
          'member.identityDocumentNumber',
          memberData?.identityDocument ? `${getIdentityDocumentLabel(memberData.identityDocument)} n° :` : 'N° CNI/Passeport :',
          memberData?.identityDocumentNumber,
        ),
        field('member.nationality', 'Nationalité :', memberData?.nationality ? getNationalityName(memberData.nationality) : ''),
      ],
      [
        field('member.age', 'Âge :', memberData?.birthDate ? calculateAgeFromBirthDate(memberData.birthDate) : ''),
        field('member.profession', 'Profession :', memberData?.profession),
      ],
      [
        field('member.quarter', 'Quartier :', memberData?.address?.district || memberData?.address?.arrondissement),
        field('member.phones', 'Téléphone(s) :', memberPhones.join(' / ')),
      ],
    ] as FieldRow[],
    guarantor: [
      [
        field('guarantor.lastName', 'Nom(s) :', String(guarantorData?.lastName || contract.guarantorLastName || '').toUpperCase()),
        field('guarantor.firstName', 'Prénom(s) :', guarantorData?.firstName || contract.guarantorFirstName),
      ],
      [field('guarantor.phone', 'Téléphone :', guarantorData?.contacts?.[0]), field('guarantor.address', 'Adresse :', guarantorAddress)],
      [
        field('guarantor.identityDocument', 'Type de pièce :', guarantorData?.identityDocument ? getIdentityDocumentLabel(guarantorData.identityDocument) : ''),
        field('guarantor.identityDocumentNumber', 'N° de pièce :', guarantorData?.identityDocumentNumber),
      ],
    ] as FieldRow[],
    disbursementDate: field('contract.disbursementDate', 'Date de mise à disposition des fonds', optionalDate(contract.disbursementDate), 'date'),
  }
}

export const listCreditContractFields = (input: CreditContractInput): DocumentField[] =>
  collectDocumentFields(buildCreditContractFields(input))

const AdhesionCreditSpecialeV3 = ({ contract, memberData, guarantorData, fillData, completion }: AdhesionCreditSpecialeV3Props) => {
  const filled = { ...EMPTY_ADHESION_CREDIT_SPECIALE_FILL_DATA, ...fillData }
  const fields = buildCreditContractFields({ contract, memberData, guarantorData })
  const read = (target: DocumentField) => readField(target, completion)
  const [[lastNameField, firstNameField]] = fields.member
  const memberName = fullNameFrom(read(lastNameField), read(firstNameField))
  const [[guarantorLastNameField, guarantorFirstNameField]] = fields.guarantor
  const guarantorName = fullNameFrom(read(guarantorLastNameField), read(guarantorFirstNameField))
  const memberNationality = read(fields.member[3][1])
  const memberQuarter = read(fields.member[5][0])
  const memberPhone = read(fields.member[5][1]).split(' / ')[0]

  const creditAmount = contract.totalAmount ?? contract.amount
  const guaranteeAmount = contract.totalAmount || contract.amount
  const firstPaymentDate = toDate(contract.firstPaymentDate)
  // Crédit en semaines : une seule échéance (firstPaymentDate), qui est aussi la fin de la créance.
  const isWeekly = isWeeklyCredit(contract)
  const durationLabel = formatCreditDuration(contract.duration, contract.durationUnit)
  const endDate = firstPaymentDate
    ? isWeekly ? firstPaymentDate : addContractMonths(firstPaymentDate, (contract.duration || 0) - 1)
    : null
  const disbursementDate = read(fields.disbursementDate) || EMPTY

  const customSchedule = contract.customSchedule && contract.customSchedule.length > 0 ? contract.customSchedule : null
  // Achat en boutique : intérêts une fois, 2 ou 3 mensualités égales.
  const isShopPurchase = contract.repaymentModel === 'FLAT' && !isWeekly
  const schedule = firstPaymentDate
    ? isWeekly
      ? [{ month: 1, date: firstPaymentDate, payment: computeWeeklyCreditTotals(contract.amount, contract.interestRate).totalAmount }]
      : isShopPurchase
      ? splitFlatInstallments(
          computeWeeklyCreditTotals(contract.amount, contract.interestRate).totalAmount,
          contract.duration || 1
        ).map((payment, index) => ({ month: index + 1, date: addContractMonths(firstPaymentDate, index), payment }))
      : customSchedule
      ? customSchedule.map(({ month, amount }) => ({ month, date: addContractMonths(firstPaymentDate, month - 1), payment: amount }))
      : calculateSchedule({
          amount: contract.amount,
          interestRate: contract.interestRate,
          monthlyPayment: contract.monthlyPaymentAmount,
          firstPaymentDate,
          maxDuration: contract.duration,
        })
    : []

  const filledDate = (raw: string) => (raw?.trim() ? formatDate(raw) : EMPTY)
  const filledCity = (raw: string) => raw?.trim() || EMPTY

  const threePartySigners: MutuelleSigner[] = [
    { title: 'Le Membre bénéficiaire', name: memberName, signature: filled.memberSignature, hint: '(Précédée de la mention « Lu et approuvé »)' },
    { title: 'La Caution', name: guarantorName, signature: filled.guarantorSignature, hint: '(Précédée de la mention « Lu et approuvé »)' },
    { title: 'Le Secrétaire Exécutif', signature: filled.secretarySignature, hint: '(Signature et cachet)' },
  ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <MutuellePageChrome footerLabel="Contrat de crédit — reconnaissance de dette et cautionnement" />

        {/* Acte 1 : reconnaissance de dette */}
        <MutuelleHeader title="RECONNAISSANCE DE DETTE" />

        <MutuelleSection title="1. IDENTIFICATION DU MEMBRE BÉNÉFICIAIRE">
          <FieldTable rows={fields.member} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="2. IDENTIFICATION DE LA CAUTION">
          <FieldTable rows={fields.guarantor} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="3. RECONNAISSANCE DE DETTE">
          <Text style={styles.paragraph}>
            Je soussigné M/Mme/Mlle <Text style={styles.bold}>{memberName || EMPTY}</Text>, de nationalité{' '}
            {memberNationality || EMPTY}, Membre de
            l’Association LE KARA, par la présente, je reconnais avoir reçu de l’association un
            accompagnement financier, conformément aux dispositions du règlement intérieur, d’un montant de :
          </Text>
          <Text style={localStyles.amount}>{formatAmount(creditAmount)} FCFA (chiffres),</Text>
          <Text style={localStyles.amount}>{numberToWords(creditAmount)} FCFA (lettres),</Text>
          <Text style={styles.paragraph}>En date du {disbursementDate}.</Text>
          {contract.shopPurchase && (
            <Text style={styles.paragraph}>
              Cet accompagnement finance l’achat de « {contract.shopPurchase.article} » auprès de la boutique
              « {contract.shopPurchase.shopName} », membre partenaire de l’Association, qui est réglée
              directement par l’Association. Les fonds ne sont pas remis au membre.
            </Text>
          )}
          <Text style={styles.paragraph}>
            {isWeekly ? (
              <>
                Cette somme doit être restituée à la trésorerie de l’Association en une seule échéance, dans
                un délai de {durationLabel}, le {formatDate(firstPaymentDate)}, date de fin de créance.
              </>
            ) : (
              <>
                Cette somme doit être restituée à la trésorerie de l’Association selon un échéancier de{' '}
                {durationLabel} à compter du {formatDate(firstPaymentDate)}. Jusqu’au{' '}
                {formatDate(endDate)} date de fin de créance.
              </>
            )}
          </Text>
          <Text style={styles.paragraph}>
            En foi de quoi, la présente reconnaissance de dette est signée par les deux parties pour
            servir et valoir ce que de droit.
          </Text>
          <View wrap={false}>
            <Text style={styles.paragraph}>
              Fait à {filledCity(filled.reconnaissanceCity)}, le {filledDate(filled.reconnaissanceDate)}
            </Text>
            <MutuelleSignatureRow
              signers={[
                { title: 'Le Membre bénéficiaire', name: memberName, signature: filled.memberSignature, hint: '(Précédée de la mention « Lu et approuvé »)' },
                { title: 'Le Secrétaire Exécutif', signature: filled.secretarySignature, hint: '(Signature et cachet)' },
              ]}
            />
          </View>
        </MutuelleSection>

        {/* Acte 2 : protocole d'accompagnement */}
        <Text break style={localStyles.actTitle}>PROTOCOLE D’ACCOMPAGNEMENT</Text>

        <MutuelleSection title="ARTICLE 1 : MONTANT ET DURÉE DE LA CRÉANCE">
          <Text style={styles.paragraph}>L’Association accorde et consent au membre bénéficiaire un accompagnement</Text>
          <View style={localStyles.checkboxRow}>
            <Checkbox checked={filled.accompanimentType === 'EXCEPTIONNEL'} label="Exceptionnel" />
            <Checkbox checked={filled.accompanimentType === 'REGULIER'} label="Régulier" />
          </View>
          <Text style={styles.paragraph}>À hauteur de :</Text>
          <Text style={localStyles.amount}>{formatAmount(creditAmount)} FCFA (chiffres),</Text>
          <Text style={localStyles.amount}>{numberToWords(creditAmount)} FCFA (lettres),</Text>
          <Text style={styles.paragraph}>En date du {disbursementDate}. Pour une nécessité sociale.</Text>
          <Text style={styles.paragraph}>
            La mise à disposition effective des fonds auprès du membre bénéficiaire pourra prendre
            quelques jours supplémentaires sans que ce délai n’affecte la date de début du prêt.
          </Text>
        </MutuelleSection>

        <MutuelleSection title="ARTICLE 2 : REMBOURSEMENT DE SOMME">
          <Text style={styles.paragraph}>
            {isWeekly
              ? `Le membre s’engage sur l’honneur à rembourser ledit accompagnement en une seule échéance, sous un délai de ${durationLabel}.`
              : `Le membre s’engage sur l’honneur à rembourser ledit accompagnement en plusieurs échéances mensuelles sous un délai maximum de ${durationLabel}.`}
          </Text>
          <Text style={styles.paragraph}>Le tableau ci-dessous représente l’échéancier convenu entre les parties.</Text>
          <View style={styles.table}>
            <View style={localStyles.scheduleHead}>
              <Text style={localStyles.scheduleCell}>Échéances</Text>
              <Text style={localStyles.scheduleCell}>Date</Text>
              <Text style={localStyles.scheduleCell}>Montant FCFA</Text>
            </View>
            {schedule.map((item, index) => (
              <View key={item.month} style={[styles.row, ...(index % 2 === 0 ? [localStyles.scheduleBand] : [])]} wrap={false}>
                <Text style={localStyles.scheduleCell}>{isWeekly ? 'Échéance unique' : `M${item.month}`}</Text>
                <Text style={localStyles.scheduleCell}>{formatDate(item.date)}</Text>
                <Text style={localStyles.scheduleCell}>{formatAmount(item.payment)}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.paragraph, { marginTop: 4 }]}>
            {isWeekly ? 'Tout remboursement' : 'Tout remboursement mensuel'} portant sur des sommes en dessous de
            celles prévues dans ledit échéancier est non valable et irrecevable.
          </Text>
        </MutuelleSection>

        <MutuelleSection title="ARTICLE 3 : EXIGIBILITÉ DE LA CRÉANCE">
          <Text style={styles.paragraph}>
            {isWeekly ? 'L’arrivée de l’échéance' : 'L’arrivée de chaque échéance mensuelle'} vaut d’office mise en
            demeure du débiteur et marque le décompte des intérêts légaux.
          </Text>
          <Text style={styles.paragraph}>
            Le non-respect des échéanciers expose le membre bénéficiaire à des poursuites judiciaires sous huitaine.
          </Text>
        </MutuelleSection>

        <MutuelleSection title="ARTICLE 4 : DÉCLARATIONS ET ENGAGEMENTS DU PRÊTEUR">
          <Text style={styles.paragraph}>Le membre bénéficiaire déclare et reconnaît :</Text>
          <Text style={styles.bullet}>• Il est majeur et a la capacité juridique pour conclure le contrat ;</Text>
          <Text style={styles.bullet}>• Il a compris les termes du contrat et la portée de ses engagements ;</Text>
          <Text style={styles.bullet}>• Il prend l’engagement de moduler ses capacités financières personnelles afin d’honorer à son remboursement ;</Text>
          <Text style={styles.bullet}>• Il a pris connaissance du règlement intérieur de LE KARA et du protocole d’accompagnement ;</Text>
          <Text style={styles.paragraph}>Le membre bénéficiaire affecte :</Text>
          <Text style={styles.bullet}>
            Pour des raisons de prévoyance, M/Mme/Mlle <Text style={styles.bold}>{guarantorName || EMPTY}</Text>
          </Text>
          <Text style={styles.bullet}>Qui se porte caution solidaire en cas de non-exécution de ma part.</Text>
          <Text style={styles.bullet}>
            Que la présence de cette caution n’empêche pas l’engagement préalable de poursuites judiciaires
            à l’encontre du débiteur pour le recouvrement de ladite créance.
          </Text>
        </MutuelleSection>

        <MutuelleSection title="ARTICLE 5 : SANCTIONS">
          <Text style={styles.paragraph}>
            Afin de garantir toute insolvabilité et non remboursement d’un accompagnement souscrit par le
            membre, l’Association LE KARA se réserve la faculté de se désintéresser par prélèvement dans le
            nominal correspondant aux versements mensuels du membre à hauteur des sommes dues. Si le nominal
            s’avère insuffisant, LE KARA procède au prélèvement du surplus manquant dans le nominal de sa caution.
          </Text>
          <Text style={styles.paragraph}>
            Le non-respect des délais de remboursement m’expose aux sanctions disciplinaires et pénales
            conformément aux dispositions du Règlement intérieur de LE KARA.
          </Text>
          {/* La clôture, le « Fait à » et les signatures ne se séparent pas d'une page à l'autre. */}
          <View wrap={false}>
            <Text style={styles.paragraph}>Ce protocole d’accompagnement est établi pour servir et valoir ce que de droit.</Text>
            <Text style={styles.paragraph}>
              Fait à {filledCity(filled.sanctionsCity)}, le {filledDate(filled.sanctionsDate)}
            </Text>
            <MutuelleSignatureRow signers={threePartySigners} />
          </View>
        </MutuelleSection>

        {/* Acte 3 : cautionnement solidaire */}
        <Text break style={localStyles.actTitle}>ACTE DE CAUTIONNEMENT SOLIDAIRE</Text>

        <MutuelleSection title="PARTIES ET OBJET DU CAUTIONNEMENT">
          <Text style={styles.paragraph}>
            En date du {disbursementDate} le présent acte a été conclu entre les parties suivantes nommément désignées :
          </Text>
          <Text style={styles.paragraph}>
            L’Association LE KARA et M/Mme/Mlle <Text style={styles.bold}>{memberName || EMPTY}</Text>, domicilié à{' '}
            {memberQuarter || EMPTY} et Tel : {memberPhone || EMPTY}.
          </Text>
          <Text style={styles.paragraph}>Il a été convenu entre les parties ce qui suit :</Text>
          <Text style={styles.paragraph}>
            En date du {disbursementDate}, l’Association LE KARA a mis à la disposition de M / Mme/Mlle{' '}
            <Text style={styles.bold}>{memberName || EMPTY}</Text> une somme de :
          </Text>
          <Text style={localStyles.amount}>{formatAmount(creditAmount)} FCFA (Chiffres),</Text>
          <Text style={localStyles.amount}>{numberToWords(creditAmount)} FCFA (Lettres),</Text>
          <Text style={styles.paragraph}>
            dans le cadre d’un accompagnement, à charge pour le membre de la lui restituer en date du {formatDate(endDate)}.
          </Text>
          <Text style={styles.paragraph}>
            Que pour garantir le remboursement de ladite somme, Monsieur/ Madame{' '}
            <Text style={styles.bold}>{guarantorName || EMPTY}</Text> affirme s’être librement et volontairement
            porté caution solidaire de cette dette à charge pour elle de rembourser à l’Association les sommes
            indiquées si Monsieur/ Madame <Text style={styles.bold}>{memberName || EMPTY}</Text> n’y satisfait pas elle-même.
          </Text>
          <Text style={styles.paragraph}>La caution s’engage à garantir le prêt pour une hauteur maximale de :</Text>
          <Text style={localStyles.amount}>{formatAmount(guaranteeAmount)} FCFA (Chiffres),</Text>
          <Text style={localStyles.amount}>{numberToWords(guaranteeAmount)} FCFA (Lettres),</Text>
          <Text style={styles.paragraph}>somme couvrant l’intégralité de la créance.</Text>
        </MutuelleSection>

        <MutuelleSection title="ENGAGEMENTS DE LA CAUTION">
          <Text style={styles.paragraph}>Le cautionnement vaut tant que la dette principale n’a pas été remboursée.</Text>
          <Text style={styles.paragraph}>
            La caution affecte principalement en garantie de la dette du débiteur, son nominal correspondant à
            ses versements mensuels en tant que membre de l’Association. Elle autorise l’Association à y
            prélever les sommes dues par le débiteur en cas de défaillance de celui-ci.
          </Text>
          <Text style={styles.paragraph}>
            Le montant de la caution, à concurrence de la créance garantie, demeurera consigné par
            l’association jusqu’à l’extinction totale de la dette du débiteur principal.
          </Text>
          <Text style={styles.paragraph}>
            La caution s’engage sur simple demande adressée par lettre recommandée à exécuter son engagement,
            sans qu’elle use du bénéfice de discussion.
          </Text>
          <Text style={styles.paragraph}>
            {isWeekly ? 'L’arrivée de l’échéance' : 'L’arrivée de chaque échéance mensuelle'} vaut d’office mise en demeure du débiteur.
          </Text>
          <Text style={styles.paragraph}>
            Pour tout litige pouvant naître de l’exécution dudit contrat, les parties donnent compétence
            territoriale au Tribunal de Libreville.
          </Text>
          <Text style={styles.paragraph}>
            Au vue des dispositions réglementaires qui régissent l’Association, les parties attestent avoir
            pris connaissance de l’étendue de leurs obligations respectives et s’engagent en parfaite
            connaissance de cause.
          </Text>
          <View wrap={false}>
            <Text style={styles.paragraph}>Ce document a été dressé pour faire valoir ce que de droit.</Text>
            <MutuelleSignatureRow signers={threePartySigners} />
          </View>
        </MutuelleSection>
      </Page>
    </Document>
  )
}

export default AdhesionCreditSpecialeV3
