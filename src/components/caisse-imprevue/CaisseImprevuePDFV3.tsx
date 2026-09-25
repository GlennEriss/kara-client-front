'use client'

import { REGLEMENT_ENTETE } from '@/constantes/reglement-interieur'
import type { ContractCI } from '@/types/types'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

/**
 * Contrat d'adhésion à la Caisse Imprévue.
 *
 * Il reprend la structure de l'engagement d'adhésion fourni par la Mutuelle,
 * avec des clauses et des données propres à la Caisse Imprévue. Il est
 * distinct du procès-verbal de liquidation, qui n'est établi qu'au règlement.
 */

const A4_HEIGHT = 841.89
const EMPTY = '........................................'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 9.4,
    paddingTop: 24,
    paddingBottom: 34,
    paddingHorizontal: 42,
    lineHeight: 1.3,
    color: '#1f2937',
  },
  pageNumber: {
    position: 'absolute',
    top: A4_HEIGHT - 22,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8.5,
    lineHeight: 1,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    top: A4_HEIGHT - 34,
    left: 42,
    right: 42,
    fontSize: 7.5,
    lineHeight: 1,
    color: '#475569',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: 'cover',
    marginBottom: 5,
  },
  association: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
  },
  devise: {
    fontSize: 8.5,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#475569',
    marginTop: 2,
  },
  siege: {
    fontSize: 8,
    textAlign: 'center',
    color: '#475569',
    marginTop: 2,
  },
  docTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
    textDecoration: 'underline',
    marginTop: 7,
  },
  preamble: {
    fontSize: 9.2,
    fontStyle: 'italic',
    textAlign: 'justify',
    marginBottom: 6,
    color: '#1f2937',
  },
  section: { marginBottom: 7 },
  sectionTitle: {
    backgroundColor: '#1f4f68',
    color: 'white',
    textAlign: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 9.5,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  table: {
    borderTop: '1px solid #cbd5e1',
  },
  row: {
    flexDirection: 'row',
    borderLeft: '1px solid #cbd5e1',
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
  },
  cell: {
    flex: 1,
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    fontSize: 8.8,
  },
  secondCell: {
    borderLeft: '1px solid #cbd5e1',
  },
  bold: { fontWeight: 'bold' },
  paragraph: {
    fontSize: 9.2,
    textAlign: 'justify',
    lineHeight: 1.28,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 9,
    textAlign: 'justify',
    lineHeight: 1.25,
    marginLeft: 9,
    marginBottom: 2,
  },
  note: {
    fontSize: 8.4,
    fontStyle: 'italic',
    color: '#334155',
    marginTop: 1,
  },
  signatures: {
    flexDirection: 'row',
    marginTop: 7,
  },
  signatureCell: {
    flex: 1,
    paddingRight: 16,
  },
  signatureTitle: {
    fontSize: 9.2,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  signatureRole: {
    fontSize: 8.3,
    color: '#475569',
    marginBottom: 3,
  },
  signatureLine: {
    borderBottom: '1px solid #64748b',
    height: 48,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  signatureImage: {
    width: 150,
    height: 44,
    objectFit: 'contain',
  },
  signatureName: {
    fontSize: 8.5,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  signatureHint: {
    fontSize: 8,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#64748b',
  },
})

const isPresent = (value?: string | null): value is string => !!value && value.trim().length > 0
const display = (value?: string | null): string => (isPresent(value) ? value : EMPTY)

const toDate = (value: unknown): Date | null => {
  if (!value) return null
  const date = typeof (value as { toDate?: () => Date })?.toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value: unknown): string => {
  const date = toDate(value)
  return date ? date.toLocaleDateString('fr-FR') : EMPTY
}

const formatAmount = (value: unknown): string => {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount)
    ? Math.trunc(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : '0'
}

const contractEndDate = (contract?: Record<string, unknown>): string => {
  if (contract?.contractEndAt) return formatDate(contract.contractEndAt)
  if (!contract?.firstPaymentDate || !contract?.subscriptionCIDuration) return EMPTY

  const start = toDate(contract.firstPaymentDate)
  if (!start) return EMPTY
  start.setMonth(start.getMonth() + Number(contract.subscriptionCIDuration))
  start.setDate(start.getDate() - 1)
  return start.toLocaleDateString('fr-FR')
}

const frequencyLabel = (frequency?: unknown): string =>
  frequency === 'DAILY' ? 'Quotidienne' : frequency === 'MONTHLY' ? 'Mensuelle' : EMPTY

const paymentDayLabel = (contract: Record<string, unknown>): string => {
  if (contract.paymentFrequency === 'DAILY') return 'Chaque jour'

  const firstPaymentDate = toDate(contract.firstPaymentDate)
  return firstPaymentDate
    ? `Le ${String(firstPaymentDate.getDate()).padStart(2, '0')} de chaque mois`
    : EMPTY
}

const Pair = ({ leftLabel, leftValue, rightLabel, rightValue }: {
  leftLabel: string
  leftValue?: string | null
  rightLabel: string
  rightValue?: string | null
}) => (
  <View style={styles.row}>
    <Text style={styles.cell}><Text style={styles.bold}>{leftLabel} </Text>{display(leftValue)}</Text>
    <Text style={[styles.cell, styles.secondCell]}><Text style={styles.bold}>{rightLabel} </Text>{display(rightValue)}</Text>
  </View>
)

export interface CaisseImprevuePdfFillData {
  memberSignature: string | null
  secretarySignature: string | null
}

const DEFAULT_FILL_DATA: CaisseImprevuePdfFillData = {
  memberSignature: null,
  secretarySignature: null,
}

const CaisseImprevuePDFV3 = ({
  contract: inputContract,
  fillData,
}: {
  contract?: ContractCI | null
  fillData?: CaisseImprevuePdfFillData
}) => {
  const contract = (inputContract ?? {}) as Record<string, any>
  const resolvedFillData = fillData ?? DEFAULT_FILL_DATA
  const member = (contract?.member ?? {}) as Record<string, unknown>
  const emergencyContact = (contract?.emergencyContact ?? {}) as Record<string, unknown>
  // Même source que le contrat Caisse Spéciale : le PDF reçoit d'abord la
  // fiche `member` complète, enrichie dans la modale avant son rendu.
  // Les champs dénormalisés du contrat ne servent que de secours pour les
  // contrats historiques dont la fiche membre est introuvable.
  const lastName = String(member.lastName || contract?.memberLastName || '')
  const firstName = String(member.firstName || contract?.memberFirstName || '')
  const memberName = [lastName.toUpperCase(), firstName].filter(Boolean).join(' ').trim()
  const contacts = Array.isArray(member.contacts) && member.contacts.length > 0
    ? member.contacts
    : Array.isArray(contract?.memberContacts) ? contract.memberContacts : []
  const memberAddress = member.address && typeof member.address === 'object'
    ? (member.address as Record<string, unknown>).district
      ?? (member.address as Record<string, unknown>).arrondissement
      ?? (member.address as Record<string, unknown>).city
    : member.address
  const address = String(memberAddress || contract?.memberAddress || '')
  const memberBirthDate = member.birthDate || contract?.memberBirthDate
  const memberBirthPlace = String(member.birthPlace ?? contract?.memberBirthPlace ?? '')
  const identityNumber = String(member.identityDocumentNumber ?? contract?.memberIdentityDocumentNumber ?? '')
  const nationality = String(member.nationality || contract?.memberNationality || '')
  const profession = String(member.profession || member.companyName || contract?.memberProfession || '')
  const email = String(member.email || contract?.memberEmail || '')
  const paymentDueDay = paymentDayLabel(contract)
  const periodicAmount = Number(contract?.subscriptionCIAmountPerMonth ?? 0)
  const nominal = Number(contract?.subscriptionCINominal ?? 0)
  const duration = Number(contract?.subscriptionCIDuration ?? 0)
  const contractDate = contract?.createdAt ?? contract?.firstPaymentDate

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text
          fixed
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
        <Text fixed style={styles.footer}>
          {REGLEMENT_ENTETE.association} — Contrat d’adhésion à la Caisse Imprévue
        </Text>

        <View style={styles.header}>
          <Image src={window.location.origin + '/Logo-Kara.jpg'} style={styles.logo} cache={false} />
          <Text style={styles.association}>{REGLEMENT_ENTETE.association}</Text>
          <Text style={styles.devise}>{REGLEMENT_ENTETE.devise}</Text>
          <Text style={styles.siege}>{REGLEMENT_ENTETE.siege}</Text>
          <Text style={styles.docTitle}>CONTRAT D’ADHÉSION À LA CAISSE IMPRÉVUE</Text>
        </View>

        <Text style={styles.preamble}>
          Le présent acte formalise l’adhésion du membre à la Caisse Imprévue de la Mutuelle. Il
          précise la formule souscrite, les engagements de versement et les conditions applicables
          pendant la durée du contrat. Il ne constitue ni un crédit ni un prêt accordé au membre.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. IDENTIFICATION DU MEMBRE ADHÉRENT</Text>
          <View style={styles.table}>
            <Pair
              leftLabel="Nom(s) :"
              leftValue={lastName.toUpperCase()}
              rightLabel="Prénom(s) :"
              rightValue={firstName}
            />
            <Pair
              leftLabel="Matricule / N° d’adhérent :"
              leftValue={String(contract?.memberId ?? '')}
              rightLabel="Référence du contrat :"
              rightValue={String(contract?.id ?? '')}
            />
            <Pair
              leftLabel="Date de naissance :"
              leftValue={formatDate(memberBirthDate)}
              rightLabel="Lieu de naissance :"
              rightValue={memberBirthPlace}
            />
            <Pair
              leftLabel="N° CNI/Passeport :"
              leftValue={identityNumber}
              rightLabel="Nationalité :"
              rightValue={nationality}
            />
            <Pair
              leftLabel="Adresse / Quartier :"
              leftValue={address}
              rightLabel="Profession / Employeur :"
              rightValue={profession}
            />
            <Pair
              leftLabel="Téléphone / WhatsApp :"
              leftValue={String(contacts.filter(Boolean).join(' / '))}
              rightLabel="Email :"
              rightValue={email}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. ENGAGEMENTS ET CONDITIONS DE LA CAISSE IMPRÉVUE</Text>
          <View style={styles.table}>
            <Pair
              leftLabel="Formule souscrite :"
              leftValue={String(contract?.subscriptionCILabel ?? contract?.subscriptionCICode ?? '')}
              rightLabel="Fréquence de versement :"
              rightValue={frequencyLabel(contract?.paymentFrequency)}
            />
            <Pair
              leftLabel="Montant prévu par période :"
              leftValue={`${formatAmount(periodicAmount)} FCFA`}
              rightLabel="Nominal contractuel :"
              rightValue={`${formatAmount(nominal)} FCFA`}
            />
            <Pair
              leftLabel="Durée du contrat :"
              leftValue={duration > 0 ? `${duration} mois` : EMPTY}
              rightLabel="Jour convenu de versement :"
              rightValue={paymentDueDay}
            />
            <Pair
              leftLabel="Date de début :"
              leftValue={formatDate(contract?.firstPaymentDate ?? contract?.contractStartAt)}
              rightLabel="Date de fin prévue :"
              rightValue={contractEndDate(contract)}
            />
          </View>
          <Text style={styles.paragraph}>
            Je soussigné(e), nommé(e) ci-dessus, adhère librement à la Caisse Imprévue et m’engage à
            effectuer les versements correspondant à la formule souscrite, selon la fréquence et la
            durée mentionnées au présent contrat.
          </Text>
          <Text style={styles.bullet}>• Les versements sont enregistrés dans l’échéancier du contrat.</Text>
          <Text style={styles.bullet}>• Toute demande de retrait anticipé est traitée selon les conditions applicables au contrat.</Text>
          <Text style={styles.bullet}>• À l’échéance ou après un règlement anticipé, les sommes effectivement remises sont constatées dans un document de liquidation distinct.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. PERSONNE À CONTACTER EN CAS D’URGENCE</Text>
          <View style={styles.table}>
            <Pair
              leftLabel="Nom(s) :"
              leftValue={String(emergencyContact.lastName ?? '').toUpperCase()}
              rightLabel="Prénom(s) :"
              rightValue={String(emergencyContact.firstName ?? '')}
            />
            <Pair
              leftLabel="Lien avec le membre :"
              leftValue={String(emergencyContact.relationship ?? '')}
              rightLabel="Téléphone :"
              rightValue={String(emergencyContact.phone1 ?? emergencyContact.phone ?? '')}
            />
            <Pair
              leftLabel="N° CNI/Passeport :"
              leftValue={String(emergencyContact.idNumber ?? '')}
              rightLabel="Adresse / Quartier :"
              rightValue={String(emergencyContact.address ?? '')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. ACCEPTATION DU RÈGLEMENT ET SIGNATURE</Text>
          <Text style={styles.paragraph}>
            Je reconnais avoir pris connaissance des Statuts, du Règlement Intérieur et des conditions
            de la Caisse Imprévue de la Mutuelle d’Entraide et de Secours Mutuel « LE KARA ». Je
            m’engage à les respecter pendant toute la durée du présent contrat.
          </Text>
          <Text style={styles.paragraph}>Fait à Owendo, le {formatDate(contractDate)}</Text>
          <Text style={styles.note}>
            (Inscrire la mention manuscrite « Lu et approuvé, bon pour engagement »)
          </Text>

          <View style={styles.signatures}>
            <View style={styles.signatureCell}>
              <Text style={styles.signatureTitle}>Le Membre Adhérent</Text>
              <View style={styles.signatureLine}>
                {resolvedFillData.memberSignature && (
                  <Image src={resolvedFillData.memberSignature} style={styles.signatureImage} cache={false} />
                )}
              </View>
              <Text style={styles.signatureName}>{display(memberName)}</Text>
              <Text style={styles.signatureHint}>(Signature précédée de la mention « Lu et approuvé »)</Text>
            </View>
            <View style={styles.signatureCell}>
              <Text style={styles.signatureTitle}>Pour le Comité Exécutif</Text>
              <Text style={styles.signatureRole}>Le Secrétaire Exécutif</Text>
              <View style={styles.signatureLine}>
                {resolvedFillData.secretarySignature && (
                  <Image src={resolvedFillData.secretarySignature} style={styles.signatureImage} cache={false} />
                )}
              </View>
              <Text style={styles.signatureHint}>(Signature et cachet)</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default CaisseImprevuePDFV3
