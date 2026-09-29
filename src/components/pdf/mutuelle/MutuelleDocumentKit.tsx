'use client'

import { Image, StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

import { REGLEMENT_ENTETE } from '@/constantes/reglement-interieur'

/**
 * Gabarit des actes de la Mutuelle (modèle LIQUIDATION.docx) : en-tête LE KARA
 * avec devise et siège, préambule, sections numérotées sur bandeau, tableaux
 * « libellé : valeur » deux à deux, mention manuscrite et double signature
 * membre / Comité Exécutif. Même charte que le Règlement intérieur et les
 * documents Caisse Imprévue.
 */

// Le pied de page est positionné depuis le haut : react-pdf gère mal `bottom`
// avec le line-height hérité.
const A4_HEIGHT = 841.89

export const EMPTY = '........................................'

export const mutuelleStyles = StyleSheet.create({
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
  header: { alignItems: 'center', marginBottom: 8 },
  logo: { width: 52, height: 52, objectFit: 'cover', marginBottom: 5 },
  association: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', color: '#1f4f68' },
  devise: { fontSize: 8.5, fontStyle: 'italic', textAlign: 'center', color: '#475569', marginTop: 2 },
  siege: { fontSize: 8, textAlign: 'center', color: '#475569', marginTop: 2 },
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
  table: { borderTop: '1px solid #cbd5e1' },
  row: {
    flexDirection: 'row',
    borderLeft: '1px solid #cbd5e1',
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
  },
  cell: { flex: 1, paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 8.8 },
  secondCell: { borderLeft: '1px solid #cbd5e1' },
  bold: { fontWeight: 'bold' },
  paragraph: { fontSize: 9.2, textAlign: 'justify', lineHeight: 1.28, marginBottom: 4 },
  bullet: { fontSize: 9, textAlign: 'justify', lineHeight: 1.25, marginLeft: 9, marginBottom: 2 },
  note: { fontSize: 8.4, fontStyle: 'italic', color: '#334155', marginTop: 1 },
  signatures: { flexDirection: 'row', marginTop: 7 },
  signatureCell: { flex: 1, paddingRight: 16 },
  signatureTitle: { fontSize: 9.2, fontWeight: 'bold', marginBottom: 4 },
  signatureRole: { fontSize: 8.3, color: '#475569', marginBottom: 3 },
  signatureLine: {
    borderBottom: '1px solid #64748b',
    height: 48,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  signatureImage: { width: 150, height: 44, objectFit: 'contain' },
  signatureName: { fontSize: 8.5, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  signatureHint: { fontSize: 8, fontStyle: 'italic', textAlign: 'center', color: '#64748b' },
})

const isPresent = (value?: string | null): value is string => !!value && value.trim().length > 0
export const display = (value?: string | null): string => (isPresent(value) ? value : EMPTY)

export const toDate = (value: unknown): Date | null => {
  if (!value) return null
  const date = typeof (value as { toDate?: () => Date })?.toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (value: unknown): string => {
  const date = toDate(value)
  return date ? date.toLocaleDateString('fr-FR') : EMPTY
}

export const formatAmount = (value: unknown): string => {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount)
    ? Math.trunc(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : '0'
}

export const numberToWords = (value: number): string => {
  const number = Math.trunc(Math.max(0, value))
  if (number === 0) return 'zéro'

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const underThousand = (n: number): string => {
    const parts: string[] = []
    const hundreds = Math.floor(n / 100)
    const remainder = n % 100
    if (hundreds) {
      parts.push(hundreds === 1 ? 'cent' : `${units[hundreds]} cent${remainder === 0 && hundreds > 1 ? 's' : ''}`)
    }
    if (remainder < 20) {
      if (remainder) parts.push(units[remainder])
    } else if (remainder < 70) {
      const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']
      const ten = Math.floor(remainder / 10)
      const unit = remainder % 10
      parts.push(`${tens[ten]}${unit === 1 ? '-et-un' : unit ? `-${units[unit]}` : ''}`)
    } else if (remainder < 80) {
      const unit = remainder - 60
      parts.push(`soixante-${unit === 11 ? 'et-onze' : units[unit]}`)
    } else {
      const unit = remainder - 80
      parts.push(`quatre-vingt${unit === 0 ? 's' : `-${units[unit]}`}`)
    }
    return parts.join(' ')
  }

  const millions = Math.floor(number / 1_000_000)
  const thousands = Math.floor((number % 1_000_000) / 1_000)
  const remainder = number % 1_000
  const parts: string[] = []
  if (millions) parts.push(millions === 1 ? 'un million' : `${underThousand(millions)} millions`)
  if (thousands) parts.push(thousands === 1 ? 'mille' : `${underThousand(thousands)} mille`)
  if (remainder) parts.push(underThousand(remainder))
  return parts.join(' ')
}

/**
 * Complétion manuelle d'un document depuis sa modale : le lieu de signature,
 * et toute information absente des données (affichée en pointillés) que
 * l'administrateur peut saisir. Rien n'est enregistré en base.
 */
export interface DocumentField {
  /** Clé stable, propre au document. */
  key: string
  label: string
  /** Valeur issue des données, déjà mise en forme ; vide si l'information manque. */
  value: string
  type?: 'text' | 'date'
}

export type FieldRow = [DocumentField, DocumentField]

export interface DocumentCompletion {
  /** Lieu de signature ; vide = lieu par défaut. */
  place: string
  /** Saisies de l'administrateur, par clé de champ. */
  values: Record<string, string>
}

export const DEFAULT_DOCUMENT_PLACE = 'Owendo'

export const EMPTY_DOCUMENT_COMPLETION: DocumentCompletion = { place: '', values: {} }

export const field = (key: string, label: string, value: unknown, type: DocumentField['type'] = 'text'): DocumentField => ({
  key,
  label,
  value: value == null ? '' : String(value).trim(),
  type,
})

/** Lit un champ : la saisie de l'administrateur l'emporte sur la donnée. */
export const readField = (target: DocumentField, completion?: DocumentCompletion | null): string => {
  const typed = completion?.values[target.key]?.trim()
  if (!typed) return target.value
  return target.type === 'date' ? formatDate(typed) : typed
}

export const documentPlace = (completion?: DocumentCompletion | null): string =>
  completion?.place?.trim() || DEFAULT_DOCUMENT_PLACE

/** Champs absents des données, à proposer à la saisie dans la modale. */
export const missingDocumentFields = (fields: DocumentField[]): DocumentField[] => {
  const seen = new Set<string>()
  return fields.filter((candidate) => {
    if (candidate.value || seen.has(candidate.key)) return false
    seen.add(candidate.key)
    return true
  })
}

export const flattenFieldRows = (rows: FieldRow[]): DocumentField[] => rows.flat()

/** Tous les champs d'un document, tableaux et champs isolés confondus. */
export const collectDocumentFields = (groups: Record<string, FieldRow[] | DocumentField>): DocumentField[] =>
  Object.values(groups).flatMap((group) => (Array.isArray(group) ? flattenFieldRows(group) : [group]))

/** « NOM Prénom », à partir des champs éventuellement complétés. */
export const fullNameFrom = (lastName: string, firstName: string): string =>
  [lastName === EMPTY ? '' : lastName.toUpperCase(), firstName === EMPTY ? '' : firstName].filter(Boolean).join(' ').trim()

/** Tableau « libellé : valeur » deux à deux, alimenté par des champs complétables. */
export const FieldTable = ({ rows, completion }: { rows: FieldRow[]; completion?: DocumentCompletion | null }) => (
  <View style={mutuelleStyles.table}>
    {rows.map(([left, right]) => (
      <Pair
        key={`${left.key}-${right.key}`}
        leftLabel={left.label}
        leftValue={readField(left, completion)}
        rightLabel={right.label}
        rightValue={readField(right, completion)}
      />
    ))}
  </View>
)

export const Pair = ({ leftLabel, leftValue, rightLabel, rightValue }: {
  leftLabel: string
  leftValue?: string | null
  rightLabel: string
  rightValue?: string | null
}) => (
  <View style={mutuelleStyles.row}>
    <Text style={mutuelleStyles.cell}><Text style={mutuelleStyles.bold}>{leftLabel} </Text>{display(leftValue)}</Text>
    <Text style={[mutuelleStyles.cell, mutuelleStyles.secondCell]}><Text style={mutuelleStyles.bold}>{rightLabel} </Text>{display(rightValue)}</Text>
  </View>
)

/** Numéro de page et pied de page, répétés sur chaque page. */
export const MutuellePageChrome = ({ footerLabel }: { footerLabel: string }) => (
  <>
    <Text
      fixed
      style={mutuelleStyles.pageNumber}
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
    />
    <Text fixed style={mutuelleStyles.footer}>
      {REGLEMENT_ENTETE.association} — {footerLabel}
    </Text>
  </>
)

export const MutuelleHeader = ({ title }: { title: string }) => (
  <View style={mutuelleStyles.header}>
    <Image src={window.location.origin + '/Logo-Kara.jpg'} style={mutuelleStyles.logo} cache={false} />
    <Text style={mutuelleStyles.association}>{REGLEMENT_ENTETE.association}</Text>
    <Text style={mutuelleStyles.devise}>{REGLEMENT_ENTETE.devise}</Text>
    <Text style={mutuelleStyles.siege}>{REGLEMENT_ENTETE.siege}</Text>
    <Text style={mutuelleStyles.docTitle}>{title}</Text>
  </View>
)

export const MutuelleSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={mutuelleStyles.section}>
    <Text style={mutuelleStyles.sectionTitle}>{title}</Text>
    {children}
  </View>
)

export interface MutuelleSigner {
  title: string
  /** Nom imprimé sous la ligne ; absent pour le Comité Exécutif, qui signe et appose son cachet. */
  name?: string
  signature: string | null
  hint: string
}

/** Signatures côte à côte, pour les actes à plus de deux parties (membre, caution, Comité). */
export const MutuelleSignatureRow = ({ signers }: { signers: MutuelleSigner[] }) => (
  <View style={mutuelleStyles.signatures} wrap={false}>
    {signers.map((signer) => (
      <View key={signer.title} style={mutuelleStyles.signatureCell}>
        <Text style={mutuelleStyles.signatureTitle}>{signer.title}</Text>
        <View style={mutuelleStyles.signatureLine}>
          {signer.signature && <Image src={signer.signature} style={mutuelleStyles.signatureImage} cache={false} />}
        </View>
        {signer.name !== undefined && <Text style={mutuelleStyles.signatureName}>{display(signer.name)}</Text>}
        <Text style={mutuelleStyles.signatureHint}>{signer.hint}</Text>
      </View>
    ))}
  </View>
)

/** Double signature : le membre à gauche, le Comité Exécutif à droite. */
export const MutuelleSignatures = ({
  memberTitle,
  memberName,
  memberSignature,
  committeeRole,
  committeeSignature,
}: {
  memberTitle: string
  memberName: string
  memberSignature: string | null
  committeeRole: string
  committeeSignature: string | null
}) => (
  <View style={mutuelleStyles.signatures}>
    <View style={mutuelleStyles.signatureCell}>
      <Text style={mutuelleStyles.signatureTitle}>{memberTitle}</Text>
      <View style={mutuelleStyles.signatureLine}>
        {memberSignature && <Image src={memberSignature} style={mutuelleStyles.signatureImage} cache={false} />}
      </View>
      <Text style={mutuelleStyles.signatureName}>{display(memberName)}</Text>
      <Text style={mutuelleStyles.signatureHint}>(Signature précédée de la mention « Lu et approuvé »)</Text>
    </View>
    <View style={mutuelleStyles.signatureCell}>
      <Text style={mutuelleStyles.signatureTitle}>Pour le Comité Exécutif</Text>
      <Text style={mutuelleStyles.signatureRole}>{committeeRole}</Text>
      <View style={mutuelleStyles.signatureLine}>
        {committeeSignature && <Image src={committeeSignature} style={mutuelleStyles.signatureImage} cache={false} />}
      </View>
      <Text style={mutuelleStyles.signatureHint}>(Signature et cachet)</Text>
    </View>
  </View>
)
